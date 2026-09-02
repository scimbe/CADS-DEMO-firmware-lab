/**
 * Types of the Board-Bridge exports API (SPEC §3.2). The tutor consumes this through
 * `vscode.extensions.getExtension('cads.cads-board-bridge')?.exports`; the bridge may be absent.
 */
export interface DisposableLike {
  dispose(): unknown;
}

export interface BoardStatus {
  connected: boolean;
  serialOpen: boolean;
  core?: "halted" | "running" | "reset" | "unknown";
  lastFlash?: { file: string; addr: number; ok: boolean; at: number | string };
  gdbClients?: number;
}

export type BridgeEventType = "flash-done" | "flash-failed" | "reset" | "debug-stop" | "debug-start" | "debug-end";

export interface BridgeEvent {
  type: BridgeEventType;
  detail?: unknown;
}

export interface BoardBridgeApi {
  getStatus(): BoardStatus;
  onDidChangeStatus(cb: (s: BoardStatus) => void): DisposableLike;
  onSerialLine(cb: (line: string) => void): DisposableLike;
  onEvent(cb: (e: BridgeEvent) => void): DisposableLike;
  flash(file?: string): Promise<{ ok: boolean; error?: string }>;
  sendSerial(text: string): Promise<void>;
  waitForSerial(pattern: RegExp, timeoutMs: number): Promise<string | null>;
}

export const BRIDGE_EXTENSION_ID = "cads.cads-board-bridge";

/** Serial patterns that trigger a contextual Socratic question (SPEC §3.3). */
export const SERIAL_ERROR_PATTERNS: { name: "hardfault" | "assert" | "result-fail"; re: RegExp }[] = [
  { name: "hardfault", re: /HardFault/i },
  { name: "assert", re: /configASSERT/i },
  { name: "result-fail", re: /RESULT:\s*FAIL/i },
];

export function lastFlashTime(status: BoardStatus | undefined): number | undefined {
  const at = status?.lastFlash?.at;
  if (at === undefined) return undefined;
  if (typeof at === "number") return at;
  const t = Date.parse(at);
  return Number.isNaN(t) ? undefined : t;
}
