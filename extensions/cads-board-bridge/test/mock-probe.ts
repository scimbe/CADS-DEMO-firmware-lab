import { ProbeService } from '../../cads-probe/src/driver/probe';
import type { ProbeEvent, ProbeOp, ProbeResult } from '../../cads-probe/src/driver/types';
import { MockStlinkDevice, MockTarget } from '../../cads-probe/test/mock-stlink';
import type { GdbProbe } from '../src/rsp/server';

/** GdbProbe on top of the real ProbeService + simulated hardware. */
export class MockProbe implements GdbProbe {
  readonly target = new MockTarget();
  readonly device = new MockStlinkDevice(this.target);
  readonly service: ProbeService;
  private listeners = new Set<(e: ProbeEvent) => void>();
  constructor() {
    this.service = new ProbeService({ emit: (e) => this.listeners.forEach((cb) => cb(e)), pollIntervalMs: 10 });
  }
  attach(): Promise<unknown> {
    return this.service.attachUsb(this.device);
  }
  op(request: ProbeOp): Promise<ProbeResult> {
    return this.service.op(request);
  }
  async batch(requests: ProbeOp[]): Promise<ProbeResult[]> {
    return (await this.service.batch(requests)).results;
  }
  onEvent(cb: (e: ProbeEvent) => void): { dispose(): void } {
    this.listeners.add(cb);
    return { dispose: () => this.listeners.delete(cb) };
  }
}

