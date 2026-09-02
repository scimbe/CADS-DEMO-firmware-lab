import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it } from "node:test";
import { loadCoursePack, orderedSteps } from "../src/loader";
import { adjacentStep, defaultStart, isStepUnlocked, newSession, nextOpenStep, readSession, recordTaskResult, setCurrentStep, stepStatus, writeSession } from "../src/session";
import { hintTierForFailures, selectHint, taskFailedTrigger } from "../src/socratic";

const EXAMPLE = path.resolve(__dirname, "..", "..", "courses", "_example");
const course = loadCoursePack(EXAMPLE, "test").course!;
const all = [course];

describe("session & progress", () => {
  it("persists to session.json atomically and round-trips", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cads-sess-"));
    const file = path.join(dir, ".cads-tutor", "session.json");
    const s = newSession();
    setCurrentStep(s, "example-course", "m0-01-welcome");
    writeSession(file, s);
    const back = readSession(file)!;
    assert.equal(back.studentId, s.studentId);
    assert.equal(back.stepId, "m0-01-welcome");
    assert.equal(readSession(path.join(dir, "missing.json")), undefined);
    fs.writeFileSync(file, "{broken");
    assert.equal(readSession(file), undefined);
  });

  it("unlocks steps via requires and completes a step when every task passed", () => {
    const s = newSession();
    const [welcome, build, board] = orderedSteps(course);
    assert.equal(stepStatus(s, course, welcome, all), "open");
    assert.equal(stepStatus(s, course, build, all), "locked");
    setCurrentStep(s, course.manifest.id, welcome.id);
    assert.equal(stepStatus(s, course, welcome, all), "active");

    const r1 = recordTaskResult(s, course, welcome, "readme", "passed", "ok", all);
    assert.equal(r1.stepCompleted, false);
    const f = recordTaskResult(s, course, welcome, "hello", "failed", "nope", all);
    assert.equal(f.state.failures, 1);
    assert.equal(recordTaskResult(s, course, welcome, "hello", "failed", "nope", all).state.failures, 2);
    const r2 = recordTaskResult(s, course, welcome, "hello", "passed", "ok", all);
    assert.equal(r2.stepCompleted, true);
    assert.equal(r2.state.failures, 0);
    assert.deepEqual(r2.unlocked.map((u) => u.id), ["m0-02-build"]);
    assert.equal(stepStatus(s, course, welcome, all), "done");
    assert.equal(stepStatus(s, course, build, all), "open");
    assert.equal(isStepUnlocked(s, course, board, all), false);
    assert.equal(nextOpenStep(s, course, all, welcome.id)!.id, "m0-02-build");
    assert.equal(adjacentStep(course, build.id, -1)!.id, welcome.id);

    // A later failure of a task re-opens the step.
    recordTaskResult(s, course, welcome, "hello", "failed", "edited away", all);
    assert.equal(stepStatus(s, course, welcome, all), "active");
    assert.equal(stepStatus(s, course, build, all), "locked");
    // "unavailable" neither fails nor passes.
    const u = recordTaskResult(s, course, board, "connected", "unavailable", "bridge missing", all);
    assert.equal(u.state.failures, 0);
  });

  it("course prerequisites lock every step of the dependent course", () => {
    const dep = { ...course, manifest: { ...course.manifest, id: "dep", prerequisites: ["example-course"] } };
    const s = newSession();
    assert.equal(stepStatus(s, dep, orderedSteps(dep)[0], [course, dep]), "locked");
    assert.equal(defaultStart([dep, course])!.course.manifest.id, "example-course");
  });
});

describe("socratic hints", () => {
  it("maps failures to tiers 1..3 and picks localized authored hints", () => {
    assert.deepEqual([0, 1, 2, 3, 9].map(hintTierForFailures), [1, 1, 2, 3, 3]);
    const meta = course.steps.get("m0-01-welcome")!.variants.de!.meta;
    const h1 = selectHint(meta, taskFailedTrigger("hello"), 1, "de")!;
    assert.equal(h1.tier, 1);
    assert.match(h1.hint, /öffne die Datei/);
    const h3 = selectHint(meta, taskFailedTrigger("hello"), 7, "en")!;
    assert.equal(h3.tier, 3);
    assert.match(h3.hint, /Save the file/);
    assert.equal(selectHint(meta, taskFailedTrigger("readme"), 1, "en"), undefined);
  });
});
