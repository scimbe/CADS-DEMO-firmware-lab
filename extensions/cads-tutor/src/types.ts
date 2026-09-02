/**
 * Data model of the CaDS Tutor: course packs (SPEC §3.3, format v1), checks, session state.
 * This module is pure (no `vscode` import) so it can be unit-tested with node:test.
 */

export type Lang = "de" | "en";

/** A string that may be given per language. A bare string counts for every language. */
export type Localized = string | { de?: string; en?: string };

export type BloomLevel = "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create";
export const BLOOM_LEVELS: readonly BloomLevel[] = ["remember", "understand", "apply", "analyze", "evaluate", "create"];

// ---------------------------------------------------------------------------------------------
// Checks (SPEC §3.3 "Check-Typen")
// ---------------------------------------------------------------------------------------------

export type CheckSpec =
  | { type: "board"; state?: "connected" | "disconnected" | "halted" | "running" }
  | { type: "task"; label: string; expectExitCode?: number; timeoutMs?: number }
  | { type: "build"; label?: string; preset?: string; expectExitCode?: number; timeoutMs?: number }
  | { type: "fileMatches"; file: string; pattern: string; flags?: string }
  | { type: "fileNotMatches"; file: string; pattern: string; flags?: string }
  | { type: "symbolInElf"; elf: string; symbol: string }
  | { type: "flash"; since?: "stepStart" | "sessionStart" | "any"; file?: string }
  | { type: "serialExpect"; send?: string; pattern: string; timeoutMs?: number }
  | { type: "debugStop"; file?: string; line?: number; timeoutMs?: number }
  | { type: "question"; prompt: Localized; rubric: string; bloom?: BloomLevel; minChars?: number }
  | { type: "manual"; label?: Localized }
  | { type: "all"; checks: CheckSpec[] }
  | { type: "any"; checks: CheckSpec[] };

export type CheckType = CheckSpec["type"];
export const CHECK_TYPES: readonly CheckType[] = [
  "board", "task", "build", "fileMatches", "fileNotMatches", "symbolInElf", "flash", "serialExpect",
  "debugStop", "question", "manual", "all", "any",
];

/** Checks that need nothing but the file system / the workspace and are cheap to re-run on save. */
export const LOCAL_CHECK_TYPES: readonly CheckType[] = ["fileMatches", "fileNotMatches", "symbolInElf"];

export interface TaskSpec {
  id: string;
  title: Localized;
  check: CheckSpec;
  /** Free-text help shown under the task (optional). */
  description?: Localized;
}

export type StepLink =
  | { step: string; title?: Localized }
  | { file: string; line?: number; title?: Localized }
  | { doc: string; title?: Localized }
  | { url: string; title?: Localized };

export interface SocraticHint {
  /** e.g. "task:build:failed" – matches `task:<taskId>:failed`; "*" matches any task failure. */
  trigger: string;
  question: Localized;
  hints: Localized[];
}

export interface StepFrontMatter {
  id: string;
  title: string;
  bloom: BloomLevel;
  objectives: string[];
  requires: string[];
  estimatedMinutes?: number;
  links: StepLink[];
  tasks: TaskSpec[];
  socratic: SocraticHint[];
}

export interface StepContent {
  /** Front matter of this language variant. */
  meta: StepFrontMatter;
  /** Markdown body of this language variant. */
  body: string;
  /** Absolute path of the .md file (for error messages and file watching). */
  file: string;
}

export interface Step {
  id: string;
  moduleId: string;
  courseId: string;
  /** Language variants that exist on disk; `en` is required by the format, `de` optional. */
  variants: Partial<Record<Lang, StepContent>>;
}

export interface CourseModule {
  id: string;
  title: Localized;
  steps: string[];
}

export interface CourseManifest {
  id: string;
  version: string;
  schema: 1;
  title: Localized;
  description?: Localized;
  project?: { root?: string; repo?: string };
  prerequisites: string[];
  grounding?: { pack?: string; threshold?: number };
  modules: CourseModule[];
}

export interface Course {
  manifest: CourseManifest;
  /** Absolute path of the pack directory. */
  dir: string;
  /** Where the pack came from ("extension:<id>", "image", "user", "workspace", "setting"). */
  origin: string;
  steps: Map<string, Step>;
  /** Extra curriculum objectives shipped with the pack (curriculum.json), optional. */
  curriculum: unknown[];
}

export interface LoadDiagnostic {
  level: "error" | "warning" | "info";
  message: string;
  file?: string;
}

// ---------------------------------------------------------------------------------------------
// Session / progress
// ---------------------------------------------------------------------------------------------

export type TaskStatus = "pending" | "running" | "passed" | "failed" | "unavailable";

export interface TaskState {
  status: TaskStatus;
  message?: string;
  checkedAt?: string;
  /** Consecutive failures – drives the Socratic hint tier (1..3). */
  failures: number;
  /** Highest hint tier shown for this task so far (0..3). */
  hintTier: number;
  /** Student's free-text answer for `question`/`manual` checks. */
  answer?: string;
}

export interface StepProgress {
  startedAt?: string;
  completedAt?: string;
  tasks: Record<string, TaskState>;
}

export interface SessionState {
  schema: 1;
  studentId: string;
  language?: Lang;
  courseId?: string;
  stepId?: string;
  startedAt: string;
  updatedAt: string;
  /** keyed by "<courseId>/<stepId>" */
  steps: Record<string, StepProgress>;
}

export type StepStatus = "locked" | "open" | "active" | "done";

export function stepKey(courseId: string, stepId: string): string {
  return `${courseId}/${stepId}`;
}

/** Resolves a localized string, falling back en → de → first available. */
export function loc(value: Localized | undefined, lang: Lang): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  return value[lang] ?? value.en ?? value.de ?? "";
}
