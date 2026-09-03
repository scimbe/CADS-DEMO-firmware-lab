/* board.ts – BoardController: bridge-side model of the board (status, flash, serial lines).
 * Pure Node (no vscode): the extension wires it to commands, status bar, terminal and exports.
 */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { elfToImage, isElf } from './elf';
import type { Probe } from './probeClient';
import type { ProbeEvent, ProbeStatus } from './types';

export interface BoardStatus {
  connected: boolean;
  serialOpen: boolean;
  core: 'halted' | 'running' | 'reset' | 'unknown';
  lastFlash?: { file: string; addr: number; ok: boolean; at: string; bytes?: number; ms?: number; error?: string };
  gdbClients: number;
  probe?: ProbeStatus;
  /** Round-trip statistics of probe calls (bridge → worker → USB → back), ms. */
  rtt?: { ops: number; avgMs: number; maxMs: number };
}

export type BoardEvent = {
  type: 'flash-done' | 'flash-failed' | 'reset' | 'debug-stop' | 'debug-start' | 'debug-end';
  detail?: unknown;
};

export interface BoardLogger {
  info(m: string): void;
  warn(m: string): void;
  error(m: string): void;
}

type Listener<T> = (v: T) => void;

class Emitter<T> {
  private set = new Set<Listener<T>>();
  on(cb: Listener<T>): { dispose(): void } {
    this.set.add(cb);
    return { dispose: () => this.set.delete(cb) };
  }
  fire(v: T): void {
    for (const cb of Array.from(this.set)) {
      try {
        cb(v);
      } catch {
        // listeners must not break the bridge
      }
    }
  }
}

export const FLASH_WINDOW = { start: 0x08000000, end: 0x08100000 };

export class BoardController {
  private status: BoardStatus = { connected: false, serialOpen: false, core: 'unknown', gdbClients: 0 };
  readonly statusChanged = new Emitter<BoardStatus>();
  readonly serialLine = new Emitter<string>();
  readonly serialData = new Emitter<Buffer>();
  readonly events = new Emitter<BoardEvent>();
  readonly flashProgress = new Emitter<{ phase: string; done: number; total: number }>();
  private lineBuf = '';
  private readonly decoder = new TextDecoder('utf-8');
  private serialWaiters: { pattern: RegExp; resolve: (m: string | null) => void; timer: ReturnType<typeof setTimeout>; buf: string }[] = [];
  private baud = 115200;
  private flashing = false;

  constructor(
    readonly probe: Probe,
    private readonly log: BoardLogger,
  ) {
    probe.onEvent((e) => this.onProbeEvent(e));
  }

  getStatus(): BoardStatus {
    const st = (this.probe as { stats?: { ops: number; totalMs: number; maxMs: number } }).stats;
    return {
      ...this.status,
      probe: this.probe.lastStatus ?? undefined,
      ...(st && st.ops ? { rtt: { ops: st.ops, avgMs: Math.round((st.totalMs / st.ops) * 10) / 10, maxMs: st.maxMs } } : {}),
    };
  }

  setBaud(baud: number): void {
    this.baud = baud;
  }

  setGdbClients(n: number): void {
    this.update({ gdbClients: n });
  }

  private update(patch: Partial<BoardStatus>): void {
    this.status = { ...this.status, ...patch };
    this.statusChanged.fire(this.getStatus());
  }

  private applyProbeStatus(s: ProbeStatus): void {
    this.update({
      connected: s.usb === 'connected',
      serialOpen: s.serial === 'open',
      core: s.usb === 'connected' ? (s.core ?? 'unknown') : 'unknown',
    });
  }

  async refresh(): Promise<BoardStatus> {
    const s = await this.probe.getStatus();
    this.applyProbeStatus(s);
    return this.getStatus();
  }

  /** Connect: chooser if needed (user gesture), then open the serial console if a port is known. */
  async connect(opts?: { usb?: boolean; serial?: boolean }): Promise<BoardStatus> {
    let s = await this.probe.reconnect();
    if ((opts?.usb !== false && s.usb !== 'connected') || (opts?.serial !== false && !s.serialPortKnown)) {
      s = await this.probe.requestDevices({ usb: opts?.usb !== false && s.usb !== 'connected', serial: opts?.serial !== false && !s.serialPortKnown });
    }
    this.applyProbeStatus(s);
    if (s.serialPortKnown && s.serial !== 'open') await this.openSerial();
    return this.getStatus();
  }

  async openSerial(): Promise<boolean> {
    const r = await this.probe.op({ op: 'serialOpen', baud: this.baud });
    if (!r.ok) {
      this.log.warn(`serial open: ${r.error}`);
      return false;
    }
    this.update({ serialOpen: true });
    return true;
  }

  async disconnect(): Promise<BoardStatus> {
    await this.probe.op({ op: 'serialClose' });
    const s = await this.probe.disconnect();
    this.applyProbeStatus(s);
    return this.getStatus();
  }

  async reset(): Promise<{ ok: boolean; error?: string }> {
    const r = await this.probe.op({ op: 'resetRun' });
    if (r.ok) {
      this.update({ core: 'running' });
      this.events.fire({ type: 'reset' });
      return { ok: true };
    }
    return { ok: false, error: r.error };
  }

  async halt(): Promise<{ ok: boolean; error?: string; pc?: number }> {
    const r = await this.probe.op({ op: 'halt' });
    if (r.ok) {
      this.update({ core: 'halted' });
      return { ok: true, pc: Number(r.pc) };
    }
    return { ok: false, error: r.error };
  }

  async run(): Promise<{ ok: boolean; error?: string }> {
    const r = await this.probe.op({ op: 'run' });
    if (r.ok) this.update({ core: 'running' });
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  }

  get isFlashing(): boolean {
    return this.flashing;
  }

  /** Flash a .bin (at addr) or .elf (LMA from the file), verify, then reset and run. */
  async flashFile(file: string, addr = FLASH_WINDOW.start, opts?: { resetAfter?: boolean }): Promise<{ ok: boolean; error?: string; bytes?: number; ms?: number }> {
    let buf: Buffer;
    try {
      buf = await fs.readFile(file);
    } catch (e) {
      return { ok: false, error: `cannot read ${file}: ${e instanceof Error ? e.message : String(e)}` };
    }
    let data = buf;
    let at = addr;
    if (isElf(buf)) {
      try {
        const img = elfToImage(buf);
        data = img.data;
        at = img.addr;
      } catch (e) {
        return { ok: false, error: `ELF: ${e instanceof Error ? e.message : String(e)}` };
      }
    }
    return this.flashImage(data, at, path.basename(file), opts);
  }

  async flashImage(data: Buffer, addr: number, label = 'image', opts?: { resetAfter?: boolean }): Promise<{ ok: boolean; error?: string; bytes?: number; ms?: number }> {
    if (this.flashing) return { ok: false, error: 'a flash operation is already running' };
    if (addr < FLASH_WINDOW.start || addr + data.length > FLASH_WINDOW.end) {
      return { ok: false, error: `image 0x${addr.toString(16)}+${data.length} outside the firmware window 0x08000000–0x080fffff` };
    }
    if (data.length === 0) return { ok: false, error: 'empty image' };
    this.flashing = true;
    const started = Date.now();
    try {
      const r = await this.probe.op({ op: 'flash', addr, data: data.toString('base64'), verify: true });
      const ms = Date.now() - started;
      if (!r.ok) {
        this.log.error(`flash ${label} failed: ${r.error}`);
        this.update({ lastFlash: { file: label, addr, ok: false, at: new Date().toISOString(), bytes: data.length, ms, error: r.error } });
        this.events.fire({ type: 'flash-failed', detail: { file: label, addr, error: r.error } });
        return { ok: false, error: r.error, ms };
      }
      this.log.info(`flash ${label}: ${data.length} bytes @0x${addr.toString(16)} in ${ms} ms`);
      this.update({ core: 'halted', lastFlash: { file: label, addr, ok: true, at: new Date().toISOString(), bytes: data.length, ms } });
      if (opts?.resetAfter !== false) {
        const rr = await this.probe.op({ op: 'resetRun' });
        if (rr.ok) this.update({ core: 'running' });
      }
      this.events.fire({ type: 'flash-done', detail: { file: label, addr, bytes: data.length, ms } });
      return { ok: true, bytes: data.length, ms };
    } finally {
      this.flashing = false;
    }
  }

  async sendSerial(text: string | Buffer): Promise<void> {
    const data = typeof text === 'string' ? Buffer.from(text, 'utf8') : text;
    const r = await this.probe.op({ op: 'serialWrite', data: data.toString('base64') });
    if (!r.ok) throw new Error(r.error);
  }

  waitForSerial(pattern: RegExp, timeoutMs: number): Promise<string | null> {
    return new Promise((resolve) => {
      const entry = {
        pattern,
        resolve,
        buf: '',
        timer: setTimeout(() => {
          this.serialWaiters = this.serialWaiters.filter((w) => w !== entry);
          resolve(null);
        }, timeoutMs),
      };
      this.serialWaiters.push(entry);
    });
  }

  private onSerialChunk(bytes: Buffer): void {
    this.serialData.fire(bytes);
    const text = this.decoder.decode(bytes, { stream: true });
    for (const w of Array.from(this.serialWaiters)) {
      w.buf += text;
      if (w.buf.length > 65536) w.buf = w.buf.slice(-32768);
      const m = w.pattern.exec(w.buf);
      if (m) {
        clearTimeout(w.timer);
        this.serialWaiters = this.serialWaiters.filter((x) => x !== w);
        w.resolve(m[0]);
      }
    }
    this.lineBuf += text;
    let nl: number;
    while ((nl = this.lineBuf.indexOf('\n')) >= 0) {
      const line = this.lineBuf.slice(0, nl).replace(/\r$/, '');
      this.lineBuf = this.lineBuf.slice(nl + 1);
      this.serialLine.fire(line);
    }
    if (this.lineBuf.length > 4096) {
      this.serialLine.fire(this.lineBuf);
      this.lineBuf = '';
    }
  }

  private onProbeEvent(e: ProbeEvent): void {
    switch (e.type) {
      case 'usb-connect':
      case 'usb-disconnect':
        this.applyProbeStatus(e.status);
        if (e.type === 'usb-disconnect') this.events.fire({ type: 'debug-end', detail: { reason: 'usb-disconnect' } });
        break;
      case 'serial-open':
        this.update({ serialOpen: true });
        break;
      case 'serial-close':
        this.update({ serialOpen: false });
        if (e.error) this.log.warn(`serial closed: ${e.error}`);
        break;
      case 'serial-data':
        this.onSerialChunk(Buffer.from(e.data, 'base64'));
        break;
      case 'halted':
        this.update({ core: 'halted' });
        this.events.fire({ type: 'debug-stop', detail: { reason: e.reason, pc: e.pc } });
        break;
      case 'flash-progress':
        this.flashProgress.fire({ phase: e.phase, done: e.done, total: e.total });
        break;
      case 'log':
        this.log[e.level](`[probe] ${e.message}`);
        break;
    }
  }
}
