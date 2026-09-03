import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseFrontMatter } from "../src/frontmatter";
import { validateCheck, validateCourseManifest, validateStepFrontMatter } from "../src/schema";

describe("front matter", () => {
  it("parses a YAML block and returns the body", () => {
    const r = parseFrontMatter("---\nid: a\ntasks:\n  - { id: t, check: { type: manual } }\n---\n# Body\n");
    assert.equal(r.hasFrontMatter, true);
    assert.equal((r.data as { id: string }).id, "a");
    assert.equal(r.body, "# Body\n");
  });
  it("treats files without a leading --- as plain markdown", () => {
    const r = parseFrontMatter("# no meta\n---\nx: 1\n---\n");
    assert.equal(r.hasFrontMatter, false);
  });
});

describe("step schema", () => {
  const base = { id: "s1", title: "T", bloom: "apply", tasks: [{ id: "a", title: "A", check: { type: "manual" } }] };

  it("accepts the SPEC example shapes", () => {
    const r = validateStepFrontMatter({ ...base, objectives: ["cz.x"], requires: ["s0"], links: [{ step: "s0" }, { file: "a.c", line: 3 }, { doc: "d.md" }, { url: "https://x", title: "x" }], socratic: [{ trigger: "task:a:failed", question: { en: "q" }, hints: [{ en: "h1" }] }] }, "s1");
    assert.deepEqual(r.errors, []);
    assert.equal(r.value!.links.length, 4);
  });
  it("rejects an id mismatch with the file name", () => {
    const r = validateStepFrontMatter(base, "other");
    assert.match(r.errors[0], /does not match the file name/);
  });
  it("rejects unknown check types with the list of known ones", () => {
    const r = validateStepFrontMatter({ ...base, tasks: [{ id: "a", check: { type: "magic" } }] }, "s1");
    assert.match(r.errors[0], /tasks\[0\]\.check\.type: unknown check type "magic"/);
  });
  it("rejects invalid regular expressions", () => {
    assert.throws(() => validateCheck({ type: "fileMatches", file: "f", pattern: "(" }, "c"), /invalid regular expression/);
  });
  it("rejects duplicate task ids and warns about dangling socratic triggers", () => {
    const dup = validateStepFrontMatter({ ...base, tasks: [{ id: "a", check: { type: "manual" } }, { id: "a", check: { type: "manual" } }] }, "s1");
    assert.match(dup.errors[0], /duplicate task id "a"/);
    const warn = validateStepFrontMatter({ ...base, socratic: [{ trigger: "task:nope:failed", question: "q", hints: ["h"] }] }, "s1");
    assert.deepEqual(warn.errors, []);
    assert.ok(warn.warnings.some((w) => /unknown task "nope"/.test(w)));
  });
  it("validates nested all/any compositions", () => {
    const r = validateCheck({ type: "all", checks: [{ type: "manual" }, { type: "any", checks: [{ type: "board" }] }] }, "c");
    assert.equal(r.type, "all");
  });
});

describe("course schema", () => {
  it("accepts the SPEC example", () => {
    const r = validateCourseManifest({ id: "cads-zero-foundations", version: "1.0.0", schema: 1, title: { de: "a", en: "b" }, project: { root: "cads-zero" }, prerequisites: [], grounding: { pack: "firmware", threshold: 5 }, modules: [{ id: "m0", title: { de: "x", en: "y" }, steps: ["m0-01"] }] });
    assert.deepEqual(r.errors, []);
    assert.equal(r.value!.grounding!.pack, "firmware");
  });
  it("rejects duplicate step listings and empty modules", () => {
    const r = validateCourseManifest({ id: "c", version: "1", schema: 1, title: "t", modules: [{ id: "m", title: "m", steps: ["a", "a"] }] });
    assert.match(r.errors[0], /step "a" is listed twice/);
    const e = validateCourseManifest({ id: "c", version: "1", schema: 1, title: "t", modules: [] });
    assert.match(e.errors[0], /modules: must be a non-empty array/);
  });
});

describe("v1.1 check types", () => {
  const base = { id: "s1", title: "T", bloom: "apply", tasks: [{ id: "a", title: "A", check: { type: "manual" } }] };

  it("accepts a command check and defaults the optional fields", () => {
    const c = validateCheck({ type: "command", command: "cargo build" }, "c");
    assert.equal(c.type, "command");
    assert.equal((c as { command: string }).command, "cargo build");
    assert.equal((c as { expectExitCode?: number }).expectExitCode, undefined);
  });
  it("rejects a command cwd that escapes the project root", () => {
    assert.throws(() => validateCheck({ type: "command", command: "x", cwd: "/etc" }, "c"), /relative path inside the project root/);
    assert.throws(() => validateCheck({ type: "command", command: "x", cwd: "../up" }, "c"), /relative path inside the project root/);
  });
  it("rejects command expect patterns that do not compile", () => {
    assert.throws(() => validateCheck({ type: "command", command: "x", expectStdout: "(" }, "c"), /invalid regular expression/);
  });
  it("accepts every documented testSuite runner and rejects others", () => {
    for (const runner of ["cargo", "node-test"]) {
      assert.equal(validateCheck({ type: "testSuite", runner }, "c").type, "testSuite");
    }
    assert.throws(() => validateCheck({ type: "testSuite", runner: "mocha" }, "c"), /must be one of/);
  });
  it("requires an explicit command for the tap and custom runners", () => {
    assert.throws(() => validateCheck({ type: "testSuite", runner: "tap" }, "c"), /is required for runner "tap"/);
    assert.equal(validateCheck({ type: "testSuite", runner: "tap", command: "./run.sh" }, "c").type, "testSuite");
  });
  it("rejects a test named in both expectPass and expectFail", () => {
    assert.throws(() => validateCheck({ type: "testSuite", runner: "cargo", expectPass: ["t"], expectFail: ["t"] }, "c"), /listed in both expectPass and expectFail/);
  });
  it("rejects a negative or fractional minPass", () => {
    assert.throws(() => validateCheck({ type: "testSuite", runner: "cargo", minPass: -1 }, "c"), /non-negative integer/);
    assert.throws(() => validateCheck({ type: "testSuite", runner: "cargo", minPass: 1.5 }, "c"), /non-negative integer/);
  });
  it("accepts a predict check wrapping a command", () => {
    const c = validateCheck({ type: "predict", prompt: { en: "what?", de: "was?" }, then: { type: "command", command: "cargo run" } }, "c");
    assert.equal(c.type, "predict");
    assert.equal((c as { then: { type: string } }).then.type, "command");
  });
  it("refuses a predict whose observed check is another predict, a question, or manual", () => {
    const p = { type: "predict", prompt: "p", then: { type: "predict", prompt: "q", then: { type: "board" } } };
    assert.throws(() => validateCheck(p, "c"), /cannot nest another predict/);
    for (const t of ["question", "manual"]) {
      const then = t === "question" ? { type: t, prompt: "q", rubric: "r" } : { type: t };
      assert.throws(() => validateCheck({ type: "predict", prompt: "p", then }, "c"), /cannot be the observed check/);
    }
  });
  it("requires a then on a predict", () => {
    assert.throws(() => validateCheck({ type: "predict", prompt: "p" }, "c"), /is required/);
  });
});

describe("v1.1 step fields", () => {
  const base = { id: "s1", title: "T", bloom: "apply", tasks: [{ id: "a", title: "A", check: { type: "manual" } }] };

  it("defaults scaffold to independent and rejects unknown levels", () => {
    assert.equal(validateStepFrontMatter(base, "s1").value!.scaffold, "independent");
    assert.equal(validateStepFrontMatter({ ...base, scaffold: "worked" }, "s1").value!.scaffold, "worked");
    assert.match(validateStepFrontMatter({ ...base, scaffold: "heavy" }, "s1").errors[0], /must be one of/);
  });
  it("refuses a step that recalls from itself", () => {
    assert.match(validateStepFrontMatter({ ...base, recallFrom: ["s1"] }, "s1").errors[0], /cannot recall from itself/);
  });
  it("validates misconception patterns and hint tiers", () => {
    const ok = validateStepFrontMatter({ ...base, tasks: [{ id: "a", check: { type: "command", command: "x" } }], misconceptions: [{ pattern: "error\\[E0382\\]", question: "q", hints: ["h1", "h2"] }] }, "s1");
    assert.deepEqual(ok.errors, []);
    assert.equal(ok.value!.misconceptions[0].hints.length, 2);
    assert.match(validateStepFrontMatter({ ...base, misconceptions: [{ pattern: "error[", question: "q", hints: ["h"] }] }, "s1").errors[0], /invalid regular expression/);
    assert.match(validateStepFrontMatter({ ...base, misconceptions: [{ pattern: "x", question: "q", hints: [] }] }, "s1").errors[0], /non-empty array/);
  });
  it("warns when misconceptions can never match because no check produces output", () => {
    const r = validateStepFrontMatter({ ...base, misconceptions: [{ pattern: "x", question: "q", hints: ["h"] }] }, "s1");
    assert.deepEqual(r.errors, []);
    assert.ok(r.warnings.some((w) => /no command\/testSuite task whose output they could match/.test(w)));
  });
  it("accepts the new socratic triggers and warns when they cannot fire", () => {
    const cannot = validateStepFrontMatter({ ...base, socratic: [{ trigger: "test:adds:failed", question: "q", hints: ["h"] }] }, "s1");
    assert.deepEqual(cannot.errors, []);
    assert.ok(cannot.warnings.some((w) => /needs a testSuite task/.test(w)));
    const can = validateStepFrontMatter({ ...base, tasks: [{ id: "a", check: { type: "testSuite", runner: "cargo" } }], socratic: [{ trigger: "test:adds:failed", question: "q", hints: ["h"] }] }, "s1");
    assert.deepEqual(can.warnings.filter((w) => /never|needs a/.test(w)), []);
  });
  it("rejects an output: trigger whose regex does not compile", () => {
    assert.match(validateStepFrontMatter({ ...base, socratic: [{ trigger: "output:(", question: "q", hints: ["h"] }] }, "s1").errors[0], /invalid regular expression/);
  });
  it("sees a command nested inside all/any when deciding whether a trigger can fire", () => {
    const r = validateStepFrontMatter({ ...base, tasks: [{ id: "a", check: { type: "all", checks: [{ type: "manual" }, { type: "command", command: "x" }] } }], socratic: [{ trigger: "output:boom", question: "q", hints: ["h"] }] }, "s1");
    assert.deepEqual(r.warnings.filter((w) => /needs a command/.test(w)), []);
  });
});

describe("v1.1 module reflection", () => {
  const mk = (reflection: unknown) => validateCourseManifest({ id: "c", version: "1", schema: 1, title: "t", modules: [{ id: "m", title: "m", steps: ["a"], reflection }] });
  it("accepts 1-3 localized prompts", () => {
    const r = mk({ prompts: [{ en: "what stuck?", de: "was blieb?" }] });
    assert.deepEqual(r.errors, []);
    assert.equal(r.value!.modules[0].reflection!.prompts.length, 1);
  });
  it("rejects an empty prompt list and warns above three", () => {
    assert.match(mk({ prompts: [] }).errors[0], /non-empty array/);
    assert.ok(mk({ prompts: ["a", "b", "c", "d"] }).warnings.some((w) => /meant for 1-3/.test(w)));
  });
  it("leaves reflection undefined when the module omits it", () => {
    const r = validateCourseManifest({ id: "c", version: "1", schema: 1, title: "t", modules: [{ id: "m", title: "m", steps: ["a"] }] });
    assert.equal(r.value!.modules[0].reflection, undefined);
  });
});
