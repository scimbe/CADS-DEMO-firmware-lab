/* breakpoints.ts – Flash Patch and Breakpoint unit (FPB) + software breakpoints (BKPT in RAM),
 * Data Watchpoint and Trace unit (DWT) watchpoints. ARMv7-M, FPB v1 (Cortex-M3/M4) and v2 (M7).
 */

import { type CortexM, DEMCR, DEMCR_TRCENA } from './cortexm';
import { ProbeError } from './errors';
import { type Logger, nullLogger } from './logger';
import { hex32 } from './util';

const FP_CTRL = 0xe0002000;
const FP_COMP0 = 0xe0002008;
const FP_CTRL_ENABLE = 1 << 0;
const FP_CTRL_KEY = 1 << 1;

const DWT_CTRL = 0xe0001000;
const DWT_COMP0 = 0xe0001020;
const DWT_STRIDE = 0x10;
const DWT_FUNC_WRITE = 0x5;
const DWT_FUNC_READ = 0x6;
const DWT_FUNC_ACCESS = 0x7;

const BKPT_0 = 0xbe00;

export type WatchKind = 'read' | 'write' | 'access';

interface HwBreakpoint {
  addr: number;
}
interface SwBreakpoint {
  addr: number;
  original: number;
}
interface Watchpoint {
  addr: number;
  len: number;
  kind: WatchKind;
}

export class BreakpointUnit {
  private fpbRevision = 0;
  private numCode = 0;
  private numWatch = 0;
  private hw: (HwBreakpoint | null)[] = [];
  private sw = new Map<number, SwBreakpoint>();
  private wp: (Watchpoint | null)[] = [];
  private probed = false;

  constructor(
    private readonly core: CortexM,
    private readonly log: Logger = nullLogger,
  ) {}

  get hardwareSlots(): number {
    return this.numCode;
  }
  get watchpointSlots(): number {
    return this.numWatch;
  }

  /** Read FP_CTRL / DWT_CTRL once; enable the FPB. */
  async probe(): Promise<void> {
    const ctrl = await this.core.readWord(FP_CTRL);
    this.fpbRevision = (ctrl >>> 28) & 0xf;
    this.numCode = (((ctrl >>> 12) & 0x7) << 4) | ((ctrl >>> 4) & 0xf);
    const dwt = await this.core.readWord(DWT_CTRL);
    this.numWatch = (dwt >>> 28) & 0xf;
    if (this.hw.length !== this.numCode) this.hw = new Array<HwBreakpoint | null>(this.numCode).fill(null);
    if (this.wp.length !== this.numWatch) this.wp = new Array<Watchpoint | null>(this.numWatch).fill(null);
    this.probed = true;
    this.log.info(`FPB rev ${this.fpbRevision}, ${this.numCode} code comparators; DWT ${this.numWatch} comparators`);
    await this.core.writeWord(FP_CTRL, FP_CTRL_KEY | FP_CTRL_ENABLE);
  }

  private async ensureProbed(): Promise<void> {
    if (!this.probed) await this.probe();
  }

  private compValue(addr: number): number {
    if (this.fpbRevision === 0) {
      // v1: COMP[28:2] = addr[28:2], REPLACE[31:30] = 01 lower / 10 upper halfword, ENABLE bit0
      const replace = addr & 2 ? 0x80000000 : 0x40000000;
      return (replace | (addr & 0x1ffffffc) | 1) >>> 0;
    }
    // v2: [31:1] address, bit0 = enable
    return ((addr & 0xfffffffe) | 1) >>> 0;
  }

  /** FPB for code addresses (< 0x20000000, v1 restriction), BKPT instruction elsewhere. */
  async setBreakpoint(rawAddr: number): Promise<'hw' | 'sw'> {
    await this.ensureProbed();
    const addr = rawAddr & 0xfffffffe;
    const useHw = this.fpbRevision === 0 ? addr < 0x20000000 : true;
    if (useHw) {
      if (this.hw.some((b) => b?.addr === addr)) return 'hw';
      const slot = this.hw.findIndex((b) => b === null);
      if (slot < 0) throw new ProbeError(`no free hardware breakpoint (${this.numCode} in use)`, 'UNSUPPORTED');
      await this.core.writeWord(FP_COMP0 + 4 * slot, this.compValue(addr));
      this.hw[slot] = { addr };
      this.log.debug(`hw breakpoint ${slot} @0x${hex32(addr)}`);
      return 'hw';
    }
    if (this.sw.has(addr)) return 'sw';
    const original = await this.core.readHalfword(addr);
    const bytes = new Uint8Array([BKPT_0 & 0xff, BKPT_0 >> 8]);
    await this.core.writeMem(addr, bytes);
    this.sw.set(addr, { addr, original });
    this.log.debug(`sw breakpoint @0x${hex32(addr)} (orig 0x${original.toString(16)})`);
    return 'sw';
  }

  async clearBreakpoint(rawAddr: number): Promise<boolean> {
    await this.ensureProbed();
    const addr = rawAddr & 0xfffffffe;
    const slot = this.hw.findIndex((b) => b?.addr === addr);
    if (slot >= 0) {
      await this.core.writeWord(FP_COMP0 + 4 * slot, 0);
      this.hw[slot] = null;
      return true;
    }
    const sw = this.sw.get(addr);
    if (sw) {
      await this.core.writeMem(addr, new Uint8Array([sw.original & 0xff, sw.original >> 8]));
      this.sw.delete(addr);
      return true;
    }
    return false;
  }

  async setWatchpoint(addr: number, len: number, kind: WatchKind): Promise<void> {
    await this.ensureProbed();
    if (this.numWatch === 0) throw new ProbeError('target has no DWT comparators', 'UNSUPPORTED');
    if (len <= 0 || (len & (len - 1)) !== 0) throw new ProbeError('watchpoint length must be a power of two', 'UNSUPPORTED');
    if (addr % len) throw new ProbeError('watchpoint address must be aligned to its length', 'UNSUPPORTED');
    if (this.wp.some((w) => w?.addr === addr && w.len === len && w.kind === kind)) return;
    const slot = this.wp.findIndex((w) => w === null);
    if (slot < 0) throw new ProbeError(`no free watchpoint (${this.numWatch} in use)`, 'UNSUPPORTED');
    const demcr = await this.core.readWord(DEMCR);
    if (!(demcr & DEMCR_TRCENA)) await this.core.writeWord(DEMCR, demcr | DEMCR_TRCENA);
    const base = DWT_COMP0 + DWT_STRIDE * slot;
    const fn = kind === 'read' ? DWT_FUNC_READ : kind === 'write' ? DWT_FUNC_WRITE : DWT_FUNC_ACCESS;
    await this.core.writeWord(base + 8, 0);
    await this.core.writeWord(base, addr >>> 0);
    await this.core.writeWord(base + 4, Math.log2(len));
    await this.core.writeWord(base + 8, fn);
    this.wp[slot] = { addr, len, kind };
    this.log.debug(`watchpoint ${slot} ${kind} @0x${hex32(addr)} len ${len}`);
  }

  async clearWatchpoint(addr: number): Promise<boolean> {
    await this.ensureProbed();
    const slot = this.wp.findIndex((w) => w?.addr === addr);
    if (slot < 0) return false;
    await this.core.writeWord(DWT_COMP0 + DWT_STRIDE * slot + 8, 0);
    this.wp[slot] = null;
    return true;
  }

  /** Remove everything (GDB detach / disconnect). Restores RAM breakpoints. */
  async clearAll(): Promise<void> {
    if (!this.probed) return;
    for (let i = 0; i < this.hw.length; i++) {
      if (this.hw[i]) {
        await this.core.writeWord(FP_COMP0 + 4 * i, 0);
        this.hw[i] = null;
      }
    }
    for (const sw of Array.from(this.sw.values())) {
      try {
        await this.core.writeMem(sw.addr, new Uint8Array([sw.original & 0xff, sw.original >> 8]));
      } catch (e) {
        this.log.warn(`could not restore sw breakpoint @0x${hex32(sw.addr)}: ${String(e)}`);
      }
    }
    this.sw.clear();
    for (let i = 0; i < this.wp.length; i++) {
      if (this.wp[i]) {
        await this.core.writeWord(DWT_COMP0 + DWT_STRIDE * i + 8, 0);
        this.wp[i] = null;
      }
    }
  }

  /** Re-write comparators after a system reset (debug registers may not survive it on all parts). */
  async reapply(): Promise<void> {
    if (!this.probed) return;
    await this.core.writeWord(FP_CTRL, FP_CTRL_KEY | FP_CTRL_ENABLE);
    for (let i = 0; i < this.hw.length; i++) {
      const b = this.hw[i];
      if (b) await this.core.writeWord(FP_COMP0 + 4 * i, this.compValue(b.addr));
    }
    for (let i = 0; i < this.wp.length; i++) {
      const w = this.wp[i];
      if (w) {
        const base = DWT_COMP0 + DWT_STRIDE * i;
        await this.core.writeWord(base, w.addr >>> 0);
        await this.core.writeWord(base + 4, Math.log2(w.len));
        await this.core.writeWord(base + 8, w.kind === 'read' ? DWT_FUNC_READ : w.kind === 'write' ? DWT_FUNC_WRITE : DWT_FUNC_ACCESS);
      }
    }
  }

  /** Forget state without touching the target (USB disconnect). */
  reset(): void {
    this.hw.fill(null);
    this.sw.clear();
    this.wp.fill(null);
    this.probed = false;
  }

  hasSoftwareBreakpointAt(addr: number): boolean {
    return this.sw.has(addr & 0xfffffffe);
  }
}
