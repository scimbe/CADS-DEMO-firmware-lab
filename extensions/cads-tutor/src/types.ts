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
  | { type: "any"; checks: CheckSpec[] }
  | CommandCheck
  | TestSuiteCheck
  | PredictCheck;

/** Addendum v1.1 A1: shell command via `/bin/sh -c` in the project root (`cwd` relative to it). */
export interface CommandCheck {
  type: "command";
  command: string;
  cwd?: string;
  expectExitCode?: number;
  expectStdout?: string;
  expectStderr?: string;
  timeoutMs?: number;
  /** Validator only (`--solutions`): set to false when the check legitimately passes on the seed workspace. */
  seedMustFail?: boolean;
}

export type TestRunner = "cargo" | "node-test" | "tap" | "custom";
export const TEST_RUNNERS: readonly TestRunner[] = ["cargo", "node-test", "tap", "custom"];

/** Addendum v1.1 A1: a test run whose per-test results are parsed (cargo / TAP) and exposed to triggers. */
export interface TestSuiteCheck {
  type: "testSuite";
  runner: TestRunner;
  cwd?: string;
  /** Optional override; required for `tap` and `custom`. */
  command?: string;
  /** Optional: the schema normalises a missing list to [], a hand-built spec may omit it. */
  expectPass?: string[];
  minPass?: number;
  expectFail?: string[];
  timeoutMs?: number;
  seedMustFail?: boolean;
}

/** Addendum v1.1 A1: the student predicts first, then `then` runs; prediction and output are shown side by side. */
export interface PredictCheck {
  type: "predict";
  prompt: Localized;
  then: CheckSpec;
  rubric?: string;
  bloom?: BloomLevel;
  minChars?: number;
}

export type CheckType = CheckSpec["type"];
export const CHECK_TYPES: readonly CheckType[] = [
  "board", "task", "build", "fileMatches", "fileNotMatches", "symbolInElf", "flash", "serialExpect",
  "debugStop", "question", "manual", "all", "any", "command", "testSuite", "predict",
];

/** Result of one test case parsed from a test runner's output. */
export interface TestCaseResult {
  /** Leaf name as printed by the runner (e.g. `ch04::moves_string`, `adds numbers`). */
  name: string;
  /** Full path for nested subtests (`suite > case`); equals `name` at top level. */
  path: string;
  status: "passed" | "failed" | "skipped";
  depth: number;
  /** False for a parent test that only groups subtests (node --test files/suites). */
  leaf: boolean;
  /** The entry is a whole test FILE that node reported as failed (it could not be loaded). */
  file?: boolean;
}

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
  /** `task:<taskId>:failed` (check failed), `task:<taskId>:stuck` (student asks for a hint),
   * `question:<taskId>:weak` (rubric verdict fail), `event:<name>` (board/serial event),
   * `test:<name>:failed` (a parsed test case failed), `output:<regex>` (check output matches), `*` (any). */
  trigger: string;
  question: Localized;
  hints: Localized[];
}

/** Addendum v1.1 A2: a misconception recognised by a regex over a check's output (short form of `output:<regex>`). */
export interface Misconception {
  pattern: string;
  flags?: string;
  question: Localized;
  hints: Localized[];
}

export type Scaffold = "worked" | "faded" | "independent";
export const SCAFFOLD_LEVELS: readonly Scaffold[] = ["worked", "faded", "independent"];

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
  /** Symbols the student is expected to create in this step (informational, from the pack). */
  creates: string[];
  /** Project files (relative to project.root) that ground this step's dialog; indexed for "ask" and check-ins. */
  sources: string[];
  /** Addendum A2: worked example / faded / independent (default independent). */
  scaffold: Scaffold;
  /** Addendum A2: steps whose `question` tasks may be asked again as a short recall card. */
  recallFrom: string[];
  /** Addendum A2: misconception triggers over check output. */
  misconceptions: Misconception[];
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
  /**
   * The step is listed in course.json but has no usable file yet (missing, or its
   * front matter did not validate). It is shown in the tree as "not yet available"
   * so a course can ship module by module, and it never blocks anything: it can be
   * neither opened nor completed, and `requires` skips it.
   */
  placeholder?: boolean;
}

export interface CourseModule {
  id: string;
  title: Localized;
  steps: string[];
  /** Addendum A3: reflection prompts shown after the module's last step is completed. */
  reflection?: { prompts: Localized[] };
}

/** A5/A4: what a course may offer. Board actions are hardware-course only. */
export type Capability = "board";
export const CAPABILITIES: readonly Capability[] = ["board"];

export interface CourseManifest {
  id: string;
  version: string;
  schema: 1;
  title: Localized;
  description?: Localized;
  project?: { root?: string; repo?: string };
  prerequisites: string[];
  grounding?: { pack?: string; threshold?: number };
  /**
   * What the course may offer in the panel. Omitted means "derive it from the
   * check types the pack uses", so existing firmware packs keep their board
   * actions and a language track never gains them by accident.
   */
  capabilities?: Capability[];
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
  /** Total check runs (passed + failed); a first-try pass has attempts === 1 and hintTier === 0. */
  attempts?: number;
  /** Captured stdout+stderr of the last `command`/`testSuite` run (max 64 KB). */
  output?: string;
  /** Parsed test cases of the last `testSuite` run. */
  tests?: TestCaseResult[];
  /** `predict`: the student's prediction, entered before `then` ran. */
  prediction?: string;
  /** `predict`: reflection result – LLM rubric verdict or the student's self-assessment. */
  predictionOutcome?: PredictionOutcome;
  /** `predict`: LLM feedback comparing prediction and output. */
  predictionFeedback?: string;
  /**
   * A9.2/R11a.8: nobody but the student verified this pass (`manual`, or a
   * `question` with no language model to grade it). It finishes the step, but it
   * is not evidence of competence. Persisted, not recomputed: whether a model was
   * configured is a property of the moment the check ran, not of today's settings.
   */
  selfReported?: boolean;
  /** `predict`: true when a language model compared prediction and output. A verdict the student gave themselves is self-assessment, not evidence. */
  predictionGraded?: boolean;
}

export type PredictionOutcome = "correct" | "deviated";

export interface StepProgress {
  startedAt?: string;
  completedAt?: string;
  tasks: Record<string, TaskState>;
}

/** Addendum A3: answers to a module's reflection prompts. */
export interface ReflectionRecord {
  answers: string[];
  feedback?: string[];
  at: string;
}

/** Addendum A2: the recall card shown for a step on a given day. */
export interface RecallRecord {
  /** ISO date (YYYY-MM-DD) the card was selected for. */
  date: string;
  fromStepId: string;
  taskId: string;
  answer?: string;
  feedback?: string;
  dismissed?: boolean;
  /** A9.2: rubric verdict on the recall answer. Only a graded pass is evidence; an ungraded card is a repetition prompt, nothing more. */
  outcome?: "passed" | "failed";
  /** True when a language model graded the answer against the original task's rubric. */
  graded?: boolean;
}

/**
 * A9.2: a graded recall, kept for good. `recall` holds only the card currently
 * shown for a step, keyed by that step, and is overwritten the next day - which
 * would erase the one piece of evidence that can carry an objective to
 * "nachgewiesen". The log is append-only for exactly that reason.
 */
export interface RecallEvidenceRecord {
  /** ISO date the card was answered. */
  date: string;
  /** The step the card was shown on. */
  onStepId: string;
  fromStepId: string;
  taskId: string;
  outcome: "passed" | "failed";
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
  /** keyed by "<courseId>/<moduleId>" */
  reflections?: Record<string, ReflectionRecord>;
  /** keyed by "<courseId>/<stepId>" (the step that showed the card) */
  recall?: Record<string, RecallRecord>;
  /** keyed by courseId: every graded recall, in the order they were answered. */
  recallLog?: Record<string, RecallEvidenceRecord[]>;
  /** The orientation card has been dismissed; it is reachable again by command. */
  orientationSeen?: boolean;
}

export type StepStatus = "locked" | "open" | "active" | "done" | "unavailable";

export function stepKey(courseId: string, stepId: string): string {
  return `${courseId}/${stepId}`;
}

/** Resolves a localized string, falling back en → de → first available. */
export function loc(value: Localized | undefined, lang: Lang): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  return value[lang] ?? value.en ?? value.de ?? "";
}

// ---------------------------------------------------------------------------------------------
// Addendum A9.2: the competence model (evidence and levels)
// ---------------------------------------------------------------------------------------------

/**
 * What produced a piece of evidence. The kinds and their weights are fixed by
 * SPEC A9.2; nothing else counts, and self-reported passes produce no evidence
 * at all (R11a.8).
 */
export type EvidenceKind =
  /** A check that passed on the first attempt with no hint shown. */
  | "checkFirstTry"
  /** A check that passed after another attempt or after a hint. */
  | "checkAssisted"
  /** A prediction a language model judged to have matched the observed output. */
  | "prediction"
  /** A `question` whose answer a language model passed against the rubric. */
  | "question"
  /** A recall card from an earlier module, answered and graded as passed. */
  | "recall";

export type EvidenceWeight = "strong" | "medium";

/** SPEC A9.2, the weight table. Kept as data so the rule is readable in one place. */
export const EVIDENCE_WEIGHT: Readonly<Record<EvidenceKind, EvidenceWeight>> = {
  checkFirstTry: "strong",
  checkAssisted: "medium",
  prediction: "medium",
  question: "medium",
  recall: "strong",
};

export interface Evidence {
  kind: EvidenceKind;
  weight: EvidenceWeight;
  /** The step the student was on when the evidence was produced. */
  stepId: string;
  /** The module that step belongs to. */
  moduleId: string;
  /** Position of that module in the manifest, so "a later module" is decidable. */
  moduleIndex: number;
  taskId: string;
  /** ISO timestamp of the event, when the session recorded one. */
  at?: string;
  /** `recall` only: the step (and its module) the question came from. */
  fromStepId?: string;
  fromModuleIndex?: number;
}

/** berührt / geübt / nachgewiesen, plus the state before any evidence exists. */
export type CompetenceLevel = "none" | "touched" | "practised" | "demonstrated";
export const COMPETENCE_LEVELS: readonly CompetenceLevel[] = ["none", "touched", "practised", "demonstrated"];

export interface ObjectiveCompetence {
  objectiveId: string;
  level: CompetenceLevel;
  /** Every piece of evidence, oldest first. */
  evidence: Evidence[];
  /** The one piece of evidence that carried the objective to its level - what the competence card names. */
  leading?: Evidence;
  /** Steps of the course that carry this objective, in authored order. */
  steps: string[];
}
