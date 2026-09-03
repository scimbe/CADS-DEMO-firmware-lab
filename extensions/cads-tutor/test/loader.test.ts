import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it } from "node:test";
import { collectSources, loadCoursePack, loadCourses, orderedSteps } from "../src/loader";

const EXAMPLE = path.resolve(__dirname, "..", "..", "courses", "_example");

function tmp(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cads-tutor-"));
}

describe("loader", () => {
  it("loads the example pack with both languages and all check types", () => {
    const { course, diagnostics } = loadCoursePack(EXAMPLE, "test");
    assert.ok(course, diagnostics.map((d) => d.message).join("\n"));
    assert.equal(diagnostics.filter((d) => d.level === "error").length, 0, diagnostics.map((d) => d.message).join("\n"));
    assert.equal(course.manifest.id, "example-course");
    assert.equal(course.steps.size, 6);
    const steps = orderedSteps(course).map((s) => s.id);
    assert.deepEqual(steps, ["m0-01-welcome", "m0-02-build", "m1-01-board", "m1-02-reflect", "m2-01-command", "m2-02-predict"]);
    for (const s of course.steps.values()) {
      assert.ok(s.variants.en, `${s.id} has en`);
      assert.ok(s.variants.de, `${s.id} has de`);
    }
    const types = new Set<string>();
    const collect = (c: { type: string; checks?: { type: string }[]; then?: { type: string } }) => {
      types.add(c.type);
      c.checks?.forEach(collect);
      if (c.then) collect(c.then as never);
    };
    for (const s of course.steps.values()) for (const t of s.variants.en!.meta.tasks) collect(t.check as never);
    // The example pack is the authoring template, so it must demonstrate every
    // check type the schema accepts - including the v1.1 additions.
    for (const expected of ["board", "task", "build", "fileMatches", "fileNotMatches", "symbolInElf", "flash", "serialExpect", "debugStop", "question", "manual", "all", "any", "command", "testSuite", "predict"]) {
      assert.ok(types.has(expected), `example course uses check type ${expected}`);
    }
    assert.equal(course.curriculum.length, 1);
  });

  it("the example pack demonstrates every v1.1 step field", () => {
    const { course } = loadCoursePack(EXAMPLE, "test");
    const metas = [...course!.steps.values()].map((s) => s.variants.en!.meta);
    assert.ok(metas.some((m) => m.scaffold === "worked"), "a worked example");
    assert.ok(metas.some((m) => m.scaffold === "faded"), "a faded step");
    assert.ok(metas.some((m) => m.recallFrom.length > 0), "a recallFrom target");
    assert.ok(metas.some((m) => m.misconceptions.length > 0), "a misconception");
    assert.ok(metas.some((m) => m.socratic.some((h) => h.trigger.startsWith("output:"))), "an output: trigger");
    assert.ok(metas.some((m) => m.socratic.some((h) => h.trigger.startsWith("test:"))), "a test: trigger");
    const reflection = course!.manifest.modules.find((m) => m.reflection);
    assert.ok(reflection, "a module reflection");
    assert.ok(reflection!.reflection!.prompts.length >= 1);
  });

  it("orders sources: extensions, image, user, workspace, extra", () => {
    const sources = collectSources({
      workspaceRoot: "/ws",
      homeDir: "/home/x",
      imageDir: "/opt/img",
      extensionContributions: [{ extensionId: "a.b", extensionPath: "/ext", paths: ["courses/one"] }],
      extraDirs: ["/extra"],
    });
    assert.deepEqual(
      sources.map((s) => [s.origin, s.dir]),
      [
        ["extension:a.b", "/ext/courses/one"],
        ["image", "/opt/img"],
        ["user", "/home/x/.cads-tutor/courses"],
        ["workspace", "/ws/.cads-tutor/courses"],
        ["setting", "/extra"],
      ]
    );
  });

  it("merges sources, first course id wins, reports collisions", () => {
    const home = tmp();
    const ws = tmp();
    const userDir = path.join(home, ".cads-tutor", "courses", "example-course");
    const wsDir = path.join(ws, ".cads-tutor", "courses", "copy");
    fs.cpSync(EXAMPLE, userDir, { recursive: true });
    fs.cpSync(EXAMPLE, wsDir, { recursive: true });
    const result = loadCourses({ workspaceRoot: ws, homeDir: home, imageDir: path.join(home, "none") });
    assert.equal(result.courses.length, 1);
    assert.equal(result.courses[0].origin, "user");
    assert.ok(result.diagnostics.some((d) => d.level === "warning" && /already provided/.test(d.message)));
  });

  it("reports schema errors with field paths and keeps other steps", () => {
    const dir = tmp();
    fs.cpSync(EXAMPLE, dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "steps", "m0-02-build.en.md"), "---\nid: m0-02-build\ntitle: x\nbloom: guess\n---\nbody\n");
    fs.unlinkSync(path.join(dir, "steps", "m0-02-build.de.md"));
    const { course, diagnostics } = loadCoursePack(dir, "test");
    assert.ok(course);
    const err = diagnostics.find((d) => d.level === "error" && /bloom/.test(d.message));
    assert.ok(err, "bloom error reported");
    assert.match(err!.message, /must be one of remember\|understand/);
    // The broken step is missing; the module still references it → error listed, other steps intact.
    assert.ok(diagnostics.some((d) => /has no valid step file/.test(d.message)));
    assert.equal(course!.steps.size, 5);
  });

  it("rejects a course.json with the wrong schema version", () => {
    const dir = tmp();
    fs.cpSync(EXAMPLE, dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "course.json"), JSON.stringify({ id: "x", schema: 2, version: "1", title: "t", modules: [{ id: "m", title: "m", steps: ["a"] }] }));
    const { course, diagnostics } = loadCoursePack(dir, "test");
    assert.equal(course, undefined);
    assert.match(diagnostics[0].message, /unsupported course schema 2/);
  });

  it("falls back to German when a step has no English variant", () => {
    const dir = tmp();
    fs.cpSync(EXAMPLE, dir, { recursive: true });
    fs.unlinkSync(path.join(dir, "steps", "m1-02-reflect.en.md"));
    const { course, diagnostics } = loadCoursePack(dir, "test");
    assert.ok(course);
    const step = course!.steps.get("m1-02-reflect")!;
    assert.equal(step.variants.en, step.variants.de);
    assert.ok(diagnostics.some((d) => /no English variant/.test(d.message)));
  });
});
