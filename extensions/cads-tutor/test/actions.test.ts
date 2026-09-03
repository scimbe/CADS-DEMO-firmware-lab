import assert from "node:assert/strict";
import * as path from "node:path";
import { describe, it } from "node:test";
import { actionLabels, actionsForCheck, allowedActions, courseCapabilities, isBoardAction, type TaskAction } from "../src/actions";
import { loadCoursePack } from "../src/loader";
import type { CheckSpec, Course } from "../src/types";

const EXAMPLE = path.resolve(__dirname, "..", "..", "courses", "_example");
const OPTS = { buildTaskLabel: "CaDS: Build" };
const kinds = (spec: CheckSpec) => actionsForCheck(spec, OPTS).map((a) => a.kind);

describe("action derivation per check type", () => {
  it("offers running the named task for a task check", () => {
    const a = actionsForCheck({ type: "task", label: "CaDS: Build" }, OPTS);
    assert.deepEqual(a, [{ kind: "runTask", arg: "CaDS: Build" }]);
  });
  it("falls back to the configured build label when a build check names nothing", () => {
    assert.deepEqual(actionsForCheck({ type: "build" }, OPTS), [{ kind: "runTask", arg: "CaDS: Build" }]);
  });
  it("turns a preset build into the exact command, since there is no task to run", () => {
    const a = actionsForCheck({ type: "build", preset: "itsboard" }, OPTS);
    assert.deepEqual(kinds({ type: "build", preset: "itsboard" }), ["runInTerminal", "copyCommand"]);
    assert.match(a[0].arg!, /cmake --preset itsboard && cmake --build --preset itsboard/);
  });
  it("offers terminal and copy for a command check, with its cwd", () => {
    const a = actionsForCheck({ type: "command", command: "cargo build", cwd: "app" }, OPTS);
    assert.deepEqual(a.map((x) => x.kind), ["runInTerminal", "copyCommand"]);
    assert.equal(a[0].arg, "cargo build");
    assert.equal(a[0].cwd, "app");
  });
  it("uses the runner's default command for a testSuite that names none", () => {
    assert.equal(actionsForCheck({ type: "testSuite", runner: "cargo" }, OPTS)[0].arg, "cargo test");
    assert.equal(actionsForCheck({ type: "testSuite", runner: "node-test" }, OPTS)[0].arg, "node --test --test-reporter=tap");
  });
  it("prefers an explicit testSuite command over the default", () => {
    assert.equal(actionsForCheck({ type: "testSuite", runner: "cargo", command: "cargo test --all" }, OPTS)[0].arg, "cargo test --all");
  });
  it("offers nothing runnable for a tap runner without a command", () => {
    assert.deepEqual(actionsForCheck({ type: "testSuite", runner: "tap" } as CheckSpec, OPTS), []);
  });
  it("opens the file a file check names", () => {
    const a = actionsForCheck({ type: "fileMatches", file: "src/main.rs", pattern: "x" }, OPTS);
    assert.deepEqual(a, [{ kind: "openFile", arg: "src/main.rs" }]);
  });
  it("offers the build for symbolInElf, because opening an ELF shows bytes", () => {
    assert.deepEqual(kinds({ type: "symbolInElf", elf: "build/x.elf", symbol: "main" }), ["runTask"]);
  });
  it("maps each board check to its own board command", () => {
    assert.deepEqual(kinds({ type: "board" }), ["boardConnect"]);
    assert.deepEqual(kinds({ type: "flash" }), ["boardFlash"]);
    assert.deepEqual(kinds({ type: "serialExpect", pattern: "x" }), ["boardConsole"]);
    assert.deepEqual(kinds({ type: "debugStop", file: "a.c", line: 12 }), ["debugStart", "openFile"]);
  });
  it("offers nothing to press for question and manual checks", () => {
    assert.deepEqual(kinds({ type: "question", prompt: "q", rubric: "r" }), []);
    assert.deepEqual(kinds({ type: "manual" }), []);
  });
  it("offers the observed check's actions for a predict, since that is what runs", () => {
    const a = kinds({ type: "predict", prompt: "p", then: { type: "command", command: "cargo run" } });
    assert.deepEqual(a, ["runInTerminal", "copyCommand"]);
  });
  it("collects the actions of every part of a composite, without duplicates", () => {
    const a = kinds({
      type: "all",
      checks: [
        { type: "command", command: "make" },
        { type: "command", command: "make" },
        { type: "fileMatches", file: "a.c", pattern: "x" },
      ],
    });
    assert.deepEqual(a, ["runInTerminal", "copyCommand", "openFile"]);
  });
});

describe("course capabilities", () => {
  function fakeCourse(checks: CheckSpec[], declared?: string[]): Course {
    const steps = new Map();
    steps.set("s1", {
      id: "s1", moduleId: "m", courseId: "c",
      variants: { en: { meta: { tasks: checks.map((c, i) => ({ id: `t${i}`, title: "t", check: c })) } as never, body: "", file: "f" } },
    });
    return {
      manifest: { id: "c", version: "1", schema: 1, title: "c", prerequisites: [], modules: [], ...(declared ? { capabilities: declared } : {}) } as never,
      dir: "/tmp", origin: "test", steps, curriculum: [],
    } as never;
  }

  it("derives board from the hardware check types a pack actually uses", () => {
    assert.ok(courseCapabilities(fakeCourse([{ type: "flash" }])).has("board"));
    assert.ok(courseCapabilities(fakeCourse([{ type: "debugStop" }])).has("board"));
  });
  it("gives a language track no board capability", () => {
    // Rust and JavaScript must never see flashing or a debugger.
    const js = fakeCourse([{ type: "testSuite", runner: "node-test" }, { type: "command", command: "node x.js" }]);
    assert.equal(courseCapabilities(js).has("board"), false);
  });
  it("sees a hardware check nested inside a composite", () => {
    const c = fakeCourse([{ type: "all", checks: [{ type: "manual" }, { type: "board" }] }]);
    assert.ok(courseCapabilities(c).has("board"));
  });
  it("lets course.json declare capabilities explicitly, overriding the derivation", () => {
    const c = fakeCourse([{ type: "flash" }], []);
    assert.equal(courseCapabilities(c).has("board"), false, "an explicit empty list wins");
  });
  it("reads the real example pack as a hardware course", () => {
    const course = loadCoursePack(EXAMPLE, "test").course!;
    assert.ok(courseCapabilities(course).has("board"));
  });
});

describe("gating board actions", () => {
  const board: TaskAction[] = [{ kind: "boardFlash" }, { kind: "runInTerminal", arg: "x" }];

  it("hides board actions in a course without the capability", () => {
    const out = allowedActions(board, { capabilities: new Set(), bridgeAvailable: true });
    assert.deepEqual(out.map((a) => a.kind), ["runInTerminal"]);
  });
  it("hides board actions when the bridge extension is missing", () => {
    // A button that answers "bridge missing" when pressed is worse than no button.
    const out = allowedActions(board, { capabilities: new Set(["board"] as const), bridgeAvailable: false });
    assert.deepEqual(out.map((a) => a.kind), ["runInTerminal"]);
  });
  it("shows them when the course uses hardware and the bridge is there", () => {
    const out = allowedActions(board, { capabilities: new Set(["board"] as const), bridgeAvailable: true });
    assert.deepEqual(out.map((a) => a.kind), ["boardFlash", "runInTerminal"]);
  });
  it("never gates non-board actions", () => {
    const plain: TaskAction[] = [{ kind: "runTask", arg: "t" }, { kind: "openFile", arg: "f" }, { kind: "copyCommand", arg: "c" }];
    assert.equal(allowedActions(plain, { capabilities: new Set(), bridgeAvailable: false }).length, 3);
    assert.ok(!plain.some((a) => isBoardAction(a.kind)));
  });
});

describe("action labels teach the manual route", () => {
  it("names the task and the menu path in both languages", () => {
    const de = actionLabels({ kind: "runTask", arg: "CaDS: Build" }, "de");
    assert.equal(de.label, "Task ausführen");
    assert.match(de.manual, /Terminal → Task ausführen → CaDS: Build/);
    const en = actionLabels({ kind: "runTask", arg: "CaDS: Build" }, "en");
    assert.match(en.manual, /Terminal → Run Task → CaDS: Build/);
  });
  it("gives every action kind a label in both languages", () => {
    const all: TaskAction[] = [
      { kind: "runTask", arg: "t" }, { kind: "runInTerminal", arg: "c" }, { kind: "copyCommand", arg: "c" },
      { kind: "openFile", arg: "f" }, { kind: "boardConnect" }, { kind: "boardFlash" },
      { kind: "boardConsole" }, { kind: "debugStart" },
    ];
    for (const a of all) {
      for (const lang of ["de", "en"] as const) {
        assert.ok(actionLabels(a, lang).label.length > 0, `${a.kind}/${lang}`);
      }
    }
  });
  it("leaves the copy button without a manual route, because there is none", () => {
    assert.equal(actionLabels({ kind: "copyCommand", arg: "x" }, "de").manual, "");
  });
});
