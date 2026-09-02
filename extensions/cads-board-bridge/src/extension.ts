import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext): void {
  const out = vscode.window.createOutputChannel('CaDS Bridge');
  context.subscriptions.push(out);
  context.subscriptions.push(
    vscode.commands.registerCommand('cads.bridge.ping', async () => {
      const started = Date.now();
      let probe: unknown;
      try {
        probe = await vscode.commands.executeCommand<unknown>('cads.probe.ping');
      } catch (e) {
        probe = { error: String(e) };
      }
      const result = {
        bridge: { node: process.version, platform: process.platform, pid: process.pid },
        probe,
        roundTripMs: Date.now() - started,
      };
      const text = JSON.stringify(result);
      out.appendLine(`[ping] ${text}`);
      void vscode.window.showInformationMessage(`CaDS ping: ${text}`);
      return result;
    }),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('cads.bridge.requestDevices', async () => {
      let probe: unknown;
      try {
        probe = await vscode.commands.executeCommand<unknown>('cads.probe.requestDevices');
      } catch (e) {
        probe = { error: String(e) };
      }
      const text = JSON.stringify(probe);
      out.appendLine(`[requestDevices] ${text}`);
      void vscode.window.showInformationMessage(`CaDS requestDevices: ${text}`);
      return probe;
    }),
  );
}

export function deactivate(): void {
  // nothing yet
}
