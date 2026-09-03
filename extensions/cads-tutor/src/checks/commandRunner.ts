/**
 * Runs a course pack's `command` / `testSuite` check (SPEC Addendum v1.1 A1):
 * `/bin/sh -c <command>` in the project root, `cwd` relative to it.
 *
 * Kept free of the VS Code API so the check runner stays unit-testable, and
 * injected through `CheckContext.runCommand` so tests can substitute a fake.
 */
import { spawn } from "node:child_process";
import path from "node:path";

/** A1: the captured output is stored with the task; 64 KB is the documented cap. */
export const MAX_OUTPUT_BYTES = 64 * 1024;
export const DEFAULT_COMMAND_TIMEOUT_MS = 120_000;

export interface CommandOutcome {
  exitCode: number | undefined;
  stdout: string;
  stderr: string;
  /** stdout and stderr interleaved by stream, capped at MAX_OUTPUT_BYTES. */
  output: string;
  timedOut: boolean;
  durationMs: number;
  /** Set only when the process could not be started at all (spawn failed). */
  spawnError?: string;
  /** Set when the process was killed by a signal, e.g. the timeout's SIGTERM. */
  terminatedBy?: string;
}

export interface CommandOptions {
  command: string;
  /** Project root; the command runs here unless `cwd` narrows it. */
  root: string;
  cwd?: string;
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
  signal?: AbortSignal;
}

/**
 * Keeps the last MAX_OUTPUT_BYTES rather than the first: a failing build's
 * useful part (the error, the summary) is at the end, and a runaway loop would
 * otherwise fill the buffer with noise before the diagnosis appears.
 */
class TailBuffer {
  private chunks: string[] = [];
  private size = 0;

  push(s: string): void {
    this.chunks.push(s);
    this.size += s.length;
    while (this.size > MAX_OUTPUT_BYTES && this.chunks.length > 1) {
      this.size -= this.chunks.shift()!.length;
    }
  }

  toString(): string {
    const s = this.chunks.join("");
    return s.length > MAX_OUTPUT_BYTES ? s.slice(s.length - MAX_OUTPUT_BYTES) : s;
  }
}

/**
 * Resolves `cwd` inside `root` and refuses to escape it. The schema already
 * rejects absolute paths and `..` segments, but a pack can be edited by hand
 * after validation, so the runtime checks again rather than trusting it.
 */
export function resolveCwd(root: string, cwd?: string): string {
  if (!cwd || cwd === ".") return root;
  const abs = path.resolve(root, cwd);
  const rel = path.relative(root, abs);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`cwd "${cwd}" resolves outside the project root`);
  }
  return abs;
}

export async function runCommand(opts: CommandOptions): Promise<CommandOutcome> {
  const started = Date.now();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
  let cwd: string;
  try {
    cwd = resolveCwd(opts.root, opts.cwd);
  } catch (err) {
    return {
      exitCode: undefined,
      stdout: "",
      stderr: "",
      output: "",
      timedOut: false,
      durationMs: 0,
      spawnError: err instanceof Error ? err.message : String(err),
    };
  }

  return await new Promise<CommandOutcome>((resolve) => {
    const stdout = new TailBuffer();
    const stderr = new TailBuffer();
    const combined = new TailBuffer();
    let settled = false;
    let timedOut = false;

    const child = spawn("/bin/sh", ["-c", opts.command], {
      cwd,
      env: opts.env ?? process.env,
      // No shell: true - we already are the shell, and a second layer would
      // re-interpret quoting in the author's command.
      stdio: ["ignore", "pipe", "pipe"],
    });

    const finish = (exitCode: number | undefined, extra: { spawnError?: string; terminatedBy?: string } = {}) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      opts.signal?.removeEventListener("abort", onAbort);
      resolve({
        exitCode,
        stdout: stdout.toString(),
        stderr: stderr.toString(),
        output: combined.toString(),
        timedOut,
        durationMs: Date.now() - started,
        ...extra,
      });
    };

    // SIGTERM first, then SIGKILL, so a shell that traps TERM cannot wedge a check.
    const kill = () => {
      child.kill("SIGTERM");
      setTimeout(() => {
        if (!settled) child.kill("SIGKILL");
      }, 2000).unref?.();
    };

    const timer = setTimeout(() => {
      timedOut = true;
      kill();
    }, timeoutMs);
    timer.unref?.();

    const onAbort = () => kill();
    opts.signal?.addEventListener("abort", onAbort, { once: true });

    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (d: string) => {
      stdout.push(d);
      combined.push(d);
    });
    child.stderr?.on("data", (d: string) => {
      stderr.push(d);
      combined.push(d);
    });
    child.on("error", (err) => finish(undefined, { spawnError: err.message }));
    // A signal exit is a kill (timeout, abort, or the student stopping it), not a
    // failure to start; keeping the two apart lets evaluateCommand say which happened.
    child.on("close", (code, signal) => finish(code ?? undefined, signal ? { terminatedBy: signal } : {}));
  });
}

export interface CommandExpectation {
  expectExitCode?: number;
  expectStdout?: string;
  expectStderr?: string;
}

/**
 * A1: a command check passes when the exit code matches (default 0) and every
 * given regex matches its stream. Regexes run multiline, matching how the
 * validator applies them.
 */
export function evaluateCommand(outcome: CommandOutcome, expect: CommandExpectation): { passed: boolean; message: string } {
  // Order matters: a timeout kills the process, so it also shows up as a signal
  // exit. The timeout is the more useful diagnosis, so it is reported first.
  if (outcome.timedOut) {
    return { passed: false, message: `timed out after ${Math.round(outcome.durationMs / 1000)} s` };
  }
  if (outcome.spawnError !== undefined) {
    return { passed: false, message: `could not run the command: ${outcome.spawnError}` };
  }
  if (outcome.exitCode === undefined) {
    return { passed: false, message: `the command was terminated by ${outcome.terminatedBy ?? "an unknown signal"}` };
  }
  const wanted = expect.expectExitCode ?? 0;
  if (outcome.exitCode !== wanted) {
    return { passed: false, message: `exited with ${outcome.exitCode ?? "no code"}, expected ${wanted}` };
  }
  for (const [key, text] of [
    ["expectStdout", outcome.stdout],
    ["expectStderr", outcome.stderr],
  ] as const) {
    const pattern = expect[key];
    if (pattern === undefined) continue;
    if (!new RegExp(pattern, "m").test(text)) {
      return { passed: false, message: `${key} /${pattern}/ did not match` };
    }
  }
  return { passed: true, message: `exited with ${outcome.exitCode}` };
}
