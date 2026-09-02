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
import { stepKey, type Course, type Lang, type SessionState, type Step, type StepProgress, type StepStatus, type TaskState, type TaskStatus } from "./types";

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

export function isCourseDone(session: SessionState, course: Course): boolean {
  const steps = orderedSteps(course);
  return steps.length > 0 && steps.every((s) => isStepDone(session, s));
}

export function isStepUnlocked(session: SessionState, course: Course, step: Step, allCourses: Course[]): boolean {
  for (const pre of course.manifest.prerequisites) {
    const preCourse = allCourses.find((c) => c.manifest.id === pre);
    if (preCourse && !isCourseDone(session, preCourse)) return false;
  }
  const requires = step.variants.en?.meta.requires ?? [];
  for (const req of requires) {
    const reqStep = course.steps.get(req);
    if (reqStep && !isStepDone(session, reqStep)) return false;
  }
  return true;
}

export function stepStatus(session: SessionState, course: Course, step: Step, allCourses: Course[]): StepStatus {
  if (isStepDone(session, step)) return "done";
  if (session.courseId === course.manifest.id && session.stepId === step.id) return "active";
  return isStepUnlocked(session, course, step, allCourses) ? "open" : "locked";
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
export function recordTaskResult(
  session: SessionState,
  course: Course,
  step: Step,
  taskId: string,
  status: TaskStatus,
  message: string | undefined,
  allCourses: Course[],
  now = new Date()
): RecordResult {
  const wasDone = isStepDone(session, step);
  const lockedBefore = new Set(orderedSteps(course).filter((s) => !isStepUnlocked(session, course, s, allCourses)).map((s) => s.id));
  const progress = ensureStepProgress(session, course.manifest.id, step.id, now);
  const prev = getTaskState(progress, taskId);
  const state: TaskState = { ...prev, status, message, checkedAt: now.toISOString() };
  if (status === "failed") state.failures = prev.failures + 1;
  else if (status === "passed") state.failures = 0;
  progress.tasks[taskId] = state;
  session.updatedAt = now.toISOString();

  const done = isStepDone(session, step);
  if (done && !progress.completedAt) progress.completedAt = now.toISOString();
  // A re-run that fails re-opens the step (the student changed something).
  if (!done && progress.completedAt) delete progress.completedAt;
  const unlocked = orderedSteps(course).filter((s) => lockedBefore.has(s.id) && isStepUnlocked(session, course, s, allCourses));
  return { state, stepCompleted: done && !wasDone, unlocked };
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
    if (!isStepDone(session, s) && isStepUnlocked(session, course, s, allCourses)) return s;
  }
  return undefined;
}

export function adjacentStep(course: Course, stepId: string, delta: 1 | -1): Step | undefined {
  const steps = orderedSteps(course);
  const i = steps.findIndex((s) => s.id === stepId);
  if (i < 0) return undefined;
  return steps[i + delta];
}

/** Where a fresh session should start: the first course without prerequisites, its first step. */
export function defaultStart(courses: Course[]): { course: Course; step: Step } | undefined {
  const sorted = [...courses].sort((a, b) => a.manifest.prerequisites.length - b.manifest.prerequisites.length);
  for (const c of sorted) {
    const [first] = orderedSteps(c);
    if (first) return { course: c, step: first };
  }
  return undefined;
}

export function courseProgress(session: SessionState, course: Course): { done: number; total: number } {
  const steps = orderedSteps(course);
  return { done: steps.filter((s) => isStepDone(session, s)).length, total: steps.length };
}
