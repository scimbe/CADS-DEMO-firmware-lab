import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { ProbeService } from '../../cads-probe/src/driver/probe';
import type { ProbeEvent, ProbeOp, ProbeResult } from '../../cads-probe/src/driver/types';
import { MockStlinkDevice, MockTarget } from '../../cads-probe/test/mock-stlink';
import { PacketParser, encodePacket, regToHex, unescapePayload } from '../src/rsp/packet';
import { GdbSession, type GdbProbe, memoryMapXml, DEFAULT_MEMORY_MAP } from '../src/rsp/server';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

/** Collects replies; `ask()` sends a packet and waits for the next reply payload. */
class TestConn {
  out: string[] = [];
  private parser = new PacketParser();
  private pending: string[] = [];
  private waiters: ((s: string) => void)[] = [];
  ended = false;
  session!: GdbSession;
  write(data: Buffer): void {
    for (const item of this.parser.feed(data)) {
      if (item.kind === 'packet') {
        const s = item.payload.toString('latin1');
        this.out.push(s);
        const w = this.waiters.shift();
        if (w) w(s);
        else this.pending.push(s);
      }
    }
  }
  end(): void {
    this.ended = true;
  }
  next(timeoutMs = 2000): Promise<string> {
    const queued = this.pending.shift();
    if (queued !== undefined) return Promise.resolve(queued);
    return new Promise((resolve, reject) => {
      const waiter = (s: string): void => {
        clearTimeout(t);
        resolve(s);
      };
      const t = setTimeout(() => {
        this.waiters = this.waiters.filter((w) => w !== waiter);
        reject(new Error('no reply'));
      }, timeoutMs);
      this.waiters.push(waiter);
    });
  }
  ask(payload: string | Buffer, timeoutMs?: number): Promise<string> {
    const p = this.next(timeoutMs);
    this.session.feed(encodePacket(payload));
    return p;
  }
}

describe('RSP packet layer', () => {
  it('parses packets, acks and interrupts', () => {
    const p = new PacketParser();
    const items = p.feed(Buffer.from('+$qSupported#37\x03-$m2000,4#a9'));
    assert.equal(items.length, 5);
    assert.equal(items[0]?.kind, 'ack');
    assert.equal(items[1]?.kind, 'packet');
    assert.equal((items[1] as { payload: Buffer }).payload.toString(), 'qSupported');
    assert.equal((items[1] as { checksumOk: boolean }).checksumOk, true);
    assert.equal(items[2]?.kind, 'interrupt');
    assert.equal(items[3]?.kind, 'nack');
    assert.equal((items[4] as { payload: Buffer }).payload.toString(), 'm2000,4');
  });

  it('handles split input and bad checksums', () => {
    const p = new PacketParser();
    assert.equal(p.feed(Buffer.from('$ab')).length, 0);
    const items = p.feed(Buffer.from('c#00'));
    assert.equal(items.length, 1);
    assert.equal((items[0] as { checksumOk: boolean }).checksumOk, false);
  });

  it('escapes and unescapes binary payloads', () => {
    const raw = Buffer.from([0x23, 0x24, 0x7d, 0x2a, 0x41]);
    const enc = encodePacket(raw);
    const items = new PacketParser().feed(enc);
    assert.deepEqual(Array.from((items[0] as { payload: Buffer }).payload), Array.from(raw));
    assert.deepEqual(Array.from(unescapePayload([0x41, 0x2a, 0x20])), [0x41, 0x41, 0x41, 0x41]); // run-length 3 extra
  });

  it('formats registers little endian', () => {
    assert.equal(regToHex(0x08000200), '00020008');
  });

  it('renders the memory map', () => {
    const xml = memoryMapXml(DEFAULT_MEMORY_MAP);
    assert.match(xml, /start="0x8000000" length="0x10000"/);
    assert.match(xml, /blocksize">0x20000/);
    assert.match(xml, /type="ram" start="0x20000000"/);
  });
});

describe('GdbSession against the simulated probe', () => {
  const probe = new MockProbe();
  const conn = new TestConn();
  const stops: string[] = [];
  let session: GdbSession;

  before(async () => {
    await probe.attach();
    session = new GdbSession(conn, {
      probe,
      log: { info: () => undefined, warn: () => undefined, debug: () => undefined },
      hooks: { onStop: (reason) => stops.push(reason) },
    });
    conn.session = session;
    await session.start();
  });
  after(() => {
    session.close();
    probe.target.dispose();
  });

  it('attach halts the target', () => {
    assert.equal(probe.target.halted, true);
  });

  it('negotiates qSupported and no-ack mode', async () => {
    const s = await conn.ask('qSupported:multiprocess+;swbreak+;hwbreak+;qRelocInsn+;fork-events+;vfork-events+;exec-events+;vContSupported+;QThreadEvents+;no-resumed+;memory-tagging+;xmlRegisters=i386');
    assert.match(s, /PacketSize=4000/);
    assert.match(s, /QStartNoAckMode\+/);
    assert.equal(await conn.ask('QStartNoAckMode'), 'OK');
    assert.equal(await conn.ask('!'), 'OK');
    assert.equal(await conn.ask('?'), 'T05thread:1;');
    assert.equal(await conn.ask('qAttached'), '1');
    assert.equal(await conn.ask('qC'), 'QC1');
    assert.equal(await conn.ask('qfThreadInfo'), 'm1');
    assert.equal(await conn.ask('qsThreadInfo'), 'l');
    assert.equal(await conn.ask('Hg0'), 'OK');
    assert.equal(await conn.ask('vMustReplyEmpty'), '');
  });

  it('serves target.xml and the memory map via qXfer', async () => {
    const first = await conn.ask('qXfer:features:read:target.xml:0,400');
    assert.equal(first[0], 'm');
    let all = first.slice(1);
    let off = all.length;
    for (let i = 0; i < 10; i++) {
      const r = await conn.ask(`qXfer:features:read:target.xml:${off.toString(16)},fff`);
      all += r.slice(1);
      off = all.length;
      if (r[0] === 'l') break;
    }
    assert.match(all, /org.gnu.gdb.arm.m-profile/);
    assert.match(all, /name="control"/);
    const mm = await conn.ask('qXfer:memory-map:read::0,fff');
    assert.match(mm, /memory-map/);
  });

  it('reads and writes registers', async () => {
    const g = await conn.ask('g');
    assert.equal(g.length, 23 * 8);
    assert.equal(g.slice(13 * 8, 14 * 8), regToHex(0x20030000)); // sp
    assert.equal(await conn.ask('P0=efbeadde'), 'OK');
    assert.equal(await conn.ask('p0'), 'efbeadde');
    assert.equal(probe.target.regs[0], 0xdeadbeef);
    const g2 = await conn.ask('g');
    assert.equal(await conn.ask(`G${g2}`), 'OK');
    assert.equal(await conn.ask('p40'), 'E01');
  });

  it('reads and writes memory, with the halted cache', async () => {
    assert.equal(await conn.ask('M20000100,4:01020304'), 'OK');
    assert.equal(await conn.ask('m20000100,4'), '01020304');
    const before = probe.device.transfers;
    assert.equal(await conn.ask('m20000102,2'), '0304'); // served from cache
    assert.equal(probe.device.transfers, before, 'cached read causes no USB traffic');
    // binary X write
    const x = Buffer.concat([Buffer.from('X20000200,4:'), Buffer.from([0x7d, 0x23, 0x24, 0x2a])]);
    assert.equal(await conn.ask(x), 'OK');
    assert.equal(await conn.ask('m20000200,4'), '7d23242a');
    assert.equal(await conn.ask('m60000000,4'), 'E01');
  });

  it('sets breakpoints, continues and reports the stop', async () => {
    assert.equal(await conn.ask('Z1,8001234,2'), 'OK');
    assert.equal(await conn.ask('Z0,20000100,2'), 'OK');
    assert.equal(probe.target.ram[0x101], 0xbe);
    assert.equal(await conn.ask('z0,20000100,2'), 'OK');
    const stop = await conn.ask('vCont;c', 3000);
    assert.match(stop, /^T05thread:1;hwbreak:;$/);
    assert.equal(await conn.ask('p0f'), regToHex(0x08001234));
    assert.equal(stops.at(-1), 'breakpoint');
    assert.equal(await conn.ask('z1,8001234,2'), 'OK');
  });

  it('steps', async () => {
    const r = await conn.ask('vCont;s:1;c');
    assert.equal(r, 'T05thread:1;');
    assert.equal(probe.target.regs[15], 0x08001236);
    assert.equal(await conn.ask('s'), 'T05thread:1;');
  });

  it('interrupts a running target with Ctrl-C', async () => {
    probe.target.breakpointHitAddr = null;
    const stopPromise = conn.next(3000);
    session.feed(encodePacket('c'));
    await sleep(30);
    assert.equal(probe.target.halted, false);
    session.feed(Buffer.from([0x03]));
    const stop = await stopPromise;
    assert.equal(stop, 'T02thread:1;');
    assert.equal(probe.target.halted, true);
  });

  it('handles monitor reset halt / reset / halt', async () => {
    const replies: string[] = [];
    const p1 = conn.next();
    session.feed(encodePacket('qRcmd,' + Buffer.from('reset halt').toString('hex')));
    replies.push(await p1);
    while (replies.at(-1)?.startsWith('O') && replies.at(-1) !== 'OK') replies.push(await conn.next());
    assert.equal(replies.at(-1), 'OK');
    assert.equal(probe.target.halted, true);
    assert.equal(probe.target.regs[15], 0x08000200);
    const p2 = conn.next();
    session.feed(encodePacket('qRcmd,' + Buffer.from('halt').toString('hex')));
    let r = await p2;
    while (r.startsWith('O') && r !== 'OK') r = await conn.next();
    assert.equal(r, 'OK');
  });

  it('flashes via vFlashErase/vFlashWrite/vFlashDone', async () => {
    const image = Buffer.alloc(3000).map((_, i) => (i * 3) & 0xff);
    assert.equal(await conn.ask('vFlashErase:08000000,4000'), 'OK');
    assert.equal(await conn.ask(Buffer.concat([Buffer.from('vFlashWrite:08000000:'), image.subarray(0, 2000)])), 'OK');
    assert.equal(await conn.ask(Buffer.concat([Buffer.from('vFlashWrite:080007d0:'), image.subarray(2000)])), 'OK');
    assert.equal(await conn.ask('vFlashDone', 5000), 'OK');
    assert.deepEqual(Array.from(probe.target.flash.subarray(0, 3000)), Array.from(image));
    assert.equal(probe.target.merEverSet, false);
    assert.equal(await conn.ask('vFlashErase:08100000,4000'), 'E01'); // outside the window
  });

  it('watchpoints map to DWT', async () => {
    assert.equal(await conn.ask('Z2,20000300,4'), 'OK');
    assert.equal(probe.target.sysregs.get(0xe0001028), 5);
    assert.equal(await conn.ask('z2,20000300,4'), 'OK');
    assert.equal(probe.target.sysregs.get(0xe0001028), 0);
  });

  it('detaches and lets the target run', async () => {
    assert.equal(await conn.ask('Z1,8000400,2'), 'OK');
    assert.equal(await conn.ask('D'), 'OK');
    assert.equal(conn.ended, true);
    await sleep(20);
    assert.equal(probe.target.halted, false);
    assert.equal(probe.target.sysregs.get(0xe0002008), 0, 'breakpoints removed');
  });
});
