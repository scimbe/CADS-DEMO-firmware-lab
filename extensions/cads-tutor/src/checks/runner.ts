/**
 * Check dispatcher (SPEC §3.3 check types). Everything that touches VS Code (tasks, the bridge,
 * the debugger, the LLM) is injected through `CheckContext`, so this module is unit-testable
 * and the same code path runs in production.
 */
import { lastFlashTime, type BoardBridgeApi } from "../bridge";
import type { CheckSpec, Lang, PredictionOutcome, TaskStatus, TestCaseResult } from "../types";
import { loc } from "../types";
import { evaluateCommand, type CommandOutcome } from "./commandRunner";
import { lookupSymbol } from "./elf";
import { fileMatches, fileNotMatches, resolveInRoot } from "./fileChecks";
import { defaultSuiteCommand, evaluateSuite, parseTestOutput } from "./testParsers";

export interface CheckResult {
  status: TaskStatus;
  message: string;
  /** Extra data for the UI (e.g. rubric feedback). */
  detail?: string;
  /** A1: captured stdout+stderr of a command/testSuite run; feeds misconception and `output:` triggers. */
  output?: string;
  /** A1: parsed cases of a testSuite run; feeds the `test:<name>:failed` trigger. */
  tests?: TestCaseResult[];
  /** A1: the prediction a `predict` check was judged against. */
  prediction?: string;
  predictionOutcome?: PredictionOutcome;
}

export interface DebugStopRecord {
  at: number;
  file?: string;
  line?: number;
}

export interface QuestionVerdict {
  /** `manual` means no LLM is configured – the UI must fall back to manual confirmation. */
  kind: "pass" | "fail" | "manual" | "error";
  feedback: string;
}

export interface CheckContext {
  projectRoot: string;
  lang: Lang;
  /** Epoch ms when the step was first opened in this session. */
  stepStartedAt: number;
  sessionStartedAt: number;
  /** Runs a VS Code task by label and resolves with its exit code (undefined = no process). */
  runTask(label: string, timeoutMs: number): Promise<number | undefined>;
  /** Runs a shell command as a task; used for `build` with a preset and no label. */
  runShell(name: string, command: string, timeoutMs: number): Promise<number | undefined>;
  bridge?: BoardBridgeApi;
  /** Debug stops observed since activation (bridge events + debug adapter tracker). */
  debugStops: DebugStopRecord[];
  /** Waits for the next debug stop matching the predicate (or `null` on timeout). */
  waitForDebugStop(match: (s: DebugStopRecord) => boolean, timeoutMs: number): Promise<DebugStopRecord | null>;
  /** LLM rubric evaluation; `manual` when unconfigured. */
  gradeAnswer(prompt: string, rubric: string, answer: string, bloom?: string): Promise<QuestionVerdict>;
  /** Manual confirmations and question answers are stored in the session; the runner reads them here. */
  answerFor(taskId: string): string | undefined;
  manualConfirmed(taskId: string): boolean;
  buildTaskLabel: string;
  env?: NodeJS.ProcessEnv;
  /** A1: runs a shell command in the project root and captures its output. */
  runCommand(command: string, cwd: string | undefined, timeoutMs: number): Promise<CommandOutcome>;
  /** A1: the prediction the student entered before a `predict` check may run its `then`. */
  predictionFor(taskId: string): string | undefined;
}

const DEFAULT_TASK_TIMEOUT = 10 * 60 * 1000;
const DEFAULT_SERIAL_TIMEOUT = 30 * 1000;
const DEFAULT_DEBUG_TIMEOUT = 60 * 1000;
/** A1 default for `command`/`testSuite`; a course pack overrides it with `timeoutMs`. */
const DEFAULT_COMMAND_TIMEOUT = 120 * 1000;
/** A1: "mindestens 10 Zeichen" - a prediction shorter than this is not a prediction. */
export const DEFAULT_PREDICTION_MIN_CHARS = 10;

function bridgeMissing(lang: Lang): CheckResult {
  return {
    status: "unavailable",
    message: lang === "de" ? "Board-Bridge fehlt (cads.cads-board-bridge nicht installiert)" : "Board-Bridge missing (cads.cads-board-bridge not installed)",
  };
}

export async function runCheck(spec: CheckSpec, taskId: string, ctx: CheckContext): Promise<CheckResult> {
  try {
    return await dispatch(spec, taskId, ctx);
  } catch (err) {
    return { status: "failed", message: err instanceof Error ? err.message : String(err) };
  }
}

async function dispatch(spec: CheckSpec, taskId: string, ctx: CheckContext): Promise<CheckResult> {
  switch (spec.type) {
    case "fileMatches": {
      const r = fileMatches(ctx.projectRoot, spec.file, spec.pattern, spec.flags);
      return { status: r.passed ? "passed" : "failed", message: r.message };
    }
    case "fileNotMatches": {
      const r = fileNotMatches(ctx.projectRoot, spec.file, spec.pattern, spec.flags);
      return { status: r.passed ? "passed" : "failed", message: r.message };
    }
    case "symbolInElf": {
      const elf = resolveInRoot(ctx.projectRoot, spec.elf);
      const r = await lookupSymbol(elf, spec.symbol, ctx.env ?? process.env);
      return r.found
        ? { status: "passed", message: `symbol ${spec.symbol} @ 0x${(r.address ?? 0).toString(16).padStart(8, "0")} (${r.via})` }
        : { status: "failed", message: `symbol ${spec.symbol} not defined in ${spec.elf} (${r.via})` };
    }
    case "task": {
      const code = await ctx.runTask(spec.label, spec.timeoutMs ?? DEFAULT_TASK_TIMEOUT);
      return exitCodeResult(spec.label, code, spec.expectExitCode ?? 0);
    }
    case "build": {
      const expect = spec.expectExitCode ?? 0;
      const timeout = spec.timeoutMs ?? DEFAULT_TASK_TIMEOUT;
      if (spec.label) return exitCodeResult(spec.label, await ctx.runTask(spec.label, timeout), expect);
      if (spec.preset) {
        const cmd = `cmake --preset ${shellQuote(spec.preset)} && cmake --build --preset ${shellQuote(spec.preset)}`;
        return exitCodeResult(`cmake preset ${spec.preset}`, await ctx.runShell(`CaDS Tutor: build ${spec.preset}`, cmd, timeout), expect);
      }
      return exitCodeResult(ctx.buildTaskLabel, await ctx.runTask(ctx.buildTaskLabel, timeout), expect);
    }
    case "board": {
      if (!ctx.bridge) return bridgeMissing(ctx.lang);
      const s = ctx.bridge.getStatus();
      const want = spec.state ?? "connected";
      const ok =
        want === "connected" ? s.connected : want === "disconnected" ? !s.connected : want === "halted" ? s.connected && s.core === "halted" : s.connected && s.core === "running";
      return { status: ok ? "passed" : "failed", message: ok ? `board ${want}` : `board is ${s.connected ? s.core ?? "connected" : "not connected"}, expected ${want}` };
    }
    case "flash": {
      if (!ctx.bridge) return bridgeMissing(ctx.lang);
      const s = ctx.bridge.getStatus();
      const at = lastFlashTime(s);
      if (!s.lastFlash || at === undefined) return { status: "failed", message: "no flash recorded yet" };
      if (!s.lastFlash.ok) return { status: "failed", message: `last flash failed (${s.lastFlash.file})` };
      const since = spec.since ?? "stepStart";
      const bound = since === "stepStart" ? ctx.stepStartedAt : since === "sessionStart" ? ctx.sessionStartedAt : 0;
      if (at < bound) return { status: "failed", message: `last successful flash (${new Date(at).toLocaleTimeString()}) is older than ${since}` };
      if (spec.file && !s.lastFlash.file.endsWith(spec.file)) return { status: "failed", message: `last flash wrote ${s.lastFlash.file}, expected ${spec.file}` };
      return { status: "passed", message: `flashed ${s.lastFlash.file} at ${new Date(at).toLocaleTimeString()}` };
    }
    case "serialExpect": {
      if (!ctx.bridge) return bridgeMissing(ctx.lang);
      const re = new RegExp(spec.pattern);
      const timeout = spec.timeoutMs ?? DEFAULT_SERIAL_TIMEOUT;
      const wait = ctx.bridge.waitForSerial(re, timeout);
      if (spec.send) await ctx.bridge.sendSerial(spec.send);
      const line = await wait;
      return line !== null ? { status: "passed", message: `serial: ${line.trim()}` } : { status: "failed", message: `no serial line matched /${spec.pattern}/ within ${Math.round(timeout / 1000)} s` };
    }
    case "debugStop": {
      const match = (s: DebugStopRecord) =>
        (spec.file === undefined || (s.file !== undefined && normalizePath(s.file).endsWith(normalizePath(spec.file)))) &&
        (spec.line === undefined || s.line === spec.line);
      const where = `${spec.file ?? "*"}${spec.line !== undefined ? `:${spec.line}` : ""}`;
      const recent = [...ctx.debugStops].reverse().find((s) => s.at >= ctx.stepStartedAt && match(s));
      if (recent) return { status: "passed", message: `debugger stopped at ${recent.file ?? "?"}:${recent.line ?? "?"}` };
      const next = await ctx.waitForDebugStop(match, spec.timeoutMs ?? DEFAULT_DEBUG_TIMEOUT);
      if (next) return { status: "passed", message: `debugger stopped at ${next.file ?? "?"}:${next.line ?? "?"}` };
      return { status: "failed", message: ctx.bridge ? `no debug stop at ${where} observed` : `no debug stop at ${where} observed (Board-Bridge missing – only editor debug sessions are tracked)` };
    }
    case "question": {
      const answer = (ctx.answerFor(taskId) ?? "").trim();
      const min = spec.minChars ?? 20;
      if (answer.length < min) return { status: "failed", message: ctx.lang === "de" ? `Antwort zu kurz (mindestens ${min} Zeichen)` : `answer too short (at least ${min} characters)` };
      const verdict = await ctx.gradeAnswer(loc(spec.prompt, ctx.lang), spec.rubric, answer, spec.bloom);
      switch (verdict.kind) {
        case "pass":
          return { status: "passed", message: verdict.feedback };
        case "fail":
          return { status: "failed", message: verdict.feedback };
        case "manual":
          return ctx.manualConfirmed(taskId)
            ? { status: "passed", message: ctx.lang === "de" ? "manuell bestätigt (kein LLM konfiguriert)" : "confirmed manually (no LLM configured)" }
            : { status: "pending", message: verdict.feedback };
        case "error":
          return { status: "unavailable", message: verdict.feedback };
      }
      break;
    }
    case "manual":
      return ctx.manualConfirmed(taskId)
        ? { status: "passed", message: ctx.lang === "de" ? "manuell bestätigt" : "confirmed manually" }
        : { status: "pending", message: ctx.lang === "de" ? "noch nicht bestätigt" : "not confirmed yet" };
    case "command": {
      const outcome = await ctx.runCommand(spec.command, spec.cwd, spec.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT);
      const verdict = evaluateCommand(outcome, spec);
      return {
        status: verdict.passed ? "passed" : "failed",
        message: verdict.message,
        output: outcome.output,
      };
    }
    case "testSuite": {
      const command = defaultSuiteCommand(spec.runner, spec.command);
      if (command === undefined) {
        return { status: "unavailable", message: `testSuite runner "${spec.runner}" needs an explicit command` };
      }
      const outcome = await ctx.runCommand(command, spec.cwd, spec.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT);
      // Timeout before spawn error: the timeout kills the process, so it also
      // surfaces as a signal exit, and it is the more useful diagnosis.
      if (outcome.timedOut) {
        return { status: "failed", message: `tests timed out after ${Math.round(outcome.durationMs / 1000)} s`, output: outcome.output, tests: [] };
      }
      if (outcome.spawnError !== undefined) {
        return { status: "failed", message: `could not run the tests: ${outcome.spawnError}`, output: outcome.output };
      }
      // The runner's exit code is deliberately ignored: a suite with an expected
      // failure (expectFail) exits non-zero by design, so the parsed per-test
      // results are the authority.
      const tests = parseTestOutput(outcome.output, spec.runner);
      const verdict = evaluateSuite(tests, spec);
      return {
        status: verdict.passed ? "passed" : "failed",
        message: verdict.message,
        output: outcome.output,
        tests,
      };
    }
    case "predict": {
      // A1: the prediction must exist before `then` runs, otherwise the exercise
      // degenerates into reading the answer off the screen and writing it down.
      const prediction = (ctx.predictionFor(taskId) ?? "").trim();
      const min = spec.minChars ?? DEFAULT_PREDICTION_MIN_CHARS;
      if (prediction.length < min) {
        return {
          status: "pending",
          message:
            ctx.lang === "de"
              ? `Bitte zuerst eine Vorhersage schreiben (mindestens ${min} Zeichen), dann wird ausgeführt.`
              : `Write a prediction first (at least ${min} characters); the check runs afterwards.`,
        };
      }
      const inner = await dispatch(spec.then, taskId, ctx);
      let outcome: PredictionOutcome | undefined;
      let feedback: string | undefined;
      if (spec.rubric) {
        const observed = (inner.output ?? inner.message).slice(0, 4000);
        const verdict = await ctx.gradeAnswer(
          `${loc(spec.prompt, ctx.lang)}\n\nPrediction: ${prediction}\n\nActual output:\n${observed}`,
          spec.rubric,
          prediction,
          spec.bloom ?? "evaluate",
        );
        if (verdict.kind === "pass" || verdict.kind === "fail") {
          outcome = verdict.kind === "pass" ? "correct" : "deviated";
          feedback = verdict.feedback;
        }
      }
      // A1: passed when `then` passed and a prediction exists. Whether the
      // prediction was right is recorded, never a gate - being wrong and seeing
      // why is the point of the exercise.
      return {
        ...inner,
        detail: feedback ?? inner.detail,
        prediction,
        predictionOutcome: outcome,
      };
    }
    case "all": {
      const results: CheckResult[] = [];
      for (const c of spec.checks) {
        const r = await dispatch(c, taskId, ctx);
        results.push(r);
        if (r.status !== "passed") return { status: r.status, message: `[${c.type}] ${r.message}` };
      }
      return { status: "passed", message: results.map((r, i) => `[${spec.checks[i].type}] ${r.message}`).join("; ") };
    }
    case "any": {
      const messages: string[] = [];
      let sawUnavailable = false;
      for (const c of spec.checks) {
        const r = await dispatch(c, taskId, ctx);
        if (r.status === "passed") return { status: "passed", message: `[${c.type}] ${r.message}` };
        if (r.status === "unavailable") sawUnavailable = true;
        messages.push(`[${c.type}] ${r.message}`);
      }
      return { status: sawUnavailable && messages.length === spec.checks.length && spec.checks.every((c) => ["board", "flash", "serialExpect"].includes(c.type)) ? "unavailable" : "failed", message: messages.join("; ") };
    }
  }
  return { status: "failed", message: `unsupported check type ${(spec as CheckSpec).type}` };
}

function exitCodeResult(label: string, code: number | undefined, expected: number): CheckResult {
  if (code === undefined) return { status: "failed", message: `task "${label}" did not produce an exit code (not found or no process)` };
  return code === expected
    ? { status: "passed", message: `task "${label}" exited with ${code}` }
    : { status: "failed", message: `task "${label}" exited with ${code} (expected ${expected})` };
}

function shellQuote(s: string): string {
  return /^[A-Za-z0-9_./-]+$/.test(s) ? s : `'${s.replace(/'/g, "'\\''")}'`;
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, "/");
}

/** Collects every project-relative file a step's checks and links refer to (for save-triggered re-checks). */
export function referencedFiles(spec: CheckSpec): string[] {
  switch (spec.type) {
    case "fileMatches":
    case "fileNotMatches":
      return [spec.file];
    case "symbolInElf":
      return [spec.elf];
    case "debugStop":
      return spec.file ? [spec.file] : [];
    case "all":
    case "any":
      return spec.checks.flatMap(referencedFiles);
    default:
      return [];
  }
}

export function isLocalCheck(spec: CheckSpec): boolean {
  switch (spec.type) {
    case "fileMatches":
    case "fileNotMatches":
    case "symbolInElf":
      return true;
    case "all":
    case "any":
      return spec.checks.every(isLocalCheck);
    default:
      return false;
  }
}
