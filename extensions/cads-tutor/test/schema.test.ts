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
