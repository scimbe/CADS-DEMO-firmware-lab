import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it } from "node:test";
import { courseMatchesFolder, coursesForFolders, loadCourses, orderedSteps } from "../src/loader";
import { newSession, recordTaskResult, stepStatus } from "../src/session";
import type { Course } from "../src/types";

const EXAMPLE = path.resolve(__dirname, "..", "..", "courses", "_example");

/**
 * Two packs that deliberately share every module id (m0, m1) and step id, the
 * way the Rust and JavaScript tracks do. Anything that resolves an id without
 * its course will mix them up.
 */
function twoCollidingPacks(): { dir: string; courses: Course[] } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cads-multi-"));
  for (const [name, root, marker] of [
    ["alpha", "alpha-workspace", "ALPHA"],
    ["beta", "beta-workspace", "BETA"],
  ] as const) {
    const packDir = path.join(dir, name);
    fs.cpSync(EXAMPLE, packDir, { recursive: true });
    const manifest = JSON.parse(fs.readFileSync(path.join(packDir, "course.json"), "utf8"));
    manifest.id = `${name}-course`;
    manifest.title = { de: `${marker} Kurs`, en: `${marker} course` };
    manifest.project = { root };
    fs.writeFileSync(path.join(packDir, "course.json"), JSON.stringify(manifest, null, 2));
    // Same step ids and module ids in both packs; only the titles differ.
    for (const file of fs.readdirSync(path.join(packDir, "steps"))) {
      const p = path.join(packDir, "steps", file);
      const text = fs.readFileSync(p, "utf8").replace(/^title: (.*)$/m, `title: ${marker} $1`);
      fs.writeFileSync(p, text);
    }
  }
  const { courses } = loadCourses({ workspaceRoot: os.tmpdir(), homeDir: os.tmpdir(), imageDir: dir });
  return { dir, courses };
}

describe("two courses that share module and step ids", () => {
  const { courses } = twoCollidingPacks();

  it("loads both", () => {
    assert.deepEqual(courses.map((c) => c.manifest.id).sort(), ["alpha-course", "beta-course"]);
  });

  it("gives each course only its own step titles", () => {
    // The live fault: the second course's tree showed the first course's titles.
    for (const c of courses) {
      const marker = c.manifest.id === "alpha-course" ? "ALPHA" : "BETA";
      const other = marker === "ALPHA" ? "BETA" : "ALPHA";
      for (const step of orderedSteps(c)) {
        const title = step.variants.en!.meta.title;
        assert.ok(title.startsWith(marker), `${c.manifest.id} step ${step.id} has title "${title}"`);
        assert.ok(!title.includes(other), `${c.manifest.id} shows a title from ${other}`);
      }
    }
  });

  it("resolves each module's steps within its own course", () => {
    for (const c of courses) {
      const marker = c.manifest.id === "alpha-course" ? "ALPHA" : "BETA";
      for (const mod of c.manifest.modules) {
        for (const sid of mod.steps) {
          const step = c.steps.get(sid);
          assert.ok(step, `${c.manifest.id}/${mod.id} resolves ${sid}`);
          assert.ok(step!.variants.en!.meta.title.startsWith(marker));
          assert.equal(step!.courseId, c.manifest.id, "the step knows which course it belongs to");
        }
      }
    }
  });

  it("keeps progress in one course from leaking into the other", () => {
    const session = newSession();
    const [alpha, beta] = [courses.find((c) => c.manifest.id === "alpha-course")!, courses.find((c) => c.manifest.id === "beta-course")!];
    const step = orderedSteps(alpha)[0];
    for (const t of step.variants.en!.meta.tasks) {
      recordTaskResult(session, alpha, step, t.id, "passed", "ok", courses);
    }
    assert.equal(stepStatus(session, alpha, step, courses), "done");
    const twin = beta.steps.get(step.id)!;
    assert.notEqual(stepStatus(session, beta, twin, courses), "done", "the same step id in the other course must stay open");
  });
});

describe("binding the visible courses to the opened folders", () => {
  const { courses } = twoCollidingPacks();
  const alphaFolder = "/home/coder/workspace/alpha-workspace";
  const betaFolder = "/home/coder/workspace/beta-workspace";

  it("matches a course to a folder by its project.root", () => {
    const alpha = courses.find((c) => c.manifest.id === "alpha-course")!;
    assert.equal(courseMatchesFolder(alpha, alphaFolder), true);
    assert.equal(courseMatchesFolder(alpha, betaFolder), false);
    assert.equal(courseMatchesFolder(alpha, "/home/coder/workspace/alpha-workspace/"), true, "a trailing slash still matches");
  });

  it("shows only the course whose folder is open", () => {
    const r = coursesForFolders(courses, [alphaFolder]);
    assert.equal(r.matched, true);
    assert.deepEqual(r.visible.map((c) => c.manifest.id), ["alpha-course"]);
  });

  it("shows every matching course when several folders are open", () => {
    const r = coursesForFolders(courses, [alphaFolder, betaFolder]);
    assert.equal(r.matched, true);
    assert.deepEqual(r.visible.map((c) => c.manifest.id).sort(), ["alpha-course", "beta-course"]);
  });

  it("falls back to showing everything when no course matches", () => {
    // An arbitrary workspace must stay usable; an empty tutor looks broken.
    const r = coursesForFolders(courses, ["/home/coder/workspace/something-else"]);
    assert.equal(r.matched, false);
    assert.equal(r.visible.length, 2);
  });

  it("shows everything when no folder is open at all", () => {
    const r = coursesForFolders(courses, []);
    assert.equal(r.matched, false);
    assert.equal(r.visible.length, 2);
  });

  it("never matches a course that declares no project.root", () => {
    const bare = { manifest: { project: undefined } } as unknown as Course;
    assert.equal(courseMatchesFolder(bare, alphaFolder), false);
    const dotted = { manifest: { project: { root: "." } } } as unknown as Course;
    assert.equal(courseMatchesFolder(dotted, alphaFolder), false);
  });

  it("matches the firmware course against its own folder", () => {
    const firmware = { manifest: { project: { root: "cads-zero" } } } as unknown as Course;
    assert.equal(courseMatchesFolder(firmware, "/home/coder/workspace/cads-zero"), true);
  });
});
