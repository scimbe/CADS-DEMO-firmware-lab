/* cortexm.ts – ARMv7-M core control through the ST-Link: halt/run/step/reset, registers
 * (DCRSR/DCRDR for the special ones), chunked memory access, halt reason (DFSR).
 *
 * Partly ported from lib/stm32.js of devanlai/webstlink (MIT, Copyright Devan Lai 2017 /
 * pystlink Copyright Pavel Revak 2015). Reset handling follows the CADS lesson: nothing in here
 * resets the chip unless the caller explicitly asks for resetHalt()/resetRun().
 */

import { ProbeError } from './errors';
import { type Logger, nullLogger } from './logger';
import { STLINK_MAXIMUM_TRANSFER_SIZE, type Stlink } from './stlinkv2';
import { concatBytes, hex32, sleep } from './util';

export const CPUID = 0xe000ed00;
export const AIRCR = 0xe000ed0c;
export const DFSR = 0xe000ed30;
export const DHCSR = 0xe000edf0;
export const DCRSR = 0xe000edf4;
export const DCRDR = 0xe000edf8;
export const DEMCR = 0xe000edfc;

const AIRCR_KEY = 0x05fa0000;
const AIRCR_SYSRESETREQ = 0x00000004;

const DHCSR_KEY = 0xa05f0000;
export const DHCSR_C_DEBUGEN = 1 << 0;
export const DHCSR_C_HALT = 1 << 1;
export const DHCSR_C_STEP = 1 << 2;
export const DHCSR_C_MASKINTS = 1 << 3;
export const DHCSR_S_REGRDY = 1 << 16;
export const DHCSR_S_HALT = 1 << 17;
export const DHCSR_S_SLEEP = 1 << 18;
export const DHCSR_S_LOCKUP = 1 << 19;
export const DHCSR_S_RETIRE_ST = 1 << 24;
export const DHCSR_S_RESET_ST = 1 << 25;

export const DEMCR_VC_CORERESET = 1 << 0;
export const DEMCR_VC_MMERR = 1 << 4;
export const DEMCR_VC_NOCPERR = 1 << 5;
export const DEMCR_VC_CHKERR = 1 << 6;
export const DEMCR_VC_STATERR = 1 << 7;
export const DEMCR_VC_BUSERR = 1 << 8;
export const DEMCR_VC_INTERR = 1 << 9;
export const DEMCR_VC_HARDERR = 1 << 10;
export const DEMCR_TRCENA = 1 << 24;
const DEMCR_VC_ALL_FAULTS =
  DEMCR_VC_HARDERR | DEMCR_VC_INTERR | DEMCR_VC_BUSERR | DEMCR_VC_STATERR | DEMCR_VC_CHKERR | DEMCR_VC_NOCPERR | DEMCR_VC_MMERR;

const DFSR_HALTED = 1 << 0;
const DFSR_BKPT = 1 << 1;
const DFSR_DWTTRAP = 1 << 2;
const DFSR_VCATCH = 1 << 3;
const DFSR_EXTERNAL = 1 << 4;

/** DCRSR REGSEL values for the registers the ST-Link register API does not cover. */
const REGSEL_XPSR = 0x10;
const REGSEL_MSP = 0x11;
const REGSEL_PSP = 0x12;
const REGSEL_SPECIAL = 0x14; // CONTROL[31:24] FAULTMASK[23:16] BASEPRI[15:8] PRIMASK[7:0]
const DCRSR_REGWnR = 1 << 16;

/**
 * Register indices of readRegs()/writeReg() (spec §3.1: 23 values).
 * 0..12 r0..r12, 13 sp, 14 lr, 15 pc, 16 xpsr, 17 msp, 18 psp, 19 primask, 20 basepri,
 * 21 faultmask, 22 control.
 */
export const REG_COUNT = 23;
export const REG_SP = 13;
export const REG_LR = 14;
export const REG_PC = 15;
export const REG_XPSR = 16;
export const REG_MSP = 17;
export const REG_PSP = 18;
export const REG_PRIMASK = 19;
export const REG_BASEPRI = 20;
export const REG_FAULTMASK = 21;
export const REG_CONTROL = 22;

export type HaltReason = 'breakpoint' | 'step' | 'watchpoint' | 'halt' | 'fault' | 'reset' | 'unknown';

export interface CoreState {
  halted: boolean;
  lockup: boolean;
  sleeping: boolean;
  resetSticky: boolean;
  dhcsr: number;
}

export class CortexM {
  private lastRequest: 'halt' | 'step' | 'reset' | 'run' | null = null;

  constructor(
    readonly stlink: Stlink,
    private readonly log: Logger = nullLogger,
  ) {}

  readWord(addr: number): Promise<number> {
    return this.stlink.getDebugReg32(addr);
  }

  writeWord(addr: number, value: number): Promise<void> {
    return this.stlink.setDebugReg32(addr, value);
  }

  async readCpuid(): Promise<number> {
    return this.readWord(CPUID);
  }

  async getState(): Promise<CoreState> {
    const dhcsr = await this.readWord(DHCSR);
    return {
      halted: (dhcsr & DHCSR_S_HALT) !== 0,
      lockup: (dhcsr & DHCSR_S_LOCKUP) !== 0,
      sleeping: (dhcsr & DHCSR_S_SLEEP) !== 0,
      resetSticky: (dhcsr & DHCSR_S_RESET_ST) !== 0,
      dhcsr,
    };
  }

  private async waitHalted(timeoutMs: number): Promise<CoreState> {
    const end = Date.now() + timeoutMs;
    let st = await this.getState();
    while (!st.halted && Date.now() < end) {
      await sleep(1);
      st = await this.getState();
    }
    if (!st.halted) throw new ProbeError(`core did not halt within ${timeoutMs} ms (DHCSR=0x${hex32(st.dhcsr)})`, 'TARGET_FAULT');
    return st;
  }

  /** Halt only – never resets (IWDG lesson, see stm32fs.ts). */
  async halt(timeoutMs = 500): Promise<CoreState> {
    this.lastRequest = 'halt';
    await this.writeWord(DHCSR, DHCSR_KEY | DHCSR_C_DEBUGEN | DHCSR_C_HALT);
    return this.waitHalted(timeoutMs);
  }

  async run(): Promise<void> {
    this.lastRequest = 'run';
    await this.writeWord(DHCSR, DHCSR_KEY | DHCSR_C_DEBUGEN);
  }

  /**
   * Single-step one instruction with interrupts masked (C_MASKINTS), so a SysTick/FreeRTOS
   * tick cannot drag the student into an ISR. Leaves the core halted, MASKINTS cleared.
   */
  async step(maskInterrupts = true, timeoutMs = 1000): Promise<CoreState> {
    this.lastRequest = 'step';
    const mask = maskInterrupts ? DHCSR_C_MASKINTS : 0;
    if (mask) await this.writeWord(DHCSR, DHCSR_KEY | DHCSR_C_DEBUGEN | DHCSR_C_HALT | mask);
    await this.writeWord(DHCSR, DHCSR_KEY | DHCSR_C_DEBUGEN | DHCSR_C_STEP | mask);
    const st = await this.waitHalted(timeoutMs);
    if (mask) await this.writeWord(DHCSR, DHCSR_KEY | DHCSR_C_DEBUGEN | DHCSR_C_HALT);
    return st;
  }

  /** System reset with the core halted at the reset vector (VC_CORERESET). */
  async resetHalt(timeoutMs = 1000): Promise<CoreState> {
    this.lastRequest = 'reset';
    await this.writeWord(DHCSR, DHCSR_KEY | DHCSR_C_DEBUGEN | DHCSR_C_HALT);
    const demcr = await this.readWord(DEMCR);
    await this.writeWord(DEMCR, demcr | DEMCR_VC_CORERESET);
    await this.writeWord(AIRCR, AIRCR_KEY | AIRCR_SYSRESETREQ);
    await sleep(5);
    let st: CoreState;
    try {
      st = await this.waitHalted(timeoutMs);
    } finally {
      // Leave VC_CORERESET clear again, else a later watchdog/button reset would silently halt.
      await this.writeWord(DEMCR, (await this.readWord(DEMCR)) & ~DEMCR_VC_CORERESET);
    }
    // Clear the sticky reset/fault bits so the next halt reason is meaningful.
    await this.writeWord(DFSR, 0x1f);
    return st;
  }

  /** System reset and let the firmware boot. */
  async resetRun(): Promise<void> {
    this.lastRequest = 'run';
    const demcr = await this.readWord(DEMCR);
    if (demcr & DEMCR_VC_CORERESET) await this.writeWord(DEMCR, demcr & ~DEMCR_VC_CORERESET);
    await this.writeWord(DHCSR, DHCSR_KEY | DHCSR_C_DEBUGEN);
    await this.writeWord(AIRCR, AIRCR_KEY | AIRCR_SYSRESETREQ);
  }

  /** Enable/disable halting on faults (vector catch). Only while a debugger session is active! */
  async setVectorCatch(enabled: boolean): Promise<void> {
    const demcr = await this.readWord(DEMCR);
    const next = enabled ? demcr | DEMCR_VC_ALL_FAULTS : demcr & ~DEMCR_VC_ALL_FAULTS;
    if (next !== demcr) await this.writeWord(DEMCR, next);
  }

  async setTraceEnable(): Promise<void> {
    const demcr = await this.readWord(DEMCR);
    if (!(demcr & DEMCR_TRCENA)) await this.writeWord(DEMCR, demcr | DEMCR_TRCENA);
  }

  /** Reads and clears DFSR, mapping it to a halt reason. */
  async haltReason(): Promise<HaltReason> {
    const dfsr = await this.readWord(DFSR);
    if (dfsr) await this.writeWord(DFSR, dfsr);
    let reason: HaltReason = 'unknown';
    if (dfsr & DFSR_BKPT) reason = 'breakpoint';
    else if (dfsr & DFSR_DWTTRAP) reason = 'watchpoint';
    else if (dfsr & DFSR_VCATCH) reason = this.lastRequest === 'reset' ? 'reset' : 'fault';
    else if (dfsr & (DFSR_HALTED | DFSR_EXTERNAL)) reason = this.lastRequest === 'step' ? 'step' : 'halt';
    else if (this.lastRequest === 'step') reason = 'step';
    else if (this.lastRequest === 'halt') reason = 'halt';
    else if (this.lastRequest === 'reset') reason = 'reset';
    this.lastRequest = null;
    return reason;
  }

  // ---- registers -------------------------------------------------------------------------

  private async dcrsrRead(regsel: number): Promise<number> {
    await this.writeWord(DCRSR, regsel);
    for (let i = 0; i < 20; i++) {
      const dhcsr = await this.readWord(DHCSR);
      if (dhcsr & DHCSR_S_REGRDY) return this.readWord(DCRDR);
    }
    throw new ProbeError('DCRSR read: S_REGRDY never set (core running?)', 'TARGET_FAULT');
  }

  private async dcrsrWrite(regsel: number, value: number): Promise<void> {
    await this.writeWord(DCRDR, value >>> 0);
    await this.writeWord(DCRSR, regsel | DCRSR_REGWnR);
    for (let i = 0; i < 20; i++) {
      const dhcsr = await this.readWord(DHCSR);
      if (dhcsr & DHCSR_S_REGRDY) return;
    }
    throw new ProbeError('DCRSR write: S_REGRDY never set (core running?)', 'TARGET_FAULT');
  }

  /** All 23 registers (see REG_* indices). Core must be halted. */
  async readRegs(): Promise<number[]> {
    const all = await this.stlink.getAllRegs(); // r0..r15, xpsr, msp, psp, rw, rw2
    const special = await this.dcrsrRead(REGSEL_SPECIAL);
    const regs = all.slice(0, 19);
    regs.push(special & 0xff, (special >>> 8) & 0xff, (special >>> 16) & 0xff, (special >>> 24) & 0xff);
    return regs;
  }

  async readReg(index: number): Promise<number> {
    if (index >= 0 && index <= 15) return this.stlink.getReg(index);
    switch (index) {
      case REG_XPSR:
        return this.stlink.getReg(16);
      case REG_MSP:
        return this.stlink.getReg(17);
      case REG_PSP:
        return this.stlink.getReg(18);
      case REG_PRIMASK:
        return (await this.dcrsrRead(REGSEL_SPECIAL)) & 0xff;
      case REG_BASEPRI:
        return ((await this.dcrsrRead(REGSEL_SPECIAL)) >>> 8) & 0xff;
      case REG_FAULTMASK:
        return ((await this.dcrsrRead(REGSEL_SPECIAL)) >>> 16) & 0xff;
      case REG_CONTROL:
        return ((await this.dcrsrRead(REGSEL_SPECIAL)) >>> 24) & 0xff;
      default:
        throw new ProbeError(`register index ${index} out of range`, 'UNSUPPORTED');
    }
  }

  async writeReg(index: number, value: number): Promise<void> {
    if (index >= 0 && index <= 15) return this.stlink.setReg(index, value);
    switch (index) {
      case REG_XPSR:
        return this.dcrsrWrite(REGSEL_XPSR, value);
      case REG_MSP:
        return this.dcrsrWrite(REGSEL_MSP, value);
      case REG_PSP:
        return this.dcrsrWrite(REGSEL_PSP, value);
      case REG_PRIMASK:
      case REG_BASEPRI:
      case REG_FAULTMASK:
      case REG_CONTROL: {
        const shift = (index - REG_PRIMASK) * 8;
        const cur = await this.dcrsrRead(REGSEL_SPECIAL);
        const next = ((cur & ~(0xff << shift)) | ((value & 0xff) << shift)) >>> 0;
        return this.dcrsrWrite(REGSEL_SPECIAL, next);
      }
      default:
        throw new ProbeError(`register index ${index} out of range`, 'UNSUPPORTED');
    }
  }

  // ---- memory ----------------------------------------------------------------------------

  private async checkRw(what: string, addr: number): Promise<void> {
    const status = await this.stlink.getLastRwStatus();
    if (status !== 0x80) {
      throw new ProbeError(`${what} at 0x${hex32(addr)} failed (ST-Link status 0x${status.toString(16)})`, 'TARGET_FAULT');
    }
  }

  /**
   * Read arbitrary byte ranges: 8-bit head/tail, 32-bit body in ≤1024-byte transfers.
   * SWD-over-USB reads transiently return a non-OK status (see cads-zero CLAUDE.md, "retry a
   * few times before escalating"); a read has no side effects, so retry the whole range once.
   */
  async readMem(addr: number, size: number, checkStatus = true, attempt = 0): Promise<Uint8Array> {
    if (size === 0) return new Uint8Array(0);
    const chunks: Uint8Array[] = [];
    let total = 0;
    if (addr % 4) {
      const n = Math.min(4 - (addr % 4), size);
      chunks.push(await this.stlink.getMem8(addr, n));
      total += n;
    }
    for (;;) {
      const remaining = (size - total) & ~3;
      if (remaining === 0) break;
      const n = Math.min(remaining, STLINK_MAXIMUM_TRANSFER_SIZE);
      chunks.push(await this.stlink.getMem32(addr + total, n));
      total += n;
    }
    while (total < size) {
      const n = Math.min(size - total, 64);
      chunks.push(await this.stlink.getMem8(addr + total, n));
      total += n;
    }
    if (checkStatus) {
      const status = await this.stlink.getLastRwStatus();
      if (status !== 0x80) {
        if (attempt < 2) return this.readMem(addr, size, checkStatus, attempt + 1);
        throw new ProbeError(`memory read at 0x${hex32(addr)} failed (ST-Link status 0x${status.toString(16)})`, 'TARGET_FAULT');
      }
    }
    return concatBytes(chunks);
  }

  async writeMem(addr: number, data: Uint8Array, checkStatus = true): Promise<void> {
    if (data.length === 0) return;
    let written = 0;
    if (addr % 4) {
      const n = Math.min(4 - (addr % 4), data.length);
      await this.stlink.setMem8(addr, data.subarray(0, n));
      written = n;
    }
    for (;;) {
      const remaining = (data.length - written) & ~3;
      if (remaining === 0) break;
      const n = Math.min(remaining, STLINK_MAXIMUM_TRANSFER_SIZE);
      await this.stlink.setMem32(addr + written, data.subarray(written, written + n));
      written += n;
    }
    while (written < data.length) {
      const n = Math.min(data.length - written, 64);
      await this.stlink.setMem8(addr + written, data.subarray(written, written + n));
      written += n;
    }
    if (checkStatus) await this.checkRw('memory write', addr);
  }

  async readHalfword(addr: number): Promise<number> {
    return this.stlink.getDebugReg16(addr);
  }
}
