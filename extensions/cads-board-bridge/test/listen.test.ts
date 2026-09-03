/* listen.test.ts – the bridge must survive a port still held by an orphaned extension host.
 *
 * Regression for the 2026-09-03 hardware run: code-server keeps the old extension host alive
 * for VSCODE_RECONNECTION_GRACE_TIME (3 h by default), so a second lab window used to find
 * 3333/3334/3335 taken, fail listen() once and stay dead for the whole session.
 */
import assert from 'node:assert/strict';
import * as net from 'node:net';
import { describe, it } from 'node:test';
import { listenWithRetry, type ListenLogger } from '../src/listen';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class RecordingLog implements ListenLogger {
  lines: string[] = [];
  info(m: string): void { this.lines.push(`info ${m}`); }
  warn(m: string): void { this.lines.push(`warn ${m}`); }
  error(m: string): void { this.lines.push(`error ${m}`); }
  has(re: RegExp): boolean { return this.lines.some((l) => re.test(l)); }
}

const freePort = async (): Promise<number> => {
  const s = net.createServer();
  await new Promise<void>((r) => s.listen(0, '127.0.0.1', r));
  const port = (s.address() as net.AddressInfo).port;
  await new Promise<void>((r) => s.close(() => r()));
  return port;
};

const waitFor = async (cond: () => boolean, timeoutMs = 5000): Promise<void> => {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (cond()) return;
    await sleep(20);
  }
  throw new Error('condition not met in time');
};

describe('listenWithRetry', () => {
  it('binds straight away when the port is free', async () => {
    const port = await freePort();
    const log = new RecordingLog();
    const server = net.createServer();
    const l = listenWithRetry(server, port, '127.0.0.1', 'HTTP shim API', log);
    await waitFor(() => l.listening);
    assert.equal(l.attempts, 0);
    assert.ok(log.has(/info HTTP shim API listening on 127\.0\.0\.1:/), log.lines.join('\n'));
    l.dispose();
    await new Promise<void>((r) => server.close(() => r()));
  });

  it('keeps retrying while another host holds the port, then binds when it is released', async () => {
    const port = await freePort();
    const squatter = net.createServer();
    await new Promise<void>((r) => squatter.listen(port, '127.0.0.1', r));

    const log = new RecordingLog();
    const server = net.createServer();
    const l = listenWithRetry(server, port, '127.0.0.1', 'GDB server', log, { stepMs: 20, maxDelayMs: 60 });

    // It must not give up: several retries while the port stays taken.
    await waitFor(() => l.attempts >= 3);
    assert.equal(l.listening, false);
    assert.ok(log.has(/warn GDB server: 127\.0\.0\.1:\d+ still held by another extension host/), log.lines.join('\n'));

    // The orphaned host exits – the next retry has to succeed.
    await new Promise<void>((r) => squatter.close(() => r()));
    await waitFor(() => l.listening, 8000);
    assert.ok(log.has(/info GDB server listening on 127\.0\.0\.1:\d+ after \d+ retries/), log.lines.join('\n'));

    l.dispose();
    await new Promise<void>((r) => server.close(() => r()));
  });

  it('caps the backoff and stops retrying once disposed', async () => {
    const port = await freePort();
    const squatter = net.createServer();
    await new Promise<void>((r) => squatter.listen(port, '127.0.0.1', r));

    const log = new RecordingLog();
    const server = net.createServer();
    const l = listenWithRetry(server, port, '127.0.0.1', 'serial TCP', log, { stepMs: 10, maxDelayMs: 20 });
    await waitFor(() => l.attempts >= 4);
    assert.ok(log.has(/retrying in 20 ms/), log.lines.join('\n'));

    l.dispose();
    const seen = l.attempts;
    await sleep(120);
    assert.equal(l.attempts, seen, 'dispose must stop the retry loop');

    await new Promise<void>((r) => squatter.close(() => r()));
    await sleep(80);
    assert.equal(l.listening, false, 'a disposed listener must not bind later');
    await new Promise<void>((r) => server.close(() => r()));
  });

  it('does not retry errors that waiting cannot fix', async () => {
    const log = new RecordingLog();
    const server = net.createServer();
    const l = listenWithRetry(server, 1, '203.0.113.1', 'HTTP shim API', log, { stepMs: 10 });
    await waitFor(() => log.lines.some((x) => x.startsWith('error ')), 8000);
    assert.equal(l.attempts, 0, 'non-EADDRINUSE errors must not be retried');
    l.dispose();
    server.close();
  });
});
