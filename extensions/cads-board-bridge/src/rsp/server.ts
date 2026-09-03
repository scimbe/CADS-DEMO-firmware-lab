/* server.ts – GDB Remote Serial Protocol server on top of the probe (spec §3.2).
 *
 * Pure: no `net`, no `vscode`. A GdbSession is fed bytes and writes replies through an
 * RspConnection; the caller wires it to a TCP socket. All probe calls are serialised by the
 * probe client itself. Memory reads are cached while the core is halted (flash/RAM/CCM only).
 */
import type { ProbeEvent, ProbeOp, ProbeResult } from '../types';
import { PacketParser, encodePacket, hexDecode, hexEncode, hexToReg, parseHexInt, regToHex } from './packet';

export interface RspConnection {
  write(data: Buffer): void;
  end(): void;
}

export interface GdbProbe {
  op(request: ProbeOp): Promise<ProbeResult>;
  batch(requests: ProbeOp[]): Promise<ProbeResult[]>;
  onEvent(cb: (e: ProbeEvent) => void): { dispose(): void };
}

export interface GdbLogger {
  info(m: string): void;
  warn(m: string): void;
  debug(m: string): void;
}

export interface GdbServerHooks {
  onSessionStart?(): void;
  onSessionEnd?(): void;
  onStop?(reason: string, pc: number): void;
  onResume?(): void;
  onFlash?(addr: number, bytes: number, ok: boolean, error?: string): void;
  onError?(message: string): void;
}

export interface MemoryRegion {
  type: 'ram' | 'flash';
  start: number;
  length: number;
  blocksize?: number;
}

/** STM32F429ZI (cads-zero window: bank 1 only). */
export const DEFAULT_MEMORY_MAP: MemoryRegion[] = [
  // Bank-1 flash (the only writable window); sector sizes drive vFlashErase blocks.
  { type: 'flash', start: 0x08000000, length: 0x10000, blocksize: 0x4000 },
  { type: 'flash', start: 0x08010000, length: 0x10000, blocksize: 0x10000 },
  { type: 'flash', start: 0x08020000, length: 0xe0000, blocksize: 0x20000 },
  { type: 'ram', start: 0x20000000, length: 0x30000 }, // SRAM1+2+3 192K
  { type: 'ram', start: 0x10000000, length: 0x10000 }, // CCM 64K
  // Listed as ram so GDB permits reads/writes (mem-inaccessible-by-default is on when a map is
  // provided): SVD peripherals and the debug/SCS region for cortex-debug's register & peripheral views.
  { type: 'ram', start: 0x40000000, length: 0x20000000 }, // APB/AHB peripherals
  { type: 'ram', start: 0xe0000000, length: 0x00100000 }, // PPB: SCS, DWT, FPB, ITM
];

export const FLASH_WINDOW = { start: 0x08000000, end: 0x08100000 };

export const TARGET_XML = `<?xml version="1.0"?>
<!DOCTYPE target SYSTEM "gdb-target.dtd">
<target version="1.0">
  <architecture>arm</architecture>
  <feature name="org.gnu.gdb.arm.m-profile">
    <reg name="r0" bitsize="32" regnum="0"/>
    <reg name="r1" bitsize="32"/>
    <reg name="r2" bitsize="32"/>
    <reg name="r3" bitsize="32"/>
    <reg name="r4" bitsize="32"/>
    <reg name="r5" bitsize="32"/>
    <reg name="r6" bitsize="32"/>
    <reg name="r7" bitsize="32"/>
    <reg name="r8" bitsize="32"/>
    <reg name="r9" bitsize="32"/>
    <reg name="r10" bitsize="32"/>
    <reg name="r11" bitsize="32"/>
    <reg name="r12" bitsize="32"/>
    <reg name="sp" bitsize="32" type="data_ptr"/>
    <reg name="lr" bitsize="32"/>
    <reg name="pc" bitsize="32" type="code_ptr"/>
    <reg name="xpsr" bitsize="32" regnum="16"/>
  </feature>
  <feature name="org.gnu.gdb.arm.m-system">
    <reg name="msp" bitsize="32" regnum="17" type="data_ptr"/>
    <reg name="psp" bitsize="32" regnum="18" type="data_ptr"/>
    <reg name="primask" bitsize="32" regnum="19"/>
    <reg name="basepri" bitsize="32" regnum="20"/>
    <reg name="faultmask" bitsize="32" regnum="21"/>
    <reg name="control" bitsize="32" regnum="22"/>
  </feature>
</target>
`;

export function memoryMapXml(regions: MemoryRegion[]): string {
  const items = regions
    .map((r) => {
      const attrs = `type="${r.type}" start="0x${r.start.toString(16)}" length="0x${r.length.toString(16)}"`;
      return r.type === 'flash'
        ? `  <memory ${attrs}>\n    <property name="blocksize">0x${(r.blocksize ?? 0x4000).toString(16)}</property>\n  </memory>`
        : `  <memory ${attrs}/>`;
    })
    .join('\n');
  return `<?xml version="1.0"?>\n<!DOCTYPE memory-map PUBLIC "+//IDN gnu.org//DTD GDB Memory Map V1.0//EN" "http://sourceware.org/gdb/gdb-memory-map.dtd">\n<memory-map>\n${items}\n</memory-map>\n`;
}

const REG_COUNT = 23;
const SIG_TRAP = '05';
const SIG_INT = '02';
const SIG_SEGV = '0b';
const PAGE = 512;

function isCacheable(addr: number): boolean {
  return (addr >= 0x08000000 && addr < 0x08200000) || (addr >= 0x20000000 && addr < 0x20040000) || (addr >= 0x10000000 && addr < 0x10010000);
}

export interface GdbServerOptions {
  probe: GdbProbe;
  log: GdbLogger;
  hooks?: GdbServerHooks;
  memoryMap?: MemoryRegion[];
  /** Called with monitor command text; return output lines or undefined if unknown. */
  monitor?: (cmd: string) => Promise<string[] | undefined>;
}

/** One GDB client connection. */
export class GdbSession {
  private readonly parser = new PacketParser();
  private noAck = false;
  private running = false;
  private interruptPending = false;
  private memCache = new Map<number, Buffer>();
  private flashChunks: { addr: number; data: Buffer }[] = [];
  private flashErased: { addr: number; len: number }[] = [];
  private eventSub: { dispose(): void };
  private closed = false;
  private queue: Promise<void> = Promise.resolve();
  private readonly memoryMap: MemoryRegion[];
  private lastStop: { reason: string; pc: number } | null = null;

  constructor(
    private readonly conn: RspConnection,
    private readonly opts: GdbServerOptions,
  ) {
    this.memoryMap = opts.memoryMap ?? DEFAULT_MEMORY_MAP;
    this.eventSub = opts.probe.onEvent((e) => this.onProbeEvent(e));
  }

  /** Attach: halt the target, drop stale breakpoints, arm vector catch. */
  async start(): Promise<void> {
    this.opts.hooks?.onSessionStart?.();
    const results = await this.opts.probe.batch([{ op: 'halt' }, { op: 'clearAllBreakpoints' }, { op: 'setVectorCatch', enabled: true }]);
    const halt = results[0];
    if (halt?.ok) this.lastStop = { reason: String(halt.reason ?? 'halt'), pc: Number(halt.pc ?? 0) };
    else this.opts.log.warn(`attach: ${halt ? (halt as { error: string }).error : 'no result'}`);
  }

  feed(data: Buffer): void {
    for (const item of this.parser.feed(data)) {
      if (item.kind === 'interrupt') {
        this.enqueue(() => this.interrupt());
      } else if (item.kind === 'packet') {
        if (!item.checksumOk) {
          if (!this.noAck) this.conn.write(Buffer.from('-'));
          continue;
        }
        if (!this.noAck) this.conn.write(Buffer.from('+'));
        const payload = item.payload;
        this.enqueue(() => this.handle(payload));
      }
      // acks/nacks from GDB are ignored (we never retransmit)
    }
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.eventSub.dispose();
    this.opts.hooks?.onSessionEnd?.();
  }

  /** Detach semantics: remove breakpoints, vector catch off, let the firmware run. */
  async releaseTarget(resume: boolean): Promise<void> {
    const ops: ProbeOp[] = [{ op: 'clearAllBreakpoints' }, { op: 'setVectorCatch', enabled: false }];
    if (resume) ops.push({ op: 'run' });
    await this.opts.probe.batch(ops);
  }

  private enqueue(fn: () => Promise<void>): void {
    this.queue = this.queue.then(fn).catch((e) => {
      this.opts.log.warn(`rsp handler error: ${e instanceof Error ? e.message : String(e)}`);
      this.opts.hooks?.onError?.(e instanceof Error ? e.message : String(e));
    });
  }

  private send(payload: Buffer | string): void {
    if (this.closed) return;
    this.conn.write(encodePacket(payload));
  }

  private invalidate(): void {
    this.memCache.clear();
  }

  private onProbeEvent(e: ProbeEvent): void {
    if (e.type === 'halted' && this.running) {
      this.running = false;
      this.invalidate();
      this.lastStop = { reason: e.reason, pc: e.pc };
      this.sendStopReply(e.reason, e.pc);
    } else if (e.type === 'usb-disconnect' && this.running) {
      this.running = false;
      this.send('X0f');
    }
  }

  private sendStopReply(reason: string, pc: number): void {
    let sig = SIG_TRAP;
    let extra = '';
    if (reason === 'breakpoint') extra = 'hwbreak:;';
    else if (reason === 'watchpoint') extra = '';
    else if (reason === 'fault') sig = SIG_SEGV;
    else if (this.interruptPending) sig = SIG_INT;
    this.interruptPending = false;
    this.opts.hooks?.onStop?.(reason, pc);
    this.send(`T${sig}thread:1;${extra}`);
  }

  private async interrupt(): Promise<void> {
    if (!this.running) return;
    this.interruptPending = true;
    const r = await this.opts.probe.op({ op: 'halt' });
    if (r.ok) {
      this.running = false;
      this.invalidate();
      this.lastStop = { reason: 'halt', pc: Number(r.pc ?? 0) };
      this.sendStopReply('halt', Number(r.pc ?? 0));
    } else {
      this.opts.log.warn(`interrupt: ${(r as { error: string }).error}`);
    }
  }

  private fail(context: string, r: ProbeResult): void {
    const msg = r.ok ? 'unknown' : r.error;
    this.opts.log.warn(`${context}: ${msg}`);
    this.opts.hooks?.onError?.(`${context}: ${msg}`);
    this.send('E01');
  }

  private async handle(payload: Buffer): Promise<void> {
    const text = payload.toString('latin1');
    const c = text[0] ?? '';
    this.opts.log.debug(`< ${text.length > 80 ? text.slice(0, 80) + '…' : text}`);
    switch (c) {
      case '!':
        return this.send('OK');
      case '?':
        return this.send(`T${SIG_TRAP}thread:1;`);
      case 'H':
        return this.send('OK');
      case 'T':
        return this.send('OK');
      case 'q':
        return this.handleQuery(text, payload);
      case 'Q':
        if (text === 'QStartNoAckMode') {
          this.noAck = true;
          return this.send('OK');
        }
        return this.send('');
      case 'v':
        return this.handleV(text, payload);
      case 'g':
        return this.readAllRegs();
      case 'G':
        return this.writeAllRegs(text.slice(1));
      case 'p':
        return this.readReg(parseHexInt(text.slice(1)));
      case 'P': {
        const [idx, val] = text.slice(1).split('=');
        return this.writeReg(parseHexInt(idx ?? '0'), hexToReg(val ?? '0'));
      }
      case 'm': {
        const [a, l] = text.slice(1).split(',');
        return this.readMem(parseHexInt(a ?? '0'), parseHexInt(l ?? '0'));
      }
      case 'M': {
        const [addrLen, hex] = text.slice(1).split(':');
        const [a, l] = (addrLen ?? '').split(',');
        const data = hexDecode(hex ?? '');
        return this.writeMem(parseHexInt(a ?? '0'), data.subarray(0, parseHexInt(l ?? '0')));
      }
      case 'X': {
        const colon = payload.indexOf(0x3a);
        const head = payload.subarray(1, colon).toString('latin1');
        const [a, l] = head.split(',');
        const len = parseHexInt(l ?? '0');
        const data = payload.subarray(colon + 1, colon + 1 + len);
        if (len === 0) return this.send('OK'); // probe for X support
        return this.writeMem(parseHexInt(a ?? '0'), data);
      }
      case 'c':
        return this.resume();
      case 's':
        return this.step();
      case 'Z':
      case 'z':
        return this.breakpoint(text);
      case 'k':
        await this.releaseTarget(false);
        await this.opts.probe.op({ op: 'resetRun' });
        this.close();
        this.conn.end();
        return;
      case 'D':
        await this.releaseTarget(true);
        this.send('OK');
        this.close();
        this.conn.end();
        return;
      default:
        return this.send('');
    }
  }

  private async handleQuery(text: string, _payload: Buffer): Promise<void> {
    if (text.startsWith('qSupported')) {
      return this.send('PacketSize=4000;QStartNoAckMode+;qXfer:features:read+;qXfer:memory-map:read+;vContSupported+;swbreak+;hwbreak+;multiprocess-');
    }
    if (text === 'qAttached' || text.startsWith('qAttached:')) return this.send('1');
    if (text === 'qC') return this.send('QC1');
    if (text === 'qfThreadInfo') return this.send('m1');
    if (text === 'qsThreadInfo') return this.send('l');
    if (text.startsWith('qThreadExtraInfo')) return this.send(hexEncode(Buffer.from('Cortex-M4 (halted)')));
    if (text === 'qOffsets') return this.send('');
    if (text === 'qSymbol::') return this.send('OK');
    if (text.startsWith('qXfer:features:read:target.xml:')) return this.sendXfer(TARGET_XML, text.slice('qXfer:features:read:target.xml:'.length));
    if (text.startsWith('qXfer:memory-map:read::')) return this.sendXfer(memoryMapXml(this.memoryMap), text.slice('qXfer:memory-map:read::'.length));
    if (text.startsWith('qRcmd,')) return this.monitor(hexDecode(text.slice(6)).toString('utf8'));
    return this.send('');
  }

  private sendXfer(doc: string, range: string): void {
    const [o, l] = range.split(',');
    const off = parseHexInt(o ?? '0');
    const len = parseHexInt(l ?? '0');
    const buf = Buffer.from(doc, 'utf8');
    const chunk = buf.subarray(off, off + len);
    const last = off + chunk.length >= buf.length;
    this.send(Buffer.concat([Buffer.from(last ? 'l' : 'm'), chunk]));
  }

  private async monitor(cmd: string): Promise<void> {
    const c = cmd.trim().toLowerCase();
    const say = (lines: string[]): void => {
      for (const line of lines) this.send(`O${hexEncode(Buffer.from(line + '\n'))}`);
    };
    if (c === 'reset halt' || c === 'reset init') {
      const r = await this.opts.probe.op({ op: 'resetHalt' });
      this.invalidate();
      this.running = false;
      if (!r.ok) return this.fail('monitor reset halt', r);
      this.lastStop = { reason: 'reset', pc: Number(r.pc ?? 0) };
      say([`target halted after reset, pc=0x${Number(r.pc ?? 0).toString(16).padStart(8, '0')}`]);
      return this.send('OK');
    }
    if (c === 'reset' || c === 'reset run') {
      const r = await this.opts.probe.op({ op: 'resetRun' });
      this.invalidate();
      if (!r.ok) return this.fail('monitor reset', r);
      // Keep the RSP state coherent: GDB believes the target is stopped after a monitor
      // command, so halt it again right away (a bare `monitor reset` is used by some launch
      // configs before `continue`).
      const h = await this.opts.probe.op({ op: 'halt' });
      this.running = false;
      if (h.ok) this.lastStop = { reason: 'halt', pc: Number(h.pc ?? 0) };
      say(['target reset']);
      return this.send('OK');
    }
    if (c === 'halt') {
      const r = await this.opts.probe.op({ op: 'halt' });
      this.invalidate();
      this.running = false;
      if (!r.ok) return this.fail('monitor halt', r);
      say([`target halted, pc=0x${Number(r.pc ?? 0).toString(16).padStart(8, '0')}`]);
      return this.send('OK');
    }
    if (this.opts.monitor) {
      const out = await this.opts.monitor(cmd);
      if (out) {
        say(out);
        return this.send('OK');
      }
    }
    say([`unknown monitor command '${cmd}' (known: reset, reset halt, halt)`]);
    return this.send('OK');
  }

  private async handleV(text: string, payload: Buffer): Promise<void> {
    if (text === 'vCont?') return this.send('vCont;c;C;s;S');
    if (text.startsWith('vCont;')) {
      const actions = text.slice(6).split(';');
      // one thread: the first action that applies decides
      const a = actions[0] ?? '';
      if (a.startsWith('s') || a.startsWith('S')) return this.step();
      if (a.startsWith('c') || a.startsWith('C')) return this.resume();
      return this.send('E01');
    }
    if (text === 'vMustReplyEmpty') return this.send('');
    if (text.startsWith('vKill')) {
      await this.releaseTarget(true);
      return this.send('OK');
    }
    if (text.startsWith('vFlashErase:')) {
      const [a, l] = text.slice(12).split(',');
      const addr = parseHexInt(a ?? '0');
      const len = parseHexInt(l ?? '0');
      if (addr < FLASH_WINDOW.start || addr + len > FLASH_WINDOW.end) {
        this.opts.log.warn(`vFlashErase outside window: 0x${addr.toString(16)}+${len}`);
        return this.send('E01');
      }
      this.flashErased.push({ addr, len });
      return this.send('OK');
    }
    if (text.startsWith('vFlashWrite:')) {
      const colon = payload.indexOf(0x3a, 12);
      const addr = parseHexInt(payload.subarray(12, colon).toString('latin1'));
      const data = Buffer.from(payload.subarray(colon + 1));
      if (addr < FLASH_WINDOW.start || addr + data.length > FLASH_WINDOW.end) return this.send('E01');
      this.flashChunks.push({ addr, data });
      return this.send('OK');
    }
    if (text === 'vFlashDone') return this.flashDone();
    return this.send('');
  }

  private async flashDone(): Promise<void> {
    const chunks = this.flashChunks.sort((x, y) => x.addr - y.addr);
    this.flashChunks = [];
    this.flashErased = [];
    if (chunks.length === 0) return this.send('OK');
    // merge into contiguous images (gap-fill 0xff inside one erased run)
    const images: { addr: number; parts: Buffer[]; end: number }[] = [];
    for (const c of chunks) {
      const cur = images[images.length - 1];
      if (cur && c.addr >= cur.end && c.addr - cur.end < 0x4000) {
        if (c.addr > cur.end) cur.parts.push(Buffer.alloc(c.addr - cur.end, 0xff));
        cur.parts.push(c.data);
        cur.end = c.addr + c.data.length;
      } else {
        images.push({ addr: c.addr, parts: [c.data], end: c.addr + c.data.length });
      }
    }
    for (const img of images) {
      const data = Buffer.concat(img.parts);
      const r = await this.opts.probe.op({ op: 'flash', addr: img.addr, data: data.toString('base64'), verify: true });
      this.invalidate();
      this.running = false;
      this.opts.hooks?.onFlash?.(img.addr, data.length, r.ok, r.ok ? undefined : (r as { error: string }).error);
      if (!r.ok) return this.fail('vFlashDone', r);
      this.lastStop = { reason: 'reset', pc: Number(r.pc ?? 0) };
    }
    this.send('OK');
  }

  private async readAllRegs(): Promise<void> {
    const r = await this.opts.probe.op({ op: 'readRegs' });
    if (!r.ok) return this.fail('readRegs', r);
    const regs = r.regs as number[];
    this.send(regs.map(regToHex).join(''));
  }

  private async writeAllRegs(hex: string): Promise<void> {
    const ops: ProbeOp[] = [];
    for (let i = 0; i < REG_COUNT && hex.length >= (i + 1) * 8; i++) {
      ops.push({ op: 'writeReg', index: i, value: hexToReg(hex.slice(i * 8, i * 8 + 8)) });
    }
    const results = await this.opts.probe.batch(ops);
    const bad = results.find((x) => !x.ok);
    if (bad) return this.fail('writeRegs', bad);
    this.send('OK');
  }

  private async readReg(index: number): Promise<void> {
    if (index >= REG_COUNT) return this.send('E01');
    const r = await this.opts.probe.op({ op: 'readReg', index });
    if (!r.ok) return this.fail(`readReg ${index}`, r);
    this.send(regToHex(Number(r.value)));
  }

  private async writeReg(index: number, value: number): Promise<void> {
    if (index >= REG_COUNT) return this.send('E01');
    const r = await this.opts.probe.op({ op: 'writeReg', index, value });
    if (!r.ok) return this.fail(`writeReg ${index}`, r);
    this.invalidate();
    this.send('OK');
  }

  private async fetchMem(addr: number, len: number): Promise<Buffer | null> {
    if (len === 0) return Buffer.alloc(0);
    if (!isCacheable(addr) || !isCacheable(addr + len - 1) || len > PAGE * 4) {
      const r = await this.opts.probe.op({ op: 'readMem', addr, len });
      return r.ok ? Buffer.from(String(r.data), 'base64') : null;
    }
    const first = Math.floor(addr / PAGE) * PAGE;
    const last = Math.floor((addr + len - 1) / PAGE) * PAGE;
    const missing: ProbeOp[] = [];
    const missingPages: number[] = [];
    for (let p = first; p <= last; p += PAGE) {
      if (!this.memCache.has(p)) {
        missing.push({ op: 'readMem', addr: p, len: PAGE });
        missingPages.push(p);
      }
    }
    if (missing.length) {
      const results = await this.opts.probe.batch(missing);
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (!r?.ok) {
          // page read failed (e.g. end of a region): fall back to the exact request
          const exact = await this.opts.probe.op({ op: 'readMem', addr, len });
          return exact.ok ? Buffer.from(String(exact.data), 'base64') : null;
        }
        this.memCache.set(missingPages[i] as number, Buffer.from(String(r.data), 'base64'));
      }
    }
    const out = Buffer.alloc(len);
    let o = 0;
    for (let p = first; p <= last; p += PAGE) {
      const page = this.memCache.get(p) as Buffer;
      const s = Math.max(addr, p) - p;
      const e = Math.min(addr + len, p + PAGE) - p;
      page.copy(out, o, s, e);
      o += e - s;
    }
    return out;
  }

  private async readMem(addr: number, len: number): Promise<void> {
    const data = await this.fetchMem(addr, len);
    if (!data) return this.send('E01');
    this.send(hexEncode(data));
  }

  private async writeMem(addr: number, data: Buffer): Promise<void> {
    const r = await this.opts.probe.op({ op: 'writeMem', addr, data: data.toString('base64') });
    this.invalidate();
    if (!r.ok) return this.fail('writeMem', r);
    this.send('OK');
  }

  private async resume(): Promise<void> {
    this.invalidate();
    const r = await this.opts.probe.op({ op: 'run' });
    if (!r.ok) return this.fail('run', r);
    this.running = true;
    this.opts.hooks?.onResume?.();
    // reply comes with the 'halted' event
  }

  private async step(): Promise<void> {
    this.invalidate();
    const r = await this.opts.probe.op({ op: 'step' });
    if (!r.ok) return this.fail('step', r);
    this.lastStop = { reason: 'step', pc: Number(r.pc ?? 0) };
    this.sendStopReply(String(r.reason ?? 'step'), Number(r.pc ?? 0));
  }

  private async breakpoint(text: string): Promise<void> {
    const set = text[0] === 'Z';
    const [typeS, addrS, kindS] = text.slice(1).split(',');
    const type = Number(typeS);
    const addr = parseHexInt(addrS ?? '0');
    const kind = parseHexInt((kindS ?? '2').split(';')[0] ?? '2');
    let r: ProbeResult;
    if (type === 0 || type === 1) {
      r = set ? await this.opts.probe.op({ op: 'setBreakpoint', addr }) : await this.opts.probe.op({ op: 'clearBreakpoint', addr });
      if (set && type === 0) this.invalidate(); // sw breakpoints modify RAM
    } else if (type >= 2 && type <= 4) {
      const wkind = type === 2 ? 'write' : type === 3 ? 'read' : 'access';
      r = set ? await this.opts.probe.op({ op: 'setWatchpoint', addr, len: kind || 4, kind: wkind }) : await this.opts.probe.op({ op: 'clearWatchpoint', addr });
    } else {
      return this.send('');
    }
    if (!r.ok) {
      this.opts.log.warn(`${text}: ${r.error}`);
      return this.send('E01');
    }
    this.send('OK');
  }
}
