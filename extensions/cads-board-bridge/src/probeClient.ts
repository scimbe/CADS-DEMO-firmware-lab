/* probeClient.ts – Node-side view of cads-probe (spec §3.1) via vscode.commands.
 *
 * Serialises every call, keeps the last known ProbeStatus, fans out ProbeEvents. All other
 * bridge modules depend on the `Probe` interface only, so tests can use a mock.
 */
import * as vscode from 'vscode';
import type { ProbeEvent, ProbeOp, ProbeResult, ProbeStatus } from './types';

export interface Probe {
  op(request: ProbeOp): Promise<ProbeResult>;
  batch(requests: ProbeOp[]): Promise<ProbeResult[]>;
  getStatus(): Promise<ProbeStatus>;
  requestDevices(opts?: { usb?: boolean; serial?: boolean }): Promise<ProbeStatus>;
  reconnect(): Promise<ProbeStatus>;
  disconnect(): Promise<ProbeStatus>;
  /** Close device + port and drop the profile-wide lock, so another tab can have the board. */
  release(): Promise<ProbeStatus>;
  /** Tell the probe whether live core state is worth USB traffic right now. */
  setPollingWanted(wanted: boolean): Promise<ProbeStatus>;
  readonly lastStatus: ProbeStatus | null;
  onEvent(cb: (e: ProbeEvent) => void): { dispose(): void };
}

const ABSENT: ProbeStatus = { usb: 'absent', serial: 'absent', core: 'unknown' };

export class VsCodeProbeClient implements Probe {
  private chain: Promise<unknown> = Promise.resolve();
  private listeners = new Set<(e: ProbeEvent) => void>();
  lastStatus: ProbeStatus | null = null;
  /** Round-trip statistics (ms) for the report. */
  readonly stats = { ops: 0, totalMs: 0, maxMs: 0 };

  private serial<T>(fn: () => Promise<T>): Promise<T> {
    const p = this.chain.then(fn, fn);
    this.chain = p.catch(() => undefined);
    return p;
  }

  private async exec<T>(command: string, ...args: unknown[]): Promise<T> {
    const t0 = Date.now();
    try {
      return await vscode.commands.executeCommand<T>(command, ...args);
    } finally {
      const dt = Date.now() - t0;
      this.stats.ops++;
      this.stats.totalMs += dt;
      if (dt > this.stats.maxMs) this.stats.maxMs = dt;
    }
  }

  private static notReachable(e: unknown): ProbeResult {
    return { ok: false, error: `cads-probe not reachable: ${e instanceof Error ? e.message : String(e)}`, code: 'NO_DEVICE' };
  }

  op(request: ProbeOp): Promise<ProbeResult> {
    return this.serial(async () => {
      try {
        return await this.exec<ProbeResult>('cads.probe.op', request);
      } catch (e) {
        return VsCodeProbeClient.notReachable(e);
      }
    });
  }

  batch(requests: ProbeOp[]): Promise<ProbeResult[]> {
    return this.serial(async () => {
      try {
        const r = await this.exec<{ results: ProbeResult[] }>('cads.probe.op', { batch: requests });
        return r.results;
      } catch (e) {
        return [VsCodeProbeClient.notReachable(e)];
      }
    });
  }

  async getStatus(): Promise<ProbeStatus> {
    try {
      this.lastStatus = await this.exec<ProbeStatus>('cads.probe.getStatus');
    } catch {
      this.lastStatus = { ...ABSENT, lastError: 'cads-probe extension not active' };
    }
    return this.lastStatus;
  }

  async requestDevices(opts?: { usb?: boolean; serial?: boolean }): Promise<ProbeStatus> {
    this.lastStatus = await this.exec<ProbeStatus>('cads.probe.requestDevices', opts ?? { usb: true, serial: true });
    return this.lastStatus;
  }

  async reconnect(): Promise<ProbeStatus> {
    this.lastStatus = await this.exec<ProbeStatus>('cads.probe.reconnect');
    return this.lastStatus;
  }

  async release(): Promise<ProbeStatus> {
    this.lastStatus = await this.exec<ProbeStatus>('cads.probe.release');
    return this.lastStatus;
  }

  async setPollingWanted(wanted: boolean): Promise<ProbeStatus> {
    this.lastStatus = await this.exec<ProbeStatus>('cads.probe.setPollingWanted', wanted);
    return this.lastStatus;
  }

  async disconnect(): Promise<ProbeStatus> {
    this.lastStatus = await this.exec<ProbeStatus>('cads.probe.disconnect');
    return this.lastStatus;
  }

  /** Called by the `cads.bridge.event` command. */
  dispatch(event: ProbeEvent): void {
    if (event.type === 'usb-connect' || event.type === 'usb-disconnect') this.lastStatus = event.status;
    for (const cb of Array.from(this.listeners)) {
      try {
        cb(event);
      } catch {
        // listener errors must not break the event pump
      }
    }
  }

  onEvent(cb: (e: ProbeEvent) => void): { dispose(): void } {
    this.listeners.add(cb);
    return { dispose: () => this.listeners.delete(cb) };
  }
}
