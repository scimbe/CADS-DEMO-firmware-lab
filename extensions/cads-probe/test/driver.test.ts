import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { ProbeService } from '../src/driver/probe';
import { Mutex } from '../src/driver/mutex';
import type { ProbeEvent, ProbeResult } from '../src/driver/types';
import { fromBase64, toBase64 } from '../src/driver/util';
import { MockSerialPort, MockStlinkDevice, MockTarget } from './mock-stlink';

function makeProbe(opts: { device?: MockStlinkDevice; target?: MockTarget } = {}) {
  const target = opts.target ?? new MockTarget();
  const device = opts.device ?? new MockStlinkDevice(target);
  const events: ProbeEvent[] = [];
  const probe = new ProbeService({ emit: (e) => events.push(e), pollIntervalMs: 10 });
  return { target, device, events, probe };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function okResult(r: ProbeResult): { ok: true } & Record<string, unknown> {
  assert.equal(r.ok, true, `expected ok, got ${JSON.stringify(r)}`);
  return r as { ok: true } & Record<string, unknown>;
}

describe('util', () => {
  it('base64 round trip', () => {
    for (const n of [0, 1, 2, 3, 4, 5, 100, 1023]) {
      const src = new Uint8Array(n).map((_, i) => (i * 37 + 11) & 0xff);
      const back = fromBase64(toBase64(src));
      assert.deepEqual(Array.from(back), Array.from(src));
    }
    assert.equal(toBase64(new Uint8Array([0x4d, 0x61, 0x6e])), 'TWFu');
    assert.equal(toBase64(new Uint8Array([0x4d, 0x61])), 'TWE=');
  });

  it('mutex serialises', async () => {
    const m = new Mutex();
    const order: string[] = [];
    const a = m.runExclusive(async () => {
      order.push('a1');
      await sleep(20);
      order.push('a2');
      return 'A';
    });
    const b = m.runExclusive(async () => {
      order.push('b1');
      return 'B';
    });
    assert.deepEqual(await Promise.all([a, b]), ['A', 'B']);
    assert.deepEqual(order, ['a1', 'a2', 'b1']);
  });
});

describe('ProbeService with mock ST-Link', () => {
  const { target, device, events, probe } = makeProbe();
  after(() => target.dispose());

  it('attaches and identifies an STM32F429', async () => {
    const st = await probe.attachUsb(device);
    assert.equal(st.usb, 'connected');
    assert.equal(st.stlink?.version, 'V2-1 V2J33M25');
    assert.equal(st.target?.chipId, 0x419);
    assert.equal(st.target?.devName, 'STM32F42x/F43x');
    assert.equal(st.target?.flashSize, 2048);
    assert.equal(st.core, 'running');
    assert.ok(events.some((e) => e.type === 'usb-connect'));
  });

  it('halts, reads and writes registers', async () => {
    const h = okResult(await probe.op({ op: 'halt' }));
    assert.equal(h.state, 'halted');
    assert.equal(h.reason, 'halt');
    const regs = okResult(await probe.op({ op: 'readRegs' })).regs as number[];
    assert.equal(regs.length, 23);
    assert.equal(regs[13], 0x20030000);
    okResult(await probe.op({ op: 'writeReg', index: 0, value: 0xdeadbeef }));
    assert.equal(okResult(await probe.op({ op: 'readReg', index: 0 })).value, 0xdeadbeef);
    okResult(await probe.op({ op: 'writeReg', index: 20, value: 0x50 })); // BASEPRI
    assert.equal(okResult(await probe.op({ op: 'readReg', index: 20 })).value, 0x50);
    const regs2 = okResult(await probe.op({ op: 'readRegs' })).regs as number[];
    assert.equal(regs2[20], 0x50);
    assert.equal(regs2[0], 0xdeadbeef);
  });

  it('reads and writes memory, unaligned included', async () => {
    const data = new Uint8Array(1500).map((_, i) => (i * 7) & 0xff);
    okResult(await probe.op({ op: 'writeMem', addr: 0x20000003, data: toBase64(data) }));
    const back = fromBase64(okResult(await probe.op({ op: 'readMem', addr: 0x20000003, len: 1500 })).data as string);
    assert.deepEqual(Array.from(back), Array.from(data));
    // batch: two reads under one lock
    const b = await probe.batch([
      { op: 'readMem', addr: 0x20000003, len: 4 },
      { op: 'readMem', addr: 0x20000007, len: 4 },
    ]);
    assert.equal(b.results.length, 2);
    assert.deepEqual(Array.from(fromBase64((b.results[0] as unknown as { data: string }).data)), Array.from(data.subarray(0, 4)));
    // unmapped address → TARGET_FAULT
    const bad = await probe.op({ op: 'readMem', addr: 0x60000000, len: 4 });
    assert.equal(bad.ok, false);
    assert.equal((bad as { code?: string }).code, 'TARGET_FAULT');
  });

  it('sets hardware breakpoints in flash and software breakpoints in RAM', async () => {
    const hw = okResult(await probe.op({ op: 'setBreakpoint', addr: 0x08001234 }));
    assert.equal(hw.kind, 'hw');
    const comp0 = target.sysregs.get(0xe0002008) ?? 0;
    assert.equal(comp0 >>> 0, (0x40000000 | 0x08001234 | 1) >>> 0);
    const hw2 = okResult(await probe.op({ op: 'setBreakpoint', addr: 0x08001236 }));
    assert.equal(hw2.kind, 'hw');
    assert.equal((target.sysregs.get(0xe000200c) ?? 0) >>> 0, (0x80000000 | 0x08001234 | 1) >>> 0);

    target.ram[0x100] = 0x34;
    target.ram[0x101] = 0x12;
    const sw = okResult(await probe.op({ op: 'setBreakpoint', addr: 0x20000100 }));
    assert.equal(sw.kind, 'sw');
    assert.equal(target.ram[0x100], 0x00);
    assert.equal(target.ram[0x101], 0xbe);
    okResult(await probe.op({ op: 'clearBreakpoint', addr: 0x20000100 }));
    assert.equal(target.ram[0x100], 0x34);
    assert.equal(target.ram[0x101], 0x12);
    okResult(await probe.op({ op: 'clearBreakpoint', addr: 0x08001236 }));
    assert.equal(target.sysregs.get(0xe000200c), 0);
  });

  it('sets and clears watchpoints via DWT', async () => {
    okResult(await probe.op({ op: 'setWatchpoint', addr: 0x20000200, len: 4, kind: 'write' }));
    assert.equal(target.sysregs.get(0xe0001020), 0x20000200);
    assert.equal(target.sysregs.get(0xe0001024), 2);
    assert.equal(target.sysregs.get(0xe0001028), 5);
    assert.ok(((target.sysregs.get(0xe000edfc) ?? 0) & (1 << 24)) !== 0, 'TRCENA set');
    const bad = await probe.op({ op: 'setWatchpoint', addr: 0x20000201, len: 4, kind: 'read' });
    assert.equal(bad.ok, false);
    okResult(await probe.op({ op: 'clearWatchpoint', addr: 0x20000200 }));
    assert.equal(target.sysregs.get(0xe0001028), 0);
  });

  it('runs, and the poller reports the breakpoint hit', async () => {
    events.length = 0;
    const r = okResult(await probe.op({ op: 'run' }));
    assert.equal(r.state, 'running');
    assert.equal(probe.status().core, 'running');
    await sleep(120);
    const halted = events.find((e) => e.type === 'halted') as { type: 'halted'; reason: string; pc: number } | undefined;
    assert.ok(halted, 'halted event emitted');
    assert.equal(halted?.reason, 'breakpoint');
    assert.equal(halted?.pc, 0x08001234);
    assert.equal(probe.status().core, 'halted');
    const st = okResult(await probe.op({ op: 'getState' }));
    assert.equal(st.state, 'halted');
    assert.equal(st.reason, 'breakpoint');
  });

  it('steps one instruction', async () => {
    const pc0 = okResult(await probe.op({ op: 'readReg', index: 15 })).value as number;
    const s = okResult(await probe.op({ op: 'step' }));
    assert.equal(s.state, 'halted');
    assert.equal(s.reason, 'step');
    assert.equal(s.pc, pc0 + 2);
  });

  it('resets with halt and run', async () => {
    const rh = okResult(await probe.op({ op: 'resetHalt' }));
    assert.equal(rh.state, 'halted');
    assert.equal(rh.reason, 'reset');
    assert.equal(rh.pc, 0x08000200);
    assert.equal((target.sysregs.get(0xe000edfc) ?? 0) & 1, 0, 'VC_CORERESET cleared afterwards');
    // breakpoints re-applied
    assert.equal((target.sysregs.get(0xe0002008) ?? 0) >>> 0, (0x40000000 | 0x08001234 | 1) >>> 0);
    okResult(await probe.op({ op: 'clearAllBreakpoints' }));
    okResult(await probe.op({ op: 'resetRun' }));
    assert.equal(probe.status().core, 'running');
    await sleep(30);
    okResult(await probe.op({ op: 'halt' }));
  });

  it('flashes with erase, program, verify and never mass-erases', async () => {
    events.length = 0;
    const resetsBefore = target.resetCount;
    const image = new Uint8Array(20000).map((_, i) => (i * 13 + 5) & 0xff);
    image.fill(0xff, 4096, 5120); // an all-0xff block is skipped
    const r = okResult(await probe.op({ op: 'flash', addr: 0x08000000, data: toBase64(image), verify: true }));
    assert.equal(r.bytes, 20000);
    assert.equal(r.state, 'halted');
    assert.deepEqual(target.eraseLog, [0, 1]);
    assert.deepEqual(Array.from(target.flash.subarray(0, 20000)), Array.from(image));
    assert.equal(target.flash[20000], 0xff);
    assert.equal(target.merEverSet, false, 'FLASH_CR.MER must never be set');
    assert.equal((target.sysregs.get(0x40023c10) ?? 0) >>> 0, 0x80000000, 'flash locked again');
    const phases = new Set(events.filter((e) => e.type === 'flash-progress').map((e) => (e as { phase: string }).phase));
    assert.deepEqual([...phases].sort(), ['erase', 'program', 'verify']);
    assert.equal(target.resetCount - resetsBefore, 1, 'exactly one reset (the final reset-halt), none before erase');
    assert.equal(probe.status().core, 'halted');
  });

  it('refuses flash outside the firmware window', async () => {
    for (const addr of [0x08100000, 0x080ff000 + 0x2000, 0x20000000, 0x08000002]) {
      const r = await probe.op({ op: 'flash', addr, data: toBase64(new Uint8Array(0x2000)), verify: true });
      assert.equal(r.ok, false, `addr 0x${addr.toString(16)}`);
      assert.equal((r as { code?: string }).code, 'UNSUPPORTED');
    }
  });

  it('detaches cleanly', async () => {
    okResult(await probe.op({ op: 'setBreakpoint', addr: 0x08000400 }));
    await probe.detachUsb();
    assert.equal(probe.status().usb, 'absent');
    assert.equal(device.opened, false);
    assert.equal(target.sysregs.get(0xe0002008), 0, 'breakpoints removed on detach');
    const r = await probe.op({ op: 'halt' });
    assert.equal(r.ok, false);
    assert.equal((r as { code?: string }).code, 'NO_DEVICE');
  });
});

describe('failure handling', () => {
  it('reports a USB timeout as USB_IO and marks the probe broken', async () => {
    const target = new MockTarget();
    const device = new MockStlinkDevice(target, { hangOnTransferIn: true });
    const probe = new ProbeService({ emit: () => undefined });
    // shorten the connector timeout via the mutable default: attach fails at read_version
    await assert.rejects(probe.attachUsb(device), (e: Error) => /timeout/.test(e.message));
    assert.equal(probe.status().usb, 'error');
    target.dispose();
  });

  it('handles the cable being pulled mid-session', async () => {
    const target = new MockTarget();
    const device = new MockStlinkDevice(target, { disconnectAfterTransfers: 60 });
    const events: ProbeEvent[] = [];
    const probe = new ProbeService({ emit: (e) => events.push(e), pollIntervalMs: 10 });
    await probe.attachUsb(device);
    let r: ProbeResult = { ok: true };
    for (let i = 0; i < 20 && r.ok; i++) r = await probe.op({ op: 'readMem', addr: 0x20000000, len: 4 });
    assert.equal(r.ok, false);
    assert.equal((r as { code?: string }).code, 'NO_DEVICE');
    assert.equal(probe.status().usb, 'error');
    assert.ok(events.some((e) => e.type === 'usb-disconnect'));
    // explicit disconnect event
    await probe.onUsbDisconnected(device);
    assert.equal(probe.status().usb, 'absent');
    target.dispose();
  });
});

describe('serial console', () => {
  it('opens, forwards data, writes and closes', async () => {
    const events: ProbeEvent[] = [];
    const probe = new ProbeService({ emit: (e) => events.push(e) });
    const port = new MockSerialPort();
    probe.setSerialPort(port);
    okResult(await probe.op({ op: 'serialOpen', baud: 115200 }));
    assert.equal(probe.status().serial, 'open');
    assert.ok(events.some((e) => e.type === 'serial-open'));
    port.push(new TextEncoder().encode('hello\r\n'));
    await sleep(10);
    const data = events.filter((e) => e.type === 'serial-data').map((e) => new TextDecoder().decode(fromBase64((e as { data: string }).data))).join('');
    assert.equal(data, 'hello\r\n');
    okResult(await probe.op({ op: 'serialWrite', data: toBase64(new TextEncoder().encode('?\n')) }));
    assert.equal(new TextDecoder().decode(port.written[0]), '?\n');
    okResult(await probe.op({ op: 'serialClose' }));
    await sleep(10);
    assert.equal(probe.status().serial, 'absent');
    assert.ok(events.some((e) => e.type === 'serial-close'));
    assert.equal(port.closeCount, 1);
  });

  it('reports a lost device', async () => {
    const events: ProbeEvent[] = [];
    const probe = new ProbeService({ emit: (e) => events.push(e) });
    const port = new MockSerialPort();
    probe.setSerialPort(port);
    okResult(await probe.op({ op: 'serialOpen', baud: 115200 }));
    port.fail('The device has been lost.');
    await sleep(20);
    const close = events.find((e) => e.type === 'serial-close') as { error?: string } | undefined;
    assert.ok(close?.error, 'close carries the error');
    assert.equal(probe.status().serial, 'error');
    const w = await probe.op({ op: 'serialWrite', data: toBase64(new Uint8Array([0x3f])) });
    assert.equal(w.ok, false);
  });
});
