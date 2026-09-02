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

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(vscode.commands.registerCommand('cads.probe.ping', () => ping()));
}

export function deactivate(): void {
  // nothing yet
}
