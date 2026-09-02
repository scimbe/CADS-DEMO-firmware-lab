import * as vscode from 'vscode';

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

function ping(): ProbePing {
  const nav = (globalThis as { navigator?: unknown }).navigator as
    | { usb?: unknown; serial?: unknown; hid?: unknown }
    | undefined;
  return {
    usb: typeof nav?.usb,
    serial: typeof nav?.serial,
    hid: typeof nav?.hid,
    worker: typeof importScripts,
    location: typeof (globalThis as { location?: { href?: string } }).location?.href === 'string'
      ? String((globalThis as { location?: { href?: string } }).location?.href)
      : 'none',
    extensionKind: vscode.env.uiKind === vscode.UIKind.Web ? 'web' : 'desktop',
    uiKind: String(vscode.env.uiKind),
  };
}

interface UsbDeviceLike { vendorId: number; productId: number; serialNumber?: string; productName?: string; opened: boolean }
interface SerialPortLike { getInfo(): { usbVendorId?: number; usbProductId?: number } }

/** B0 experiment: does the workbench chooser command exist, and what does getDevices() see afterwards? */
async function requestDevicesExperiment(): Promise<unknown> {
  const nav = navigator as unknown as {
    usb: { getDevices(): Promise<UsbDeviceLike[]> };
    serial: { getPorts(): Promise<SerialPortLike[]> };
  };
  const report: Record<string, unknown> = {};
  const t0 = Date.now();
  try {
    const r = await vscode.commands.executeCommand('workbench.experimental.requestUsbDevice', {
      filters: [{ vendorId: 0x0483 }],
    });
    report.requestUsbDevice = { ok: true, result: r };
  } catch (e) {
    report.requestUsbDevice = { ok: false, error: String(e) };
  }
  report.requestUsbDeviceMs = Date.now() - t0;
  try {
    const devs = await nav.usb.getDevices();
    report.usbDevices = devs.map((d) => ({
      vendorId: d.vendorId, productId: d.productId, serialNumber: d.serialNumber, productName: d.productName, opened: d.opened,
    }));
  } catch (e) {
    report.usbDevices = { error: String(e) };
  }
  try {
    const r = await vscode.commands.executeCommand('workbench.experimental.requestSerialPort', {
      filters: [{ usbVendorId: 0x0483 }],
    });
    report.requestSerialPort = { ok: true, result: r };
  } catch (e) {
    report.requestSerialPort = { ok: false, error: String(e) };
  }
  try {
    const ports = await nav.serial.getPorts();
    report.serialPorts = ports.map((p) => p.getInfo());
  } catch (e) {
    report.serialPorts = { error: String(e) };
  }
  return report;
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(vscode.commands.registerCommand('cads.probe.ping', () => ping()));
  context.subscriptions.push(vscode.commands.registerCommand('cads.probe.requestDevices', () => requestDevicesExperiment()));
}

export function deactivate(): void {
  // nothing yet
}
