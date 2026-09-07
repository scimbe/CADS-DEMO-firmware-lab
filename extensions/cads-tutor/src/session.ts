/**
 * Session state (`<workspace>/.cads-tutor/session.json`) and the progress rules:
 *  - a step is done when every task has passed,
 *  - a step is open when every step in `requires` is done (and the course's prerequisite
 *    courses are done), otherwise locked,
 *  - the "active" step is the one the session points at.
 * Pure module: file access goes through a tiny injected store so tests can use a temp dir.
 */
import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { orderedSteps } from "./loader";
import { EVIDENCE_WEIGHT, recallPromptOf, stepKey, type CompetenceLevel, type Course, type CourseModule, type Evidence, type EvidenceKind, type Lang, type ObjectiveCompetence, type PredictionOutcome, type RecallEvidenceRecord, type SessionState, type Step, type StepProgress, type StepStatus, type TaskSpec, type TaskState, type TaskStatus, type TestCaseResult } from "./types";

export function newSession(now = new Date()): SessionState {
  const iso = now.toISOString();
  return { schema: 1, studentId: randomUUID(), startedAt: iso, updatedAt: iso, steps: {} };
}

export function sessionFilePath(workspaceRoot: string): string {
  return path.join(workspaceRoot, ".cads-tutor", "session.json");
}

export function readSession(file: string): SessionState | undefined {
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as Partial<SessionState>;
    if (raw.schema !== 1 || typeof raw.studentId !== "string" || typeof raw.steps !== "object" || raw.steps === null) return undefined;
    return { ...newSession(), ...raw, steps: raw.steps as Record<string, StepProgress> } as SessionState;
  } catch {
    return undefined;
  }
}

export function writeSession(file: string, session: SessionState): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(session, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, file);
}

export function getStepProgress(session: SessionState, courseId: string, stepId: string): StepProgress | undefined {
  return session.steps[stepKey(courseId, stepId)];
}

export function ensureStepProgress(session: SessionState, courseId: string, stepId: string, now = new Date()): StepProgress {
  const key = stepKey(courseId, stepId);
  let p = session.steps[key];
  if (!p) {
    p = { startedAt: now.toISOString(), tasks: {} };
    session.steps[key] = p;
  } else if (!p.startedAt) {
    p.startedAt = now.toISOString();
  }
  return p;
}

export function getTaskState(progress: StepProgress | undefined, taskId: string): TaskState {
  return progress?.tasks[taskId] ?? { status: "pending", failures: 0, hintTier: 0 };
}

/** Done = every task passed. A step without tasks (pure reading) counts as done once it was opened. */
export function isStepDone(session: SessionState, step: Step): boolean {
  const p = getStepProgress(session, step.courseId, step.id);
  if (!p) return false;
  const tasks = step.variants.en?.meta.tasks ?? [];
  if (tasks.length === 0) return !!p.startedAt;
  return tasks.every((t) => p.tasks[t.id]?.status === "passed");
}

/**
 * The module this step just finished - the step is the module's last one and every step in the
 * module is done. Kept here (not in the controller) so it is testable: the moment it becomes true
 * is the moment the last check passes, which is exactly what went unnoticed for the reflection card.
 */
export function moduleCompletedAt(session: SessionState, course: Course, step: Step): CourseModule | undefined {
  const mod = course.manifest.modules.find((m) => m.id === step.moduleId);
  if (!mod || mod.steps[mod.steps.length - 1] !== step.id) return undefined;
  const done = mod.steps.every((sid) => {
    const st = course.steps.get(sid);
    return st ? isStepDone(session, st) : true;
  });
  return done ? mod : undefined;
}

/** A3: the module whose reflection card is due at this step. Only modules that authored prompts have one. */
export function moduleReflectionDue(session: SessionState, course: Course, step: Step): CourseModule | undefined {
  const mod = moduleCompletedAt(session, course, step);
  return mod?.reflection && mod.reflection.prompts.length > 0 ? mod : undefined;
}

export function isCourseDone(session: SessionState, course: Course): boolean {
  const steps = orderedSteps(course);
  return steps.length > 0 && steps.every((s) => isStepDone(session, s));
}

/**
 * Unlocking runs on `requires` and on the course's prerequisites - deliberately
 * NOT on the competence level (see isModuleCompetenceComplete). A9.2's "geübt"
 * needs a strong piece of evidence or two medium ones, and a course whose
 * objective is served by a single `question` step can never produce that, least
 * of all without a language model. Making the level a gate would lock such a
 * student out of the rest of the course for a reason they cannot act on.
 */
export function isStepUnlocked(session: SessionState, course: Course, step: Step, allCourses: Course[]): boolean {
  for (const pre of course.manifest.prerequisites) {
    const preCourse = allCourses.find((c) => c.manifest.id === pre);
    if (preCourse && !isCourseDone(session, preCourse)) return false;
  }
  const requires = step.variants.en?.meta.requires ?? [];
  for (const req of requires) {
    const reqStep = course.steps.get(req);
    // A placeholder is a step whose file is not written yet. Requiring it would
    // lock the rest of the course behind a file that does not exist, which is
    // exactly what shipping a course module by module must not do.
    if (reqStep && !reqStep.placeholder && !isStepDone(session, reqStep)) return false;
  }
  return true;
}

/** done → locked → active → open: a locked step stays locked even while it is the session's current step. */
export function stepStatus(session: SessionState, course: Course, step: Step, allCourses: Course[]): StepStatus {
  if (step.placeholder) return "unavailable";
  if (isStepDone(session, step)) return "done";
  if (!isStepUnlocked(session, course, step, allCourses)) return "locked";
  if (session.courseId === course.manifest.id && session.stepId === step.id) return "active";
  return "open";
}

export interface RecordResult {
  state: TaskState;
  /** True if this record turned the step from "not done" into "done". */
  stepCompleted: boolean;
  /** Steps of the same course that became unlocked by this completion. */
  unlocked: Step[];
}

/**
 * Records a check result. Consecutive failures are counted for the Socratic hint tier; a pass
 * resets them. `unavailable` (e.g. Board-Bridge missing) neither counts as a failure nor resets.
 */
export interface TaskRunExtras {
  output?: string;
  tests?: TestCaseResult[];
  prediction?: string;
  predictionOutcome?: PredictionOutcome;
  predictionFeedback?: string;
  /** A9.2: nobody but the student verified this pass; it finishes the step but is not evidence. */
  selfReported?: boolean;
  /** A9.2: a language model compared prediction and output (a self-assessed verdict is not evidence). */
  predictionGraded?: boolean;
}

export function recordTaskResult(
  session: SessionState,
  course: Course,
  step: Step,
  taskId: string,
  status: TaskStatus,
  message: string | undefined,
  allCourses: Course[],
  now = new Date(),
  /** Addendum v1.1: what a command/testSuite/predict check produced, kept for triggers,
   *  the progress view and the telemetry events. */
  extra: TaskRunExtras = {}
): RecordResult {
  const wasDone = isStepDone(session, step);
  const lockedBefore = new Set(orderedSteps(course).filter((s) => !isStepUnlocked(session, course, s, allCourses)).map((s) => s.id));
  const progress = ensureStepProgress(session, course.manifest.id, step.id, now);
  const prev = getTaskState(progress, taskId);
  const state: TaskState = { ...prev, status, message, checkedAt: now.toISOString() };
  if (status === "failed") state.failures = prev.failures + 1;
  else if (status === "passed") state.failures = 0;
  // `attempts` counts every completed run, so "passed on the first try" is
  // attempts === 1 && hintTier === 0. A pending run (a predict still waiting for
  // its prediction) is not an attempt - nothing was checked yet.
  if (status === "passed" || status === "failed") state.attempts = (prev.attempts ?? 0) + 1;
  if (extra.output !== undefined) state.output = extra.output;
  if (extra.tests !== undefined) state.tests = extra.tests;
  if (extra.prediction !== undefined) state.prediction = extra.prediction;
  if (extra.predictionOutcome !== undefined) state.predictionOutcome = extra.predictionOutcome;
  if (extra.predictionFeedback !== undefined) state.predictionFeedback = extra.predictionFeedback;
  // Explicit false clears the flag: a `question` re-run that a model graded this
  // time must stop being reported as self-confirmed, and the other way round.
  if (extra.selfReported === true) state.selfReported = true;
  else if (extra.selfReported === false) delete state.selfReported;
  if (extra.predictionGraded === true) state.predictionGraded = true;
  else if (extra.predictionGraded === false) delete state.predictionGraded;
  progress.tasks[taskId] = state;
  session.updatedAt = now.toISOString();

  const done = isStepDone(session, step);
  if (done && !progress.completedAt) progress.completedAt = now.toISOString();
  // A re-run that fails re-opens the step (the student changed something).
  if (!done && progress.completedAt) delete progress.completedAt;
  const unlocked = orderedSteps(course).filter((s) => lockedBefore.has(s.id) && isStepUnlocked(session, course, s, allCourses));
  return { state, stepCompleted: done && !wasDone, unlocked };
}

/**
 * A9.2: appends a graded recall to the course's evidence log. The card state in
 * `recall` is per step and per day and is overwritten; this is not.
 */
export function recordRecallEvidence(
  session: SessionState,
  courseId: string,
  entry: RecallEvidenceRecord,
  now = new Date(),
): void {
  const log = session.recallLog ?? (session.recallLog = {});
  const existing = log[courseId] ?? (log[courseId] = []);
  existing.push(entry);
  session.updatedAt = now.toISOString();
}

export function setAnswer(session: SessionState, courseId: string, stepId: string, taskId: string, answer: string, now = new Date()): void {
  const progress = ensureStepProgress(session, courseId, stepId, now);
  const prev = getTaskState(progress, taskId);
  progress.tasks[taskId] = { ...prev, answer };
  session.updatedAt = now.toISOString();
}

export function setHintTier(session: SessionState, courseId: string, stepId: string, taskId: string, tier: number, now = new Date()): void {
  const progress = ensureStepProgress(session, courseId, stepId, now);
  const prev = getTaskState(progress, taskId);
  progress.tasks[taskId] = { ...prev, hintTier: Math.max(prev.hintTier, tier) };
  session.updatedAt = now.toISOString();
}

export function setCurrentStep(session: SessionState, courseId: string, stepId: string, now = new Date()): void {
  session.courseId = courseId;
  session.stepId = stepId;
  ensureStepProgress(session, courseId, stepId, now);
  session.updatedAt = now.toISOString();
}

export function setLanguage(session: SessionState, lang: Lang): void {
  session.language = lang;
  session.updatedAt = new Date().toISOString();
}

/** Next step in authored order that is not done and unlocked, starting after `stepId` (wraps to the first open step). */
export function nextOpenStep(session: SessionState, course: Course, allCourses: Course[], stepId?: string): Step | undefined {
  const steps = orderedSteps(course);
  const start = stepId ? steps.findIndex((s) => s.id === stepId) + 1 : 0;
  for (let i = start; i < steps.length; i++) {
    const s = steps[i];
    if (s.placeholder) continue; // nothing to open
    if (!isStepDone(session, s) && isStepUnlocked(session, course, s, allCourses)) return s;
  }
  return undefined;
}

export function adjacentStep(course: Course, stepId: string, delta: 1 | -1): Step | undefined {
  const steps = orderedSteps(course);
  let i = steps.findIndex((s) => s.id === stepId);
  if (i < 0) return undefined;
  // Step over placeholders: Back/Next must not land on a step that has no content.
  for (i += delta; i >= 0 && i < steps.length; i += delta) {
    if (!steps[i].placeholder) return steps[i];
  }
  return undefined;
}

/** Where a fresh session should start: the first course without prerequisites, its first step. */
export function defaultStart(courses: Course[]): { course: Course; step: Step } | undefined {
  const sorted = [...courses].sort((a, b) => a.manifest.prerequisites.length - b.manifest.prerequisites.length);
  for (const c of sorted) {
    const first = orderedSteps(c).find((s) => !s.placeholder);
    if (first) return { course: c, step: first };
  }
  return undefined;
}

export function courseProgress(session: SessionState, course: Course): { done: number; total: number } {
  // Placeholders are not part of the work: counting them would show a course as
  // permanently incomplete because of files nobody has written yet.
  const steps = orderedSteps(course).filter((s) => !s.placeholder);
  return { done: steps.filter((s) => isStepDone(session, s)).length, total: steps.length };
}

// ---------------------------------------------------------------------------
// Addendum v1.1 A3: per-module progress for the progress view.
// ---------------------------------------------------------------------------

export interface ModuleProgress {
  moduleId: string;
  stepsTotal: number;
  stepsDone: number;
  /** Checks that passed on the first attempt with no hint shown. */
  firstTry: number;
  /** Checks that passed, but only after another attempt or a hint. */
  assisted: number;
  /** Checks in this module that have not passed yet. */
  open: number;
  predictionsCorrect: number;
  predictionsDeviated: number;
  /** Predictions made but never compared (no LLM graded them and the student did not self-assess). */
  predictionsOpen: number;
  /** A3: whether the module's reflection card has been filled in. */
  reflection: boolean;
  /** True when the module declares no reflection prompts at all. */
  reflectionOffered: boolean;
}

/**
 * A3: "Steps erledigt, Checks bestanden beim ersten Versuch vs. mit Hinweisen,
 * Vorhersagen korrekt/abweichend, Reflexion vorhanden."
 *
 * "First try" deliberately requires BOTH a single attempt and no hint: a check
 * that passed on attempt one after reading a tier-3 hint is not independent work.
 * Sessions written before v1.1 have no `attempts`, and are read as one attempt so
 * old progress is not retroactively reported as assisted.
 */
export function moduleProgress(course: Course, moduleId: string, session: SessionState): ModuleProgress {
  const mod = course.manifest.modules.find((m) => m.id === moduleId);
  const stepIds = mod?.steps ?? [];
  const out: ModuleProgress = {
    moduleId,
    stepsTotal: stepIds.length,
    stepsDone: 0,
    firstTry: 0,
    assisted: 0,
    open: 0,
    predictionsCorrect: 0,
    predictionsDeviated: 0,
    predictionsOpen: 0,
    reflection: session.reflections?.[stepKey(course.manifest.id, moduleId)] !== undefined,
    reflectionOffered: (mod?.reflection?.prompts.length ?? 0) > 0,
  };
  for (const stepId of stepIds) {
    const step = course.steps.get(stepId);
    if (!step) continue;
    if (isStepDone(session, step)) out.stepsDone += 1;
    const progress = getStepProgress(session, course.manifest.id, stepId);
    for (const task of step.variants.en?.meta.tasks ?? []) {
      const state = progress?.tasks?.[task.id];
      if (!state || state.status !== "passed") {
        out.open += 1;
      } else if ((state.attempts ?? 1) <= 1 && state.hintTier === 0) {
        out.firstTry += 1;
      } else {
        out.assisted += 1;
      }
      if (task.check.type !== "predict") continue;
      if (state?.predictionOutcome === "correct") out.predictionsCorrect += 1;
      else if (state?.predictionOutcome === "deviated") out.predictionsDeviated += 1;
      else if (state?.prediction) out.predictionsOpen += 1;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Addendum A9.2: the competence model.
//
// A learning objective carries evidence, and the evidence - not the number of
// steps clicked through - decides the level. Everything here is pure: it reads
// the course and the session and returns a verdict, so the rule can be tested
// without a panel, a language model or a board (and so the panel, the progress
// view and the export cannot drift apart by each computing their own).
// ---------------------------------------------------------------------------

/** Position of a module in the manifest. "A later module" is decided by this, not by dates. */
export function moduleIndex(course: Course, moduleId: string): number {
  return course.manifest.modules.findIndex((m) => m.id === moduleId);
}

/**
 * The evidence one finished task contributes. At most two pieces: the pass
 * itself, and - for a `predict` - the prediction verdict on top of it, because
 * A9.2 lists "Prüfung bestanden" and "Vorhersage traf zu" as separate rows.
 *
 * A self-reported pass contributes nothing (R11a.8). That is the whole point of
 * the flag: without it the tutor would report competence that nobody checked.
 */
function taskEvidence(step: Step, task: TaskSpec, state: TaskState | undefined, index: number): Evidence[] {
  if (!state || state.status !== "passed" || state.selfReported) return [];
  const base = { stepId: step.id, moduleId: step.moduleId, moduleIndex: index, taskId: task.id, at: state.checkedAt };
  const out: Evidence[] = [];
  // A rubric-graded answer is worth a medium regardless of attempts: A9.2 grades
  // the question by who judged it, not by how often it was tried.
  const kind: EvidenceKind =
    task.check.type === "question" ? "question" : (state.attempts ?? 1) <= 1 && state.hintTier === 0 ? "checkFirstTry" : "checkAssisted";
  out.push({ ...base, kind, weight: EVIDENCE_WEIGHT[kind] });
  if (task.check.type === "predict" && state.predictionOutcome === "correct" && state.predictionGraded) {
    out.push({ ...base, kind: "prediction", weight: EVIDENCE_WEIGHT.prediction });
  }
  return out;
}

/**
 * Recall evidence: a recall card that was answered and graded as passed, shown
 * on a step at least one module after the step the question came from. The
 * distance is the point (E7, verteilte Wiederholung); a card answered inside the
 * same module is repetition, not retrieval after a delay.
 */
function recallEvidence(course: Course, session: SessionState, objectiveSteps: Set<string>): Evidence[] {
  const out = new Map<string, Evidence>();
  const add = (onStepId: string, fromStepId: string, taskId: string, date: string): void => {
    if (!objectiveSteps.has(fromStepId)) return;
    const shownOn = course.steps.get(onStepId);
    const from = course.steps.get(fromStepId);
    if (!shownOn || !from) return;
    const here = moduleIndex(course, shownOn.moduleId);
    const there = moduleIndex(course, from.moduleId);
    if (here < 0 || there < 0 || here <= there) return;
    // The same question, repeated at the same place, is one piece of evidence
    // however often the student reopened the step.
    out.set(`${onStepId}/${fromStepId}/${taskId}`, {
      kind: "recall",
      weight: EVIDENCE_WEIGHT.recall,
      stepId: shownOn.id,
      moduleId: shownOn.moduleId,
      moduleIndex: here,
      taskId,
      at: date,
      fromStepId,
      fromModuleIndex: there,
    });
  };
  for (const r of session.recallLog?.[course.manifest.id] ?? []) {
    if (r.outcome === "passed") add(r.onStepId, r.fromStepId, r.taskId, r.date);
  }
  // Sessions written before the log existed keep their evidence: `recall` still
  // holds the last card per step, and reading it costs nothing.
  const prefix = `${course.manifest.id}/`;
  for (const [key, record] of Object.entries(session.recall ?? {})) {
    if (record.outcome !== "passed" || !record.graded || !key.startsWith(prefix)) continue;
    add(key.slice(prefix.length), record.fromStepId, record.taskId, record.date);
  }
  return [...out.values()];
}

/** Every piece of evidence a course's session holds for one objective, oldest first. */
export function objectiveEvidence(course: Course, session: SessionState, objectiveId: string): Evidence[] {
  const steps = new Set<string>();
  const out: Evidence[] = [];
  for (const step of orderedSteps(course)) {
    const meta = step.variants.en?.meta;
    if (!meta || !meta.objectives.includes(objectiveId)) continue;
    steps.add(step.id);
    const index = moduleIndex(course, step.moduleId);
    const progress = getStepProgress(session, course.manifest.id, step.id);
    for (const task of meta.tasks) out.push(...taskEvidence(step, task, progress?.tasks?.[task.id], index));
  }
  out.push(...recallEvidence(course, session, steps));
  return out.sort((a, b) => (a.at ?? "").localeCompare(b.at ?? ""));
}

/**
 * A9.2: berührt = at least one piece of evidence, geübt = one strong or two
 * medium, nachgewiesen = a strong piece *and* a recall from a later module.
 *
 * A recall is itself strong, so "nachgewiesen" deliberately asks for a strong
 * piece besides it: one event cannot be both the work and the proof that the
 * work survived a delay.
 */
export function competenceLevel(evidence: Evidence[]): CompetenceLevel {
  if (evidence.length === 0) return "none";
  const recalls = evidence.filter((e) => e.kind === "recall");
  const strongBesides = evidence.filter((e) => e.weight === "strong" && e.kind !== "recall");
  if (recalls.length > 0 && strongBesides.length > 0) return "demonstrated";
  const strong = evidence.filter((e) => e.weight === "strong").length;
  const medium = evidence.filter((e) => e.weight === "medium").length;
  if (strong >= 1 || medium >= 2) return "practised";
  return "touched";
}

/** The piece of evidence the competence card names - the one that carried the objective to its level. */
export function leadingEvidence(evidence: Evidence[], level: CompetenceLevel): Evidence | undefined {
  if (level === "none") return undefined;
  if (level === "demonstrated") return evidence.filter((e) => e.kind === "recall").at(-1);
  if (level === "practised") {
    // The strong one if there is one; otherwise the second medium, which is the
    // one that actually reached the level - naming the first would suggest a
    // single answer was enough.
    const strong = evidence.find((e) => e.weight === "strong");
    if (strong) return strong;
    return evidence.filter((e) => e.weight === "medium")[1];
  }
  return evidence[0];
}

export function objectiveCompetence(course: Course, session: SessionState, objectiveId: string): ObjectiveCompetence {
  const evidence = objectiveEvidence(course, session, objectiveId);
  const level = competenceLevel(evidence);
  const steps = orderedSteps(course)
    .filter((s) => s.variants.en?.meta.objectives.includes(objectiveId))
    .map((s) => s.id);
  return { objectiveId, level, evidence, leading: leadingEvidence(evidence, level), steps };
}

/** The objectives a module's steps carry, in authored order, each named once. */
export function moduleObjectiveIds(course: Course, moduleId: string): string[] {
  const mod = course.manifest.modules.find((m) => m.id === moduleId);
  const out: string[] = [];
  for (const sid of mod?.steps ?? []) {
    for (const o of course.steps.get(sid)?.variants.en?.meta.objectives ?? []) {
      if (!out.includes(o)) out.push(o);
    }
  }
  return out;
}

export function moduleCompetence(course: Course, session: SessionState, moduleId: string): ObjectiveCompetence[] {
  return moduleObjectiveIds(course, moduleId).map((o) => objectiveCompetence(course, session, o));
}

export const COMPETENCE_ORDER: Readonly<Record<CompetenceLevel, number>> = { none: 0, touched: 1, practised: 2, demonstrated: 3 };

export function atLeast(level: CompetenceLevel, min: CompetenceLevel): boolean {
  return COMPETENCE_ORDER[level] >= COMPETENCE_ORDER[min];
}

/**
 * A9.2: "a module counts as finished only once each of its objectives is at
 * least *geübt*". This is a statement about competence, not a gate: it is what
 * the competence card, the can-do card and the progress view report. Step
 * unlocking still runs on `requires` (see isStepUnlocked) - see the note there.
 */
export function isModuleCompetenceComplete(course: Course, session: SessionState, moduleId: string): boolean {
  const objectives = moduleObjectiveIds(course, moduleId);
  if (objectives.length === 0) return false;
  return objectives.every((o) => atLeast(objectiveCompetence(course, session, o).level, "practised"));
}

/** Every objective of the course with its level, in module order: the source for the record sheet and the progress view. */
export function courseCompetence(course: Course, session: SessionState): { moduleId: string; objectives: ObjectiveCompetence[] }[] {
  return course.manifest.modules.map((m) => ({ moduleId: m.id, objectives: moduleCompetence(course, session, m.id) }));
}

// ---------------------------------------------------------------------------
// A9.2: what a learning objective can reach at all.
//
// "Not reached" and "not reachable" look the same on a card and mean opposite
// things. An objective whose steps carry only rubric-graded questions cannot get
// past "berührt" on a deployment without a language model, however well the
// student works - four objectives of cads-zero-foundations are exactly that. The
// card has to say so, or the student reads a permanently empty mark as their own
// failure.
// ---------------------------------------------------------------------------

export interface ObjectiveCeiling {
  /** Highest level the course's own tasks and recall pointers can produce here. */
  level: CompetenceLevel;
  /** What it would be with a language model configured. */
  withLlm: CompetenceLevel;
  /** The ceiling is lower than it would be with a model: the gap is the deployment's, not the student's. */
  limitedByLlm: boolean;
  /** No step in a later module points back at this objective at all (K8) - a gap in the course's structure. */
  noLaterRecall: boolean;
  /**
   * A later module does point back, but the step it points at carries no task with
   * a `recallPrompt` and a rubric (A9.2a). The card would render nothing. This is an
   * authoring defect, not something to tell the student about their own progress.
   */
  recallTargetMissing: boolean;
  /**
   * R11a.7c: the objective is taught only in the course's last module, so there is
   * no later module to recall it from. That is a property of where it sits, not a
   * gap in the course - and a card must not report it as one.
   */
  terminal: boolean;
}

/** Best case for one task: what it contributes when everything goes right. */
function taskCeiling(task: TaskSpec, hasLlm: boolean): { strong: number; medium: number } {
  // A pass nobody verifies is never evidence, whatever the student does.
  if (task.check.type === "manual") return { strong: 0, medium: 0 };
  if (task.check.type === "question") return { strong: 0, medium: hasLlm ? 1 : 0 };
  // A prediction's observed check is never a question or a manual (the schema
  // forbids it), so its pass is machine-verified; the comparison needs a model.
  if (task.check.type === "predict") return { strong: 1, medium: hasLlm ? 1 : 0 };
  return { strong: 1, medium: 0 };
}

/**
 * Two different answers, deliberately kept apart. `pointer` says whether some step
 * in a LATER module points back at one of this objective's steps at all - that is
 * the course's structure, and the student may be told about it. `askable` says
 * whether the step it points at carries a task the card may ask (`recallPrompt`)
 * and a rubric to judge it by (A9.2a) - a pointer without one is an authoring
 * defect, which belongs in the evidence sheet and in front of a teacher, never on
 * a student's card as "this course never asks again".
 */
function laterRecall(course: Course, objectiveSteps: Set<string>): { pointer: boolean; askable: boolean } {
  const canAsk = (stepId: string): boolean => {
    const step = course.steps.get(stepId);
    return (step?.variants.en?.meta.tasks ?? []).some((t) => {
      const prompt = recallPromptOf(t.check);
      const rubric = t.check.type === "question" || t.check.type === "predict" ? t.check.rubric : undefined;
      return prompt !== undefined && !!rubric;
    });
  };
  const out = { pointer: false, askable: false };
  for (const step of orderedSteps(course)) {
    const here = moduleIndex(course, step.moduleId);
    for (const source of step.variants.en?.meta.recallFrom ?? []) {
      if (!objectiveSteps.has(source)) continue;
      const from = course.steps.get(source);
      if (!from || here <= moduleIndex(course, from.moduleId)) continue;
      out.pointer = true;
      if (canAsk(source)) out.askable = true;
    }
  }
  return out;
}

export function objectiveCeiling(course: Course, objectiveId: string, hasLlm: boolean): ObjectiveCeiling {
  const steps = new Set<string>();
  const totals = { withLlm: { strong: 0, medium: 0 }, here: { strong: 0, medium: 0 } };
  let lastModule = -1;
  for (const step of orderedSteps(course)) {
    const meta = step.variants.en?.meta;
    if (!meta?.objectives.includes(objectiveId)) continue;
    steps.add(step.id);
    lastModule = Math.max(lastModule, moduleIndex(course, step.moduleId));
    for (const task of meta.tasks) {
      const a = taskCeiling(task, hasLlm);
      const b = taskCeiling(task, true);
      totals.here.strong += a.strong;
      totals.here.medium += a.medium;
      totals.withLlm.strong += b.strong;
      totals.withLlm.medium += b.medium;
    }
  }
  const recall = laterRecall(course, steps);
  const levelOf = (t: { strong: number; medium: number }, recallGraded: boolean): CompetenceLevel => {
    if (t.strong >= 1 && recallGraded) return "demonstrated";
    if (t.strong >= 1 || t.medium >= 2) return "practised";
    if (t.strong + t.medium >= 1) return "touched";
    return "none";
  };
  // Grading a recall needs a model too, so without one the recall is never evidence.
  const level = levelOf(totals.here, recall.askable && hasLlm);
  const withLlm = levelOf(totals.withLlm, recall.askable);
  // R11a.7c: an objective the last module alone teaches has no later module by
  // construction. A course pack of projects consists entirely of them.
  const terminal = steps.size > 0 && lastModule >= 0 && lastModule === course.manifest.modules.length - 1;
  return {
    level,
    withLlm,
    limitedByLlm: COMPETENCE_ORDER[level] < COMPETENCE_ORDER[withLlm],
    noLaterRecall: !recall.pointer,
    recallTargetMissing: recall.pointer && !recall.askable,
    terminal,
  };
}

// ---------------------------------------------------------------------------
// E7: which recall the card should draw.
// ---------------------------------------------------------------------------

export interface RecallCandidate {
  /** The step the question comes from. */
  stepId: string;
  taskId: string;
}

/**
 * Narrows the recall candidates to the ones that have not been answered
 * correctly yet, and hands the rest back untouched when everything has.
 *
 * Why the preference exists - do not simplify it away: one card is drawn per step
 * and per day out of every candidate the step's `recallFrom` offers, so a course
 * with 35 authored recalls showed about 24 of them and never the rest. Distributed
 * practice works on what has NOT stuck yet (E7); drawing uniformly spends the
 * repetition on material that is already proven.
 *
 * Why it is not a work list: the pool keeps at least two entries whenever the step
 * has that many, so the daily draw still varies. A card that comes back every
 * single morning in a fixed order is a chore, and the order becomes the thing
 * people learn.
 */
export function recallDrawPool(session: SessionState, courseId: string, candidates: RecallCandidate[]): RecallCandidate[] {
  const passed = new Set(
    (session.recallLog?.[courseId] ?? []).filter((r) => r.outcome === "passed").map((r) => `${r.fromStepId}/${r.taskId}`),
  );
  const unproven = candidates.filter((c) => !passed.has(`${c.stepId}/${c.taskId}`));
  if (unproven.length === 0) return candidates;
  const pool = [...unproven];
  for (const c of candidates) {
    if (pool.length >= 2) break;
    if (!pool.includes(c)) pool.push(c);
  }
  return pool;
}
