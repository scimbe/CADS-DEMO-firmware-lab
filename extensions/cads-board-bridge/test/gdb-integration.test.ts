/* Real GDB (arm-none-eabi-gdb or gdb-multiarch) in batch mode against the RSP server with the
 * simulated probe. Skipped when no GDB is installed. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as net from 'node:net';
import * as path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { GdbSession } from '../src/rsp/server';
import { MockProbe } from './mock-probe';

function findGdb(): string | null {
  const candidates = [
    process.env.CADS_GDB,
    '/Users/dev/.vcpkg/artifacts/2139c4c6/compilers.arm.arm.none.eabi.gcc/13.3.1/bin/arm-none-eabi-gdb',
    '/opt/arm-gnu-toolchain/bin/arm-none-eabi-gdb',
  ].filter((x): x is string => !!x);
  for (const c of candidates) if (fs.existsSync(c)) return c;
  for (const name of ['arm-none-eabi-gdb', 'gdb-multiarch']) {
    for (const dir of (process.env.PATH ?? '').split(path.delimiter)) {
      const p = path.join(dir, name);
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

const gdb = findGdb();

describe('arm-none-eabi-gdb --batch against the RSP server (mock probe)', { skip: gdb ? false : 'no GDB found' }, () => {
  const probe = new MockProbe();
  let server: net.Server;
  let port = 0;
  const sessions: GdbSession[] = [];

  before(async () => {
    await probe.attach();
    // a tiny "program": bkpt target at 0x08001234, some RAM content
    probe.target.ram.set([0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff, 0x00], 0);
    server = net.createServer((sock) => {
      const session = new GdbSession(
        { write: (d) => void sock.write(d), end: () => sock.end() },
        { probe, log: { info: () => undefined, warn: (m) => console.error('[warn]', m), debug: () => undefined } },
      );
      sessions.push(session);
      void session.start();
      sock.on('data', (d: Buffer) => session.feed(d));
      sock.on('close', () => session.close());
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = (server.address() as net.AddressInfo).port;
  });

  after(async () => {
    for (const s of sessions) s.close();
    server.close();
    await probe.service.detachUsb();
    probe.target.dispose();
  });

  it('connects, reads registers, hits a breakpoint, examines memory', async () => {
    const args = [
      '--batch',
      '-nx',
      '-ex', 'set pagination off',
      '-ex', 'set confirm off',
      '-ex', `target extended-remote 127.0.0.1:${port}`,
      '-ex', 'info registers',
      '-ex', 'break *0x08001234',
      '-ex', 'continue',
      '-ex', 'print/x $pc',
      '-ex', 'x/4xw 0x20000000',
      '-ex', 'set {int}0x20000010 = 0x1234abcd',
      '-ex', 'x/1xw 0x20000010',
      '-ex', 'stepi',
      '-ex', 'print/x $pc',
      '-ex', 'monitor reset halt',
      '-ex', 'flushregs',
      '-ex', 'print/x $pc',
      '-ex', 'detach',
    ];
    const out = await new Promise<string>((resolve, reject) => {
      const child = spawn(gdb as string, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let buf = '';
      child.stdout.on('data', (d) => (buf += d));
      child.stderr.on('data', (d) => (buf += d));
      const kill = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('gdb timed out\n' + buf)); }, 30000);
      child.on('error', reject);
      child.on('close', (code) => { clearTimeout(kill); code === 0 ? resolve(buf) : reject(new Error(`gdb exit ${code}\n${buf}`)); });
    });
    assert.match(out, /sp\s+0x20030000/);
    assert.match(out, /Breakpoint 1 at 0x8001234/);
    assert.match(out, /Breakpoint 1, 0x08001234 in \?\? \(\)/);
    assert.match(out, /\$1 = 0x8001234/);
    assert.match(out, /0x20000000:\s+0x44332211\s+0x88776655\s+0xccbbaa99\s+0x00ffeedd/);
    assert.match(out, /0x20000010:\s+0x1234abcd/);
    assert.match(out, /\$2 = 0x8001236/);
    assert.match(out, /target halted after reset, pc=0x08000200/);
    assert.match(out, /\$3 = 0x8000200/);
    assert.match(out, /Detaching|Ending remote|\[Inferior .* detached\]|Remote connection closed/);
  });
});
