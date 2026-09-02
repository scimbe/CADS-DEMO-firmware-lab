/* types.ts – the probe interface of docs/SPEC.md §3.1 (shared by cads-probe and the bridge). */

export interface ProbeStatus {
  usb: 'absent' | 'connected' | 'error';
  serial: 'absent' | 'open' | 'error';
  stlink?: { version: string; serial?: string; targetVoltage?: number };
  target?: { coreId: number; chipId: number; devName?: string; flashSize?: number; sramSize?: number };
  core?: 'halted' | 'running' | 'reset' | 'unknown';
  lastError?: string;
  /** Additions (documented in docs/BRIDGE-NOTES.md): */
  serialPortKnown?: boolean;
  usbDeviceKnown?: boolean;
}

export type ProbeOp =
  | { op: 'halt' }
  | { op: 'run' }
  | { op: 'step' }
  | { op: 'resetHalt' }
  | { op: 'resetRun' }
  | { op: 'getState' }
  | { op: 'readMem'; addr: number; len: number }
  | { op: 'writeMem'; addr: number; data: string }
  | { op: 'readRegs' }
  | { op: 'readReg'; index: number }
  | { op: 'writeReg'; index: number; value: number }
  | { op: 'setBreakpoint'; addr: number }
  | { op: 'clearBreakpoint'; addr: number }
  | { op: 'setWatchpoint'; addr: number; len: number; kind: 'read' | 'write' | 'access' }
  | { op: 'clearWatchpoint'; addr: number }
  | { op: 'clearAllBreakpoints' }
  | { op: 'setVectorCatch'; enabled: boolean }
  | { op: 'flash'; addr: number; data: string; verify: boolean }
  | { op: 'serialOpen'; baud: number }
  | { op: 'serialWrite'; data: string }
  | { op: 'serialClose' };

export type ProbeErrorCodeT = 'NO_DEVICE' | 'USB_IO' | 'TARGET_FAULT' | 'UNSUPPORTED';

export type ProbeResult =
  | ({ ok: true } & Record<string, unknown>)
  | { ok: false; error: string; code?: ProbeErrorCodeT };

export type ProbeEvent =
  | { type: 'usb-connect' | 'usb-disconnect'; status: ProbeStatus }
  | { type: 'serial-open' }
  | { type: 'serial-close'; error?: string }
  | { type: 'serial-data'; data: string }
  | { type: 'halted'; reason: string; pc: number }
  | { type: 'flash-progress'; done: number; total: number; phase: 'erase' | 'program' | 'verify' }
  | { type: 'log'; level: 'info' | 'warn' | 'error'; message: string };

export interface ProbeBatchRequest {
  batch: ProbeOp[];
}
