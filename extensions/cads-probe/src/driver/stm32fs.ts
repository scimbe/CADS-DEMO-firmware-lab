/* stm32fs.ts – STM32F2/F4 sector-flash programming through the debug port.
 *
 * Copyright Devan Lai 2017 (webstlink, MIT) – ported from lib/stm32fs.py in the pystlink
 * project, Copyright Pavel Revak 2015. Vendored into CADS-DEMO-firmware-lab with real,
 * hardware-verified fixes proven on a STM32F429ZI (CaDS Zero board); every "CADS:" comment
 * below marks one of them. TypeScript port 2026.
 *
 * Deliberately NOT implemented: mass erase (FLASH_CR.MER) and option-byte access. The CaDS
 * Zero filesystem lives in bank 2 and must survive every flash operation (cads-zero
 * docs/SAFETY.md). Callers additionally restrict the address window (see probe.ts).
 */

import type { CortexM } from './cortexm';
import { ProbeError } from './errors';
import { type Logger, nullLogger } from './logger';
import { hex32, sleep } from './util';

const FLASH_REG_BASE = 0x40023c00;
const FLASH_KEYR = FLASH_REG_BASE + 0x04;
const FLASH_SR = FLASH_REG_BASE + 0x0c;
const FLASH_CR = FLASH_REG_BASE + 0x10;

const FLASH_CR_LOCK = 0x80000000;
const FLASH_CR_PG = 0x00000001;
const FLASH_CR_SER = 0x00000002;
const FLASH_CR_STRT = 0x00010000;
const FLASH_CR_PSIZE_MASK = 0x00000300;
const FLASH_CR_PSIZE_X32 = 0x00000200;
const FLASH_CR_SNB_SHIFT = 3;
const FLASH_CR_SNB_MASK = 0x78; // bits [6:3]

const FLASH_SR_BSY = 0x00010000;
// CADS: end_of_operation() used to treat ANY nonzero FLASH_SR as an error, which also fires
// on EOP (bit0, set on a perfectly successful program/erase, W1C) and OPERR (bit1). Real
// error conditions only: WRPERR/PGAERR/PGPERR/PGSERR – matches pystlink's FLASH_SR_ERROR_MASK.
const FLASH_SR_ERROR_MASK = 0x10 | 0x20 | 0x40 | 0x80;

/** Typical sector erase times (s) at VDD > 2.7 V, keyed by sector size in KB. */
const MAX_ERASE_TIME_S: Record<number, number> = { 16: 0.5, 64: 1.1, 128: 2 };
// CADS: the values above are the datasheet's TYPICAL erase times, not guaranteed maxima, and
// each busy-poll is a full SWD round trip over (Web)USB – observed: a 16 KB sector erase timed
// out at the stock 1.5× margin on a Nucleo-F429ZI. 4× costs nothing, a false timeout is fatal.
const ERASE_TIME_FACTOR = 4;

export type FlashPhase = 'erase' | 'program' | 'verify';
export type FlashProgress = (phase: FlashPhase, done: number, total: number) => void;

export interface FlashOptions {
  eraseSizes: number[];
  flashStart?: number;
  verify?: boolean;
  onProgress?: FlashProgress;
}

export class Stm32FlashFS {
  constructor(
    private readonly core: CortexM,
    private readonly log: Logger = nullLogger,
  ) {}

  private async unlock(): Promise<void> {
    // CADS: this used to call core_reset_halt() – a REAL system reset (AIRCR.SYSRESETREQ), not
    // just a halt. On CaDS Zero that re-arms a ~2 s independent watchdog (IWDG) that only gets
    // frozen (DBGMCU_APB1_FZ_DBG_IWDG_STOP) once the CPU is halted again; a WebUSB erase+program
    // round trip easily outlasts that window, so the IWDG fired mid-operation and reset the chip
    // out from under the in-progress erase. FLASH_CR reading back as 0x80000000 (its power-on
    // default) right after a plain SER write was the hardware signature. Fix: halt only.
    await this.core.halt();
    let cr = await this.core.readWord(FLASH_CR);
    if (cr & FLASH_CR_LOCK) {
      await this.core.writeWord(FLASH_KEYR, 0x45670123);
      await this.core.writeWord(FLASH_KEYR, 0xcdef89ab);
    }
    cr = await this.core.readWord(FLASH_CR);
    if (cr & FLASH_CR_LOCK) throw new ProbeError('error unlocking FLASH (FLASH_CR.LOCK still set)', 'TARGET_FAULT');
    // CADS: FLASH_SR's error bits are write-1-to-clear and sticky – a flag latched by an earlier
    // failed/aborted operation would otherwise fail every subsequent write with a misleading
    // "Error writing FLASH". Clear them before starting.
    await this.core.writeWord(FLASH_SR, 0xf3);
  }

  private async lock(): Promise<void> {
    await this.core.writeWord(FLASH_CR, FLASH_CR_LOCK);
  }

  private async waitBusy(waitTimeS: number, minMs = 100): Promise<void> {
    const end = Date.now() + Math.max(minMs, waitTimeS * ERASE_TIME_FACTOR * 1000);
    for (;;) {
      const status = await this.core.readWord(FLASH_SR);
      if (!(status & FLASH_SR_BSY)) {
        if (status & FLASH_SR_ERROR_MASK) {
          throw new ProbeError(`FLASH operation failed, FLASH_SR=0x${hex32(status)}`, 'TARGET_FAULT');
        }
        return;
      }
      if (Date.now() >= end) throw new ProbeError('FLASH operation timeout (BSY stuck)', 'TARGET_FAULT');
      await sleep(Math.max(1, (waitTimeS * 1000) / 20));
    }
  }

  private async eraseSector(sector: number, eraseSize: number): Promise<void> {
    // CADS: st-flash sets SER+SNB and STRT as two separate read-modify-write transactions
    // (each reading FLASH_CR fresh before writing it back), not two blind full-value writes –
    // matched here since it's what the known-working reference does.
    let cr = await this.core.readWord(FLASH_CR);
    cr &= ~FLASH_CR_SNB_MASK;
    cr |= (sector << FLASH_CR_SNB_SHIFT) | FLASH_CR_SER;
    await this.core.writeWord(FLASH_CR, cr >>> 0);
    cr = await this.core.readWord(FLASH_CR);
    cr |= FLASH_CR_STRT;
    await this.core.writeWord(FLASH_CR, cr >>> 0);
    // CADS: eraseSize is in bytes but the timing table is keyed by KB (the un-converted lookup
    // returned undefined → NaN deadline → immediate "Operation timeout" on every erase).
    const t = MAX_ERASE_TIME_S[eraseSize / 1024] ?? 2;
    await this.waitBusy(t);
  }

  /** Sectors (bank 1) overlapping [addr, addr+size). */
  static sectorsFor(flashStart: number, eraseSizes: number[], addr: number, size: number): { sector: number; start: number; size: number }[] {
    const out: { sector: number; start: number; size: number }[] = [];
    let start = flashStart;
    for (let sector = 0; sector < eraseSizes.length; sector++) {
      const sz = eraseSizes[sector] as number;
      if (addr < start + sz && addr + size > start) out.push({ sector, start, size: sz });
      start += sz;
    }
    return out;
  }

  private async initWrite(): Promise<void> {
    // CADS: st-flash sets PSIZE and PG in two SEPARATE read-modify-write transactions, not one
    // combined write of PG|PSIZE. Matched here for the same reason as eraseSector().
    let cr = await this.core.readWord(FLASH_CR);
    cr = (cr & ~FLASH_CR_PSIZE_MASK) | FLASH_CR_PSIZE_X32;
    await this.core.writeWord(FLASH_CR, cr >>> 0);
    cr = await this.core.readWord(FLASH_CR);
    cr |= FLASH_CR_PG;
    await this.core.writeWord(FLASH_CR, cr >>> 0);
  }

  /**
   * Erase the sectors touched by [addr, addr+data.length), program, verify by reading back.
   * Requires: word-aligned addr, VDD > 2.7 V (X32 programming – the only bracket this lab meets).
   * Leaves the core halted and the flash locked; the caller decides between resetRun/resetHalt.
   */
  async write(addr: number, input: Uint8Array, opts: FlashOptions): Promise<void> {
    const flashStart = opts.flashStart ?? 0x08000000;
    if (addr % 4) throw new ProbeError('flash: start address must be word aligned', 'UNSUPPORTED');
    let data = input;
    if (data.length % 4) {
      const padded = new Uint8Array(data.length + (4 - (data.length % 4)));
      padded.fill(0xff);
      padded.set(data);
      data = padded;
    }
    const voltage = await this.core.stlink.readTargetVoltage();
    if (voltage === null || voltage <= 2.7) {
      throw new ProbeError(`target voltage ${voltage?.toFixed(2) ?? '?'} V – X32 programming needs > 2.7 V`, 'TARGET_FAULT');
    }
    const progress = opts.onProgress ?? (() => undefined);
    const sectors = Stm32FlashFS.sectorsFor(flashStart, opts.eraseSizes, addr, data.length);
    if (sectors.length === 0) throw new ProbeError('flash: range does not overlap any sector', 'UNSUPPORTED');
    const eraseTotal = sectors.reduce((a, s) => a + s.size, 0);

    await this.unlock();
    try {
      let erased = 0;
      progress('erase', 0, eraseTotal);
      for (const s of sectors) {
        this.log.info(`erasing sector ${s.sector} @0x${hex32(s.start)} (${s.size / 1024} KB)`);
        await this.eraseSector(s.sector, s.size);
        erased += s.size;
        progress('erase', erased, eraseTotal);
      }

      await this.initWrite();
      const block = this.core.stlink.maximumTransferSize;
      progress('program', 0, data.length);
      for (let off = 0; off < data.length; off += block) {
        const chunk = data.subarray(off, Math.min(off + block, data.length));
        // all-0xff blocks are already "programmed" after the erase
        if (!chunk.every((b) => b === 0xff)) {
          // CADS: the target-side copy loop of the original was replaced by direct writes through
          // the probe's memory-access port (what pystlink/st-flash/OpenOCD do for F2/F4); the flash
          // controller paces itself while PG is set.
          await this.core.stlink.setMem32(addr + off, chunk);
          await this.waitBusy(0.001);
        }
        progress('program', off + chunk.length, data.length);
      }
      // clear PG
      const cr = await this.core.readWord(FLASH_CR);
      await this.core.writeWord(FLASH_CR, (cr & ~FLASH_CR_PG) >>> 0);

      if (opts.verify !== false) {
        progress('verify', 0, data.length);
        for (let off = 0; off < data.length; off += block) {
          const n = Math.min(block, data.length - off);
          const back = await this.core.stlink.getMem32(addr + off, n);
          for (let i = 0; i < n; i++) {
            if (back[i] !== data[off + i]) {
              throw new ProbeError(`verify error at 0x${hex32(addr + off + i)}: read 0x${(back[i] as number).toString(16)}, expected 0x${(data[off + i] as number).toString(16)}`, 'TARGET_FAULT');
            }
          }
          progress('verify', off + n, data.length);
        }
      }
    } finally {
      await this.lock();
    }
  }
}
