/* board.test.ts – PB-02: a `halted` event is a fast hint, not the owner of board state.
 *
 * Two independent measures, tested independently:
 *  - a `halted` event whose pc lands outside flash/SRAM/CCM is not applied at all;
 *  - ANY `halted` event schedules a debounced refresh() that asks the probe directly, so a
 *    wrong (or unreported) transition self-corrects instead of surviving until the next
 *    unrelated event happens to fire.
 */
import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { BoardController, type BoardLogger } from '../src/board';
import type { Probe } from '../src/probeClient';
import type { ProbeEvent, ProbeStatus } from '../src/types';

function silentLogger(): BoardLogger {
  return { info: () => undefined, warn: () => undefined, error: () => undefined };
}

/** Enough of Probe for BoardController: getStatus() is what refresh() calls. */
class FakeProbe implements Probe {
  lastStatus: ProbeStatus | null = null;
  private listeners = new Set<(e: ProbeEvent) => void>();
  statusToReport: ProbeStatus = { usb: 'connected', serial: 'absent', core: 'unknown' };

  async op(): Promise<never> {
    throw new Error('not used by this test');
  }
  async batch(): Promise<never[]> {
    return [];
  }
  async getStatus(): Promise<ProbeStatus> {
    this.lastStatus = this.statusToReport;
    return this.statusToReport;
  }
  async requestDevices(): Promise<ProbeStatus> {
    return this.statusToReport;
  }
  async reconnect(): Promise<ProbeStatus> {
    return this.statusToReport;
  }
  async disconnect(): Promise<ProbeStatus> {
    return this.statusToReport;
  }
  async release(): Promise<ProbeStatus> {
    return this.statusToReport;
  }
  async setPollingWanted(): Promise<ProbeStatus> {
    return this.statusToReport;
  }
  onEvent(cb: (e: ProbeEvent) => void): { dispose(): void } {
    this.listeners.add(cb);
    return { dispose: () => this.listeners.delete(cb) };
  }
  fire(e: ProbeEvent): void {
    for (const cb of this.listeners) cb(e);
  }
}

describe('PB-02: halted events do not own board state on their own', () => {
  it('drops a halted event whose pc lies outside flash/SRAM/CCM', () => {
    const probe = new FakeProbe();
    const board = new BoardController(probe, silentLogger());
    board.getStatus(); // establish a baseline core value below
    const seen: string[] = [];
    board.events.on((e) => seen.push(e.type));
    // 0xE000ED30 is DFSR's own register address - the exact garbled value measured live.
    probe.fire({ type: 'halted', reason: 'unknown', pc: 0xe000ed30 });
    assert.equal(board.getStatus().core, 'unknown', 'the implausible-pc event must not move core state');
    assert.ok(!seen.includes('debug-stop'), 'a dropped event must not fire debug-stop either');
  });

  it('applies a halted event whose pc is a real flash address', () => {
    const probe = new FakeProbe();
    const board = new BoardController(probe, silentLogger());
    probe.fire({ type: 'halted', reason: 'breakpoint', pc: 0x08000140 });
    assert.equal(board.getStatus().core, 'halted');
  });

  it('schedules a debounced refresh after ANY halted event, plausible pc or not', async () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    try {
      const probe = new FakeProbe();
      probe.statusToReport = { usb: 'connected', serial: 'absent', core: 'running' }; // ground truth: already running
      const board = new BoardController(probe, silentLogger());
      // A halt hint the event stream reported, even though the probe itself now says running -
      // the exact desync PB-02 measured (resume worked, the event that would say so was missed).
      probe.fire({ type: 'halted', reason: 'unknown', pc: 0x08000140 });
      assert.equal(board.getStatus().core, 'halted', 'the fast hint is applied immediately');
      mock.timers.tick(799);
      assert.equal(board.getStatus().core, 'halted', 'not yet - the refresh has not fired');
      mock.timers.tick(1);
      await Promise.resolve(); // let the scheduled refresh()'s promise chain settle
      await Promise.resolve();
      assert.equal(board.getStatus().core, 'running', 'the debounced refresh corrected the stale hint');
    } finally {
      mock.timers.reset();
    }
  });

  it('debounces a burst of halted events into a single refresh, not one per event', () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    try {
      const probe = new FakeProbe();
      const getStatusCalls = mock.method(probe, 'getStatus');
      const board = new BoardController(probe, silentLogger());
      probe.fire({ type: 'halted', reason: 'unknown', pc: 0x08000100 });
      mock.timers.tick(400);
      probe.fire({ type: 'halted', reason: 'unknown', pc: 0x08000200 });
      mock.timers.tick(400);
      probe.fire({ type: 'halted', reason: 'unknown', pc: 0x08000300 });
      mock.timers.tick(800);
      assert.equal(getStatusCalls.mock.callCount(), 1, 'three halts within the debounce window settle once');
    } finally {
      mock.timers.reset();
    }
  });
});
