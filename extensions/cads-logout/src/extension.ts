/**
 * CaDS Abmelden: status bar entry and command "CaDS: Abmelden".
 *
 * Runs in the browser's web-worker extension host (like cads-probe). The actual
 * navigation is done by the page script the image injects into the workbench
 * (image/logout/cads-logout.js) - see channel.ts for why.
 */
import * as vscode from 'vscode';
import { CHANNEL_NAME, requestNavigation } from './channel';
import { runLogout, type BoardState } from './flow';

const ACK_TIMEOUT_MS = 3000;
const RELEASE_TIMEOUT_MS = 5000;

/** The fields of cads-probe's ProbeStatus this extension reads. */
interface ProbeStatusLike {
  usb?: string;
  serial?: string;
}

function withTimeout<T>(work: Thenable<T>, ms: number): Promise<T | undefined> {
  return Promise.race([
    Promise.resolve(work),
    new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), ms)),
  ]);
}

async function releaseBoard(): Promise<BoardState> {
  try {
    const status = await withTimeout(
      vscode.commands.executeCommand<ProbeStatusLike>('cads.probe.release'),
      RELEASE_TIMEOUT_MS,
    );
    if (status && (status.usb === 'connected' || status.serial === 'open')) return 'busy';
    return 'released';
  } catch {
    // cads-probe is not installed or not active: there is no board to give up.
    return 'absent';
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const channel = new BroadcastChannel(CHANNEL_NAME);
  let running = false;

  const logout = async (): Promise<void> => {
    if (running) return;
    running = true;
    try {
      await runLogout({
        confirm: async (message, detail, action) =>
          (await vscode.window.showWarningMessage(message, { modal: true, detail }, action)) === action,
        saveAll: () => Promise.resolve(vscode.workspace.saveAll(false)),
        dirtyNames: () => {
          const dirty = vscode.workspace.textDocuments.filter((doc) => doc.isDirty);
          // Full URIs for whoever debugs a "not saved" question; the student sees names.
          if (dirty.length > 0) console.warn(`[cads-logout] dirty: ${dirty.map((doc) => doc.uri.toString()).join(' ')}`);
          return dirty.map((doc) => doc.uri.path.split('/').pop() || doc.uri.toString());
        },
        releaseBoard,
        navigate: () => requestNavigation(channel, ACK_TIMEOUT_MS),
        error: (message) => void vscode.window.showErrorMessage(message, { modal: true }),
        wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      });
    } finally {
      running = false;
    }
  };

  // Far right of the status bar, where a session control is expected.
  const item = vscode.window.createStatusBarItem('abmelden', vscode.StatusBarAlignment.Right, -10000);
  item.name = 'CaDS: Abmelden';
  item.text = '$(sign-out) Abmelden';
  item.tooltip = 'Vom Firmware-Labor abmelden (speichert offene Dateien, trennt das Board)';
  item.command = 'cads.logout';
  // Rot hinterlegt, damit der Abmelde-Knopf sofort auffaellt (Wunsch des CTO).
  item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
  item.color = new vscode.ThemeColor('statusBarItem.errorForeground');
  item.show();

  context.subscriptions.push(
    item,
    vscode.commands.registerCommand('cads.logout', logout),
    { dispose: () => channel.close() },
  );
}

export function deactivate(): void {}
