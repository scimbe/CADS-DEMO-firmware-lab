/* stm32fs.js
 * stm32fs flash driver class
 *
 * Copyright Devan Lai 2017
 *
 * Ported from lib/stm32fs.py in the pystlink project,
 * Copyright Pavel Revak 2015
 *
 * Vendored into CADS-DEMO-firmware-lab from upstream devanlai/webstlink
 * (MIT, see ./LICENSE), with real, hardware-verified fixes found and
 * proven on a real STM32F429ZI (CaDS Zero board) -- see inline "CADS:"
 * comments throughout this file for each fix and why it was needed.
 * Upstream source: https://github.com/devanlai/webstlink
 */

import { Exception, Warning, UsbError } from './stlinkex.js';
import { Stm32 } from './stm32.js';
import {
    hex_word as H32,
    async_sleep,
    async_timeout
} from './util.js';

const FLASH_REG_BASE = 0x40023c00;
const FLASH_KEYR_REG = FLASH_REG_BASE + 0x04;
const FLASH_SR_REG = FLASH_REG_BASE + 0x0c;
const FLASH_CR_REG = FLASH_REG_BASE + 0x10;

const FLASH_CR_LOCK_BIT = 0x80000000;
const FLASH_CR_PG_BIT = 0x00000001;
const FLASH_CR_SER_BIT = 0x00000002;
const FLASH_CR_MER_BIT = 0x00000004;
const FLASH_CR_STRT_BIT = 0x00010000;
const FLASH_CR_PSIZE_X8 = 0x00000000;
const FLASH_CR_PSIZE_X16 = 0x00000100;
const FLASH_CR_PSIZE_X32 = 0x00000200;
const FLASH_CR_PSIZE_X64 = 0x00000300;
const FLASH_CR_SNB_BITINDEX = 3;

const FLASH_SR_BUSY_BIT = 0x00010000;
// CADS: end_of_operation() used to treat ANY nonzero FLASH_SR as an error,
// which also fires on EOP (bit0, "End Of Operation" - set by hardware on a
// perfectly successful program/erase, W1C, never cleared anywhere in this
// file) and OPERR (bit1). Real error conditions only: WRPERR/PGAERR/
// PGPERR/PGSERR - matches pystlink's own FLASH_SR_ERROR_MASK exactly.
const FLASH_SR_WRPERR_BIT = 0x00000010;
const FLASH_SR_PGAERR_BIT = 0x00000020;
const FLASH_SR_PGPERR_BIT = 0x00000040;
const FLASH_SR_PGSERR_BIT = 0x00000080;
const FLASH_SR_ERROR_MASK = FLASH_SR_WRPERR_BIT | FLASH_SR_PGAERR_BIT |
    FLASH_SR_PGPERR_BIT | FLASH_SR_PGSERR_BIT;

// PARAMS
// R0: SRC data
// R1: DST data
// R2: size
// R4: STM32_FLASH_SR
// R5: FLASH_SR_BUSY_BIT

const FLASH_WRITER_F4_CODE_X8 = new Uint8Array([
    // write:
    0x03, 0x78,  // 0x7803    // ldrh r3, [r0]
    0x0b, 0x70,  // 0x700b    // strh r3, [r1]
    // test_busy:
    0x23, 0x68,  // 0x6823    // ldr r3, [r4]
    0x2b, 0x42,  // 0x422b    // tst r3, r5
    0xfc, 0xd1,  // 0xd1fc    // bne <test_busy>
    0x00, 0x2b,  // 0x2b00    // cmp r3, //0
    0x04, 0xd1,  // 0xd104    // bne <exit>
    0x01, 0x30,  // 0x3001    // adds r0, //1
    0x01, 0x31,  // 0x3101    // adds r1, //1
    0x01, 0x3a,  // 0x3a01    // subs r2, //1
    0x00, 0x2a,  // 0x2a00    // cmp r2, //0
    0xf3, 0xd1,  // 0xd1f3    // bne <write>
    // exit:
    0x00, 0xbe,  // 0xbe00    // bkpt 0x00
]);

const FLASH_WRITER_F4_CODE_X16 = new Uint8Array([
    // write:
    0x03, 0x88,  // 0x8803    // ldrh r3, [r0]
    0x0b, 0x80,  // 0x800b    // strh r3, [r1]
    // test_busy:
    0x23, 0x68,  // 0x6823    // ldr r3, [r4]
    0x2b, 0x42,  // 0x422b    // tst r3, r5
    0xfc, 0xd1,  // 0xd1fc    // bne <test_busy>
    0x00, 0x2b,  // 0x2b00    // cmp r3, //0
    0x04, 0xd1,  // 0xd104    // bne <exit>
    0x02, 0x30,  // 0x3002    // adds r0, //2
    0x02, 0x31,  // 0x3102    // adds r1, //2
    0x02, 0x3a,  // 0x3a02    // subs r2, //2
    0x00, 0x2a,  // 0x2a00    // cmp r2, //0
    0xf3, 0xd1,  // 0xd1f3    // bne <write>
    // exit:
    0x00, 0xbe,  // 0xbe00    // bkpt 0x00
]);

const FLASH_WRITER_F4_CODE_X32 = new Uint8Array([
    // write:
    0x03, 0x68,  // 0x6803    // ldr r3, [r0]
    0x0b, 0x60,  // 0x600b    // str r3, [r1]
    // test_busy:
    0x23, 0x68,  // 0x6823    // ldr r3, [r4]
    0x2b, 0x42,  // 0x422b    // tst r3, r5
    0xfc, 0xd1,  // 0xd1fc    // bne <test_busy>
    0x00, 0x2b,  // 0x2b00    // cmp r3, //0
    0x04, 0xd1,  // 0xd104    // bne <exit>
    0x04, 0x30,  // 0x3004    // adds r0, //4
    0x04, 0x31,  // 0x3104    // adds r1, //4
    0x04, 0x3a,  // 0x3a04    // subs r2, //4
    0x00, 0x2a,  // 0x2a00    // cmp r2, //0
    0xf3, 0xd1,  // 0xd1f3    // bne <write>
    // exit:
    0x00, 0xbe,  // 0xbe00    // bkpt 0x00
]);

const VOLTAGE_DEPENDEND_PARAMS = [
    {
        'min_voltage': 2.7,
        'max_mass_erase_time': 16,
        'max_erase_time': {16: .5, 64: 1.1, 128: 2},
        'FLASH_CR_PSIZE': FLASH_CR_PSIZE_X32,
        'FLASH_WRITER_CODE': FLASH_WRITER_F4_CODE_X32,
    },
    {
        'min_voltage': 2.1,
        'max_mass_erase_time': 22,
        'max_erase_time': {16: .6, 64: 1.4, 128: 2.6},
        'FLASH_CR_PSIZE': FLASH_CR_PSIZE_X16,
        'FLASH_WRITER_CODE': FLASH_WRITER_F4_CODE_X16,
    },
    {
        'min_voltage': 1.8,
        'max_mass_erase_time': 32,
        'max_erase_time': {16: .8, 64: 2.4, 128: 4},
        'FLASH_CR_PSIZE': FLASH_CR_PSIZE_X8,
        'FLASH_WRITER_CODE': FLASH_WRITER_F4_CODE_X8,
    }
];

class Flash {
    constructor(driver, stlink, dbg) {
        this._driver = driver;
        this._stlink = stlink;
        this._dbg = dbg;
        this._params = null;
    }

    async init() {
        this._params = await this.get_voltage_dependend_params();
        await this.unlock();
    }

    async get_voltage_dependend_params() {
        await this._stlink.read_target_voltage();
        let voltage = this._stlink.target_voltage;
        let params = VOLTAGE_DEPENDEND_PARAMS.find(
            params => (voltage > params["min_voltage"])
        );
        if (params) {
            return params;
        }
        throw new Exception(`Supply voltage is ${voltage}V, but minimum for FLASH program or erase is 1.8V`);
    }

    async unlock() {
        // CADS: this used to call core_reset_halt() - a REAL system reset
        // (writes AIRCR.SYSRESETREQ), not just a halt. That restarts the
        // target's own firmware boot sequence at the start of every single
        // flash operation, and on CaDS Zero specifically that re-arms a
        // ~2s independent hardware watchdog (IWDG) that only gets frozen
        // (DBGMCU_APB1_FZ_DBG_IWDG_STOP) once the CPU is halted - if the
        // WebUSB erase+program round trip takes longer than that window
        // (very plausible - it's real USB traffic per register access),
        // the IWDG fires mid-operation and resets the chip AGAIN, out from
        // under the in-progress erase/program. FLASH_CR reading back as
        // 0x80000000 (its literal power-on-reset default, LOCK=1) right
        // after a plain SER write was the real hardware signature of this,
        // reproduced identically in Node and in a real Chrome tab - not a
        // WebUSB/test-harness artifact after all, an actual reset. Fixed
        // by just halting (core_halt()) instead: nothing about erasing or
        // programming flash via the debug port requires resetting the
        // target first, only having the core not actively executing.
        await this._driver.core_halt();
        // programming locked
        let cr_reg = await this._stlink.get_debugreg32(FLASH_CR_REG);
        if (cr_reg & FLASH_CR_LOCK_BIT) {
            // unlock keys
            await this._stlink.set_debugreg32(FLASH_KEYR_REG, 0x45670123);
            await this._stlink.set_debugreg32(FLASH_KEYR_REG, 0xcdef89ab);
        }
        cr_reg = await this._stlink.get_debugreg32(FLASH_CR_REG);
        // programming locked
        if (cr_reg & FLASH_CR_LOCK_BIT) {
            throw new Exception("Error unlocking FLASH");
        }

        // CADS: FLASH_SR's error bits (OPERR/WRPERR/PGAERR/PGPERR/PGSERR)
        // are write-1-to-clear and sticky - this driver never cleared them
        // anywhere, so a flag latched by an earlier failed/aborted
        // operation (e.g. the erase_sector timeout bug fixed above) stays
        // set forever and makes end_of_operation() fail every subsequent
        // write, even a perfectly good one, with a misleading "Error
        // writing FLASH" that has nothing to do with the current write.
        // Found on real hardware: after fixing the timeout bug, the very
        // next write failed with FLASH_SR=0xc0 (PGPERR|PGSERR) purely
        // because those bits were left over from earlier failed attempts.
        await this._stlink.set_debugreg32(FLASH_SR_REG, 0xf3);
    }

    async lock() {
        await this._stlink.set_debugreg32(FLASH_CR_REG, FLASH_CR_LOCK_BIT);
        await this._driver.core_reset_halt();
    }

    async erase_all() {
        await this._stlink.set_debugreg32(FLASH_CR_REG, FLASH_CR_MER_BIT);
        await this._stlink.set_debugreg32(FLASH_CR_REG, (FLASH_CR_MER_BIT | FLASH_CR_STRT_BIT));
        await this.wait_busy(this._params["max_mass_erase_time"], "Erasing FLASH");
    }

    async erase_sector(sector, erase_size) {
        // CADS: st-flash sets SER+SNB and STRT as two separate
        // read-modify-write transactions (write_flash_cr_snb() then
        // set_flash_cr_strt(), each reading FLASH_CR fresh before writing
        // it back), not two blind full-value writes like this used to be -
        // matched here even though the final register value is the same
        // either way, since it's what the known-working reference does.
        const SNB_MASK = 0x78; // bits [6:3]
        let cr = await this._stlink.get_debugreg32(FLASH_CR_REG);
        cr &= ~SNB_MASK;
        cr |= (sector << FLASH_CR_SNB_BITINDEX);
        cr |= FLASH_CR_SER_BIT;
        await this._stlink.set_debugreg32(FLASH_CR_REG, cr);
        cr = await this._stlink.get_debugreg32(FLASH_CR_REG);
        cr |= FLASH_CR_STRT_BIT;
        await this._stlink.set_debugreg32(FLASH_CR_REG, cr);
        // CADS: erase_size arrives in bytes (16384/65536/131072 - real sector
        // sizes from the device's own erase_sizes list), but max_erase_time
        // is keyed by KB shorthand (16/64/128). The un-converted lookup
        // silently returned undefined -> NaN end_time -> wait_busy's loop
        // condition was false before the first iteration, so it never
        // polled FLASH_SR even once and threw "Operation timeout"
        // immediately, on every single erase, regardless of margin. Found
        // by real-hardware testing on a Nucleo-F429ZI; this driver (the
        // sector-based "FS" flash driver, used for F4/F7/L4) is a separate
        // code path from the page-based "FP" driver F1/F3 boards use, so
        // this repo's own "tested on STM32F103 only" claim never actually
        // exercised this line.
        await this.wait_busy(this._params["max_erase_time"][erase_size / 1024]);
    }

    async erase_sectors(flash_start, erase_sizes, addr, size) {
        let erase_addr = flash_start;
        this._dbg.bargraph_start("Erasing FLASH", {"value_min": flash_start, "value_max": (flash_start + size)});
        let sector = 0;
        while (true) {
            for (let erase_size of erase_sizes) {
                if (addr < (erase_addr + erase_size)) {
                    this._dbg.bargraph_update({"value": erase_addr});
                    await this.erase_sector(sector, erase_size);
                }
                erase_addr += erase_size;
                if ((addr + size) < erase_addr) {
                    this._dbg.bargraph_done();
                    return;
                }
                sector += 1;
            }
        }
    }

    // CADS: this used to upload a hand-assembled ARM Thumb copy-loop into
    // SRAM and have the TARGET CPU execute it (core_run() + wait for its
    // own bkpt), one word/half-word/byte at a time, polling FLASH_SR
    // itself. On real Nucleo-F429ZI hardware this reliably failed on the
    // very first block with FLASH_SR=0xc0 (PGPERR|PGSERR) regardless of
    // PSIZE (X32 and X16 both fail identically), and the on-chip loop's own
    // error check (`cmp r3, #0 / bne exit`) has the same "any nonzero
    // FLASH_SR is an error" bug as this file's own end_of_operation() -
    // EOP alone would trip it too. This whole approach turns out not to be
    // what pystlink (the project this file is ported from) actually does
    // for STM32F2/F4: pystlink's own lib/stm32fs.py writes flash directly
    // through the debug probe's own memory-access port
    // (stlink.set_mem32/16/8 - the exact mechanism the ST-Link hardware
    // already uses to upload the writer code and data to SRAM elsewhere in
    // this same file, and what st-flash/OpenOCD do too), relying on the
    // flash controller to pace itself while PG is enabled - no on-target
    // program, no hand-assembled opcodes to get subtly wrong. Replaced to
    // match: init_write() now just enables PG, and write() writes each
    // block straight to the flash address via set_mem32 (this project only
    // ever runs at ~3.3V - the X32/align-4 bracket - so set_mem16/8 for the
    // lower-voltage brackets are intentionally not wired up; add them the
    // same way if a lower-voltage target is ever needed).
    async init_write(sram_offset) {
        // CADS: st-flash sets PSIZE and PG in two SEPARATE read-modify-write
        // transactions (write_flash_cr_psiz() then set_flash_cr_pg(), each
        // its own SWD round trip), not one combined write of PG|PSIZE like
        // this used to be. Matched here for the same reason as
        // erase_sector() above.
        let cr = await this._stlink.get_debugreg32(FLASH_CR_REG);
        cr &= ~0x300; // clear PSIZE[1:0]
        cr |= this._params["FLASH_CR_PSIZE"];
        await this._stlink.set_debugreg32(FLASH_CR_REG, cr);
        cr = await this._stlink.get_debugreg32(FLASH_CR_REG);
        cr |= FLASH_CR_PG_BIT;
        await this._stlink.set_debugreg32(FLASH_CR_REG, cr);
    }

    async write(addr, block) {
        // if all data are 0xff then will be not written
        if (block.every(b => (b == 0xff))) {
            return;
        }
        // CADS: this used to fail with PGPERR/PGSERR (FLASH_SR=0xc0) on
        // real hardware, reproduced identically in a Node test harness and
        // in a real Chrome tab - so NOT a WebUSB-testing artifact. Real
        // root cause found: Flash.unlock() (above) used to call
        // core_reset_halt(), a genuine chip reset, at the start of every
        // flash operation. On CaDS Zero that re-arms a ~2s hardware
        // watchdog (IWDG) that only freezes once the debugger has the core
        // halted; a WebUSB erase+program sequence is real USB traffic and
        // can easily run past that window, so the watchdog fires mid-
        // operation and resets the chip again, out from under the erase.
        // FLASH_CR reading back as 0x80000000 - its literal power-on-reset
        // default - was the actual signature of a second, unwanted reset,
        // not a corrupted register read. Fixed at the source (unlock() now
        // just halts, doesn't reset) - erase+write+verify all confirmed
        // passing against real hardware after that fix, with the sector
        // read back as genuinely erased (not just BSY-clear) before the
        // write, and the written content verified correct afterward.
        await this._stlink.set_mem32(addr, block);
        await this.wait_busy(0.001);
    }

    async wait_busy(wait_time, bargraph_msg = null) {
        // CADS: VOLTAGE_DEPENDEND_PARAMS' max_erase_time values are the
        // datasheet's TYPICAL erase times, not guaranteed maxima, and each
        // busy-poll here is a full SWD round trip over (Web)USB - real
        // hardware plus that overhead can exceed a 1.5x margin on real
        // STM32F42x/F43x silicon (observed: a plain 16KB sector erase timed
        // out at the stock 0.5s*1.5=0.75s ceiling on a Nucleo-F429ZI).
        // Bumped to 4x - a few extra seconds of wait costs nothing, a false
        // timeout is a hard failure.
        const end_time = (Date.now() + (wait_time * 4 * 1000));
        if (bargraph_msg) {
            this._dbg.bargraph_start(bargraph_msg, {
                "value_min": Date.now()/1000.0,
                "value_max": (Date.now()/1000.0 + wait_time)
            });
        }
        while (Date.now() < end_time) {
            if (bargraph_msg) {
                this._dbg.bargraph_update({"value": Date.now()/1000.0});
            }
            let status = await this._stlink.get_debugreg32(FLASH_SR_REG);
            if (!(status & FLASH_SR_BUSY_BIT)) {
                this.end_of_operation(status);
                if (bargraph_msg) {
                    this._dbg.bargraph_done();
                }
                return;
            }
            await async_sleep(wait_time / 20);
        }
        throw new Exception("Operation timeout");
    }

    end_of_operation(status) {
        if (status & FLASH_SR_ERROR_MASK) {
            throw new Exception("Error writing FLASH with status (FLASH_SR) " + H32(status));
        }
    }
}

// support all STM32F MCUs with sector access access to FLASH
// (STM32F2xx, STM32F4xx) 
class Stm32FS extends Stm32 {
    async flash_erase_all() {
        this._dbg.debug("Stm32FS.flash_erase_all()");
        let flash = new Flash(this, this._stlink, this._dbg);
        await flash.init();
        await flash.erase_all();
        await flash.lock();
    }

    async flash_write(addr, data, { erase = false, verify = false, erase_sizes = null }) {
        let addr_str = (addr !== null) ? `0x${H32(addr)}` : 'None';
        this._dbg.debug(`Stm32FS.flash_write(${addr_str}, [data:${data.length}Bytes], erase=${erase}, verify=${verify}, erase_sizes=${erase_sizes})`);
        if (addr === null) {
            addr = this.FLASH_START;
        }
        if (addr % 4) {
            throw new Exception("Start address is not aligned to word");
        }
        // align data
        if (data.length % 4) {
            let padded_data = new Uint8Array(data.length + (4 - (data.length % 4)));
            data.forEach((b, i) => padded_data[i] = b);
            padded_data.fill(0xff, data.length);
            data = padded_data;
        }
        let flash = new Flash(this, this._stlink, this._dbg);
        await flash.init();
        if (erase) {
            if (erase_sizes) {
                await flash.erase_sectors(this.FLASH_START, erase_sizes, addr, data.length);
            } else {
                await flash.erase_all();
            }
        }
        this._dbg.bargraph_start("Writing FLASH", {
            "value_min": addr,
            "value_max": (addr + data.length)
        });
        await flash.init_write(Stm32FS.SRAM_START);
        while (data.length > 0) {
            this._dbg.bargraph_update({"value": addr});
            let block = data.slice(0, this._stlink.maximum_transfer_size);
            data = data.slice(this._stlink.maximum_transfer_size);
            await flash.write(addr, block);
            if (verify) {
                let flashed_data = await this._stlink.get_mem32(addr, block.length);
                let flashed_block = new Uint8Array(flashed_data.buffer);
                let verified = false;
                if (flashed_block.length == block.length) {
                    verified = flashed_block.every((octet, index) => octet == block[index]);
                }
                if (!verified) {
                    throw new Exception("Verify error at block address: 0x" + H32(addr));
                }
            }
            addr += block.length;
        }
        await flash.lock();
        this._dbg.bargraph_done();
    }
}

export { Stm32FS };
