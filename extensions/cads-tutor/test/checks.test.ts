import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it } from "node:test";
import type { BoardBridgeApi } from "../src/bridge";
import { findSymbol, lookupSymbol, parseElf32Symbols } from "../src/checks/elf";
import { fileMatches, fileNotMatches, resolveInRoot } from "../src/checks/fileChecks";
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
