/**
 * VS Code-bound helpers for the check runner: running tasks by label, shell tasks, tracking
 * debugger stops (bridge events + a DebugAdapterTracker on every session) and locating the
 * Board-Bridge exports.
 */
import * as vscode from "vscode";
import { BRIDGE_EXTENSION_ID, type BoardBridgeApi } from "./bridge";
import type { DebugStopRecord } from "./checks/runner";

export function getBridge(): BoardBridgeApi | undefined {
  const ext = vscode.extensions.getExtension<BoardBridgeApi>(BRIDGE_EXTENSION_ID);
  const api = ext?.exports;
  if (!api || typeof api.getStatus !== "function") return undefined;
  return api;
}

/** Activates the bridge if present but inactive (its exports are only available after activation). */
export async function ensureBridge(): Promise<BoardBridgeApi | undefined> {
  const ext = vscode.extensions.getExtension<BoardBridgeApi>(BRIDGE_EXTENSION_ID);
  if (!ext) return undefined;
  try {
    if (!ext.isActive) await ext.activate();
  } catch {
    return undefined;
  }
  return getBridge();
}

function waitForExit(execution: vscode.TaskExecution, timeoutMs: number): Promise<number | undefined> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      dispose();
      try {
        execution.terminate();
      } catch {
        /* ignore */
      }
      resolve(undefined);
    }, timeoutMs);
    const subs: vscode.Disposable[] = [];
    const dispose = () => {
      clearTimeout(timer);
      for (const d of subs) d.dispose();
    };
    subs.push(
      vscode.tasks.onDidEndTaskProcess((e) => {
        if (e.execution === execution || e.execution.task === execution.task) {
          dispose();
          resolve(e.exitCode);
        }
      }),
      vscode.tasks.onDidEndTask((e) => {
        if (e.execution === execution) {
          // Ended without a process event (e.g. custom execution): give the process event a moment.
          setTimeout(() => {
            dispose();
            resolve(undefined);
          }, 500);
        }
      })
    );
  });
}

/** Runs the workspace task whose name/label equals `label`; resolves with its exit code. */
export async function runTaskByLabel(label: string, timeoutMs: number): Promise<number | undefined> {
  const tasks = await vscode.tasks.fetchTasks();
  const task = tasks.find((t) => t.name === label) ?? tasks.find((t) => `${t.source}: ${t.name}` === label);
  if (!task) throw new Error(`task "${label}" not found (define it in .vscode/tasks.json)`);
  const execution = await vscode.tasks.executeTask(task);
  return waitForExit(execution, timeoutMs);
}

export async function runShellTask(name: string, command: string, cwd: string, timeoutMs: number): Promise<number | undefined> {
  const folder = vscode.workspace.workspaceFolders?.[0];
  const task = new vscode.Task({ type: "shell", task: name }, folder ?? vscode.TaskScope.Workspace, name, "CaDS Tutor", new vscode.ShellExecution(command, { cwd }));
  task.presentationOptions = { reveal: vscode.TaskRevealKind.Always, panel: vscode.TaskPanelKind.Shared, clear: true };
  const execution = await vscode.tasks.executeTask(task);
  return waitForExit(execution, timeoutMs);
}

/**
 * Observes debugger stops from two sources: the Board-Bridge's `debug-stop` events (SPEC §3.2)
 * and, independently of the bridge, a DebugAdapterTracker that records the top stack frame of
 * every `stackTrace` response following a `stopped` event (works with cortex-debug or any DAP).
 */
export class DebugStopTracker implements vscode.Disposable {
  readonly stops: DebugStopRecord[] = [];
  private readonly waiters = new Set<(s: DebugStopRecord) => void>();
  private readonly disposables: vscode.Disposable[] = [];
  private pendingStop = false;

  constructor() {
    this.disposables.push(
      vscode.debug.registerDebugAdapterTrackerFactory("*", {
        createDebugAdapterTracker: () => ({
          onDidSendMessage: (m: { type?: string; event?: string; command?: string; body?: { stackFrames?: { source?: { path?: string; name?: string }; line?: number }[] } }) => {
            if (m.type === "event" && m.event === "stopped") this.pendingStop = true;
            if (m.type === "event" && m.event === "continued") this.pendingStop = false;
            if (m.type === "response" && m.command === "stackTrace" && this.pendingStop) {
              const frame = m.body?.stackFrames?.[0];
              if (frame) {
                this.pendingStop = false;
                this.push({ at: Date.now(), file: frame.source?.path ?? frame.source?.name, line: frame.line });
              }
            }
          },
        }),
      })
    );
  }

  attachBridge(bridge: BoardBridgeApi): void {
    try {
      this.disposables.push(
        bridge.onEvent((e) => {
          if (e.type !== "debug-stop") return;
          const d = (e.detail ?? {}) as { file?: string; line?: number; path?: string };
          this.push({ at: Date.now(), file: d.file ?? d.path, line: d.line });
        }) as vscode.Disposable
      );
    } catch {
      /* bridge without onEvent – ignore */
    }
  }

  push(record: DebugStopRecord): void {
    this.stops.push(record);
    if (this.stops.length > 200) this.stops.splice(0, this.stops.length - 200);
    for (const w of [...this.waiters]) w(record);
  }

  waitFor(match: (s: DebugStopRecord) => boolean, timeoutMs: number): Promise<DebugStopRecord | null> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.waiters.delete(handler);
        resolve(null);
      }, timeoutMs);
      const handler = (s: DebugStopRecord) => {
        if (!match(s)) return;
        clearTimeout(timer);
        this.waiters.delete(handler);
        resolve(s);
      };
      this.waiters.add(handler);
    });
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
    this.waiters.clear();
  }
}
