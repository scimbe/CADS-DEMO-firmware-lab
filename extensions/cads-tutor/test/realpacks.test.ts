/**
 * Loads the real course packs from <repo>/courses and renders every step in both languages –
 * the loader must accept exactly what the course authors ship (SPEC §3.3).
 */
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it } from "node:test";
import { loadCoursePack, loadCourses, orderedSteps } from "../src/loader";
import { createRenderer } from "../src/markdown";
import { TutorPlatform } from "../src/platform";
import { newSession, stepStatus } from "../src/session";
import { renderStepHtml, type StepView } from "../src/webview";

const COURSES = path.resolve(__dirname, "..", "..", "..", "..", "courses");
const PACKS = path.resolve(__dirname, "..", "..", "node_modules", "@cads", "tutor-platform", "content-packs");
const REAL = ["cads-zero-foundations", "cads-zero-projects"].filter((c) => fs.existsSync(path.join(COURSES, c, "course.json")));

describe("real course packs", { skip: REAL.length === 0 ? "courses/ not present" : false }, () => {
  for (const name of REAL) {
    it(`${name}: loads without errors and every step renders in de and en`, () => {
      const { course, diagnostics } = loadCoursePack(path.join(COURSES, name), "test");
      const errors = diagnostics.filter((d) => d.level === "error").map((d) => `${path.basename(d.file ?? "")}: ${d.message}`);
      assert.deepEqual(errors, []);
      assert.ok(course);
      const listed = course!.manifest.modules.flatMap((m) => m.steps);
      assert.equal(course!.steps.size, listed.length, "every listed step loaded");
      const render = createRenderer({ resolveAsset: (p) => `asset:${p}` });
      for (const step of orderedSteps(course!)) {
        for (const lang of ["en", "de"] as const) {
          const content = step.variants[lang];
          assert.ok(content, `${step.id} has ${lang}`);
          const html = render(content!.body);
          assert.ok(html.length > 100, `${step.id}.${lang} body renders`);
          const meta = content!.meta;
          const view: StepView = {
            lang, courseId: course!.manifest.id, courseTitle: "c", moduleTitle: "m", stepId: step.id, title: meta.title, index: 0, total: 1,
            bloom: meta.bloom, estimatedMinutes: meta.estimatedMinutes, objectives: meta.objectives, creates: meta.creates, status: "open", lockedBy: [], bodyHtml: html,
            links: [], tasks: meta.tasks.map((t) => ({ id: t.id, title: typeof t.title === "string" ? t.title : t.title.en ?? "", type: t.check.type, status: "pending" as const, needsAnswer: t.check.type === "question", manual: t.check.type === "manual", live: false })),
            llmConfigured: false, bridgeAvailable: false, scaffold: meta.scaffold, hasBoard: false,
          };
          const page = renderStepHtml(view, "vscode-webview://x", "N");
          assert.match(page, /<h1 id="step-title">/);
        }
        // Every socratic trigger references a task of the step (or an event / *).
        for (const s of step.variants.en!.meta.socratic) {
          const m = /^(?:task|question):([^:]+):/.exec(s.trigger);
          if (m) assert.ok(step.variants.en!.meta.tasks.some((t) => t.id === m[1]), `${step.id}: trigger ${s.trigger} names a task`);
        }
      }
      const warnings = diagnostics.filter((d) => d.level === "warning").map((d) => d.message);
      assert.equal(warnings.filter((w) => /unknown step|unknown task/.test(w)).length, 0, warnings.join("\n"));
    });
  }

  it("both packs load together; projects is locked behind foundations; pack objectives land in the curriculum", () => {
    const result = loadCourses({ workspaceRoot: os.tmpdir(), homeDir: os.tmpdir(), imageDir: COURSES });
    // courses/ also holds the language tracks now, so assert that the firmware
    // packs are among what loaded rather than pinning the whole set - a new pack
    // in the repo must not break this test.
    const ids = result.courses.map((c) => c.manifest.id);
    for (const id of REAL) assert.ok(ids.includes(id), `${id} loaded (got ${ids.join(", ")})`);
    for (const c of result.courses) assert.ok(c.steps.size > 0, `${c.manifest.id} has steps`);
    assert.deepEqual(result.diagnostics.filter((d) => d.level === "error"), [], "no pack in courses/ fails to load");
    const foundations = result.courses.find((c) => c.manifest.id === "cads-zero-foundations")!;
    const projects = result.courses.find((c) => c.manifest.id === "cads-zero-projects");
    // A count pinned to the day it was written breaks whenever the course stream
    // adds an objective, which is normal authoring. Assert the property that
    // matters: the pack ships its own objectives and they parse.
    assert.ok(foundations.curriculum.length >= 20, `curriculum entries: ${foundations.curriculum.length}`);
    assert.ok(foundations.curriculum.every((o) => typeof (o as { id?: unknown }).id === "string"));
    const session = newSession();
    assert.equal(stepStatus(session, foundations, orderedSteps(foundations)[0], result.courses), "open");
    if (projects) assert.equal(stepStatus(session, projects, orderedSteps(projects)[0], result.courses), "locked");

    const platform = new TutorPlatform({ course: foundations, packsDir: PACKS, studentId: "s", memoryDir: fs.mkdtempSync(path.join(os.tmpdir(), "cads-")), llm: null, projectRoot: path.resolve(__dirname, "..", "..", "..", "..", "..", "cads-zero") });
    assert.ok(platform.curriculum, "curriculum graph built");
    assert.ok(platform.curriculum!.get("cz.arch.sim-vs-board"), "pack objective merged");
    assert.ok(platform.curriculum!.get("firmware-how-to-build"), "platform objective present");
    const used = new Set(orderedSteps(foundations).flatMap((s) => s.variants.en!.meta.objectives));
    for (const id of used) assert.ok(platform.curriculum!.get(id), `objective ${id} known`);
    assert.equal(platform.knownObjective(orderedSteps(foundations)[0].variants.en!.meta.objectives), orderedSteps(foundations)[0].variants.en!.meta.objectives[0]);
  });
});
