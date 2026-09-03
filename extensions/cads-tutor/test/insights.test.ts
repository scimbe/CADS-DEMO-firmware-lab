import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateStepFrontMatter } from "../src/schema";
import { selectInsight, selectOutputInsight, selectTestInsight } from "../src/socratic";
import type { StepFrontMatter } from "../src/types";

/** Builds a real StepFrontMatter through the schema, so the tests exercise what a pack produces. */
function meta(extra: Record<string, unknown>): StepFrontMatter {
  const r = validateStepFrontMatter(
    {
      id: "s1",
      title: "T",
      bloom: "apply",
      tasks: [{ id: "tests", check: { type: "testSuite", runner: "cargo" } }],
      ...extra,
    },
    "s1",
  );
  assert.deepEqual(r.errors, []);
  return r.value!;
}

const RUST_MOVE = `error[E0382]: borrow of moved value: \`s\`
 --> src/main.rs:5:20
  |
4 |     let t = s;
  |             - value moved here`;

describe("misconception matching", () => {
  const m = meta({
    misconceptions: [
      { pattern: "error\\[E0382\\]", question: { en: "Who owns the value now?", de: "Wem gehört der Wert jetzt?" }, hints: [{ en: "tier one" }, { en: "tier two" }, { en: "tier three" }] },
      { pattern: "error\\[E0499\\]", question: { en: "How many mutable borrows?" }, hints: [{ en: "borrow tier one" }] },
    ],
  });

  it("matches a compiler error in the captured output", () => {
    const hit = selectOutputInsight(m, RUST_MOVE, 1, "en")!;
    assert.equal(hit.source, "misconception");
    assert.equal(hit.matched, "error\\[E0382\\]");
    assert.equal(hit.question, "Who owns the value now?");
    assert.equal(hit.hint, "tier one");
  });
  it("escalates the tier with repeated failures, capped at three", () => {
    assert.equal(selectOutputInsight(m, RUST_MOVE, 2, "en")!.hint, "tier two");
    assert.equal(selectOutputInsight(m, RUST_MOVE, 9, "en")!.hint, "tier three");
  });
  it("falls back to the last authored tier when fewer than three exist", () => {
    assert.equal(selectOutputInsight(m, "error[E0499]: two mutable borrows", 3, "en")!.hint, "borrow tier one");
  });
  it("returns the localized wording", () => {
    assert.equal(selectOutputInsight(m, RUST_MOVE, 1, "de")!.question, "Wem gehört der Wert jetzt?");
  });
  it("records a short excerpt of what matched", () => {
    assert.equal(selectOutputInsight(m, RUST_MOVE, 1, "en")!.excerpt, "error[E0382]");
  });
  it("does not match unrelated output", () => {
    assert.equal(selectOutputInsight(m, "everything compiled fine", 1, "en"), undefined);
  });
  it("returns nothing for empty output rather than matching a permissive pattern", () => {
    const permissive = meta({ misconceptions: [{ pattern: ".*", question: { en: "q" }, hints: [{ en: "h" }] }] });
    assert.equal(selectOutputInsight(permissive, "", 1, "en"), undefined);
  });
});

describe("output: trigger matching", () => {
  it("matches an output: socratic trigger when no misconception does", () => {
    const m = meta({ socratic: [{ trigger: "output:ReferenceError", question: { en: "Where is it declared?" }, hints: [{ en: "look at the scope" }] }] });
    const hit = selectOutputInsight(m, "ReferenceError: x is not defined", 1, "en")!;
    assert.equal(hit.source, "output");
    assert.equal(hit.matched, "ReferenceError");
  });
  it("prefers a misconception over an equivalent output: trigger", () => {
    // A2 calls the two equivalent and names the short form preferred.
    const m = meta({
      misconceptions: [{ pattern: "E0382", question: { en: "from the misconception" }, hints: [{ en: "h" }] }],
      socratic: [{ trigger: "output:E0382", question: { en: "from the trigger" }, hints: [{ en: "h" }] }],
    });
    assert.equal(selectOutputInsight(m, RUST_MOVE, 1, "en")!.question, "from the misconception");
  });
});

describe("test:<name>:failed trigger matching", () => {
  const m = meta({
    socratic: [
      { trigger: "test:moves_string:failed", question: { en: "What happened to the original binding?" }, hints: [{ en: "ownership moved" }] },
      { trigger: "test:outer > inner:failed", question: { en: "nested one" }, hints: [{ en: "nested hint" }] },
    ],
  });

  it("fires for a failed test named by its leaf name", () => {
    const hit = selectTestInsight(m, ["moves_string"], 1, "en")!;
    assert.equal(hit.source, "test");
    assert.equal(hit.matched, "moves_string");
    assert.equal(hit.hint, "ownership moved");
  });
  it("fires for a test named by its full nested path", () => {
    assert.equal(selectTestInsight(m, ["outer > inner"], 1, "en")!.question, "nested one");
  });
  it("stays silent when a different test failed", () => {
    assert.equal(selectTestInsight(m, ["something_else"], 1, "en"), undefined);
  });
  it("stays silent when nothing failed", () => {
    assert.equal(selectTestInsight(m, [], 1, "en"), undefined);
  });
});

describe("insight precedence", () => {
  it("prefers the failing test's hint over a generic output match", () => {
    // The test hint names the case that broke; the output hint is a guess at the class of error.
    const m = meta({
      misconceptions: [{ pattern: "assertion", question: { en: "generic" }, hints: [{ en: "generic hint" }] }],
      socratic: [{ trigger: "test:moves_string:failed", question: { en: "specific" }, hints: [{ en: "specific hint" }] }],
    });
    const hit = selectInsight(m, { output: "assertion failed", failedTests: ["moves_string"], failures: 1, lang: "en" })!;
    assert.equal(hit.question, "specific");
  });
  it("falls back to the output match when no test trigger applies", () => {
    const m = meta({
      misconceptions: [{ pattern: "assertion", question: { en: "generic" }, hints: [{ en: "generic hint" }] }],
      socratic: [{ trigger: "test:other:failed", question: { en: "specific" }, hints: [{ en: "h" }] }],
    });
    assert.equal(selectInsight(m, { output: "assertion failed", failedTests: ["moves_string"], failures: 1, lang: "en" })!.question, "generic");
  });
  it("returns nothing when a step authored no insights at all", () => {
    assert.equal(selectInsight(meta({}), { output: "anything", failedTests: ["x"], failures: 1, lang: "en" }), undefined);
  });
});
