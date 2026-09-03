import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it } from "node:test";
import type { BoardBridgeApi } from "../src/bridge";
import { findSymbol, lookupSymbol, parseElf32Symbols } from "../src/checks/elf";
import { fileMatches, fileNotMatches, resolveInRoot } from "../src/checks/fileChecks";
import { evaluateCommand, runCommand } from "../src/checks/commandRunner";
import { isLocalCheck, referencedFiles, runCheck, type CheckContext } from "../src/checks/runner";

const ELF = path.resolve(__dirname, "..", "..", "test", "fixtures", "cads-zero.elf");

function project(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cads-proj-"));
  fs.mkdirSync(path.join(dir, "apps", "desktop"), { recursive: true });
  fs.writeFileSync(path.join(dir, "apps", "desktop", "cads_desktop.c"), "#include <x.h>\n/* splash */\nconst char *s = \"Hello World\";\n");
  fs.mkdirSync(path.join(dir, "build", "itsboard"), { recursive: true });
  fs.copyFileSync(ELF, path.join(dir, "build", "itsboard", "cads-zero.elf"));
  return dir;
}

function ctx(root: string, extra: Partial<CheckContext> = {}): CheckContext {
  return {
    projectRoot: root,
    lang: "en",
    stepStartedAt: Date.now() - 1000,
    sessionStartedAt: Date.now() - 5000,
    runTask: async () => 0,
    runShell: async () => 0,
    debugStops: [],
    waitForDebugStop: async () => null,
    gradeAnswer: async () => ({ kind: "manual", feedback: "no llm" }),
    answerFor: () => undefined,
    manualConfirmed: () => false,
    buildTaskLabel: "CaDS: Build",
    env: { PATH: "/nonexistent" },
    runCommand: (command, cwd, timeoutMs) => runCommand({ command, root, cwd, timeoutMs }),
    predictionFor: () => undefined,
    ...extra,
  };
}

describe("file checks", () => {
  it("fileMatches reports the line and fileNotMatches the opposite", () => {
    const root = project();
    const miss = fileMatches(root, "apps/desktop/cads_desktop.c", "Hello ITS");
    assert.equal(miss.passed, false);
    const hit = fileMatches(root, "apps/desktop/cads_desktop.c", "Hello World");
    assert.equal(hit.passed, true);
    assert.equal(hit.line, 3);
    assert.equal(fileNotMatches(root, "apps/desktop/cads_desktop.c", "Hello World").passed, false);
    assert.equal(fileNotMatches(root, "apps/desktop/cads_desktop.c", "TODO").passed, true);
    assert.match(fileMatches(root, "nope.c", "x").message, /file not found/);
  });
  it("supports flags and refuses paths outside the root", () => {
    const root = project();
    assert.equal(fileMatches(root, "apps/desktop/cads_desktop.c", "hello world", "i").passed, true);
    assert.throws(() => resolveInRoot(root, "../etc/passwd"), /escapes the project root/);
  });
});

describe("ELF32 symbol parser", () => {
  it("finds main and HardFault_Handler in the cads-zero ELF fixture", () => {
    const symbols = parseElf32Symbols(fs.readFileSync(ELF));
    assert.ok(symbols.length > 1000);
    const main = findSymbol(symbols, "main")!;
    assert.ok(main, "main present");
    assert.equal(main.value, 0x08023108);
    assert.equal(main.type, 2, "STT_FUNC");
    assert.ok(findSymbol(symbols, "HardFault_Handler"));
    assert.equal(findSymbol(symbols, "cads_no_such_symbol_xyz"), undefined);
  });
  it("rejects non-ELF input", () => {
    assert.throws(() => parseElf32Symbols(Buffer.from("not an elf file at all, really not")), /not an ELF/);
  });
  it("lookupSymbol falls back to the parser when nm is unavailable", async () => {
    const r = await lookupSymbol(ELF, "main", { PATH: "/nonexistent" });
    assert.equal(r.found, true);
    assert.equal(r.via, "parser");
    assert.equal(r.address, 0x08023108);
    const miss = await lookupSymbol(ELF, "nope_nope", { PATH: "/nonexistent" });
    assert.equal(miss.found, false);
  });
});

describe("check runner", () => {
  it("runs fileMatches / symbolInElf / all / any / manual / question", async () => {
    const root = project();
    const c = ctx(root);
    assert.equal((await runCheck({ type: "fileMatches", file: "apps/desktop/cads_desktop.c", pattern: "Hello ITS" }, "t", c)).status, "failed");
    fs.appendFileSync(path.join(root, "apps", "desktop", "cads_desktop.c"), "// Hello ITS\n");
    assert.equal((await runCheck({ type: "fileMatches", file: "apps/desktop/cads_desktop.c", pattern: "Hello ITS" }, "t", c)).status, "passed");
    const sym = await runCheck({ type: "symbolInElf", elf: "build/itsboard/cads-zero.elf", symbol: "main" }, "t", c);
    assert.equal(sym.status, "passed", sym.message);
    assert.match(sym.message, /0x08023108/);
    const all = await runCheck({ type: "all", checks: [{ type: "fileMatches", file: "apps/desktop/cads_desktop.c", pattern: "Hello ITS" }, { type: "fileNotMatches", file: "apps/desktop/cads_desktop.c", pattern: "Hello ITS" }] }, "t", c);
    assert.equal(all.status, "failed");
    assert.match(all.message, /^\[fileNotMatches\]/);
    const any = await runCheck({ type: "any", checks: [{ type: "fileMatches", file: "x", pattern: "y" }, { type: "symbolInElf", elf: "build/itsboard/cads-zero.elf", symbol: "main" }] }, "t", c);
    assert.equal(any.status, "passed");
    assert.equal((await runCheck({ type: "manual" }, "t", c)).status, "pending");
    assert.equal((await runCheck({ type: "manual" }, "t", ctx(root, { manualConfirmed: () => true }))).status, "passed");
    // question without LLM → manual fallback
    const q = { type: "question" as const, prompt: "why?", rubric: "r", minChars: 5 };
    assert.equal((await runCheck(q, "t", ctx(root, { answerFor: () => "because of reasons" }))).status, "pending");
    assert.equal((await runCheck(q, "t", ctx(root, { answerFor: () => "because of reasons", manualConfirmed: () => true }))).status, "passed");
    assert.equal((await runCheck(q, "t", ctx(root, { answerFor: () => "no" }))).status, "failed");
    const graded = await runCheck(q, "t", ctx(root, { answerFor: () => "because of reasons", gradeAnswer: async () => ({ kind: "fail", feedback: "missing option bytes" }) }));
    assert.equal(graded.status, "failed");
    assert.equal(graded.message, "missing option bytes");
  });

  it("task/build use exit codes; board checks report unavailable without a bridge", async () => {
    const root = project();
    const calls: string[] = [];
    const c = ctx(root, { runTask: async (label) => (calls.push(label), label === "CaDS: Build" ? 0 : 2), runShell: async (_n, cmd) => (calls.push(cmd), 0) });
    assert.equal((await runCheck({ type: "task", label: "CaDS: Build" }, "t", c)).status, "passed");
    assert.equal((await runCheck({ type: "task", label: "Other", expectExitCode: 0 }, "t", c)).status, "failed");
    assert.equal((await runCheck({ type: "build" }, "t", c)).status, "passed");
    assert.equal((await runCheck({ type: "build", preset: "itsboard" }, "t", c)).status, "passed");
    assert.ok(calls.some((x) => x.includes("cmake --build --preset itsboard")));
    for (const spec of [{ type: "board" as const }, { type: "flash" as const }, { type: "serialExpect" as const, pattern: "x" }]) {
      const r = await runCheck(spec, "t", c);
      assert.equal(r.status, "unavailable");
      assert.match(r.message, /Board-Bridge missing/);
    }
  });

  it("bridge-backed checks: board, flash since stepStart, serialExpect, debugStop", async () => {
    const root = project();
    const sent: string[] = [];
    const now = Date.now();
    const bridge: BoardBridgeApi = {
      getStatus: () => ({ connected: true, serialOpen: true, core: "halted", lastFlash: { file: "build/itsboard/cads-zero.bin", addr: 0x08000000, ok: true, at: now - 500 } }),
      onDidChangeStatus: () => ({ dispose() {} }),
      onSerialLine: () => ({ dispose() {} }),
      onEvent: () => ({ dispose() {} }),
      flash: async () => ({ ok: true }),
      sendSerial: async (t) => void sent.push(t),
      waitForSerial: async (re) => (re.test("RESULT: PASS") ? "RESULT: PASS" : null),
    };
    const c = ctx(root, { bridge, stepStartedAt: now - 1000 });
    assert.equal((await runCheck({ type: "board", state: "halted" }, "t", c)).status, "passed");
    assert.equal((await runCheck({ type: "board", state: "running" }, "t", c)).status, "failed");
    assert.equal((await runCheck({ type: "flash", since: "stepStart" }, "t", c)).status, "passed");
    assert.equal((await runCheck({ type: "flash", since: "stepStart" }, "t", ctx(root, { bridge, stepStartedAt: now + 1000 }))).status, "failed");
    const ser = await runCheck({ type: "serialExpect", send: "t\n", pattern: "RESULT: PASS" }, "t", c);
    assert.equal(ser.status, "passed");
    assert.deepEqual(sent, ["t\n"]);
    assert.equal((await runCheck({ type: "serialExpect", pattern: "NOPE" }, "t", c)).status, "failed");
    const stop = await runCheck({ type: "debugStop", file: "apps/bringup/explorer_app_demo.c", line: 120 }, "t", ctx(root, { debugStops: [{ at: now, file: "/ws/cads-zero/apps/bringup/explorer_app_demo.c", line: 120 }] }));
    assert.equal(stop.status, "passed");
    const waited = await runCheck({ type: "debugStop", file: "a.c", line: 1, timeoutMs: 10 }, "t", ctx(root, { waitForDebugStop: async (m) => (m({ at: now, file: "x/a.c", line: 1 }) ? { at: now, file: "x/a.c", line: 1 } : null) }));
    assert.equal(waited.status, "passed");
    assert.equal((await runCheck({ type: "debugStop", file: "a.c", line: 2, timeoutMs: 10 }, "t", c)).status, "failed");
  });

  it("referencedFiles / isLocalCheck", () => {
    assert.deepEqual(referencedFiles({ type: "all", checks: [{ type: "fileMatches", file: "a", pattern: "x" }, { type: "symbolInElf", elf: "b", symbol: "s" }, { type: "manual" }] }), ["a", "b"]);
    assert.equal(isLocalCheck({ type: "all", checks: [{ type: "fileMatches", file: "a", pattern: "x" }] }), true);
    assert.equal(isLocalCheck({ type: "any", checks: [{ type: "fileMatches", file: "a", pattern: "x" }, { type: "board" }] }), false);
  });
});

// ---------------------------------------------------------------------------
// Addendum v1.1 A1: command, testSuite and predict checks.
// ---------------------------------------------------------------------------

describe("command check", () => {
  it("passes on exit code 0 and captures the output", async () => {
    const root = project();
    const r = await runCheck({ type: "command", command: "echo hello from the check" }, "t", ctx(root));
    assert.equal(r.status, "passed");
    assert.match(r.output ?? "", /hello from the check/);
  });
  it("fails on a non-zero exit code and reports both codes", async () => {
    const root = project();
    const r = await runCheck({ type: "command", command: "exit 3" }, "t", ctx(root));
    assert.equal(r.status, "failed");
    assert.match(r.message, /exited with 3, expected 0/);
  });
  it("honours a non-zero expectExitCode", async () => {
    const root = project();
    assert.equal((await runCheck({ type: "command", command: "exit 3", expectExitCode: 3 }, "t", ctx(root))).status, "passed");
  });
  it("applies expectStdout and expectStderr to the right stream", async () => {
    const root = project();
    const ok = await runCheck({ type: "command", command: "echo out; echo err >&2", expectStdout: "^out$", expectStderr: "^err$" }, "t", ctx(root));
    assert.equal(ok.status, "passed");
    const crossed = await runCheck({ type: "command", command: "echo out", expectStderr: "out" }, "t", ctx(root));
    assert.equal(crossed.status, "failed");
    assert.match(crossed.message, /expectStderr/);
  });
  it("runs in cwd relative to the project root", async () => {
    const root = project();
    const r = await runCheck({ type: "command", command: "pwd", cwd: "apps/desktop" }, "t", ctx(root));
    assert.equal(r.status, "passed");
    assert.match(r.output ?? "", /apps\/desktop/);
  });
  it("refuses a cwd that escapes the project root", async () => {
    const root = project();
    const r = await runCheck({ type: "command", command: "pwd", cwd: "../.." }, "t", ctx(root));
    assert.equal(r.status, "failed");
    assert.match(r.message, /outside the project root/);
  });
  it("fails rather than hangs when the command exceeds its timeout", async () => {
    const root = project();
    const started = Date.now();
    const r = await runCheck({ type: "command", command: "sleep 30", timeoutMs: 400 }, "t", ctx(root));
    assert.equal(r.status, "failed");
    assert.match(r.message, /timed out/);
    assert.ok(Date.now() - started < 10_000, "the timeout must actually kill the process");
  });
  it("caps the captured output and keeps the end, where the error is", async () => {
    const root = project();
    const r = await runCheck({ type: "command", command: "for i in $(seq 1 20000); do echo padding-line-$i; done; echo FINAL-MARKER" }, "t", ctx(root));
    assert.equal(r.status, "passed");
    assert.ok((r.output ?? "").length <= 64 * 1024, `output was ${(r.output ?? "").length} bytes`);
    assert.match(r.output ?? "", /FINAL-MARKER/);
  });
});

describe("testSuite check", () => {
  function suiteProject(tapBody: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cads-suite-"));
    fs.writeFileSync(path.join(dir, "fake-runner.sh"), `#!/bin/sh\ncat <<'TAPEOF'\n${tapBody}\nTAPEOF\nexit 1\n`);
    fs.chmodSync(path.join(dir, "fake-runner.sh"), 0o755);
    return dir;
  }

  it("passes when the named tests passed, ignoring the runner's exit code", async () => {
    // The fake runner exits 1 on purpose: a suite with an expected failure is
    // non-zero by design, so the parsed results must be the authority.
    const root = suiteProject("TAP version 13\nok 1 - alpha\nnot ok 2 - beta\n1..2");
    const r = await runCheck({ type: "testSuite", runner: "tap", command: "./fake-runner.sh", expectPass: ["alpha"], expectFail: ["beta"] }, "t", ctx(root));
    assert.equal(r.status, "passed");
    assert.equal(r.tests?.length, 2);
  });
  it("fails and names the test when an expected pass did not pass", async () => {
    const root = suiteProject("TAP version 13\nnot ok 1 - alpha\n1..1");
    const r = await runCheck({ type: "testSuite", runner: "tap", command: "./fake-runner.sh", expectPass: ["alpha"] }, "t", ctx(root));
    assert.equal(r.status, "failed");
    assert.match(r.message, /"alpha" to pass, but it failed/);
  });
  it("exposes parsed cases so the test:<name>:failed trigger can fire", async () => {
    const root = suiteProject("TAP version 13\nok 1 - alpha\nnot ok 2 - beta\n1..2");
    const r = await runCheck({ type: "testSuite", runner: "tap", command: "./fake-runner.sh" }, "t", ctx(root));
    assert.equal(r.status, "failed");
    assert.deepEqual(r.tests?.map((t) => [t.name, t.status]), [["alpha", "passed"], ["beta", "failed"]]);
  });
  it("reports unparseable output instead of passing silently", async () => {
    const root = suiteProject("this is not TAP at all");
    const r = await runCheck({ type: "testSuite", runner: "tap", command: "./fake-runner.sh" }, "t", ctx(root));
    assert.equal(r.status, "failed");
    assert.match(r.message, /no test results could be parsed/);
  });
  it("is unavailable when a tap/custom runner has no command", async () => {
    const root = project();
    const r = await runCheck({ type: "testSuite", runner: "custom" } as never, "t", ctx(root));
    assert.equal(r.status, "unavailable");
  });
});

describe("predict check", () => {
  const inner = { type: "command", command: "echo 42" } as const;

  it("does not run the observed check before a prediction exists", async () => {
    const root = project();
    const marker = path.join(root, "ran.txt");
    const r = await runCheck(
      { type: "predict", prompt: { en: "what prints?" }, then: { type: "command", command: `touch ${JSON.stringify(marker)}` } },
      "t",
      ctx(root, { predictionFor: () => undefined }),
    );
    assert.equal(r.status, "pending");
    assert.equal(fs.existsSync(marker), false, "the observed check must not run before the prediction");
  });
  it("rejects a prediction that is too short to be one", async () => {
    const root = project();
    const r = await runCheck({ type: "predict", prompt: { en: "p" }, then: inner }, "t", ctx(root, { predictionFor: () => "no" }));
    assert.equal(r.status, "pending");
    assert.match(r.message, /at least 10 characters/);
  });
  it("runs the observed check once a prediction is in and reports its output", async () => {
    const root = project();
    const r = await runCheck({ type: "predict", prompt: { en: "p" }, then: inner }, "t", ctx(root, { predictionFor: () => "I think it prints 42" }));
    assert.equal(r.status, "passed");
    assert.equal(r.prediction, "I think it prints 42");
    assert.match(r.output ?? "", /42/);
  });
  it("passes on a wrong prediction as long as the observed check passed", async () => {
    // Being wrong and seeing why is the exercise; the outcome is recorded, not a gate.
    const root = project();
    const r = await runCheck(
      { type: "predict", prompt: { en: "p" }, rubric: "prediction matches the output", then: inner },
      "t",
      ctx(root, { predictionFor: () => "I predict it prints 99", gradeAnswer: async () => ({ kind: "fail", feedback: "you said 99, it printed 42" }) }),
    );
    assert.equal(r.status, "passed");
    assert.equal(r.predictionOutcome, "deviated");
    assert.match(r.detail ?? "", /printed 42/);
  });
  it("records a matching prediction as correct", async () => {
    const root = project();
    const r = await runCheck(
      { type: "predict", prompt: { en: "p" }, rubric: "r", then: inner },
      "t",
      ctx(root, { predictionFor: () => "I predict it prints 42", gradeAnswer: async () => ({ kind: "pass", feedback: "right" }) }),
    );
    assert.equal(r.predictionOutcome, "correct");
  });
  it("leaves the outcome open when no LLM graded it, without failing the check", async () => {
    const root = project();
    const r = await runCheck({ type: "predict", prompt: { en: "p" }, rubric: "r", then: inner }, "t", ctx(root, { predictionFor: () => "a long enough prediction" }));
    assert.equal(r.status, "passed");
    assert.equal(r.predictionOutcome, undefined);
  });
  it("fails when the observed check fails, keeping the prediction", async () => {
    const root = project();
    const r = await runCheck(
      { type: "predict", prompt: { en: "p" }, then: { type: "command", command: "exit 1" } },
      "t",
      ctx(root, { predictionFor: () => "a long enough prediction" }),
    );
    assert.equal(r.status, "failed");
    assert.equal(r.prediction, "a long enough prediction");
  });
});

describe("command outcomes that are not plain exits", () => {
  it("reports a timeout as a timeout, not as a failure to start", async () => {
    // A timeout kills the process, so it also arrives as a signal exit. The
    // timeout must win, otherwise the student is told the command "could not run".
    const root = project();
    const r = await runCheck({ type: "command", command: "sleep 30", timeoutMs: 300 }, "t", ctx(root));
    assert.match(r.message, /timed out/);
    assert.doesNotMatch(r.message, /could not run/);
  });
  it("distinguishes a kill from a spawn failure", async () => {
    const root = project();
    const outcome = await runCommand({ command: "kill -TERM $$", root });
    assert.equal(outcome.exitCode, undefined);
    assert.equal(outcome.spawnError, undefined);
    assert.equal(outcome.terminatedBy, "SIGTERM");
    assert.match(evaluateCommand(outcome, {}).message, /terminated by SIGTERM/);
  });
});
