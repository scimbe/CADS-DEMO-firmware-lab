import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('cads.bridge.ping', async () => {
      const started = Date.now();
      const probe = await vscode.commands.executeCommand<unknown>('cads.probe.ping');
      return {
        bridge: { node: process.version, platform: process.platform, pid: process.pid },
        probe,
        roundTripMs: Date.now() - started,
      };
    }),
  );
}

export function deactivate(): void {
  // nothing yet
}
