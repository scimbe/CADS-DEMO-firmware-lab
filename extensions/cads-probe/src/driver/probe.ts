/* probe.ts – ProbeService: the spec §3.1 operation dispatcher on top of the driver.
 *
 * - every operation is serialised through one Mutex (USB transfers never interleave),
 * - a poller reads DHCSR every ≤100 ms only while the core is 'running' and reports 'halted',
 * - flash is confined to the firmware window (bank 1) and always halts, never resets, before
 *   erasing (IWDG lesson); it ends with a reset-halt so the caller decides how to continue,
 * - fatal USB errors mark the probe 'error' until the device is re-attached.
 * No DOM / VS Code API in this file: it also runs under node:test with mocks.
 */

import { type BlockReason, diagnoseOpenFailure, isTargetUnresponsive } from './busy';
import { BreakpointUnit } from './breakpoints';
import { DeviceLock, deviceLockName, type LockManagerLike } from './deviceLock';
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
  /** Fastest poll interval while running (ms). Spec: ≤ 100. */
  pollIntervalMs?: number;
  /** Web Locks of the browser profile, so a second lab tab cannot fight over the board. */
  locks?: LockManagerLike;
}

/**
 * How the idle poller backs off. The board wedged once after nine minutes of an idle session in
 * which the 100 ms poller was the only USB traffic - roughly 5000 transfers that told us nothing.
 * Anything that changes state resets the ladder to the first step.
 */
export const POLL_LADDER_MS = [100, 500, 2000] as const;
/** Ticks at one rung with no state change before dropping to the next. */
export const POLL_STEPS_PER_RUNG = 20;

const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

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
  private pollRung = 0;
  private pollQuietTicks = 0;
  /** Set false while nothing needs live state (no debug session, window not focused). */
  private pollWanted = true;
  private readonly lock: DeviceLock;
  private blockReason: BlockReason | undefined;
  /** True between the first erase and the end of a flash: never tear down in this window. */
  private flashing = false;

  constructor(private readonly host: ProbeHost) {
    this.log = host.log ?? nullLogger;
    this.pollIntervalMs = Math.min(100, host.pollIntervalMs ?? 100);
    this.lock = new DeviceLock(host.locks);
  }

  /** Total USB transfers since the device was opened - makes idle chatter visible in the log. */
  get usbTransfers(): number {
    return this.connector?.transferCount ?? 0;
  }

  /** True while a flash is between erase and done; callers must not tear the connection down. */
  get isFlashing(): boolean {
    return this.flashing;
  }

  /**
   * Say whether live core state is worth USB traffic. A debug session or an open status view sets
   * this true; an idle editor sets it false and the poller stops entirely.
   */
  setPollingWanted(wanted: boolean): void {
    if (this.pollWanted === wanted) return;
    this.pollWanted = wanted;
    this.log.debug(`polling ${wanted ? 'wanted' : 'not wanted'}`);
    if (wanted) {
      this.pollRung = 0;
      this.pollQuietTicks = 0;
      if (this.usbState === 'connected' && this.coreState === 'running') this.startPoller();
    } else {
      this.stopPoller();
    }
  }

  /** Something happened that makes the core state interesting again: poll fast for a while. */
  noteActivity(): void {
    this.pollRung = 0;
    this.pollQuietTicks = 0;
  }

  // ---- status ----------------------------------------------------------------------------

  status(): ProbeStatus {
    const s: ProbeStatus = {
      usb: this.usbState,
      serial: this.serialState,
      blockReason: this.blockReason,
      usbTransfers: this.usbTransfers,
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

      // One lab tab per board. Web Locks are shared across the whole browser profile, so this
      // catches the second tab *before* WebUSB fails with a DOMException that reads like a
      // hardware fault. It says nothing about other programs on the machine - that is the
      // claimInterface() failure below.
      const lockName = deviceLockName(device.vendorId, device.productId, device.serialNumber);
      if (this.lock.available && !(await this.lock.acquire(lockName))) {
        this.blockReason = 'other-tab';
        this.usbState = 'error';
        this.lastError = 'board is open in another tab of this browser';
        this.logEvent('warn', `board already claimed by another tab (lock ${lockName})`);
        throw new ProbeError('board is open in another tab of this browser', 'NO_DEVICE');
      }

      const connector = new UsbConnector(device, this.log);
      const stlink = new Stlink(connector, this.log);
      try {
        try {
          await connector.connect();
        } catch (openErr) {
          const d = diagnoseOpenFailure(openErr, await this.lock.heldElsewhere(lockName));
          this.blockReason = d.reason;
          this.logEvent('warn', `open failed (${d.reason}): ${d.detail}`);
          throw ProbeError.from(openErr, 'NO_DEVICE');
        }
        await stlink.init();
        const core = new CortexM(stlink, this.log);
        this.target = await this.identifyWithRecovery(stlink, core);
        this.blockReason = undefined;
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
        this.lock.releaseNow();
        this.connector = null;
        this.stlink = null;
        this.core = null;
        this.bpu = null;
        this.target = null;
        if (!this.blockReason) {
          this.blockReason = diagnoseOpenFailure(err, false).reason;
        }
        this.logEvent('error', `probe attach failed: ${err.message}`);
        throw err;
      }
    });
  }

  /**
   * Identify the target, and if it does not answer, put the ST-Link back into a defined state
   * instead of handing the student a wedged adapter.
   *
   * The failure this repairs is the everyday one: the previous session ended without a clean
   * detach (tab closed, browser killed, client crash), so the ST-Link's SWD state machine is out
   * of step and reports an all-zero core id - what the host tool prints as "Failed to enter SWD
   * mode" and chipid 0x000. Never assume the last session shut down properly; establish the state.
   *
   * Two escalating attempts, both non-destructive:
   *   1. leave debug mode and re-enter SWD (the software half of --connect-under-reset),
   *   2. the same with NRST held low, so the target cannot run away while we re-attach.
   * A target that still does not answer means the ST-Link itself is desynchronised at USB level,
   * and only a physical replug fixes that - the caller turns that into a message with a button.
   */
  private async identifyWithRecovery(stlink: Stlink, core: CortexM): Promise<TargetInfo> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= 2; attempt++) {
      if (attempt > 0) {
        this.logEvent('warn', `target did not answer, recovery attempt ${attempt} of 2`);
        try {
          if (attempt === 2) await stlink.driveNrst('low');
          await stlink.leaveState();
          await delay(30);
          await stlink.enterDebugSwd();
          await stlink.readCoreId();
          if (attempt === 2) {
            // Halt on the reset vector before letting the target run, so a firmware that
            // immediately re-wedges the bus cannot do so before we have identified it.
            try {
              await core.resetHalt();
            } catch {
              // best effort - identification below is what actually decides
            }
            await stlink.driveNrst('high');
          }
        } catch (e) {
          lastError = e;
          continue;
        }
      }
      try {
        const info = await this.identify(stlink, core);
        const cpuid = await core.readCpuid().catch(() => 0);
        if (!isTargetUnresponsive(info.coreId, cpuid)) {
          if (attempt > 0) this.logEvent('info', `target recovered on attempt ${attempt} (connect under reset)`);
          this.blockReason = undefined;
          return info;
        }
        lastError = new ProbeError(`target unresponsive (core id 0x${info.coreId.toString(16)}, CPUID 0x${cpuid.toString(16)})`, 'TARGET_FAULT');
      } catch (e) {
        lastError = e;
      }
    }
    this.blockReason = 'target-unresponsive';
    throw ProbeError.from(lastError ?? new ProbeError('target unresponsive', 'TARGET_FAULT'), 'TARGET_FAULT');
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

  /**
   * Hand the board back to the browser profile: close the port, close the device, drop the lock.
   * Called by the "Board freigeben" command, on extension shutdown, and when the window goes away.
   * A flash in progress is never interrupted - the caller waits or the image is left half written.
   */
  async release(): Promise<void> {
    if (this.flashing) {
      this.logEvent('warn', 'release ignored: a flash is running, that must finish first');
      return;
    }
    await this.mutex.runExclusive(async () => {
      this.setSerialPort(null);
      await this.teardownUsb(true);
      this.usbDevice = null;
      this.logEvent('info', 'board released (device closed, lock dropped)');
    });
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
    this.lock.releaseNow();
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

  /** Current back-off rung in ms; exported through status for tests and the log. */
  get pollDelayMs(): number {
    const rung = Math.min(this.pollRung, POLL_LADDER_MS.length - 1);
    return Math.max(this.pollIntervalMs, POLL_LADDER_MS[rung] ?? POLL_LADDER_MS[0]);
  }

  private startPoller(): void {
    if (this.pollTimer) return;
    if (!this.pollWanted) return;
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
            this.pollRung = 0;
            this.pollQuietTicks = 0;
            this.emit({ type: 'halted', reason, pc });
          } else if (st.lockup) {
            this.logEvent('warn', 'core is in LOCKUP state');
            this.pollRung = 0;
            this.pollQuietTicks = 0;
          } else if (++this.pollQuietTicks >= POLL_STEPS_PER_RUNG) {
            // Nothing changed for a whole rung: slow down rather than keep the bus busy.
            this.pollQuietTicks = 0;
            if (this.pollRung < POLL_LADDER_MS.length - 1) {
              this.pollRung++;
              this.log.debug(`poller backing off to ${this.pollDelayMs} ms after ${this.usbTransfers} USB transfers`);
            }
          }
        })
        .catch((e) => {
          const err = ProbeError.from(e);
          this.log.warn(`poll failed: ${err.message}`);
          this.markFatal(err);
        })
        .finally(() => {
          if (generation === this.pollGeneration && this.pollWanted && this.coreState === 'running' && this.usbState === 'connected') {
            this.pollTimer = setTimeout(tick, this.pollDelayMs);
          } else {
            this.pollTimer = null;
          }
        });
    };
    this.pollTimer = setTimeout(tick, this.pollDelayMs);
  }

  private stopPoller(): void {
    this.pollGeneration++;
    this.pollRung = 0;
    this.pollQuietTicks = 0;
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
    // From here to the finally below the image on the chip is incomplete. release() refuses to
    // run in this window, so no teardown can leave a half-erased flash behind.
    this.flashing = true;
    try {
      await bpu.clearAll();
      await flash.write(addr, data, {
        eraseSizes: target.eraseSizes,
        flashStart: FLASH_WINDOW_START,
        verify,
        onProgress: (phase, done, total) => this.emit({ type: 'flash-progress', phase, done, total }),
      });
      // Leave the target in a defined state: reset and halted at the reset vector.
      await core.resetHalt();
    } finally {
      this.flashing = false;
    }
    this.coreState = 'halted';
    this.noteActivity();
    const pc = await core.readReg(REG_PC);
    this.lastHalt = { reason: 'reset', pc };
    const ms = Date.now() - started;
    this.logEvent('info', `flash done: ${data.length} bytes in ${ms} ms (${verify ? 'verified' : 'not verified'}), ${this.usbTransfers} USB transfers total`);
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
