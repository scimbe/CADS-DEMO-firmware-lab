import assert from "node:assert/strict";
import * as path from "node:path";
import { describe, it } from "node:test";
import { loadCoursePack } from "../src/loader";
import {
  atLeast,
  competenceLevel,
  courseCompetence,
  ensureStepProgress,
  isModuleCompetenceComplete,
  leadingEvidence,
  moduleCompetence,
  moduleCompletedAt,
  moduleObjectiveIds,
  moduleReflectionDue,
  newSession,
  objectiveCeiling,
  objectiveCompetence,
  objectiveEvidence,
} from "../src/session";
import { stepKey, type Evidence, type EvidenceKind, type SessionState, type TaskState } from "../src/types";
import { getStepProgress, recordTaskResult } from "../src/session";
import { orderedSteps } from "../src/loader";

const EXAMPLE = path.resolve(__dirname, "..", "..", "courses", "_example");
const course = loadCoursePack(EXAMPLE, "test").course!;
const CID = course.manifest.id;

function ev(kind: EvidenceKind, weight: "strong" | "medium", extra: Partial<Evidence> = {}): Evidence {
  return { kind, weight, stepId: "s", moduleId: "m", moduleIndex: 0, taskId: "t", ...extra };
}

/** Writes a task state straight into the session; the model must read what is stored, not re-derive it. */
function pass(session: SessionState, stepId: string, taskId: string, state: Partial<TaskState> = {}): void {
  const p = ensureStepProgress(session, CID, stepId);
  p.tasks[taskId] = { status: "passed", failures: 0, hintTier: 0, attempts: 1, checkedAt: "2026-09-06T10:00:00.000Z", ...state };
}

describe("A9.2 competence levels", () => {
  it("counts one piece of evidence as touched", () => {
    assert.equal(competenceLevel([]), "none");
    assert.equal(competenceLevel([ev("question", "medium")]), "touched");
  });

  it("reaches practised with one strong or two medium pieces", () => {
    assert.equal(competenceLevel([ev("checkFirstTry", "strong")]), "practised");
    assert.equal(competenceLevel([ev("question", "medium"), ev("prediction", "medium")]), "practised");
    assert.equal(competenceLevel([ev("checkAssisted", "medium")]), "touched");
  });

  it("reaches demonstrated only with a recall on top of a strong piece", () => {
    const recall = ev("recall", "strong", { moduleIndex: 2, fromModuleIndex: 1 });
    assert.equal(competenceLevel([recall]), "practised");
    assert.equal(competenceLevel([ev("checkFirstTry", "strong"), recall]), "demonstrated");
    // Two recalls and nothing else are still only the proof of a delay, not of the work.
    assert.equal(competenceLevel([recall, recall]), "practised");
  });

  it("names the piece of evidence that carried the level", () => {
    const strong = ev("checkFirstTry", "strong");
    const m1 = ev("question", "medium", { taskId: "q1" });
    const m2 = ev("prediction", "medium", { taskId: "q2" });
    const recall = ev("recall", "strong");
    assert.equal(leadingEvidence([], "none"), undefined);
    assert.equal(leadingEvidence([m1], "touched"), m1);
    assert.equal(leadingEvidence([m1, m2], "practised"), m2);
    assert.equal(leadingEvidence([m1, strong], "practised"), strong);
    assert.equal(leadingEvidence([strong, recall], "demonstrated"), recall);
  });

  it("orders the levels", () => {
    assert.equal(atLeast("practised", "practised"), true);
    assert.equal(atLeast("demonstrated", "practised"), true);
    assert.equal(atLeast("touched", "practised"), false);
  });
});

describe("A9.2 evidence from a session", () => {
  it("reads a first-try pass as strong and an assisted pass as medium", () => {
    const s = newSession();
    pass(s, "m0-02-build", "build");
    pass(s, "m0-02-build", "preset", { attempts: 3, hintTier: 2 });
    const evidence = objectiveEvidence(course, s, "firmware-how-to-build");
    assert.deepEqual(evidence.map((e) => e.kind), ["checkFirstTry", "checkAssisted"]);
    assert.deepEqual(evidence.map((e) => e.weight), ["strong", "medium"]);
    assert.equal(evidence[0].moduleId, "m0");
    assert.equal(evidence[0].moduleIndex, 0);
  });

  it("ignores a pass the student confirmed themselves", () => {
    const s = newSession();
    // `seen` is a manual check: nobody verified it, so R11a.8 gives it no weight.
    pass(s, "m1-02-reflect", "seen", { selfReported: true });
    assert.deepEqual(objectiveEvidence(course, s, "firmware-safety"), []);
    assert.equal(objectiveCompetence(course, s, "firmware-safety").level, "none");
  });

  it("grades a question as medium however often it was tried", () => {
    const s = newSession();
    pass(s, "m1-02-reflect", "reflect", { attempts: 1, hintTier: 0 });
    const evidence = objectiveEvidence(course, s, "firmware-safety");
    assert.deepEqual(evidence.map((e) => e.kind), ["question"]);
    assert.equal(evidence[0].weight, "medium");
  });

  it("adds a prediction only when a model compared it", () => {
    const s = newSession();
    pass(s, "m2-02-predict", "guess-margin", { predictionOutcome: "correct" });
    assert.deepEqual(objectiveEvidence(course, s, "firmware-tooling").map((e) => e.kind), ["checkFirstTry"]);
    pass(s, "m2-02-predict", "guess-margin", { predictionOutcome: "correct", predictionGraded: true });
    assert.deepEqual(objectiveEvidence(course, s, "firmware-tooling").map((e) => e.kind), ["checkFirstTry", "prediction"]);
  });

  it("counts a graded recall from an earlier module and nothing else", () => {
    const s = newSession();
    pass(s, "m1-02-reflect", "reflect");
    pass(s, "m1-02-reflect", "cleanup");
    const key = stepKey(CID, "m2-02-predict");
    // Ungraded: a repetition prompt, not evidence.
    s.recall = { [key]: { date: "2026-09-07", fromStepId: "m1-02-reflect", taskId: "reflect", answer: "…" } };
    assert.equal(objectiveEvidence(course, s, "firmware-safety").some((e) => e.kind === "recall"), false);
    s.recall = { [key]: { date: "2026-09-07", fromStepId: "m1-02-reflect", taskId: "reflect", answer: "…", outcome: "passed", graded: true } };
    const recall = objectiveEvidence(course, s, "firmware-safety").find((e) => e.kind === "recall")!;
    assert.equal(recall.fromStepId, "m1-02-reflect");
    assert.equal(recall.fromModuleIndex! < recall.moduleIndex, true);
    assert.equal(objectiveCompetence(course, s, "firmware-safety").level, "demonstrated");
  });

  it("keeps a graded recall after the card was replaced the next day", () => {
    const s = newSession();
    pass(s, "m1-02-reflect", "cleanup");
    s.recallLog = {
      [CID]: [{ date: "2026-09-07", onStepId: "m2-02-predict", fromStepId: "m1-02-reflect", taskId: "reflect", outcome: "passed" }],
    };
    // The card of the day now points somewhere else entirely; the evidence stays.
    s.recall = { [stepKey(CID, "m2-02-predict")]: { date: "2026-09-09", fromStepId: "m1-01-board", taskId: "tap" } };
    assert.equal(objectiveCompetence(course, s, "firmware-safety").level, "demonstrated");
  });

  it("counts the same repetition once however often the step was reopened", () => {
    const s = newSession();
    pass(s, "m1-02-reflect", "cleanup");
    const entry = { date: "2026-09-07", onStepId: "m2-02-predict", fromStepId: "m1-02-reflect", taskId: "reflect", outcome: "passed" as const };
    s.recallLog = { [CID]: [entry, { ...entry, date: "2026-09-09" }] };
    s.recall = {
      [stepKey(CID, "m2-02-predict")]: { date: "2026-09-09", fromStepId: "m1-02-reflect", taskId: "reflect", outcome: "passed", graded: true },
    };
    assert.equal(objectiveEvidence(course, s, "firmware-safety").filter((e) => e.kind === "recall").length, 1);
  });

  it("ignores a failed recall", () => {
    const s = newSession();
    pass(s, "m1-02-reflect", "cleanup");
    s.recallLog = {
      [CID]: [{ date: "2026-09-07", onStepId: "m2-02-predict", fromStepId: "m1-02-reflect", taskId: "reflect", outcome: "failed" }],
    };
    assert.equal(objectiveEvidence(course, s, "firmware-safety").some((e) => e.kind === "recall"), false);
  });

  it("does not count a recall shown inside the module it came from", () => {
    const s = newSession();
    pass(s, "m1-02-reflect", "cleanup");
    // m1-01-board is in the same module as the recalled step, so there is no delay.
    s.recallLog = {
      [CID]: [{ date: "2026-09-07", onStepId: "m1-01-board", fromStepId: "m1-02-reflect", taskId: "reflect", outcome: "passed" }],
    };
    assert.equal(objectiveEvidence(course, s, "firmware-safety").some((e) => e.kind === "recall"), false);
  });
});

describe("A9.2 module competence", () => {
  it("lists a module's objectives once, in authored order", () => {
    assert.deepEqual(moduleObjectiveIds(course, "m0"), ["firmware-how-to-vscode-setup", "example.orientation", "firmware-how-to-build"]);
    assert.deepEqual(moduleObjectiveIds(course, "m2"), ["firmware-tooling"]);
    assert.deepEqual(moduleObjectiveIds(course, "nope"), []);
  });

  it("calls a module complete only once every objective is at least practised", () => {
    const s = newSession();
    assert.equal(isModuleCompetenceComplete(course, s, "m0"), false);
    pass(s, "m0-01-welcome", "readme");
    pass(s, "m0-01-welcome", "hello");
    // m0's third objective lives in the second step and is still untouched.
    assert.equal(isModuleCompetenceComplete(course, s, "m0"), false);
    pass(s, "m0-02-build", "build");
    assert.equal(isModuleCompetenceComplete(course, s, "m0"), true);
    const levels = moduleCompetence(course, s, "m0").map((o) => o.level);
    assert.deepEqual(levels, ["practised", "practised", "practised"]);
  });

  it("a module without objectives is never complete", () => {
    assert.equal(isModuleCompetenceComplete(course, newSession(), "nope"), false);
  });

  it("reports the whole course in module order", () => {
    const record = courseCompetence(course, newSession());
    assert.deepEqual(record.map((m) => m.moduleId), ["m0", "m1", "m2"]);
    assert.equal(record.every((m) => m.objectives.every((o) => o.level === "none")), true);
  });
});

describe("A9.2 what recordTaskResult stores", () => {
  const all = [course];

  it("marks a self-confirmed pass and clears the mark when a model grades it later", () => {
    const s = newSession();
    const step = orderedSteps(course).find((x) => x.id === "m1-02-reflect")!;
    recordTaskResult(s, course, step, "reflect", "passed", "ok", all, new Date(), { selfReported: true });
    assert.equal(getStepProgress(s, CID, step.id)!.tasks.reflect.selfReported, true);
    assert.deepEqual(objectiveEvidence(course, s, "firmware-safety"), []);
    recordTaskResult(s, course, step, "reflect", "passed", "ok", all, new Date(), { selfReported: false });
    assert.equal(getStepProgress(s, CID, step.id)!.tasks.reflect.selfReported, undefined);
    assert.deepEqual(objectiveEvidence(course, s, "firmware-safety").map((e) => e.kind), ["question"]);
  });

  it("keeps a self-assessed prediction verdict out of the evidence", () => {
    const s = newSession();
    const step = orderedSteps(course).find((x) => x.id === "m2-02-predict")!;
    recordTaskResult(s, course, step, "guess-margin", "passed", "ok", all, new Date(), {
      predictionOutcome: "correct",
      predictionGraded: false,
    });
    assert.deepEqual(objectiveEvidence(course, s, "firmware-tooling").map((e) => e.kind), ["checkFirstTry"]);
  });
});

describe("A9.2 what an objective can reach at all", () => {
  it("keeps demonstrated out of reach where no later module asks again", () => {
    // m0-02-build is never named in any recallFrom, so the course itself caps it.
    const c = objectiveCeiling(course, "firmware-how-to-build", true);
    assert.equal(c.level, "practised");
    assert.equal(c.noLaterRecall, true);
    assert.equal(c.limitedByLlm, false);
  });

  it("reaches demonstrated where a later module recalls a task that carries a recall prompt", () => {
    const c = objectiveCeiling(course, "firmware-safety", true);
    assert.equal(c.level, "demonstrated");
    assert.equal(c.noLaterRecall, false);
  });

  it("separates 'not reached' from 'not reachable without a model'", () => {
    const withModel = objectiveCeiling(course, "firmware-safety", true);
    const without = objectiveCeiling(course, "firmware-safety", false);
    // The step has an automatic check too, so the level survives; the recall does not.
    assert.equal(without.level, "practised");
    assert.equal(without.withLlm, withModel.level);
    assert.equal(without.limitedByLlm, true);
  });

  it("gives a manual-only objective no ceiling at all", () => {
    // A step whose only task is `manual` produces nothing, with or without a model.
    const c = objectiveCeiling(course, "does-not-exist", true);
    assert.equal(c.level, "none");
    assert.equal(c.limitedByLlm, false);
  });
});

describe("A9.3 the can-do card does not hang on the reflection", () => {
  it("marks the module finished even when nobody authored reflection prompts", () => {
    const s = newSession();
    const m0 = orderedSteps(course).filter((x) => x.moduleId === "m0");
    for (const step of m0) for (const t of step.variants.en!.meta.tasks) pass(s, step.id, t.id);
    const last = m0[m0.length - 1];
    // m0 has no `reflection` in the manifest - the reflection card stays away, the
    // module is still complete, and that is what the can-do card hangs on.
    assert.equal(moduleReflectionDue(s, course, last), undefined);
    assert.equal(moduleCompletedAt(s, course, last)?.id, "m0");
  });

  it("offers both when the module does author prompts", () => {
    const s = newSession();
    const m2 = orderedSteps(course).filter((x) => x.moduleId === "m2");
    for (const step of m2) for (const t of step.variants.en!.meta.tasks) pass(s, step.id, t.id);
    const last = m2[m2.length - 1];
    assert.equal(moduleReflectionDue(s, course, last)?.id, "m2");
    assert.equal(moduleCompletedAt(s, course, last)?.id, "m2");
  });
});
