/* cads-board-bridge – Node extension host side (spec §3.2).
 *
 * GDB-RSP server (3333), serial TCP (3334) + socat PTY, HTTP shim API (3335), commands,
 * status bar, "CaDS Board Console" terminal, cortex-debug configuration provider, exports API.
 */
import * as net from 'node:net';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { BoardController, type BoardEvent, type BoardStatus } from './board';
import { createHttpServer } from './http';
import { boardMessage, boardMessageLine } from './messages';
import { listenWithRetry } from './listen';
import { VsCodeProbeClient } from './probeClient';
import { GdbSession } from './rsp/server';
import { SerialTcpServer, SocatPty } from './serialServer';
import type { ProbeEvent } from './types';

export interface BoardBridgeApi {
  getStatus(): BoardStatus;
  onDidChangeStatus(cb: (s: BoardStatus) => void): vscode.Disposable;
  onSerialLine(cb: (line: string) => void): vscode.Disposable;
  onEvent(cb: (e: BoardEvent) => void): vscode.Disposable;
  flash(file?: string): Promise<{ ok: boolean; error?: string }>;
  sendSerial(text: string): Promise<void>;
  waitForSerial(pattern: RegExp, timeoutMs: number): Promise<string | null>;
  /** Additions (documented in docs/BRIDGE-NOTES.md): */
  connect(): Promise<BoardStatus>;
  reset(): Promise<{ ok: boolean; error?: string }>;
}

function cfg<T>(key: string, fallback: T): T {
  return vscode.workspace.getConfiguration('cads.board').get<T>(key, fallback);
}

function workspaceRoot(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

function resolveImagePath(file?: string): string | undefined {
  const root = workspaceRoot();
  const rel = file ?? cfg('defaultImage', 'build/itsboard/cads-zero.bin');
  if (path.isAbsolute(rel)) return rel;
  return root ? path.join(root, rel) : undefined;
}

export function activate(context: vscode.ExtensionContext): BoardBridgeApi {
  const out = vscode.window.createOutputChannel('CaDS Board');
  context.subscriptions.push(out);
  const ring: string[] = [];
  const emit = (level: string, m: string): void => {
    const line = `${new Date().toISOString()} [${level}] ${m}`;
    out.appendLine(line);
    ring.push(line);
    if (ring.length > 2000) ring.splice(0, ring.length - 2000);
  };
  const log = {
    debug: (m: string) => {
      if (cfg('verbose', false)) emit('debug', m);
    },
    info: (m: string) => emit('info', m),
    warn: (m: string) => emit('warn', m),
    error: (m: string) => emit('error', m),
  };

  const probe = new VsCodeProbeClient();
  const board = new BoardController(probe, log);
  board.setBaud(cfg('baud', 115200));

  // ---- events from the web side --------------------------------------------------------
  context.subscriptions.push(vscode.commands.registerCommand('cads.bridge.event', (ev: ProbeEvent) => probe.dispatch(ev)));

  // ---- B0 ping (kept: cheap health check for e2e tests) --------------------------------
  context.subscriptions.push(
    vscode.commands.registerCommand('cads.bridge.ping', async () => {
      const started = Date.now();
      let probeInfo: unknown;
      try {
        probeInfo = await vscode.commands.executeCommand<unknown>('cads.probe.ping');
      } catch (e) {
        probeInfo = { error: String(e) };
      }
      const result = { bridge: { node: process.version, platform: process.platform, pid: process.pid }, probe: probeInfo, roundTripMs: Date.now() - started };
      log.info(`[ping] ${JSON.stringify(result)}`);
      void vscode.window.showInformationMessage(`CaDS ping: ${JSON.stringify(result)}`);
      return result;
    }),
  );

  // ---- status bar ------------------------------------------------------------------------
  const statusItem = vscode.window.createStatusBarItem('cads.board.status', vscode.StatusBarAlignment.Left, 50);
  statusItem.name = 'CaDS Board';
  statusItem.command = 'cads.board.showMenu';
  context.subscriptions.push(statusItem);
  const renderStatus = (s: BoardStatus): void => {
    if (!s.connected) {
      statusItem.text = '$(plug) Board: getrennt';
      statusItem.tooltip = 'CaDS Board – nicht verbunden. Klicken zum Verbinden.';
      statusItem.backgroundColor = undefined;
    } else {
      const core = s.core === 'halted' ? 'angehalten' : s.core === 'running' ? 'läuft' : s.core;
      const serial = s.serialOpen ? ' · Konsole' : '';
      const gdb = s.gdbClients > 0 ? ' · GDB' : '';
      statusItem.text = `$(plug) Board: verbunden · ${core}${serial}${gdb}`;
      const t = s.probe?.target;
      statusItem.tooltip = `ST-Link ${s.probe?.stlink?.version ?? ''} – ${t?.devName ?? ''} (${t?.flashSize ?? '?'} KB)\nCore: ${s.core}${s.lastFlash ? `\nLetzter Flash: ${s.lastFlash.file} ${s.lastFlash.ok ? 'ok' : 'FEHLER'} (${s.lastFlash.at})` : ''}`;
      statusItem.backgroundColor = s.core === 'halted' && s.gdbClients === 0 ? new vscode.ThemeColor('statusBarItem.warningBackground') : undefined;
    }
    statusItem.show();
  };
  board.statusChanged.on(renderStatus);
  renderStatus(board.getStatus());

  // ---- terminal --------------------------------------------------------------------------
  let terminal: vscode.Terminal | undefined;
  const openConsole = (): vscode.Terminal => {
    if (terminal) {
      terminal.show();
      return terminal;
    }
    const writeEmitter = new vscode.EventEmitter<string>();
    const closeEmitter = new vscode.EventEmitter<void>();
    let sub: { dispose(): void } | undefined;
    const pty: vscode.Pseudoterminal = {
      onDidWrite: writeEmitter.event,
      onDidClose: closeEmitter.event,
      open: () => {
        writeEmitter.fire('\x1b[36m[CaDS Board Console – serielle Konsole des Boards, 115200 Baud. Ctrl-] beendet nicht, Terminal schließen genügt.]\x1b[0m\r\n');
        sub = board.serialData.on((d) => writeEmitter.fire(d.toString('latin1').replace(/(?<!\r)\n/g, '\r\n')));
        if (!board.getStatus().serialOpen) {
          void board.openSerial().then((ok) => {
            if (!ok) writeEmitter.fire('\x1b[33m[Konsole nicht offen – Board verbinden (Statusleiste) und Serial-Port freigeben]\x1b[0m\r\n');
          });
        }
      },
      close: () => {
        sub?.dispose();
        terminal = undefined;
      },
      handleInput: (data: string) => {
        // local echo so the student sees what they type; the firmware accepts '\r' as EOL
        writeEmitter.fire(data === '\r' ? '\r\n' : data === '\x7f' ? '\b \b' : data);
        board.sendSerial(data).catch((e) => writeEmitter.fire(`\r\n\x1b[31m[senden fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}]\x1b[0m\r\n`));
      },
    };
    terminal = vscode.window.createTerminal({ name: 'CaDS Board Console', pty, iconPath: new vscode.ThemeIcon('plug') });
    terminal.show();
    return terminal;
  };

  // ---- GDB server ------------------------------------------------------------------------
  let gdbSessions = 0;
  const gdbPort = cfg('gdbPort', 3333);
  const gdbServer = net.createServer((sock) => {
    if (gdbSessions > 0) {
      log.warn('second GDB client refused (one session at a time)');
      sock.destroy();
      return;
    }
    gdbSessions++;
    board.setGdbClients(gdbSessions);
    sock.setNoDelay(true);
    const session = new GdbSession(
      { write: (d) => void sock.write(d), end: () => sock.end() },
      {
        probe,
        log,
        hooks: {
          onSessionStart: () => board.events.fire({ type: 'debug-start' }),
          onSessionEnd: () => board.events.fire({ type: 'debug-end' }),
          onStop: () => board.refresh().catch(() => undefined),
          onResume: () => board.refresh().catch(() => undefined),
          onFlash: (addr, bytes, ok, error) => board.events.fire({ type: ok ? 'flash-done' : 'flash-failed', detail: { addr, bytes, error, via: 'gdb' } }),
          onError: (m) => {
            statusItem.text = `$(warning) Board: ${m.slice(0, 40)}`;
            setTimeout(() => renderStatus(board.getStatus()), 4000);
          },
        },
        monitor: async (cmd) => {
          if (cmd.trim() === 'status') return [JSON.stringify(board.getStatus())];
          return undefined;
        },
      },
    );
    log.info(`GDB client connected from ${sock.remoteAddress ?? '?'}:${sock.remotePort ?? '?'}`);
    void session.start();
    sock.on('data', (d: Buffer) => session.feed(d));
    let done_ran = false;
    const done = (): void => {
      if (done_ran) return;
      done_ran = true;
      gdbSessions = Math.max(0, gdbSessions - 1);
      board.setGdbClients(gdbSessions);
      // If the debugger dropped the socket without a detach/kill, the core may be left halted.
      // Resume it (and drop our breakpoints / vector catch) so closing the debugger never
      // freezes the student's board (cads-zero: "a bare write/attach left halted looks like a crash").
      session
        .releaseTarget(true)
        .catch((e) => log.warn(`resume-on-disconnect: ${e instanceof Error ? e.message : String(e)}`))
        .finally(() => {
          session.close();
          log.info('GDB client disconnected');
          void board.refresh();
        });
    };
    sock.on('close', done);
    sock.on('error', done);
  });
  const gdbListener = listenWithRetry(gdbServer, gdbPort, '127.0.0.1', 'GDB server', log);
  context.subscriptions.push({ dispose: () => { gdbListener.dispose(); gdbServer.close(); } });

  // ---- serial TCP + socat + HTTP ---------------------------------------------------------
  const serialPort = cfg('serialPort', 3334);
  const serialTcp = new SerialTcpServer(board, log);
  const serialListener = listenWithRetry(serialTcp.server, serialPort, '127.0.0.1', 'serial TCP', log);
  context.subscriptions.push({ dispose: () => { serialListener.dispose(); serialTcp.close(); } });
  const socat = new SocatPty(cfg('consoleLink', '/home/coder/board-console'), serialPort, log);
  socat.start();
  context.subscriptions.push({ dispose: () => socat.stop() });

  const httpPort = cfg('httpPort', 3335);
  const httpServer = createHttpServer(board, log, {
    log: () => ring.slice(-400),
    command: cfg('httpCommandsEnabled', true)
      ? async (command, args) => {
          const r = await vscode.commands.executeCommand<unknown>(command, ...args);
          return r;
        }
      : undefined,
  });
  const httpListener = listenWithRetry(httpServer, httpPort, '127.0.0.1', 'HTTP shim API', log);
  context.subscriptions.push({ dispose: () => { httpListener.dispose(); httpServer.close(); } });

  // ---- commands --------------------------------------------------------------------------
  const flashCommand = async (file?: string): Promise<{ ok: boolean; error?: string }> => {
    const target = resolveImagePath(file);
    if (!target) return { ok: false, error: 'no workspace folder and no absolute path' };
    if (!board.getStatus().connected) {
      const s = await board.connect();
      if (!s.connected) return { ok: false, error: 'board not connected' };
    }
    return vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: `CaDS: Flash ${path.basename(target)}`, cancellable: false }, async (progress) => {
      let lastPct = 0;
      const sub = board.flashProgress.on((p) => {
        const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
        progress.report({ message: `${p.phase} ${pct}%`, increment: 0 });
        lastPct = pct;
      });
      try {
        const r = await board.flashFile(target);
        if (r.ok) void vscode.window.setStatusBarMessage(`$(check) Flash ok: ${r.bytes} Bytes in ${r.ms} ms`, 6000);
        else void vscode.window.showErrorMessage(`Flash fehlgeschlagen: ${r.error}`);
        return r;
      } finally {
        sub.dispose();
        void lastPct;
      }
    });
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('cads.board.connect', async () => {
      const s = await board.connect();
      if (!s.connected) {
        // The raw DOMException reads like a broken board; say who is holding it instead.
        const m = boardMessage(s.probe?.blockReason, vscode.env.language);
        const pick = await vscode.window.showWarningMessage(m.title, { modal: false, detail: m.action }, 'Erneut verbinden', 'Log anzeigen');
        if (pick === 'Erneut verbinden') await vscode.commands.executeCommand('cads.board.connect');
        else if (pick === 'Log anzeigen') await vscode.commands.executeCommand('cads.board.showPanel');
        log.warn(`connect refused (${s.probe?.blockReason ?? 'unknown'}): ${s.probe?.lastError ?? '-'}`);
      }
      return s;
    }),
    vscode.commands.registerCommand('cads.board.disconnect', () => board.disconnect()),
    vscode.commands.registerCommand('cads.board.flash', (file?: string) => flashCommand(file)),
    vscode.commands.registerCommand('cads.board.reset', () => board.reset()),
    vscode.commands.registerCommand('cads.board.halt', () => board.halt()),
    vscode.commands.registerCommand('cads.board.run', () => board.run()),
    vscode.commands.registerCommand('cads.board.openConsole', () => openConsole()),
    vscode.commands.registerCommand('cads.board.status', () => board.getStatus()),
    vscode.commands.registerCommand('cads.board.refresh', () => board.refresh()),
    vscode.commands.registerCommand('cads.board.showPanel', () => {
      out.show(true);
      return board.getStatus();
    }),
    vscode.commands.registerCommand('cads.board.release', async () => {
      const s = await board.release();
      void vscode.window.setStatusBarMessage('$(check) Board freigegeben – ein anderer Tab kann es jetzt benutzen', 6000);
      return s;
    }),
    vscode.commands.registerCommand('cads.board.showMenu', async () => {
      const s = board.getStatus();
      const items: (vscode.QuickPickItem & { cmd: string })[] = s.connected
        ? [
            { label: '$(zap) Flash (build/itsboard/cads-zero.bin)', cmd: 'cads.board.flash' },
            { label: '$(debug-restart) Reset', cmd: 'cads.board.reset' },
            { label: s.core === 'halted' ? '$(debug-continue) Weiterlaufen lassen' : '$(debug-pause) Anhalten', cmd: s.core === 'halted' ? 'cads.board.run' : 'cads.board.halt' },
            { label: '$(terminal) Konsole öffnen', cmd: 'cads.board.openConsole' },
            { label: '$(output) Log anzeigen', cmd: 'cads.board.showPanel' },
            { label: '$(debug-disconnect) Trennen', cmd: 'cads.board.disconnect' },
            { label: '$(circle-slash) Board freigeben (für einen anderen Tab)', cmd: 'cads.board.release' },
          ]
        : [
            { label: '$(plug) Board verbinden (USB/Serial freigeben)', cmd: 'cads.board.connect' },
            { label: '$(output) Log anzeigen', cmd: 'cads.board.showPanel' },
          ];
      const pick = await vscode.window.showQuickPick(items, { title: `CaDS Board – ${s.connected ? 'verbunden' : 'getrennt'}` });
      if (pick) await vscode.commands.executeCommand(pick.cmd);
    }),
  );

  // ---- cortex-debug configuration provider ---------------------------------------------
  const debugConfig = (): vscode.DebugConfiguration => ({
    name: 'Debug CaDS Zero (Board im Browser)',
    type: 'cortex-debug',
    request: 'launch',
    cwd: '${workspaceFolder}',
    executable: '${workspaceFolder}/build/itsboard/cads-zero.elf',
    servertype: 'external',
    gdbTarget: `127.0.0.1:${gdbPort}`,
    gdbPath: cfg('gdbPath', 'arm-none-eabi-gdb'),
    svdFile: '${workspaceFolder}/targets/itsboard/STM32F429.svd',
    preLaunchTask: 'CaDS: Build + Flash',
    overrideLaunchCommands: ['monitor reset halt'],
    overrideRestartCommands: ['monitor reset halt'],
    runToEntryPoint: 'main',
    showDevDebugOutput: 'none',
  });
  context.subscriptions.push(
    vscode.debug.registerDebugConfigurationProvider(
      'cortex-debug',
      {
        provideDebugConfigurations: () => [debugConfig()],
        resolveDebugConfiguration: async (_folder, config) => {
          if (!config.type && !config.request && !config.name) {
            // F5 without launch.json
            Object.assign(config, debugConfig());
          }
          if (config.servertype !== 'external' || !String(config.gdbTarget ?? '').endsWith(`:${gdbPort}`)) return config;
          if (!board.getStatus().connected) {
            const choice = await vscode.window.showInformationMessage('Das Board ist nicht verbunden. Jetzt verbinden?', { modal: true }, 'Verbinden');
            if (choice !== 'Verbinden') return undefined;
            const s = await board.connect();
            if (!s.connected) {
              void vscode.window.showErrorMessage(`Board konnte nicht verbunden werden${s.probe?.lastError ? `: ${s.probe.lastError}` : ''}`);
              return undefined;
            }
          }
          return config;
        },
      },
      vscode.DebugConfigurationProviderTriggerKind.Dynamic,
    ),
    vscode.debug.registerDebugConfigurationProvider('cortex-debug', { provideDebugConfigurations: () => [debugConfig()] }, vscode.DebugConfigurationProviderTriggerKind.Initial),
  );

  // ---- startup: pick up already granted devices ----------------------------------------
  setTimeout(() => {
    probe
      .reconnect()
      .then(() => board.refresh())
      .catch((e) => log.warn(`startup reconnect: ${e instanceof Error ? e.message : String(e)}`));
  }, 1500);

  board.events.on((e) => log.info(`event ${e.type}${e.detail ? ' ' + JSON.stringify(e.detail) : ''}`));
  board.serialLine.on((line) => log.debug(`serial: ${line}`));

  const api: BoardBridgeApi = {
    getStatus: () => board.getStatus(),
    onDidChangeStatus: (cb) => new vscode.Disposable(board.statusChanged.on(cb).dispose),
    onSerialLine: (cb) => new vscode.Disposable(board.serialLine.on(cb).dispose),
    onEvent: (cb) => new vscode.Disposable(board.events.on(cb).dispose),
    flash: (file) => flashCommand(file),
    sendSerial: (text) => board.sendSerial(text),
    waitForSerial: (pattern, timeoutMs) => board.waitForSerial(pattern, timeoutMs),
    connect: () => board.connect(),
    reset: () => board.reset(),
  };
  return api;
}

export function deactivate(): void {
  // servers are closed via context.subscriptions
}
