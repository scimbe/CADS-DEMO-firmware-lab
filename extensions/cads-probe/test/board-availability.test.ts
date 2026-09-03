/* board-availability.test.ts – what happens when the board is NOT simply available.
 *
 * These are the everyday failures of the lab, and until now they all surfaced as a bare
 * DOMException: another tab holding the board, another program on the machine holding it, a
 * device that vanished, and the desynchronised ST-Link that the host tool reports as chipid
 * 0x000. Plus the idle poller, which wedged a board once by keeping the bus busy for nine
 * minutes with nothing to report.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ProbeService, POLL_LADDER_MS, POLL_STEPS_PER_RUNG } from '../src/driver/probe';
import { DeviceLock, deviceLockName, type LockManagerLike } from '../src/driver/deviceLock';
import { diagnoseOpenFailure, isTargetUnresponsive } from '../src/driver/busy';
import type { ProbeEvent } from '../src/driver/types';
import { MockStlinkDevice, MockTarget } from './mock-stlink';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A Web Locks stand-in shared by several "contexts", the way one browser profile shares one. */
class FakeLockManager implements LockManagerLike {
  held = new Map<string, () => void>();
  async request(
    name: string,
    options: { mode?: 'exclusive' | 'shared'; ifAvailable?: boolean },
    cb: (lock: unknown) => Promise<unknown>,
  ): Promise<unknown> {
    if (this.held.has(name)) {
      if (options.ifAvailable) return cb(null);
      throw new Error('would block');
    }
    let done!: () => void;
    const holder = new Promise<void>((r) => (done = r));
    this.held.set(name, done);
    const p = cb({ name }).finally(() => this.held.delete(name));
    void holder;
    return p;
  }
  async query(): Promise<{ held: { name: string }[] }> {
    return { held: [...this.held.keys()].map((name) => ({ name })) };
  }
  /** Simulate a different tab taking the board. */
  takeFromElsewhere(name: string): void {
    this.held.set(name, () => undefined);
  }
  releaseElsewhere(name: string): void {
    this.held.delete(name);
  }
}

const makeProbe = (opts: {
  device?: MockStlinkDevice;
  locks?: LockManagerLike;
  pollIntervalMs?: number;
} = {}) => {
  const target = new MockTarget();
  const device = opts.device ?? new MockStlinkDevice(target);
  const events: ProbeEvent[] = [];
  const probe = new ProbeService({
    emit: (e) => events.push(e),
    pollIntervalMs: opts.pollIntervalMs ?? 10,
    locks: opts.locks,
  });
  return { target, device, events, probe };
};

describe('device lock', () => {
  it('names the lock after the actual board, not just "a board"', () => {
    const a = deviceLockName(0x0483, 0x374b, '066FFF565282494867161033');
    assert.equal(a, 'cads-board-1155-14155-066FFF565282494867161033');
    assert.notEqual(a, deviceLockName(0x0483, 0x374b, 'OTHERSERIAL'));
    // A probe without a serial number must still produce a usable, stable name.
    assert.equal(deviceLockName(0x0483, 0x374b), 'cads-board-1155-14155-unknown');
  });

  it('refuses a second holder and lets go on release', async () => {
    const locks = new FakeLockManager();
    const name = deviceLockName(0x0483, 0x374b, 'X');
    const first = new DeviceLock(locks);
    const second = new DeviceLock(locks);
    assert.equal(await first.acquire(name), true);
    assert.equal(first.held, true);
    assert.equal(await second.acquire(name), false, 'a second context must not get the board');
    assert.equal(await second.heldElsewhere(name), true);
    first.releaseNow();
    assert.equal(first.held, false);
    await sleep(0); // releasing a Web Lock settles a promise; the manager frees it one tick later
    assert.equal(await second.acquire(name), true, 'released board must be available again');
    second.releaseNow();
  });

  it('is a no-op when the browser has no Web Locks', async () => {
    const lock = new DeviceLock(undefined);
    assert.equal(lock.available, false);
    assert.equal(await lock.acquire('x'), true, 'without locks we must still try the raw USB path');
  });
});

describe('open-failure classification', () => {
  const cases: [string, string, string][] = [
    ['other-app', 'NetworkError', 'Unable to claim interface.'],
    ['other-app', 'NetworkError', 'Access denied.'],
    ['gone', 'NotFoundError', 'No device selected.'],
    ['denied', 'SecurityError', 'Access to this device is not allowed.'],
    ['gone', 'InvalidStateError', 'The device was disconnected.'],
  ];
  for (const [expected, name, message] of cases) {
    it(`${name}: "${message}" -> ${expected}`, () => {
      const e = new Error(message);
      e.name = name;
      assert.equal(diagnoseOpenFailure(e).reason, expected);
    });
  }
  it('a held lock outranks the raw text, because both look identical to WebUSB', () => {
    const e = new Error('Unable to claim interface.');
    e.name = 'NetworkError';
    assert.equal(diagnoseOpenFailure(e, false).reason, 'other-app');
    assert.equal(diagnoseOpenFailure(e, true).reason, 'other-tab');
  });
  it('spots a target that answers with nothing', () => {
    assert.equal(isTargetUnresponsive(0, 0x410fc241), true);
    assert.equal(isTargetUnresponsive(0xffffffff, 0x410fc241), true);
    assert.equal(isTargetUnresponsive(0x2ba01477, 0), true);
    assert.equal(isTargetUnresponsive(0x2ba01477, 0x410fc241), false);
  });
});

describe('ProbeService when the board is not available', () => {
  it('another tab of this profile: never opens USB, and says which tab problem it is', async () => {
    const locks = new FakeLockManager();
    const { probe, device } = makeProbe({ locks });
    locks.takeFromElsewhere(deviceLockName(device.vendorId, device.productId, device.serialNumber));
    await assert.rejects(() => probe.attachUsb(device));
    const s = probe.status();
    assert.equal(s.blockReason, 'other-tab');
    assert.equal(s.usb, 'error');
    assert.equal(device.opened, false, 'the device must not even be opened while another tab holds it');
  });

  it('another program on the machine: reports other-app, not a broken board', async () => {
    const target = new MockTarget();
    const err = new Error('Unable to claim interface.');
    err.name = 'NetworkError';
    const device = new MockStlinkDevice(target, { failOpenWith: err });
    const { probe } = makeProbe({ device, locks: new FakeLockManager() });
    await assert.rejects(() => probe.attachUsb(device));
    assert.equal(probe.status().blockReason, 'other-app');
  });

  it('a desynchronised ST-Link is repaired by re-entering SWD, without a replug', async () => {
    const target = new MockTarget();
    // Dead until the third SWD entry: init() does one, so recovery has to do the rest.
    const device = new MockStlinkDevice(target, { deadUntilSwdEntry: 3 });
    const { probe } = makeProbe({ device, locks: new FakeLockManager() });
    const s = await probe.attachUsb(device);
    assert.equal(s.usb, 'connected');
    assert.equal(s.blockReason, undefined);
    assert.ok(device.swdEntries >= 3, `expected repeated SWD entry, saw ${device.swdEntries}`);
    await probe.release();
  });

  it('a target that never answers ends as target-unresponsive, not an endless retry', async () => {
    const target = new MockTarget();
    const device = new MockStlinkDevice(target, { deadUntilSwdEntry: 99 });
    const { probe } = makeProbe({ device, locks: new FakeLockManager() });
    await assert.rejects(() => probe.attachUsb(device));
    assert.equal(probe.status().blockReason, 'target-unresponsive');
    // Bounded: init plus at most two recovery attempts, not a loop.
    assert.ok(device.swdEntries <= 4, `recovery must be bounded, saw ${device.swdEntries} SWD entries`);
  });

  it('release() closes the device and hands the lock to the next tab', async () => {
    const locks = new FakeLockManager();
    const { probe, device } = makeProbe({ locks });
    await probe.attachUsb(device);
    assert.equal(device.opened, true);
    const name = deviceLockName(device.vendorId, device.productId, device.serialNumber);
    assert.equal((await locks.query()).held.some((l) => l.name === name), true);
    await probe.release();
    assert.equal(device.opened, false);
    assert.equal((await locks.query()).held.length, 0, 'the lock must be gone so another tab can connect');
  });

  it('refuses to release while a flash is running, so no half-written image', async () => {
    const { probe, device } = makeProbe({ locks: new FakeLockManager() });
    await probe.attachUsb(device);
    const flash = probe.op({ op: 'flash', addr: 0x08000000, data: Buffer.from(new Uint8Array(2048).fill(0xa5)).toString('base64'), verify: false });
    await sleep(1);
    if (probe.isFlashing) {
      await probe.release();
      assert.equal(probe.status().usb, 'connected', 'a flash in progress must survive a release request');
    }
    await flash;
    await probe.release();
  });
});

describe('idle poller', () => {
  it('backs off while nothing changes and speeds up again on activity', async () => {
    const { probe, device } = makeProbe({ pollIntervalMs: 5 });
    await probe.attachUsb(device);
    await probe.op({ op: 'run' });
    assert.equal(probe.pollDelayMs, POLL_LADDER_MS[0]);
    // Enough quiet ticks to drop at least one rung.
    await sleep(POLL_STEPS_PER_RUNG * POLL_LADDER_MS[0] + 400);
    assert.ok(probe.pollDelayMs > POLL_LADDER_MS[0], `expected a slower poll, still ${probe.pollDelayMs} ms`);
    probe.noteActivity();
    assert.equal(probe.pollDelayMs, POLL_LADDER_MS[0], 'activity must restore the fast poll');
    await probe.release();
  });

  it('stops entirely when nobody is watching, and counts what it spent', async () => {
    const { probe, device } = makeProbe({ pollIntervalMs: 5 });
    await probe.attachUsb(device);
    await probe.op({ op: 'run' });
    await sleep(60);
    const busy = probe.usbTransfers;
    assert.ok(busy > 0);
    probe.setPollingWanted(false);
    await sleep(30);
    const idle = probe.usbTransfers;
    await sleep(120);
    assert.equal(probe.usbTransfers, idle, 'an unwatched board must generate no USB traffic at all');
    probe.setPollingWanted(true);
    await probe.release();
  });
});
