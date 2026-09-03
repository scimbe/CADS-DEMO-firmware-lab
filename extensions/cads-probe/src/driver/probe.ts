/* probe.ts – ProbeService: the spec §3.1 operation dispatcher on top of the driver.
 *
 * - every operation is serialised through one Mutex (USB transfers never interleave),
 * - a poller reads DHCSR every ≤100 ms only while the core is 'running' and reports 'halted',
 * - flash is confined to the firmware window (bank 1) and always halts, never resets, before
 *   erasing (IWDG lesson); it ends with a reset-halt so the caller decides how to continue,
 * - fatal USB errors mark the probe 'error' until the device is re-attached.
 * No DOM / VS Code API in this file: it also runs under node:test with mocks.
 */

import { BreakpointUnit } from './breakpoints';
import { CortexM, REG_PC } from './cortexm';
import { ProbeError } from './errors';
import { type Logger, nullLogger } from './logger';
import { Mutex } from './mutex';
import { SerialConsole, type SerialPortLike } from './serial';
import { UsbConnector, type UsbDeviceLike } from './stlinkusb';
import { Stlink } from './stlinkv2';
import { Stm32FlashFS } from './stm32fs';
import { CORES, IDCODE_REG, type TargetInfo, findFamily } from './targets';
import type { ProbeEvent, ProbeOp, ProbeResult, ProbeStatus } from './types';
import { fromBase64, hex32, toBase64 } from './util';

export const FLASH_WINDOW_START = 0x08000000;
export const FLASH_WINDOW_END = 0x08100000; // exclusive – bank 1 only (cads-zero docs/SAFETY.md)

export interface ProbeHost {
  emit(event: ProbeEvent): void;
  log?: Logger;
  /** Poll interval while running (ms). Spec: ≤ 100. */
  pollIntervalMs?: number;
}

type CoreStatus = NonNullable<ProbeStatus['core']>;

export class ProbeService {
  private readonly mutex = new Mutex();
  private readonly log: Logger;
  private readonly pollIntervalMs: number;

  private usbDevice: UsbDeviceLike | null = null;
  private connector: UsbConnector | null = null;
  private stlink: Stlink | null = null;
  private core: CortexM | null = null;
  private bpu: BreakpointUnit | null = null;
  private target: TargetInfo | null = null;
  private usbState: ProbeStatus['usb'] = 'absent';
  private coreState: CoreStatus = 'unknown';
  private lastHalt: { reason: string; pc: number } | null = null;
  private lastError: string | undefined;

  private serialPort: SerialPortLike | null = null;
  private serial: SerialConsole | null = null;
  private serialState: ProbeStatus['serial'] = 'absent';

  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private pollGeneration = 0;

  constructor(private readonly host: ProbeHost) {
    this.log = host.log ?? nullLogger;
    this.pollIntervalMs = Math.min(100, host.pollIntervalMs ?? 100);
  }

  // ---- status ----------------------------------------------------------------------------

  status(): ProbeStatus {
    const s: ProbeStatus = {
      usb: this.usbState,
      serial: this.serialState,
      core: this.usbState === 'connected' ? this.coreState : 'unknown',
      usbDeviceKnown: this.usbDevice !== null,
      serialPortKnown: this.serialPort !== null,
    };
    if (this.stlink && this.usbState === 'connected') {
      s.stlink = {
        version: this.stlink.versionString,
        ...(this.usbDevice?.serialNumber ? { serial: this.usbDevice.serialNumber } : {}),
        ...(this.stlink.voltage !== null ? { targetVoltage: Math.round(this.stlink.voltage * 100) / 100 } : {}),
      };
    }
    if (this.target && this.usbState === 'connected') {
      s.target = {
        coreId: this.target.coreId,
        chipId: this.target.chipId,
        devName: this.target.devName,
        flashSize: this.target.flashSize,
        sramSize: this.target.sramSize,
      };
    }
    if (this.lastError) s.lastError = this.lastError;
    return s;
  }

  get isConnected(): boolean {
    return this.usbState === 'connected' && this.core !== null;
  }

  get knownUsbDevice(): UsbDeviceLike | null {
    return this.usbDevice;
  }

  get knownSerialPort(): SerialPortLike | null {
    return this.serialPort;
  }

  private emit(event: ProbeEvent): void {
    try {
      this.host.emit(event);
    } catch (e) {
      this.log.warn(`event sink failed: ${String(e)}`);
    }
  }

  private logEvent(level: 'info' | 'warn' | 'error', message: string): void {
    this.log[level](message);
    this.emit({ type: 'log', level, message });
  }

  // ---- USB attach / detach ---------------------------------------------------------------

  /** Open the ST-Link, enter SWD, identify the target. Serialised. */
  attachUsb(device: UsbDeviceLike): Promise<ProbeStatus> {
    return this.mutex.runExclusive(async () => {
      if (this.connector && this.usbState === 'connected' && this.usbDevice === device) return this.status();
      await this.teardownUsb(false);
      this.usbDevice = device;
      const connector = new UsbConnector(device, this.log);
      const stlink = new Stlink(connector, this.log);
      try {
        await connector.connect();
        await stlink.init();
        const core = new CortexM(stlink, this.log);
        this.target = await this.identify(stlink, core);
        this.connector = connector;
        this.stlink = stlink;
        this.core = core;
        this.bpu = new BreakpointUnit(core, this.log);
        await this.bpu.probe();
        // stale DFSR bits from an earlier debugger session would mislabel the first halt reason
        await core.writeWord(0xe000ed30, 0x1f);
        this.usbState = 'connected';
        this.lastError = undefined;
        await this.refreshCoreState();
        this.logEvent('info', `ST-Link/${stlink.versionString} connected, ${this.target.devName} (chip 0x${this.target.chipId.toString(16)}), ${this.target.flashSize} KB flash, core ${this.coreState}`);
        this.emit({ type: 'usb-connect', status: this.status() });
        return this.status();
      } catch (e) {
        const err = ProbeError.from(e, 'USB_IO');
        this.lastError = err.message;
        this.usbState = 'error';
        try {
          await stlink.cleanExit();
        } catch {
          // ignore
        }
        await connector.disconnect();
        this.connector = null;
        this.stlink = null;
        this.core = null;
        this.bpu = null;
        this.target = null;
        this.logEvent('error', `probe attach failed: ${err.message}`);
        throw err;
      }
    });
  }

  private async identify(stlink: Stlink, core: CortexM): Promise<TargetInfo> {
    let cpuid = 0;
    try {
      cpuid = await core.readCpuid();
    } catch (e) {
      this.log.warn(`CPUID read failed: ${String(e)}`);
    }
    if (cpuid === 0 || cpuid === 0xffffffff) {
      // Target not answering on SWD (deep sleep, SWD pins reconfigured, previous session left
      // it wedged). Same recovery as `st-info --connect-under-reset`: hold NRST, re-enter SWD.
      this.logEvent('warn', 'target not responding on SWD – retrying connect-under-reset');
      await stlink.driveNrst('low');
      try {
        await stlink.enterDebugSwd();
        await stlink.readCoreId();
        await core.writeWord(0xe000edf0, 0xa05f0003); // DHCSR: DEBUGEN|HALT so it halts out of reset
      } finally {
        await stlink.driveNrst('high');
      }
      cpuid = await core.readCpuid();
      if (cpuid === 0 || cpuid === 0xffffffff) throw new ProbeError('no CPU behind the ST-Link (CPUID reads 0)', 'TARGET_FAULT');
    }
    const partNo = (cpuid >>> 4) & 0xfff;
    const coreName = CORES[partNo] ?? `part 0x${partNo.toString(16)}`;
    const idcodeReg = IDCODE_REG[partNo];
    if (idcodeReg === undefined) throw new ProbeError(`${coreName} is not a supported core`, 'UNSUPPORTED');
    const idcode = await core.readWord(idcodeReg);
    const chipId = idcode & 0xfff;
    const family = findFamily(chipId);
    if (!family) throw new ProbeError(`unsupported STM32 (DBGMCU_IDCODE 0x${hex32(idcode)}, dev_id 0x${chipId.toString(16)})`, 'UNSUPPORTED');
    const flashSize = await stlink.getDebugReg16(family.flashSizeReg);
    return {
      coreId: stlink.coreid,
      cpuid,
      partNo,
      coreName,
      chipId,
      devName: family.name,
      flashSize,
      sramSize: family.sramSize,
      eraseSizes: family.eraseSizes,
    };
  }

  private async refreshCoreState(): Promise<void> {
    if (!this.core) return;
    const st = await this.core.getState();
    this.coreState = st.halted ? 'halted' : 'running';
    if (this.coreState === 'running') this.startPoller();
  }

  /** Detach cleanly: stop polling, remove our breakpoints, leave the core as it is, close USB. */
  detachUsb(): Promise<void> {
    return this.mutex.runExclusive(() => this.teardownUsb(true));
  }

  private async teardownUsb(cleanTarget: boolean): Promise<void> {
    this.stopPoller();
    const wasConnected = this.usbState === 'connected';
    if (this.connector && this.stlink) {
      if (cleanTarget && !this.connector.isBroken) {
        try {
          await this.bpu?.clearAll();
          await this.core?.setVectorCatch(false);
        } catch (e) {
          this.log.warn(`teardown: could not clean target: ${String(e)}`);
        }
        try {
          await this.stlink.cleanExit();
        } catch {
          // ignore
        }
      }
      await this.connector.disconnect();
    }
    this.connector = null;
    this.stlink = null;
    this.core = null;
    this.bpu?.reset();
    this.bpu = null;
    this.target = null;
    this.coreState = 'unknown';
    this.lastHalt = null;
    if (wasConnected) {
      this.usbState = 'absent';
      this.emit({ type: 'usb-disconnect', status: this.status() });
    } else {
      this.usbState = 'absent';
    }
  }

  /** WebUSB 'disconnect' event: the cable is gone, nothing on the bus can be talked to. */
  async onUsbDisconnected(device?: UsbDeviceLike): Promise<void> {
    if (device && this.usbDevice && device !== this.usbDevice) return;
    this.stopPoller();
    await this.mutex.runExclusive(async () => {
      if (this.connector) {
        await this.connector.disconnect();
      }
      this.connector = null;
      this.stlink = null;
      this.core = null;
      this.bpu?.reset();
      this.bpu = null;
      this.target = null;
      this.coreState = 'unknown';
      this.usbState = 'absent';
      this.lastError = 'USB device disconnected';
      this.logEvent('warn', 'ST-Link disconnected');
      this.emit({ type: 'usb-disconnect', status: this.status() });
    });
  }

  private markFatal(err: ProbeError): void {
    if (!err.fatal) return;
    this.stopPoller();
    this.usbState = 'error';
    this.lastError = err.message;
    this.coreState = 'unknown';
    this.logEvent('error', `USB failure: ${err.message}`);
    this.emit({ type: 'usb-disconnect', status: this.status() });
  }

  // ---- serial ----------------------------------------------------------------------------

  setSerialPort(port: SerialPortLike | null): void {
    if (this.serial?.isOpen && this.serial.port !== port) {
      void this.serial.close();
    }
    this.serialPort = port;
    if (!port) {
      this.serial = null;
      this.serialState = 'absent';
    }
  }

  async onSerialDisconnected(port?: SerialPortLike): Promise<void> {
    if (port && this.serialPort && port !== this.serialPort) return;
    const s = this.serial;
    this.serial = null;
    this.serialPort = null;
    if (s?.isOpen) await s.close().catch(() => undefined);
    this.serialState = 'absent';
  }

  // ---- poller ----------------------------------------------------------------------------

  private startPoller(): void {
    if (this.pollTimer) return;
    const generation = ++this.pollGeneration;
    const tick = (): void => {
      this.pollTimer = null;
      if (generation !== this.pollGeneration) return;
      void this.mutex
        .runExclusive(async () => {
          if (generation !== this.pollGeneration || !this.core || this.coreState !== 'running') return;
          const st = await this.core.getState();
          if (st.halted) {
            this.coreState = 'halted';
            const reason = await this.core.haltReason();
            const pc = await this.core.readReg(REG_PC);
            this.lastHalt = { reason, pc };
            this.emit({ type: 'halted', reason, pc });
          } else if (st.lockup) {
            this.logEvent('warn', 'core is in LOCKUP state');
          }
        })
        .catch((e) => {
          const err = ProbeError.from(e);
          this.log.warn(`poll failed: ${err.message}`);
          this.markFatal(err);
        })
        .finally(() => {
          if (generation === this.pollGeneration && this.coreState === 'running' && this.usbState === 'connected') {
            this.pollTimer = setTimeout(tick, this.pollIntervalMs);
          } else {
            this.pollTimer = null;
          }
        });
    };
    this.pollTimer = setTimeout(tick, this.pollIntervalMs);
  }

  private stopPoller(): void {
    this.pollGeneration++;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  // ---- operations ------------------------------------------------------------------------

  op(request: ProbeOp): Promise<ProbeResult> {
    return this.mutex.runExclusive(() => this.runOp(request));
  }

  /** Batch: all ops under one lock, stop at the first failure (spec §3.1). */
  batch(requests: ProbeOp[]): Promise<{ results: ProbeResult[] }> {
    return this.mutex.runExclusive(async () => {
      const results: ProbeResult[] = [];
      for (const r of requests) {
        const res = await this.runOp(r);
        results.push(res);
        if (!res.ok) break;
      }
      return { results };
    });
  }

  private requireCore(): { core: CortexM; bpu: BreakpointUnit; target: TargetInfo; stlink: Stlink } {
    if (!this.core || !this.bpu || !this.target || !this.stlink || this.usbState !== 'connected') {
      throw new ProbeError('no ST-Link connected', 'NO_DEVICE');
    }
    return { core: this.core, bpu: this.bpu, target: this.target, stlink: this.stlink };
  }

  private async runOp(request: ProbeOp): Promise<ProbeResult> {
    try {
      return await this.dispatch(request);
    } catch (e) {
      const err = ProbeError.from(e);
      this.log.warn(`op ${request.op} failed: ${err.message}`);
      this.markFatal(err);
      return { ok: false, error: err.message, code: err.code };
    }
  }

  private async dispatch(request: ProbeOp): Promise<ProbeResult> {
    switch (request.op) {
      case 'halt': {
        const { core } = this.requireCore();
        this.stopPoller();
        if (this.coreState !== 'halted' || !(await core.getState()).halted) {
          await core.halt();
        }
        this.coreState = 'halted';
        const reason = await core.haltReason();
        const pc = await core.readReg(REG_PC);
        this.lastHalt = { reason: reason === 'unknown' ? 'halt' : reason, pc };
        return { ok: true, state: 'halted', reason: this.lastHalt.reason, pc };
      }
      case 'run': {
        const { core } = this.requireCore();
        await core.run();
        this.coreState = 'running';
        this.lastHalt = null;
        this.startPoller();
        return { ok: true, state: 'running' };
      }
      case 'step': {
        const { core } = this.requireCore();
        this.stopPoller();
        await core.step();
        this.coreState = 'halted';
        const reason = await core.haltReason();
        const pc = await core.readReg(REG_PC);
        this.lastHalt = { reason: reason === 'halt' || reason === 'unknown' ? 'step' : reason, pc };
        return { ok: true, state: 'halted', reason: this.lastHalt.reason, pc };
      }
      case 'resetHalt': {
        const { core, bpu } = this.requireCore();
        this.stopPoller();
        await core.resetHalt();
        await bpu.reapply();
        this.coreState = 'halted';
        const pc = await core.readReg(REG_PC);
        this.lastHalt = { reason: 'reset', pc };
        return { ok: true, state: 'halted', reason: 'reset', pc };
      }
      case 'resetRun': {
        const { core, bpu } = this.requireCore();
        this.stopPoller();
        await core.resetRun();
        await bpu.reapply();
        this.coreState = 'running';
        this.lastHalt = null;
        this.startPoller();
        return { ok: true, state: 'running' };
      }
      case 'getState': {
        const { core } = this.requireCore();
        const st = await core.getState();
        if (st.halted) {
          if (this.coreState !== 'halted') {
            this.stopPoller();
            this.coreState = 'halted';
            const reason = await core.haltReason();
            const pc = await core.readReg(REG_PC);
            this.lastHalt = { reason, pc };
          }
          return { ok: true, state: 'halted', reason: this.lastHalt?.reason ?? 'unknown', pc: this.lastHalt?.pc };
        }
        if (this.coreState !== 'running') {
          this.coreState = 'running';
          this.startPoller();
        }
        return { ok: true, state: 'running' };
      }
      case 'readMem': {
        const { core } = this.requireCore();
        if (!Number.isInteger(request.addr) || !Number.isInteger(request.len) || request.len < 0 || request.len > 0x100000) {
          throw new ProbeError('readMem: invalid addr/len', 'UNSUPPORTED');
        }
        const data = await core.readMem(request.addr >>> 0, request.len);
        return { ok: true, data: toBase64(data) };
      }
      case 'writeMem': {
        const { core } = this.requireCore();
        const data = fromBase64(request.data);
        await core.writeMem(request.addr >>> 0, data);
        return { ok: true, written: data.length };
      }
      case 'readRegs': {
        const { core } = this.requireCore();
        return { ok: true, regs: await core.readRegs() };
      }
      case 'readReg': {
        const { core } = this.requireCore();
        return { ok: true, value: await core.readReg(request.index) };
      }
      case 'writeReg': {
        const { core } = this.requireCore();
        await core.writeReg(request.index, request.value >>> 0);
        return { ok: true };
      }
      case 'setBreakpoint': {
        const { bpu } = this.requireCore();
        const kind = await bpu.setBreakpoint(request.addr >>> 0);
        return { ok: true, kind };
      }
      case 'clearBreakpoint': {
        const { bpu } = this.requireCore();
        return { ok: true, found: await bpu.clearBreakpoint(request.addr >>> 0) };
      }
      case 'setWatchpoint': {
        const { bpu } = this.requireCore();
        await bpu.setWatchpoint(request.addr >>> 0, request.len, request.kind);
        return { ok: true };
      }
      case 'clearWatchpoint': {
        const { bpu } = this.requireCore();
        return { ok: true, found: await bpu.clearWatchpoint(request.addr >>> 0) };
      }
      case 'clearAllBreakpoints': {
        const { bpu } = this.requireCore();
        await bpu.clearAll();
        return { ok: true };
      }
      case 'setVectorCatch': {
        const { core } = this.requireCore();
        await core.setVectorCatch(request.enabled);
        return { ok: true };
      }
      case 'flash':
        return this.flash(request.addr >>> 0, fromBase64(request.data), request.verify !== false);
      case 'serialOpen':
        return this.serialOpen(request.baud);
      case 'serialWrite': {
        if (!this.serial?.isOpen) throw new ProbeError('serial port is not open', 'NO_DEVICE');
        const data = fromBase64(request.data);
        await this.serial.write(data);
        return { ok: true, written: data.length };
      }
      case 'serialClose': {
        if (this.serial) await this.serial.close();
        return { ok: true };
      }
      default:
        throw new ProbeError(`unknown op ${String((request as { op: unknown }).op)}`, 'UNSUPPORTED');
    }
  }

  private async flash(addr: number, data: Uint8Array, verify: boolean): Promise<ProbeResult> {
    const { core, target, bpu } = this.requireCore();
    if (addr % 4) throw new ProbeError('flash: address must be word aligned', 'UNSUPPORTED');
    if (addr < FLASH_WINDOW_START || addr >= FLASH_WINDOW_END || addr + data.length > FLASH_WINDOW_END) {
      throw new ProbeError(`flash: range 0x${hex32(addr)}+${data.length} outside the firmware window 0x${hex32(FLASH_WINDOW_START)}–0x${hex32(FLASH_WINDOW_END - 1)}`, 'UNSUPPORTED');
    }
    if (data.length === 0) throw new ProbeError('flash: empty image', 'UNSUPPORTED');
    this.stopPoller();
    const started = Date.now();
    const flash = new Stm32FlashFS(core, this.log);
    this.logEvent('info', `flashing ${data.length} bytes @0x${hex32(addr)}`);
    await bpu.clearAll();
    await flash.write(addr, data, {
      eraseSizes: target.eraseSizes,
      flashStart: FLASH_WINDOW_START,
      verify,
      onProgress: (phase, done, total) => this.emit({ type: 'flash-progress', phase, done, total }),
    });
    // Leave the target in a defined state: reset and halted at the reset vector.
    await core.resetHalt();
    this.coreState = 'halted';
    const pc = await core.readReg(REG_PC);
    this.lastHalt = { reason: 'reset', pc };
    const ms = Date.now() - started;
    this.logEvent('info', `flash done: ${data.length} bytes in ${ms} ms (${verify ? 'verified' : 'not verified'})`);
    return { ok: true, bytes: data.length, ms, verified: verify, state: 'halted' };
  }

  private async serialOpen(baud: number): Promise<ProbeResult> {
    if (!this.serialPort) throw new ProbeError('no serial port granted – use requestDevices', 'NO_DEVICE');
    if (this.serial?.isOpen) return { ok: true, already: true };
    const port = this.serialPort;
    this.serial = new SerialConsole(
      port,
      {
        onData: (bytes) => this.emit({ type: 'serial-data', data: toBase64(bytes) }),
        onClose: (error) => {
          this.serialState = error ? 'error' : 'absent';
          if (this.serialPort === port && !error) this.serialState = 'absent';
          this.emit(error ? { type: 'serial-close', error } : { type: 'serial-close' });
          if (error) this.logEvent('warn', `serial closed: ${error}`);
        },
      },
      this.log,
    );
    try {
      await this.serial.open(baud || 115200);
    } catch (e) {
      this.serialState = 'error';
      this.lastError = ProbeError.from(e).message;
      throw e;
    }
    this.serialState = 'open';
    this.emit({ type: 'serial-open' });
    return { ok: true };
  }
}
