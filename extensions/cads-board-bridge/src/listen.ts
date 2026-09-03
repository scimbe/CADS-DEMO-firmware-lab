/* listen.ts – listen() with retry on EADDRINUSE.
 *
 * code-server keeps an extension host alive after the browser disconnects
 * (VSCODE_RECONNECTION_GRACE_TIME, three hours by default). Opening the lab in a second
 * window therefore starts a second extension host while the first still owns the bridge's
 * fixed ports, and a plain listen() fails once with EADDRINUSE and never recovers: no GDB
 * server, no serial TCP, no HTTP shim, for the rest of that session. The only thing the
 * student sees is "Board-Bridge nicht aktiv" from the st-flash shim.
 *
 * The port frees up as soon as the orphaned host exits, so retrying is enough. The backoff
 * matches SocatPty's supervisor: 1 s per attempt, capped at 30 s, forever until disposed.
 */
import type * as net from 'node:net';

export interface ListenLogger {
  info(m: string): void;
  warn(m: string): void;
  error(m: string): void;
}

export interface ListenRetryOptions {
  /** Growth per attempt; attempt n waits min(step * n, maxDelayMs). */
  stepMs?: number;
  maxDelayMs?: number;
  /** Injectable for tests. */
  setTimeoutFn?: (fn: () => void, ms: number) => unknown;
  clearTimeoutFn?: (handle: unknown) => void;
}

export interface RetryingListener {
  /** Number of EADDRINUSE retries scheduled so far (tests/diagnostics). */
  readonly attempts: number;
  readonly listening: boolean;
  dispose(): void;
}

/**
 * Start listening and keep retrying while the address is in use.
 *
 * Non-EADDRINUSE errors are reported and not retried – those are configuration problems
 * (EACCES on a privileged port, an unresolvable host) that no amount of waiting fixes.
 */
export function listenWithRetry(
  server: net.Server,
  port: number,
  host: string,
  label: string,
  log: ListenLogger,
  opts: ListenRetryOptions = {},
): RetryingListener {
  const stepMs = opts.stepMs ?? 1000;
  const maxDelayMs = opts.maxDelayMs ?? 30000;
  const setTimeoutFn = opts.setTimeoutFn ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimeoutFn = opts.clearTimeoutFn ?? ((h) => clearTimeout(h as NodeJS.Timeout));

  let disposed = false;
  let attempts = 0;
  let listening = false;
  let timer: unknown = null;

  const onError = (e: NodeJS.ErrnoException): void => {
    if (disposed) return;
    if (e.code !== 'EADDRINUSE') {
      log.error(`${label}: ${e.message}`);
      return;
    }
    attempts++;
    const delay = Math.min(maxDelayMs, stepMs * attempts);
    log.warn(
      `${label}: 127.0.0.1:${port} still held by another extension host, retrying in ${delay} ms (attempt ${attempts})`,
    );
    timer = setTimeoutFn(() => {
      timer = null;
      if (!disposed) server.listen(port, host);
    }, delay);
  };

  const onListening = (): void => {
    listening = true;
    const retried = attempts > 0 ? ` after ${attempts} retr${attempts === 1 ? 'y' : 'ies'}` : '';
    log.info(`${label} listening on ${host}:${port}${retried}`);
    attempts = 0;
  };

  server.on('error', onError);
  server.on('listening', onListening);
  server.listen(port, host);

  return {
    get attempts() {
      return attempts;
    },
    get listening() {
      return listening;
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      if (timer !== null) clearTimeoutFn(timer);
      server.off('error', onError);
      server.off('listening', onListening);
    },
  };
}
