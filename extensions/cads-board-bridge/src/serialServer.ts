/* serialServer.ts – raw serial TCP (127.0.0.1:3334) and the socat PTY link for scripts. */
import { spawn, type ChildProcess } from 'node:child_process';
import * as fs from 'node:fs';
import * as net from 'node:net';
import * as path from 'node:path';
import type { BoardController } from './board';

export interface SerialLogger {
  info(m: string): void;
  warn(m: string): void;
}

export class SerialTcpServer {
  readonly server: net.Server;
  private clients = new Set<net.Socket>();
  private sub: { dispose(): void };

  constructor(
    private readonly board: BoardController,
    private readonly log: SerialLogger,
  ) {
    this.server = net.createServer((sock) => this.onClient(sock));
    this.sub = board.serialData.on((data) => {
      for (const c of this.clients) c.write(data);
    });
  }

  get clientCount(): number {
    return this.clients.size;
  }

  private onClient(sock: net.Socket): void {
    this.clients.add(sock);
    sock.setNoDelay(true);
    sock.on('data', (d: Buffer) => {
      this.board.sendSerial(d).catch((e) => this.log.warn(`serial tcp write: ${e instanceof Error ? e.message : String(e)}`));
    });
    sock.on('close', () => this.clients.delete(sock));
    sock.on('error', () => this.clients.delete(sock));
  }

  close(): void {
    this.sub.dispose();
    for (const c of this.clients) c.destroy();
    this.server.close();
  }
}

function findOnPath(bin: string): string | null {
  for (const dir of (process.env.PATH ?? '').split(path.delimiter)) {
    const p = path.join(dir, bin);
    try {
      fs.accessSync(p, fs.constants.X_OK);
      return p;
    } catch {
      // next
    }
  }
  return null;
}

/** `socat pty,raw,echo=0,link=<link> tcp:127.0.0.1:<port>` – only if socat exists. Restarts on exit. */
export class SocatPty {
  private child: ChildProcess | null = null;
  private stopped = false;
  private restarts = 0;
  readonly available: boolean;

  constructor(
    private readonly link: string,
    private readonly port: number,
    private readonly log: SerialLogger,
  ) {
    this.available = findOnPath('socat') !== null;
  }

  start(): void {
    if (!this.available) {
      this.log.info(`socat not found – no PTY link at ${this.link}`);
      return;
    }
    this.stopped = false;
    this.spawn();
  }

  private spawn(): void {
    if (this.stopped) return;
    const args = [`pty,raw,echo=0,link=${this.link}`, `tcp:127.0.0.1:${this.port}`];
    this.child = spawn('socat', args, { stdio: 'ignore' });
    this.log.info(`socat started (pid ${this.child.pid}): ${this.link} ↔ tcp:${this.port}`);
    this.child.on('exit', (code) => {
      this.child = null;
      if (this.stopped) return;
      this.restarts++;
      const delay = Math.min(30000, 1000 * this.restarts);
      this.log.warn(`socat exited (${code}), restarting in ${delay} ms`);
      setTimeout(() => this.spawn(), delay);
    });
  }

  stop(): void {
    this.stopped = true;
    if (this.child) {
      this.child.kill('SIGTERM');
      this.child = null;
    }
  }
}
