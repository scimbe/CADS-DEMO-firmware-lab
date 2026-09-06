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
  moduleObjectiveIds,
  newSession,
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

  it("does not count a recall shown inside the module it came from", () => {
    const s = newSession();
    pass(s, "m1-02-reflect", "cleanup");
    // m1-01-board is in the same module as the recalled step, so there is no delay.
    s.recall = {
      [stepKey(CID, "m1-01-board")]: { date: "2026-09-07", fromStepId: "m1-02-reflect", taskId: "reflect", outcome: "passed", graded: true },
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
