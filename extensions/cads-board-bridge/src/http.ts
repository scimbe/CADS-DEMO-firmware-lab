/* http.ts – shim API on 127.0.0.1:3335 for the st-flash/st-info shims and tooling (spec §3.2). */
import * as http from 'node:http';
import type { BoardController } from './board';
import type { ProbeOp } from './types';
import { shimMessage } from './messages';

export interface HttpLogger {
  info(m: string): void;
  warn(m: string): void;
}

function readBody(req: http.IncomingMessage, limit = 4 * 1024 * 1024): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function json(res: http.ServerResponse, code: number, body: unknown): void {
  const text = JSON.stringify(body);
  res.writeHead(code, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(text) });
  res.end(text);
}

function text(res: http.ServerResponse, code: number, body: string): void {
  res.writeHead(code, { 'content-type': 'text/plain; charset=utf-8', 'content-length': Buffer.byteLength(body) });
  res.end(body);
}

/** st-info --probe compatible listing. */
export function probeText(board: BoardController): string {
  const s = board.getStatus();
  const p = s.probe;
  if (!s.connected || !p?.stlink) {
    // st-info's own wording first, so scripts that grep for it keep working, then the reason in
    // plain words - the shims are the only thing a student sees when a terminal task fails.
    return `Found 0 stlink programmers\n${shimMessage(p?.blockReason, false)}\n`;
  }
  const flashBytes = (p.target?.flashSize ?? 0) * 1024;
  const sramBytes = (p.target?.sramSize ?? 0) * 1024;
  return [
    'Found 1 stlink programmers',
    `  version:    ${p.stlink.version.replace(/^V2-1 /, '')}`,
    `  serial:     ${p.stlink.serial ?? ''}`,
    `  flash:      ${flashBytes} (pagesize: 16384)`,
    `  sram:       ${sramBytes}`,
    `  chipid:     0x${(p.target?.chipId ?? 0).toString(16).padStart(3, '0')}`,
    `  dev-type:   ${p.target?.devName ?? 'unknown'}`,
    '',
  ].join('\n');
}

export interface HttpExtras {
  /** Recent bridge log lines (GET /log). */
  log?: () => string[];
  /** Execute an arbitrary VS Code command (POST /command {"command","args"}); tooling/e2e only. */
  command?: (command: string, args: unknown[]) => Promise<unknown>;
}

export function createHttpServer(board: BoardController, log: HttpLogger, extras: HttpExtras = {}): http.Server {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    const method = req.method ?? 'GET';
    try {
      if (method === 'GET' && url.pathname === '/status') return json(res, 200, board.getStatus());
      if (method === 'GET' && url.pathname === '/probe') return text(res, 200, probeText(board));
      if (method === 'GET' && url.pathname === '/health') return json(res, 200, { ok: true });
      if (method === 'POST' && url.pathname === '/connect') {
        const s = await board.connect();
        return json(res, s.connected ? 200 : 503, s);
      }
      if (method === 'POST' && url.pathname === '/flash') {
        const addr = url.searchParams.get('addr');
        const at = addr ? Number(addr) : 0x08000000;
        if (!Number.isInteger(at)) return json(res, 400, { ok: false, error: `bad addr '${addr}'` });
        const body = await readBody(req);
        {
          const st = board.getStatus();
          if (!st.connected) {
            return json(res, 503, {
              ok: false,
              error: 'board not connected',
              reason: st.probe?.blockReason ?? 'unknown',
              message: shimMessage(st.probe?.blockReason, false),
            });
          }
        }
        const r = await board.flashImage(body, at >>> 0, url.searchParams.get('name') ?? 'http-upload');
        return json(res, r.ok ? 200 : 500, r);
      }
      if (method === 'POST' && url.pathname === '/reset') {
        {
          const st = board.getStatus();
          if (!st.connected) {
            return json(res, 503, {
              ok: false,
              error: 'board not connected',
              reason: st.probe?.blockReason ?? 'unknown',
              message: shimMessage(st.probe?.blockReason, false),
            });
          }
        }
        const r = await board.reset();
        return json(res, r.ok ? 200 : 500, r);
      }
      if (method === 'POST' && url.pathname === '/halt') {
        {
          const st = board.getStatus();
          if (!st.connected) {
            return json(res, 503, {
              ok: false,
              error: 'board not connected',
              reason: st.probe?.blockReason ?? 'unknown',
              message: shimMessage(st.probe?.blockReason, false),
            });
          }
        }
        const r = await board.halt();
        return json(res, r.ok ? 200 : 500, r);
      }
      if (method === 'POST' && url.pathname === '/op') {
        // raw probe passthrough (tests, tooling): {"op":...} or {"batch":[...]}
        const body = JSON.parse((await readBody(req)).toString('utf8')) as ProbeOp | { batch: ProbeOp[] };
        if ('batch' in body) return json(res, 200, { results: await board.probe.batch(body.batch) });
        return json(res, 200, await board.probe.op(body));
      }
      if (method === 'POST' && url.pathname === '/serial') {
        const body = await readBody(req);
        await board.sendSerial(body);
        return json(res, 200, { ok: true, written: body.length });
      }
      if (method === 'GET' && url.pathname === '/log') return text(res, 200, (extras.log?.() ?? []).join('\n') + '\n');
      if (method === 'POST' && url.pathname === '/command' && extras.command) {
        const body = JSON.parse((await readBody(req)).toString('utf8')) as { command: string; args?: unknown[] };
        const started = Date.now();
        const result = await extras.command(body.command, body.args ?? []);
        return json(res, 200, { ok: true, ms: Date.now() - started, result: result === undefined ? null : result });
      }
      if (url.pathname === '/erase') return json(res, 403, { ok: false, error: 'not permitted: mass erase is disabled in the CaDS lab' });
      json(res, 404, { ok: false, error: `unknown route ${method} ${url.pathname}` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      log.warn(`http ${method} ${url.pathname}: ${msg}`);
      json(res, 500, { ok: false, error: msg });
    }
  });
  return server;
}
