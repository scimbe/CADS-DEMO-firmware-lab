/* cads-probe – web-worker extension host side (spec §3.1).
 *
 * Owns the WebUSB ST-Link and the WebSerial VCP of the board attached to the *browser* machine.
 * Everything talks to the Node side (cads-board-bridge) via vscode.commands only.
 */
import * as vscode from 'vscode';
import {
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

function nav(): { usb?: UsbNavigator; serial?: SerialNavigator } {
  return (globalThis as unknown as { navigator?: { usb?: UsbNavigator; serial?: SerialNavigator } }).navigator ?? {};
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

  const probe = new ProbeService({ emit, log, pollIntervalMs: 100 });

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

  context.subscriptions.push(
    vscode.commands.registerCommand('cads.probe.ping', () => ping()),
    vscode.commands.registerCommand('cads.probe.getStatus', () => probe.status()),
    vscode.commands.registerCommand('cads.probe.reconnect', () => reconnect()),
    vscode.commands.registerCommand('cads.probe.requestDevices', (opts?: { usb?: boolean; serial?: boolean }) => requestDevices(opts)),
    vscode.commands.registerCommand('cads.probe.disconnect', async () => {
      await probe.detachUsb();
      return probe.status();
    }),
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
