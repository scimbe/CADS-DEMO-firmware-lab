/* mock-stlink.ts – a simulated ST-Link/V2-1 + STM32F429 behind a WebUSB-shaped device.
 *
 * Enough of the protocol to exercise the whole driver without hardware: version/voltage/mode,
 * SWD enter, debug register + memory access (flash/RAM/CCM/system regs), core registers, halt/run/
 * step/reset semantics in DHCSR/DEMCR/AIRCR/DFSR, FPB/DWT registers, the FLASH controller
 * (unlock, sector erase, PG programming with AND semantics, BSY, error flags) and a "run for a
 * while then hit a breakpoint" behaviour for the poller.
 */
import type { UsbDeviceLike } from '../src/driver/stlinkusb';

const FLASH_BASE = 0x08000000;
const FLASH_SIZE = 0x100000; // bank 1
const RAM_BASE = 0x20000000;
const RAM_SIZE = 192 * 1024;
const CCM_BASE = 0x10000000;
const CCM_SIZE = 64 * 1024;

const DHCSR = 0xe000edf0;
const DCRSR = 0xe000edf4;
const DCRDR = 0xe000edf8;
const DEMCR = 0xe000edfc;
const AIRCR = 0xe000ed0c;
const DFSR = 0xe000ed30;
const CPUID = 0xe000ed00;
const FP_CTRL = 0xe0002000;
const FP_COMP0 = 0xe0002008;
const DWT_CTRL = 0xe0001000;
const FLASH_KEYR = 0x40023c04;
const FLASH_SR = 0x40023c0c;
const FLASH_CR = 0x40023c10;
const SECTORS = [16, 16, 16, 16, 64, 128, 128, 128, 128, 128, 128, 128].map((k) => k * 1024);

export class MockTarget {
  flash = new Uint8Array(FLASH_SIZE).fill(0xff);
  ram = new Uint8Array(RAM_SIZE);
  ccm = new Uint8Array(CCM_SIZE);
  regs: number[] = new Array<number>(21).fill(0);
  sysregs = new Map<number, number>();
  halted = false;
  debugEnabled = false;
  flashUnlocked = false;
  keyStage = 0;
  busyReads = 0;
  merEverSet = false;
  resetCount = 0;
  eraseLog: number[] = [];
  rwStatus = 0x80;
  /** When running, halt at this address after `runHaltAfterMs` (simulates a breakpoint hit). */
  breakpointHitAddr: number | null = null;
  runHaltAfterMs = 20;
  private runTimer: ReturnType<typeof setTimeout> | null = null;
  lastRequest: 'halt' | 'step' | 'reset' | 'run' | null = null;

  constructor() {
    this.sysregs.set(CPUID, 0x410fc241);
    this.sysregs.set(0xe0042000, 0x10036419);
    this.sysregs.set(FP_CTRL, 0x00000260); // rev 0, 6 code, 2 literal comparators
    this.sysregs.set(DWT_CTRL, 0x40000000); // 4 comparators
    this.sysregs.set(DEMCR, 0);
    this.sysregs.set(DFSR, 0);
    this.sysregs.set(FLASH_CR, 0x80000000);
    this.sysregs.set(FLASH_SR, 0);
    this.regs[13] = 0x20030000;
    this.regs[15] = 0x08000200;
    this.regs[16] = 0x01000000;
    this.regs[17] = 0x20030000;
    // vector table: initial SP + reset handler
    this.writeFlashWordRaw(0, 0x20030000);
    this.writeFlashWordRaw(4, 0x08000201);
  }

  private writeFlashWordRaw(off: number, v: number): void {
    this.flash[off] = v & 0xff;
    this.flash[off + 1] = (v >>> 8) & 0xff;
    this.flash[off + 2] = (v >>> 16) & 0xff;
    this.flash[off + 3] = (v >>> 24) & 0xff;
  }

  private region(addr: number): { buf: Uint8Array; off: number } | null {
    if (addr >= FLASH_BASE && addr < FLASH_BASE + FLASH_SIZE) return { buf: this.flash, off: addr - FLASH_BASE };
    if (addr >= RAM_BASE && addr < RAM_BASE + RAM_SIZE) return { buf: this.ram, off: addr - RAM_BASE };
    if (addr >= CCM_BASE && addr < CCM_BASE + CCM_SIZE) return { buf: this.ccm, off: addr - CCM_BASE };
    return null;
  }

  readByte(addr: number): number {
    const r = this.region(addr);
    if (r) return r.buf[r.off] as number;
    if (addr === 0x1fff7a22) return 0x00;
    if (addr === 0x1fff7a23) return 0x08; // 2048 KB
    const w = this.readWord(addr & ~3);
    return (w >>> ((addr & 3) * 8)) & 0xff;
  }

  writeByte(addr: number, v: number): void {
    const r = this.region(addr);
    if (!r) {
      this.rwStatus = 0x1d;
      return;
    }
    if (r.buf === this.flash) {
      if (!((this.sysregs.get(FLASH_CR) ?? 0) & 1)) {
        this.rwStatus = 0x1d;
        return;
      }
      r.buf[r.off] = (r.buf[r.off] as number) & v;
      return;
    }
    r.buf[r.off] = v;
  }

  readWord(addr: number): number {
    const r = this.region(addr);
    if (r) {
      return ((r.buf[r.off] as number) | ((r.buf[r.off + 1] as number) << 8) | ((r.buf[r.off + 2] as number) << 16) | ((r.buf[r.off + 3] as number) << 24)) >>> 0;
    }
    if (addr === 0x1fff7a20) return 0x08000000;
    switch (addr) {
      case DHCSR: {
        let v = 1 << 16; // S_REGRDY
        if (this.halted) v |= 1 << 17;
        if (this.debugEnabled) v |= 1;
        return v >>> 0;
      }
      case DCRDR:
        return this.sysregs.get(DCRDR) ?? 0;
      case FLASH_SR: {
        let v = this.sysregs.get(FLASH_SR) ?? 0;
        if (this.busyReads > 0) {
          this.busyReads--;
          v |= 1 << 16;
        }
        return v >>> 0;
      }
      default:
        if (this.sysregs.has(addr)) return this.sysregs.get(addr)!;
        if (addr >= 0xe0000000 && addr < 0xe0100000) return 0;
        this.rwStatus = 0x1d;
        return 0;
    }
  }

  writeWord(addr: number, v: number): void {
    v >>>= 0;
    const r = this.region(addr);
    if (r) {
      for (let i = 0; i < 4; i++) this.writeByte(addr + i, (v >>> (i * 8)) & 0xff);
      return;
    }
    switch (addr) {
      case DHCSR: {
        if ((v >>> 16) !== 0xa05f) return;
        this.debugEnabled = (v & 1) !== 0;
        if (v & 2) {
          this.halted = true;
          this.stopRun();
          if (this.lastRequest !== 'step') this.lastRequest = 'halt';
          this.sysregs.set(DFSR, (this.sysregs.get(DFSR) ?? 0) | 1);
        } else if (v & 4) {
          // step
          this.halted = true;
          this.regs[15] = ((this.regs[15] as number) + 2) >>> 0;
          this.sysregs.set(DFSR, (this.sysregs.get(DFSR) ?? 0) | 1);
          this.lastRequest = 'step';
        } else {
          this.halted = false;
          this.lastRequest = 'run';
          this.startRun();
        }
        return;
      }
      case DCRSR: {
        const sel = v & 0x7f;
        const write = (v & (1 << 16)) !== 0;
        const idx = sel <= 15 ? sel : sel === 0x10 ? 16 : sel === 0x11 ? 17 : sel === 0x12 ? 18 : sel === 0x14 ? 19 : -1;
        if (idx < 0) return;
        if (write) this.regs[idx] = this.sysregs.get(DCRDR) ?? 0;
        else this.sysregs.set(DCRDR, this.regs[idx] as number);
        return;
      }
      case DCRDR:
        this.sysregs.set(DCRDR, v);
        return;
      case DFSR:
        this.sysregs.set(DFSR, (this.sysregs.get(DFSR) ?? 0) & ~v);
        return;
      case AIRCR: {
        if ((v >>> 16) === 0x05fa && v & 4) this.doReset();
        return;
      }
      case FLASH_KEYR: {
        if (this.keyStage === 0 && v === 0x45670123) this.keyStage = 1;
        else if (this.keyStage === 1 && v === 0xcdef89ab) {
          this.keyStage = 0;
          this.flashUnlocked = true;
          this.sysregs.set(FLASH_CR, (this.sysregs.get(FLASH_CR) ?? 0) & 0x7fffffff);
        } else this.keyStage = 0;
        return;
      }
      case FLASH_SR:
        this.sysregs.set(FLASH_SR, (this.sysregs.get(FLASH_SR) ?? 0) & ~v & 0xffff);
        return;
      case FLASH_CR: {
        if (!this.flashUnlocked) {
          this.sysregs.set(FLASH_CR, 0x80000000);
          return;
        }
        if (v & 0x80000000) {
          this.flashUnlocked = false;
          this.sysregs.set(FLASH_CR, 0x80000000);
          return;
        }
        if (v & 4) this.merEverSet = true;
        if (v & 0x10000 && v & 2) {
          const snb = (v >>> 3) & 0x1f;
          if (snb < SECTORS.length) {
            let start = 0;
            for (let i = 0; i < snb; i++) start += SECTORS[i] as number;
            this.flash.fill(0xff, start, start + (SECTORS[snb] as number));
            this.eraseLog.push(snb);
            this.busyReads = 3;
          }
          v &= ~0x10000;
        }
        this.sysregs.set(FLASH_CR, v);
        return;
      }
      default:
        if (addr >= FP_COMP0 && addr < FP_COMP0 + 4 * 8) {
          this.sysregs.set(addr, v);
          return;
        }
        if (addr === FP_CTRL) {
          this.sysregs.set(FP_CTRL, (0x00000260 | (v & 1)) >>> 0);
          return;
        }
        if (addr >= 0xe0000000 && addr < 0xe0100000) {
          this.sysregs.set(addr, v);
          return;
        }
        this.rwStatus = 0x1d;
    }
  }

  private doReset(): void {
    this.resetCount++;
    this.stopRun();
    this.regs.fill(0);
    this.regs[13] = this.readWord(FLASH_BASE);
    this.regs[17] = this.regs[13] as number;
    this.regs[15] = (this.readWord(FLASH_BASE + 4) & ~1) >>> 0;
    this.regs[14] = 0xffffffff;
    this.flashUnlocked = false;
    this.sysregs.set(FLASH_CR, 0x80000000);
    const demcr = this.sysregs.get(DEMCR) ?? 0;
    if (demcr & 1) {
      this.halted = true;
      this.sysregs.set(DFSR, (this.sysregs.get(DFSR) ?? 0) | 8);
    } else {
      this.halted = false;
      this.startRun();
    }
  }

  private startRun(): void {
    this.stopRun();
    const comps: number[] = [];
    for (let i = 0; i < 6; i++) {
      const c = this.sysregs.get(FP_COMP0 + 4 * i) ?? 0;
      if (c & 1) comps.push((c & 0x1ffffffc) | (c & 0x80000000 ? 2 : 0));
    }
    const hit = this.breakpointHitAddr ?? comps[0] ?? null;
    if (hit === null) return;
    this.runTimer = setTimeout(() => {
      this.runTimer = null;
      this.halted = true;
      this.regs[15] = hit >>> 0;
      this.sysregs.set(DFSR, (this.sysregs.get(DFSR) ?? 0) | 2);
    }, this.runHaltAfterMs);
  }

  private stopRun(): void {
    if (this.runTimer) {
      clearTimeout(this.runTimer);
      this.runTimer = null;
    }
  }

  dispose(): void {
    this.stopRun();
  }
}

export interface MockDeviceOptions {
  hangOnTransferIn?: boolean;
  disconnectAfterTransfers?: number;
  /** Throw this from open(), to model "something else holds the device". */
  failOpenWith?: Error;
  /**
   * Report a dead target (core id 0) until this many SWD entries have happened – models the
   * desynchronised ST-Link that a connect-under-reset repairs.
   */
  deadUntilSwdEntry?: number;
}

/** WebUSB-shaped ST-Link V2-1 wrapping a MockTarget. */
export class MockStlinkDevice implements UsbDeviceLike {
  readonly vendorId = 0x0483;
  readonly productId = 0x374b;
  readonly serialNumber = 'MOCK0001';
  readonly productName = 'STM32 STLink (mock)';
  opened = false;
  claimed = false;
  configuration: UsbDeviceLike['configuration'] = null;
  transfers = 0;
  mode = 0x01; // mass storage mode initially
  private pendingReply: Uint8Array | null = null;
  private expectData: { kind: 'mem32' | 'mem8'; addr: number; len: number } | null = null;
  disconnected = false;

  constructor(
    readonly target: MockTarget,
    readonly opts: MockDeviceOptions = {},
  ) {}

  /** False while the mock pretends the SWD state machine is out of step. */
  targetAlive(): boolean {
    return this.swdEntries >= (this.opts.deadUntilSwdEntry ?? 0);
  }

  /** Counts STLINK_DEBUG_APIV2_ENTER (SWD) commands – the recovery path re-enters. */
  swdEntries = 0;

  async open(): Promise<void> {
    if (this.opts.failOpenWith) throw this.opts.failOpenWith;
    if (this.disconnected) throw new Error('The device was disconnected.');
    this.opened = true;
    this.configuration = { configurationValue: 1, interfaces: [{ interfaceNumber: 0, claimed: this.claimed, alternate: { alternateSetting: 0 } }] };
  }
  async close(): Promise<void> {
    this.opened = false;
    this.claimed = false;
  }
  async selectConfiguration(): Promise<void> {
    // fixed
  }
  async claimInterface(): Promise<void> {
    this.claimed = true;
    this.configuration = { configurationValue: 1, interfaces: [{ interfaceNumber: 0, claimed: true, alternate: { alternateSetting: 0 } }] };
  }
  async releaseInterface(): Promise<void> {
    this.claimed = false;
  }
  async selectAlternateInterface(): Promise<void> {
    // fixed
  }

  private reply(bytes: number[] | Uint8Array): void {
    this.pendingReply = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
  }

  private u32(v: number): number[] {
    return [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];
  }

  private checkAlive(): void {
    this.transfers++;
    if (this.disconnected) throw new Error('The device was disconnected.');
    if (this.opts.disconnectAfterTransfers !== undefined && this.transfers > this.opts.disconnectAfterTransfers) {
      this.disconnected = true;
      throw new Error('The device was disconnected.');
    }
  }

  async transferOut(_endpoint: number, data: Uint8Array): Promise<{ status?: string; bytesWritten: number }> {
    this.checkAlive();
    if (!this.opened || !this.claimed) throw new Error('InvalidStateError: interface not claimed');
    const t = this.target;
    if (this.expectData) {
      const { kind, addr, len } = this.expectData;
      this.expectData = null;
      t.rwStatus = 0x80;
      if (kind === 'mem32') {
        for (let i = 0; i < len; i += 4) {
          const v = ((data[i] as number) | ((data[i + 1] as number) << 8) | ((data[i + 2] as number) << 16) | ((data[i + 3] as number) << 24)) >>> 0;
          t.writeWord(addr + i, v);
        }
      } else {
        for (let i = 0; i < len; i++) t.writeByte(addr + i, data[i] as number);
      }
      return { status: 'ok', bytesWritten: data.length };
    }
    const cmd = data[0] as number;
    const sub = data[1] as number;
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    switch (cmd) {
      case 0xf1:
        this.reply([0x28, 0x59, 0x83, 0x04, 0x4b, 0x37]);
        break;
      case 0xf5:
        this.reply([this.mode, 0]);
        break;
      case 0xf7:
        this.reply([...this.u32(1200), ...this.u32(1650)]);
        break;
      case 0xf3:
        this.mode = 0x02;
        break;
      case 0xf2:
        switch (sub) {
          case 0x21:
            this.mode = 0x01;
            break;
          case 0x30:
            this.mode = 0x02;
            this.swdEntries++;
            this.reply([0x80, 0]);
            break;
          case 0x22:
            this.reply(this.u32(this.targetAlive() ? 0x2ba01477 : 0));
            break;
          case 0x43:
          case 0x32:
          case 0x3c:
            this.reply([0x80, 0]);
            break;
          case 0x36: {
            const addr = view.getUint32(2, true);
            t.rwStatus = 0x80;
            this.reply([0x80, 0, 0, 0, ...this.u32(t.readWord(addr))]);
            break;
          }
          case 0x35: {
            const addr = view.getUint32(2, true);
            const val = view.getUint32(6, true);
            t.rwStatus = 0x80;
            t.writeWord(addr, val);
            this.reply([0x80, 0]);
            break;
          }
          case 0x33: {
            const idx = data[2] as number;
            this.reply([0x80, 0, 0, 0, ...this.u32(t.regs[idx] ?? 0)]);
            break;
          }
          case 0x34: {
            const idx = data[2] as number;
            t.regs[idx] = view.getUint32(3, true);
            this.reply([0x80, 0]);
            break;
          }
          case 0x3a: {
            const out = [0x80, 0, 0, 0];
            for (let i = 0; i < 21; i++) out.push(...this.u32(t.regs[i] ?? 0));
            this.reply(out);
            break;
          }
          case 0x3b:
            this.reply([t.rwStatus, 0]);
            break;
          case 0x3e:
            this.reply([t.rwStatus, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
            break;
          case 0x07: {
            const addr = view.getUint32(2, true);
            const len = view.getUint32(6, true);
            t.rwStatus = 0x80;
            const out: number[] = [];
            for (let i = 0; i < len; i += 4) out.push(...this.u32(t.readWord(addr + i)));
            this.reply(out);
            break;
          }
          case 0x0c: {
            const addr = view.getUint32(2, true);
            const len = view.getUint32(6, true);
            t.rwStatus = 0x80;
            const out: number[] = [];
            for (let i = 0; i < len; i++) out.push(t.readByte(addr + i));
            this.reply(out);
            break;
          }
          case 0x08:
            this.expectData = { kind: 'mem32', addr: view.getUint32(2, true), len: view.getUint32(6, true) };
            break;
          case 0x0d:
            this.expectData = { kind: 'mem8', addr: view.getUint32(2, true), len: view.getUint32(6, true) };
            break;
          default:
            throw new Error(`mock: unsupported debug command 0x${sub.toString(16)}`);
        }
        break;
      default:
        throw new Error(`mock: unsupported command 0x${cmd.toString(16)}`);
    }
    return { status: 'ok', bytesWritten: data.length };
  }

  async transferIn(_endpoint: number, length: number): Promise<{ status?: string; data?: DataView }> {
    this.checkAlive();
    if (this.opts.hangOnTransferIn) return new Promise(() => undefined);
    const r = this.pendingReply ?? new Uint8Array(0);
    this.pendingReply = null;
    const out = new Uint8Array(Math.max(length, r.length));
    out.set(r);
    return { status: 'ok', data: new DataView(out.buffer, 0, Math.min(out.length, Math.max(length, r.length))) };
  }
}

/** Minimal WebSerial-shaped port backed by two queues. */
export class MockSerialPort {
  written: Uint8Array[] = [];
  private controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  readable: ReadableStream<Uint8Array> | null = null;
  writable: WritableStream<Uint8Array> | null = null;
  openCount = 0;
  closeCount = 0;

  getInfo(): { usbVendorId?: number; usbProductId?: number } {
    return { usbVendorId: 0x0483, usbProductId: 0x374b };
  }

  async open(): Promise<void> {
    this.openCount++;
    this.readable = new ReadableStream<Uint8Array>({
      start: (c) => {
        this.controller = c;
      },
      cancel: () => {
        this.controller = null;
      },
    });
    this.writable = new WritableStream<Uint8Array>({
      write: (chunk) => {
        this.written.push(chunk);
      },
    });
  }

  /** Simulate bytes arriving from the board. */
  push(bytes: Uint8Array): void {
    this.controller?.enqueue(bytes);
  }

  /** Simulate the cable being pulled. */
  fail(message = 'The device has been lost.'): void {
    this.controller?.error(new Error(message));
    this.controller = null;
  }

  async close(): Promise<void> {
    this.closeCount++;
    this.readable = null;
    this.writable = null;
  }
}
