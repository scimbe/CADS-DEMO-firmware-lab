/* cads-probe – web-worker extension host side (spec §3.1).
 *
 * Owns the WebUSB ST-Link and the WebSerial VCP of the board attached to the *browser* machine.
 * Everything talks to the Node side (cads-board-bridge) via vscode.commands only.
 */
import * as vscode from 'vscode';
import {
  type LockManagerLike,
  type Logger,
  ProbeError,
  ProbeService,
  type ProbeEvent,
  type ProbeOp,
  type ProbeResult,
  type ProbeStatus,
  type SerialPortLike,
  USB_FILTERS,
  type UsbDeviceLike,
  matchDeviceType,
} from './driver';

/** Host capability report used by milestone B0 (feasibility). */
export interface ProbePing {
  usb: string;
  serial: string;
  worker: string;
  hid: string;
  location: string;
  extensionKind: string;
  uiKind: string;
}

declare const importScripts: unknown;

interface UsbNavigator {
  getDevices(): Promise<UsbDeviceLike[]>;
  addEventListener(type: 'connect' | 'disconnect', cb: (ev: { device: UsbDeviceLike }) => void): void;
}
interface SerialNavigator {
  getPorts(): Promise<SerialPortLike[]>;
  addEventListener(type: 'connect' | 'disconnect', cb: (ev: { target: SerialPortLike }) => void): void;
}

function nav(): { usb?: UsbNavigator; serial?: SerialNavigator; locks?: LockManagerLike } {
  return (globalThis as unknown as { navigator?: { usb?: UsbNavigator; serial?: SerialNavigator; locks?: LockManagerLike } }).navigator ?? {};
}

function ping(): ProbePing {
  const n = nav();
  return {
    usb: typeof n.usb,
    serial: typeof n.serial,
    hid: typeof (globalThis as { navigator?: { hid?: unknown } }).navigator?.hid,
    worker: typeof importScripts,
    location: typeof (globalThis as { location?: { href?: string } }).location?.href === 'string'
      ? String((globalThis as { location?: { href?: string } }).location?.href)
      : 'none',
    extensionKind: vscode.env.uiKind === vscode.UIKind.Web ? 'web' : 'desktop',
    uiKind: String(vscode.env.uiKind),
  };
}

function isStlink(d: UsbDeviceLike): boolean {
  return matchDeviceType(d.vendorId, d.productId) !== undefined;
}

function isStPort(p: SerialPortLike): boolean {
  const info = p.getInfo();
  return info.usbVendorId === 0x0483;
}

export function activate(context: vscode.ExtensionContext): void {
  const out = vscode.window.createOutputChannel('CaDS Probe');
  context.subscriptions.push(out);
  const log: Logger = {
    debug: () => undefined,
    info: (m) => out.appendLine(`[info] ${m}`),
    warn: (m) => out.appendLine(`[warn] ${m}`),
    error: (m) => out.appendLine(`[error] ${m}`),
  };

  let bridgeMissingLogged = false;
  const emit = (ev: ProbeEvent): void => {
    vscode.commands.executeCommand('cads.bridge.event', ev).then(
      () => undefined,
      (e: unknown) => {
        if (!bridgeMissingLogged) {
          bridgeMissingLogged = true;
          log.warn(`cads.bridge.event not reachable (${String(e)}) – is cads-board-bridge installed?`);
        }
      },
    );
  };

  const probe = new ProbeService({ emit, log, pollIntervalMs: 100, locks: nav().locks });

  /**
   * Hand the board back. Called by the "Board freigeben" command, on shutdown, and whenever the
   * window stops being used - a browser tab that is closed hard never runs any of this, which is
   * exactly why connecting re-establishes the state instead of trusting a clean exit.
   */
  async function release(why: string): Promise<ProbeStatus> {
    if (probe.isFlashing) {
      log.warn(`release (${why}) refused: a flash is running`);
      return probe.status();
    }
    log.info(`releasing the board (${why})`);
    await probe.release();
    return probe.status();
  }

  /** Give up the board after this long with the window unfocused. 0 disables it. */
  const idleReleaseMs = (): number =>
    Math.max(0, vscode.workspace.getConfiguration('cads.board').get<number>('idleReleaseSeconds', 0) * 1000);
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  const cancelIdleRelease = (): void => {
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
  };

  /** Attach the first granted ST-Link / ST serial port without a chooser (getDevices/getPorts). */
  async function reconnect(): Promise<ProbeStatus> {
    const n = nav();
    if (n.usb && !probe.isConnected) {
      try {
        const devices = (await n.usb.getDevices()).filter(isStlink);
        const dev = devices[0];
        if (dev) {
          await probe.attachUsb(dev);
        }
      } catch (e) {
        log.warn(`reconnect (usb): ${ProbeError.from(e).message}`);
      }
    }
    if (n.serial && !probe.knownSerialPort) {
      try {
        const ports = (await n.serial.getPorts()).filter(isStPort);
        const port = ports[0];
        if (port) probe.setSerialPort(port);
      } catch (e) {
        log.warn(`reconnect (serial): ${ProbeError.from(e).message}`);
      }
    }
    return probe.status();
  }

  async function requestDevices(opts?: { usb?: boolean; serial?: boolean }): Promise<ProbeStatus> {
    const wantUsb = opts?.usb !== false;
    const wantSerial = opts?.serial !== false;
    const n = nav();
    if (wantUsb && n.usb) {
      // Already granted? Then skip the chooser (policy-granted devices, replug, page reload).
      let devices = (await n.usb.getDevices()).filter(isStlink);
      if (devices.length === 0) {
        try {
          await vscode.commands.executeCommand('workbench.experimental.requestUsbDevice', { filters: USB_FILTERS });
        } catch (e) {
          log.warn(`requestUsbDevice: ${String(e)}`);
        }
        devices = (await n.usb.getDevices()).filter(isStlink);
      }
      const dev = devices[0];
      if (dev && !probe.isConnected) {
        try {
          await probe.attachUsb(dev);
        } catch (e) {
          log.error(`attach: ${ProbeError.from(e).message}`);
        }
      }
    }
    if (wantSerial && n.serial) {
      let ports = (await n.serial.getPorts()).filter(isStPort);
      if (ports.length === 0) {
        try {
          await vscode.commands.executeCommand('workbench.experimental.requestSerialPort', {
            filters: [{ usbVendorId: 0x0483 }],
          });
        } catch (e) {
          log.warn(`requestSerialPort: ${String(e)}`);
        }
        ports = (await n.serial.getPorts()).filter(isStPort);
      }
      const port = ports[0];
      if (port) probe.setSerialPort(port);
    }
    return probe.status();
  }

  async function diag(): Promise<unknown> {
    const n = nav();
    const g = globalThis as unknown as { origin?: string; isSecureContext?: boolean; constructor?: { name?: string } };
    const report: Record<string, unknown> = { origin: g.origin, isSecureContext: g.isSecureContext, scope: g.constructor?.name, status: probe.status() };
    try {
      const devs = await n.usb!.getDevices();
      report.usbDevices = devs.map((d) => ({ vendorId: d.vendorId, productId: d.productId, serialNumber: d.serialNumber, productName: d.productName, opened: d.opened }));
    } catch (e) {
      report.usbDevicesError = String(e);
    }
    try {
      const ports = await n.serial!.getPorts();
      report.serialPorts = ports.map((p) => p.getInfo());
    } catch (e) {
      report.serialPortsError = String(e);
    }
    return report;
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('cads.probe.ping', () => ping()),
    vscode.commands.registerCommand('cads.probe.diag', () => diag()),
    vscode.commands.registerCommand('cads.probe.getStatus', () => probe.status()),
    vscode.commands.registerCommand('cads.probe.reconnect', () => reconnect()),
    vscode.commands.registerCommand('cads.probe.requestDevices', (opts?: { usb?: boolean; serial?: boolean }) => requestDevices(opts)),
    vscode.commands.registerCommand('cads.probe.disconnect', async () => {
      await probe.detachUsb();
      return probe.status();
    }),
    vscode.commands.registerCommand('cads.probe.release', () => release('command')),
    vscode.commands.registerCommand('cads.probe.setPollingWanted', (wanted: boolean) => {
      probe.setPollingWanted(wanted !== false);
      return probe.status();
    }),
    // The window losing focus is the closest thing a web-worker extension host has to
    // visibilitychange: there is no document here, so document events are not reachable.
    vscode.window.onDidChangeWindowState((st) => {
      if (st.focused) {
        cancelIdleRelease();
        probe.setPollingWanted(true);
        probe.noteActivity();
        return;
      }
      probe.setPollingWanted(false);
      const after = idleReleaseMs();
      if (after > 0 && probe.isConnected) {
        cancelIdleRelease();
        idleTimer = setTimeout(() => void release('window idle'), after);
      }
    }),
    { dispose: () => cancelIdleRelease() },
    // Best effort on teardown. VS Code calls deactivate() on an orderly shutdown; a tab that is
    // simply closed gets no notice at all, in any browser, which is why connect() re-establishes
    // the ST-Link state rather than assuming the previous session ended cleanly.
    { dispose: () => void probe.release().catch(() => undefined) },
    vscode.commands.registerCommand(
      'cads.probe.op',
      async (request: ProbeOp | { batch: ProbeOp[] }): Promise<ProbeResult | { results: ProbeResult[] }> => {
        if (request && 'batch' in request && Array.isArray(request.batch)) return probe.batch(request.batch);
        return probe.op(request as ProbeOp);
      },
    ),
  );

  const n = nav();
  try {
    n.usb?.addEventListener('connect', (ev) => {
      if (isStlink(ev.device)) {
        log.info('USB connect event – attaching');
        void reconnect();
      }
    });
    n.usb?.addEventListener('disconnect', (ev) => {
      if (isStlink(ev.device)) void probe.onUsbDisconnected(ev.device);
    });
    n.serial?.addEventListener('connect', () => void reconnect());
    n.serial?.addEventListener('disconnect', (ev) => void probe.onSerialDisconnected(ev.target));
  } catch (e) {
    log.warn(`device event listeners unavailable: ${String(e)}`);
  }

  void reconnect().then((s) => log.info(`startup: usb=${s.usb} serial=${s.serial} core=${s.core ?? '-'}`));
}

export function deactivate(): void {
  // the worker is torn down with the page; USB handles are released by the browser
}
