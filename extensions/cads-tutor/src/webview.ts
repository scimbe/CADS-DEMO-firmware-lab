/**
 * HTML for the step panel. Pure (no vscode import): takes a `StepView` model and returns the
 * document. Theme colors come from VS Code's CSS variables; scripts are nonce-gated (CSP).
 */
import { randomBytes } from "node:crypto";
import { ui } from "./i18n";
import { escapeHtml, tutorLinkAttrs, type DoBlockView, type TutorLink } from "./markdown";
import type { Citation } from "./platform";
import { actionForDo, actionLabels, doRouteText, type ActionKind } from "./actions";
import type { BloomLevel, CheckType, CompetenceLevel, EvidenceKind, Lang, Scaffold, StepStatus, TaskStatus } from "./types";

export interface HintView {
  tier: number;
  question: string;
  hint: string;
}

export interface PredictView {
  /** The prompt the student answers before the observed check runs. */
  prompt: string;
  prediction?: string;
  /** Output of the observed check, once it ran. */
  actual?: string;
  outcome?: "correct" | "deviated";
  feedback?: string;
  /** True once a prediction long enough to run the check exists. */
  ran: boolean;
}

export interface ActionView {
  kind: ActionKind;
  label: string;
  /** One line naming the equivalent manual route; empty for Copy. */
  manual: string;
  arg?: string;
}

export interface TaskView {
  id: string;
  title: string;
  description?: string;
  type: CheckType;
  status: TaskStatus;
  message?: string;
  /**
   * R11a.4: one sentence in the course's language naming the probable cause,
   * shown BEFORE the tool's own output. A compiler or test runner explains the
   * symptom in its own vocabulary, and a beginner reading it first goes looking
   * in the wrong place; the course's wording gets the first line.
   */
  cause?: string;
  answer?: string;
  hint?: HintView;
  /** A2/A1: set for `predict` tasks; drives the predict-then-observe panel. */
  predict?: PredictView;
  /**
   * The predict panel, rendered on the extension side and patched into the DOM.
   * Rendering here rather than in the webview keeps the decision of whether the
   * observed output may be revealed on the side that knows the session state.
   * Every interpolated value goes through escapeHtml.
   */
  predictHtml?: string;
  /** `question` tasks need a free-text answer before the check can run. */
  needsAnswer: boolean;
  /** `manual` tasks (and `question` tasks without LLM) are confirmed by the student. */
  manual: boolean;
  /**
   * The rubric, shown as a self-check once an answer has been submitted and no
   * model is available to grade it. Withheld before submission: it is the
   * answer, and showing it first would turn the task into copying.
   */
  selfCheck?: string;
  /**
   * The buttons row and the self-check box, rendered on the extension side and
   * patched into the DOM on every update - not just the step's initial render -
   * because whether a task is confirmable and whether its rubric shows both
   * depend on state (`answer`, `selfCheck`) that only exists after a run.
   */
  buttonsHtml?: string;
  selfCheckHtml?: string;
  /** Plain text for the type badge - see renderTaskTypeLabel for why it must also be resent on every update. */
  typeLabel?: string;
  /** Nobody but the student verified this pass; it carries no mastery weight. */
  selfReported?: boolean;
  /** true when the task's check runs automatically on save (fileMatches & co.). */
  live: boolean;
  /** Buttons that perform what the task asks for, derived from its check type. */
  actions?: ActionView[];
}

export interface LinkView {
  label: string;
  link: TutorLink;
}

export interface StepRef {
  stepId: string;
  title: string;
}

export interface StepView {
  lang: Lang;
  courseId: string;
  courseTitle: string;
  moduleTitle: string;
  stepId: string;
  title: string;
  index: number;
  total: number;
  bloom: BloomLevel;
  estimatedMinutes?: number;
  objectives: string[];
  /** Symbols the student creates in this step (front matter `creates`). */
  creates: string[];
  status: StepStatus;
  lockedBy: StepRef[];
  bodyHtml: string;
  links: LinkView[];
  tasks: TaskView[];
  prev?: StepRef;
  next?: StepRef;
  llmConfigured: boolean;
  bridgeAvailable: boolean;
  /** A note from the tutor to show on load (e.g. a proactive check-in or a contextual question). */
  note?: NoteView;
  /** A2: worked / faded / independent, shown as a badge with a one-line explanation. */
  scaffold: Scaffold;
  /** A2: a short recall question from an earlier, completed step. */
  recall?: RecallView;
  /** A3: shown when this step completed its module. */
  reflection?: ReflectionView;
  /** Orientation card, shown before the first step of a fresh session. */
  orientation?: OrientationView;
  /** Whether this course may show hardware actions at all. */
  hasBoard: boolean;
  /** The single next thing to do, always visible in the header (A9.4.2). */
  nextAction?: NextActionView;
  /** A9.4.1: how far this module has come, for the bar in the header. */
  moduleProgress: { done: number; total: number };
}

/**
 * A9.4.2 / R11a.5: the one next thing to do, and the page's only primary
 * button. A student who is lost needs one instruction, not a status report, and
 * two equally weighted buttons are a decision they cannot make.
 */
export interface NextActionView {
  text: string;
  /** Caption of the primary button; absent when there is nothing left to do. */
  label?: string;
  kind: "task" | "step" | "none";
  taskId?: string;
  stepId?: string;
  /** True when the task needs typing first, so the button focuses it instead of running it. */
  needsInput?: boolean;
}

export interface OrientationView {
  /** Board-specific lines are omitted entirely for language courses. */
  board: boolean;
}

export interface RecallView {
  fromStepId: string;
  fromTitle: string;
  /** A9.2a: the module the question comes from - how far back the student has to reach. */
  fromModuleTitle?: string;
  taskId: string;
  prompt: string;
  answer?: string;
  /** True once answered or skipped; the card then shows only an acknowledgement. */
  settled: boolean;
  /** A9.2: the rubric verdict, when a model graded the answer. Undefined means ungraded, which is not evidence. */
  outcome?: "passed" | "failed";
  /** The grader's sentence on the answer, shown instead of a bare acknowledgement. */
  feedback?: string;
}

export interface ReflectionView {
  moduleId: string;
  moduleTitle: string;
  prompts: string[];
  answers?: string[];
  saved: boolean;
}

export interface NoteView {
  title: string;
  text: string;
  citations?: Citation[];
  /** Hint tier 1..3 if the note is an escalation hint. */
  tier?: number;
}

export type ToWebview =
  | { type: "task"; task: TaskView }
  /** `html` is produced by renderRecall / renderReflection on the extension side. */
  | { type: "recall"; html: string }
  | { type: "reflection"; html: string }
  /** A9.3/A9.4: can-do card and competence card, appended after the reflection card. */
  | { type: "competence"; html: string }
  /**
   * The header's own state: the one line saying what to do next, and how far the
   * module has come. Both are recomputed after every check, so the bar moves at
   * the moment the step is finished rather than at the next navigation.
   */
  | { type: "next"; next?: NextActionView; moduleProgress?: { done: number; total: number } }
  | { type: "ask"; outcome: AskView }
  | { type: "note"; note: NoteView }
  | { type: "stepDone"; unlocked: StepRef[] }
  | { type: "busy"; busy: boolean }
  /**
   * An LLM grading call's lifecycle for one task - the wait display (started),
   * queue info as soon as an HTTP attempt has an answer (progress, optional
   * fields), and its end either way, success or failure (done). Never a signal to
   * change the task's own state; postTask/taskUpdateFields still owns that.
   */
  | { type: "grading"; taskId: string; state: "started" }
  | { type: "grading"; taskId: string; state: "progress"; queuePosition?: number; queueLength?: number }
  | { type: "grading"; taskId: string; state: "done" };

export interface AskView {
  kind: "unconfigured" | "refused" | "llm-error" | "answer";
  text: string;
  citations: Citation[];
  bloomLevel?: BloomLevel;
  hintTier?: number;
  next?: string;
}

export type FromWebview =
  | { type: "ready" }
  | { type: "runCheck"; taskId: string }
  | { type: "runAll" }
  | { type: "ask"; question: string }
  | { type: "link"; link: TutorLink }
  | { type: "nav"; stepId: string }
  | { type: "setLang"; lang: Lang }
  | { type: "confirm"; taskId: string }
  | { type: "answer"; taskId: string; text: string }
  | { type: "hint"; taskId: string }
  | { type: "predict"; taskId: string; text: string }
  /** "Don't wait - check it yourself": gives up on an in-flight LLM grading call. */
  | { type: "giveUp"; taskId: string }
  | { type: "recallAnswer"; text: string }
  | { type: "recallSkip" }
  | { type: "reflection"; answers: string[] }
  /** `taskId` is absent for a `::: do` card, which belongs to the step body, not to a task. */
  | { type: "action"; taskId?: string; kind: ActionKind; arg?: string; cwd?: string; line?: number }
  | { type: "dismissOrientation" };

/**
 * A two-way choice with the ACTIVE language marked, not a toggle labelled with
 * the other language. The old button said "Deutsch" while the UI was English,
 * which reads as a statement of the current state rather than an offer to change
 * it, so people believed they were already in German.
 */
export function renderLanguageChoice(active: Lang): string {
  const s = ui(active);
  const button = (lang: Lang) => {
    const name = s.languageNames[lang];
    const isActive = lang === active;
    return `<button class="btn lang-choice${isActive ? " active" : ""}" data-lang="${lang}"
      title="${escapeHtml(isActive ? s.languageActive(name) : s.languageSwitchTo(name))}"
      aria-pressed="${isActive}"${isActive ? " aria-current=\"true\"" : ""}>${escapeHtml(name)}</button>`;
  };
  return `<span class="lang-group" role="group" aria-label="${escapeHtml(s.languageLabel)}">${button("de")}${button("en")}</span>`;
}

export function nonce(): string {
  return randomBytes(16).toString("hex");
}

const STATUS_ICON: Record<TaskStatus, string> = { pending: "○", running: "◌", passed: "✔", failed: "✘", unavailable: "–" };

/**
 * A1: the predict-then-observe panel. Before a prediction exists the observed
 * output is not rendered at all - not merely hidden - so it cannot be read out
 * of the DOM, which would defeat the exercise.
 */
export function renderPredict(t: TaskView, lang: Lang): string {
  const p = t.predict;
  if (!p) return "";
  const s = ui(lang);
  const id = escapeHtml(t.id);
  const input = `<div class="predict-input">
      <textarea class="prediction" data-task="${id}" rows="3" placeholder="${escapeHtml(s.predictPlaceholder)}">${escapeHtml(p.prediction ?? "")}</textarea>
      <div class="row"><button class="btn submit-predict" data-task="${id}">${escapeHtml(s.predictSubmit)}</button></div>
    </div>`;
  if (!p.ran || p.actual === undefined) {
    return `<div class="predict"><div class="predict-head">${escapeHtml(s.predictTitle)}</div>
      <div class="predict-prompt">${escapeHtml(p.prompt)}</div>${input}</div>`;
  }
  const verdict =
    p.outcome === "correct"
      ? `<div class="predict-verdict match">${escapeHtml(s.predictMatch)}</div>`
      : p.outcome === "deviated"
        ? `<div class="predict-verdict differ">${escapeHtml(s.predictDiffer)}</div>`
        : `<div class="predict-verdict">${escapeHtml(s.predictReflect)}
             <div class="row">
               <button class="btn predict-self" data-task="${id}" data-outcome="correct">${escapeHtml(s.predictSelfMatch)}</button>
               <button class="btn predict-self" data-task="${id}" data-outcome="deviated">${escapeHtml(s.predictSelfDiffer)}</button>
             </div>
           </div>`;
  return `<div class="predict"><div class="predict-head">${escapeHtml(s.predictTitle)}</div>
    <div class="predict-prompt">${escapeHtml(p.prompt)}</div>
    <div class="predict-compare">
      <div class="predict-col"><div class="predict-label">${escapeHtml(s.predictYours)}</div><pre>${escapeHtml(p.prediction ?? "")}</pre></div>
      <div class="predict-col"><div class="predict-label">${escapeHtml(s.predictActual)}</div><pre>${escapeHtml(p.actual)}</pre></div>
    </div>
    ${verdict}
    ${p.feedback ? `<div class="predict-feedback">${escapeHtml(p.feedback)}</div>` : ""}
    ${input}</div>`;
}

/** A2: the recall card - one question from an earlier step, never blocking. */
export function renderRecall(r: RecallView, lang: Lang): string {
  const s = ui(lang);
  if (r.settled) {
    // A9.2: the verdict is named, because this card is the one thing that can
    // carry an objective to "nachgewiesen" - the student should see it happen.
    const verdict = r.outcome === "passed" ? s.recallPassed : r.outcome === "failed" ? s.recallFailed : s.recallThanks;
    return `<div class="card recall settled"><div class="card-head">${escapeHtml(s.recallTitle)}</div><div>${escapeHtml(verdict)}</div>${
      r.feedback ? `<div class="card-sub">${escapeHtml(r.feedback)}</div>` : ""
    }</div>`;
  }
  return `<div class="card recall"><div class="card-head">${escapeHtml(s.recallTitle)}</div>
    <div class="card-sub">${escapeHtml(r.fromModuleTitle ? s.recallFromModule(r.fromTitle, r.fromModuleTitle) : s.recallFrom(r.fromTitle))}</div>
    <div class="card-prompt">${escapeHtml(r.prompt)}</div>
    <textarea id="recall-answer" rows="2" placeholder="${escapeHtml(s.reflectionPlaceholder)}">${escapeHtml(r.answer ?? "")}</textarea>
    <div class="row"><button class="btn primary" id="recall-submit">${escapeHtml(s.recallSubmit)}</button><button class="btn" id="recall-skip">${escapeHtml(s.recallSkip)}</button></div>
  </div>`;
}

/** A3: the module reflection card, shown after a module's last step is done. */
export function renderReflection(r: ReflectionView, lang: Lang): string {
  const s = ui(lang);
  const boxes = r.prompts
    .map((q, i) => `<div class="reflect-item"><div class="card-prompt">${escapeHtml(q)}</div>
      <textarea class="reflect-answer" data-index="${i}" rows="3" placeholder="${escapeHtml(s.reflectionPlaceholder)}">${escapeHtml(r.answers?.[i] ?? "")}</textarea></div>`)
    .join("");
  return `<div class="card reflection"><div class="card-head">${escapeHtml(s.reflectionTitle)}</div>
    <div class="card-sub">${escapeHtml(s.reflectionIntro(r.moduleTitle))}</div>
    ${boxes}
    <div class="row"><button class="btn primary" id="reflection-submit">${escapeHtml(s.reflectionSubmit)}</button>
      <span id="reflection-state">${r.saved ? escapeHtml(s.reflectionSaved) : ""}</span></div>
  </div>`;
}

/**
 * The buttons that perform what a task asks for, each with the manual route it
 * corresponds to underneath. The note is the point: the student should end the
 * course able to do it without the button.
 */
export function renderActions(t: TaskView, lang: Lang): string {
  const actions = t.actions ?? [];
  if (actions.length === 0) return "";
  const buttons = actions
    .map(
      (a) =>
        `<button class="btn action" data-task="${escapeHtml(t.id)}" data-kind="${escapeHtml(a.kind)}"${
          a.arg !== undefined ? ` data-arg="${escapeHtml(a.arg)}"` : ""
        }>${escapeHtml(a.label)}</button>`,
    )
    .join(" ");
  const notes = actions
    .filter((a) => a.manual)
    .map((a) => `<div class="action-manual">${escapeHtml(a.manual)}</div>`)
    .join("");
  return `<div class="actions"><div class="row">${buttons}</div>${notes}</div>`;
}

/**
 * A9.1: the instruction card for a `::: do` block. One action, the literal route
 * printed beside the button, what success looks like, and the way back when it
 * did not happen.
 *
 * The button demonstrates the route, it does not replace it: the route stays on
 * screen in the form the student would type, because the click is over in a
 * second and the route has to survive it. Its button is deliberately secondary -
 * the page's one primary button is the next action in the header (R11a.5).
 */
export function renderDoCard(block: DoBlockView, lang: Lang): string {
  const s = ui(lang);
  const action = block.action;
  const performed = action ? actionForDo(action) : undefined;
  const labels = performed ? actionLabels(performed, lang) : undefined;
  const button = performed && labels
    ? `<div class="row"><button class="btn action do-action" data-kind="${escapeHtml(performed.kind)}"${
        performed.arg !== undefined ? ` data-arg="${escapeHtml(performed.arg)}"` : ""
      }${performed.cwd ? ` data-cwd="${escapeHtml(performed.cwd)}"` : ""}${
        performed.line ? ` data-line="${performed.line}"` : ""
      }>${escapeHtml(labels.label)}</button></div>${labels.manual ? `<div class="action-manual">${escapeHtml(labels.manual)}</div>` : ""}`
    : "";
  const routeLabel = action?.kind === "keys" ? s.doKeys : s.doRoute;
  const route = action
    ? `<div class="do-route"><span class="do-label">${escapeHtml(routeLabel)}:</span> <code>${escapeHtml(doRouteText(action))}</code></div>`
    : "";
  const problems = block.problems.length
    ? `<div class="do-problem">${escapeHtml(s.doProblem)} ${escapeHtml(block.problems.join("; "))}</div>`
    : "";
  return `<div class="card do">
    <div class="card-head">${escapeHtml(s.doTitle)}</div>
    <div class="do-instruction">${block.instructionHtml}</div>
    ${route}
    ${button}
    ${block.expectHtml ? `<div class="do-expect"><span class="do-label">${escapeHtml(s.doExpect)}:</span> ${block.expectHtml}</div>` : ""}
    ${block.recoverHtml ? `<div class="do-recover"><span class="do-label">${escapeHtml(s.doRecover)}:</span> ${block.recoverHtml}</div>` : ""}
    ${problems}
  </div>`;
}

/** The three manual routes, spelled out once per step, collapsed by default. */
export function renderHowTo(lang: Lang): string {
  const s = ui(lang);
  return `<details class="howto">
    <summary>${escapeHtml(s.howToTitle)}</summary>
    <div class="howto-body">
      <p>${escapeHtml(s.howToIntro)}</p>
      <ol>
        <li>${escapeHtml(s.howToPalette)}</li>
        <li>${escapeHtml(s.howToMenu)}</li>
        <li>${escapeHtml(s.howToTerminal)}</li>
      </ol>
    </div>
  </details>`;
}

/**
 * Shown once, before the first step of a fresh session. Two variants: the board
 * paragraph exists only for hardware courses, so a Rust student is never told
 * about flashing.
 */
export function renderOrientation(view: OrientationView, lang: Lang): string {
  const s = ui(lang);
  const lines: string[] = [s.orientationLeft, s.orientationBottom, s.orientationPanel, s.orientationRun, s.orientationSuccess];
  if (view.board) lines.push(s.orientationBoard);
  return `<div class="card orientation" id="orientation">
    <div class="card-head">${escapeHtml(s.orientationTitle)}</div>
    <div class="card-sub">${escapeHtml(s.orientationIntro)}</div>
    <ul>${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>
    ${renderHowTo(lang)}
    <div class="row"><button class="btn primary" id="orientation-dismiss">${escapeHtml(s.orientationDismiss)}</button></div>
  </div>`;
}

/**
 * The buttons row and the self-check box are exported separately from renderTask
 * (rather than left inline) because they must ALSO be re-sent after an answer is
 * submitted, when the task's `<li>` already exists in the DOM: whether a task is
 * manually confirmable, and whether its rubric is shown, both depend on state
 * (`t.answer`, `t.selfCheck`) that only exists AFTER that submission. A postTask
 * update that only patched icon/message/cause/hint - as this one used to - left
 * the confirm button and the rubric box permanently absent for any `question`
 * that fell back to manual: they were computed once, when the step first opened
 * and no answer existed yet, and never recomputed after.
 */
export function renderTaskButtons(t: TaskView, lang: Lang): string {
  const s = ui(lang);
  const canCheck = !t.manual || t.type === "question";
  const buttons: string[] = [];
  // A predict task is run from its own "save prediction and run" button, so the
  // plain Check button would let the student skip the prediction.
  if (canCheck && !t.needsAnswer && !t.predict) buttons.push(`<button class="btn run-check" data-task="${escapeHtml(t.id)}">${s.check}</button>`);
  // A `question` without a model is confirmed only AFTER an answer exists, and
  // the button says what the student is actually attesting to. Offering it
  // beside "Submit answer" taught weaker students that it was the easier route.
  if (t.manual && t.type !== "question") buttons.push(`<button class="btn confirm" data-task="${escapeHtml(t.id)}">${s.markDone}</button>`);
  if (t.manual && t.type === "question" && t.selfCheck) buttons.push(`<button class="btn confirm" data-task="${escapeHtml(t.id)}">${s.selfCheckConfirm}</button>`);
  buttons.push(`<button class="btn hint-btn" data-task="${escapeHtml(t.id)}">${s.showHint}</button>`);
  return `<div class="row task-actions">${buttons.join(" ")}</div>`;
}

/**
 * Plain text, not HTML: `selfReported` only becomes true after a confirm click
 * that happens well after the step first opened, so this - like the buttons row
 * and the self-check box above - must be resent on every update, not computed
 * once. Callers embedding it into an HTML string still need escapeHtml.
 */
export function renderTaskTypeLabel(t: TaskView, lang: Lang): string {
  const s = ui(lang);
  return `${t.type}${t.live ? " · live" : ""}${t.selfReported && t.status === "passed" ? ` · ${s.selfReportedBadge}` : ""}`;
}

export function renderSelfCheck(t: TaskView, lang: Lang): string {
  const s = ui(lang);
  return t.selfCheck
    ? `<div class="selfcheck"><div class="selfcheck-title">${escapeHtml(s.selfCheckTitle)}</div>
       <div class="selfcheck-intro">${escapeHtml(s.selfCheckIntro)}</div>
       <div class="selfcheck-rubric">${escapeHtml(t.selfCheck)}</div></div>`
    : "";
}

/**
 * R11a.8b: every TaskView field that can change after a task first appears must be
 * recomputed and resent on EVERY update, not only the step's initial render - a
 * partial update that omits one freezes it silently, without a test or a validator
 * ever going red. This is the single place that enumerates them, precisely so a
 * later field with the same problem has one obvious spot to be added to, instead of
 * a fourth hand-patched line inside postTask. The three fields here were the second
 * and third such gap found (the first was `answerGraded`, a persisted-state gap
 * rather than a resend gap; see TaskState.answerGraded).
 */
export function taskUpdateFields(t: TaskView, lang: Lang): { predictHtml?: string; buttonsHtml: string; selfCheckHtml: string; typeLabel: string } {
  return {
    predictHtml: t.predict ? renderPredict(t, lang) : undefined,
    buttonsHtml: renderTaskButtons(t, lang),
    selfCheckHtml: renderSelfCheck(t, lang),
    typeLabel: renderTaskTypeLabel(t, lang),
  };
}

function renderTask(t: TaskView, lang: Lang): string {
  const s = ui(lang);
  // R11a.5: no button inside a task is primary. The page has exactly one, in
  // the header, and it points here - two equally weighted buttons are a choice
  // the student cannot make.
  const answerBox = t.needsAnswer
    ? `<textarea class="answer" data-task="${escapeHtml(t.id)}" placeholder="${escapeHtml(s.answerPlaceholder)}" rows="3">${escapeHtml(t.answer ?? "")}</textarea>
       <div class="row"><button class="btn submit-answer" data-task="${escapeHtml(t.id)}">${s.submitAnswer}</button></div>`
    : "";
  const hint = t.hint
    ? `<div class="hint"><div class="hint-tier">${escapeHtml(s.hintTier(t.hint.tier))}</div><div class="hint-q">${escapeHtml(t.hint.question)}</div><div class="hint-h">${escapeHtml(t.hint.hint)}</div></div>`
    : "";
  return `<li class="task status-${t.status}" data-task="${escapeHtml(t.id)}" data-type="${t.type}">
    <div class="task-head">
      <span class="task-icon" title="${escapeHtml(s.taskStatus[t.status])}">${STATUS_ICON[t.status]}</span>
      <span class="task-title">${escapeHtml(t.title)}</span>
      <span class="task-type">${escapeHtml(renderTaskTypeLabel(t, lang))}</span>
    </div>
    ${t.description ? `<div class="task-desc">${escapeHtml(t.description)}</div>` : ""}
    ${renderPredict(t, lang)}
    ${renderActions(t, lang)}
    ${answerBox}
    ${renderSelfCheck(t, lang)}
    <div class="task-cause">${t.cause ? `<span class="cause-label">${escapeHtml(s.causeLabel)}:</span> ${escapeHtml(t.cause)}` : ""}</div>
    <div class="task-msg">${t.message ? escapeHtml(t.message) : escapeHtml(s.taskStatus[t.status])}</div>
    <div class="task-waiting" hidden></div>
    ${renderTaskButtons(t, lang)}
    <div class="task-hint">${hint}</div>
  </li>`;
}

// A course-step source is indexed under `step:${courseId}/${stepId}#${lang}`
// (platform.ts) - a citation from one is not an external link, it is the
// step the student is already reading (or a neighboring one), so it jumps
// there via the same nav path as "next step" instead of opening a URL.
const STEP_CITATION_URL_RE = /^step:[^/]+\/([^#]+)#\w+$/;

function renderCitations(citations: Citation[], lang: Lang): string {
  if (citations.length === 0) return "";
  const s = ui(lang);
  return `<div class="citations"><div class="citations-title">${s.sources}</div><ol>${citations
    .map((c) => {
      const step = STEP_CITATION_URL_RE.exec(c.url);
      const link = step
        ? `<a ${tutorLinkAttrs({ kind: "step", stepId: step[1] })}>↗</a>`
        : c.url && /^https?:/.test(c.url)
          ? `<a href="${escapeHtml(c.url)}" data-tutor-link="url">↗</a>`
          : "";
      return `<li><span class="cite-title">${escapeHtml(c.title)}</span> – ${escapeHtml(c.section)}${link ? ` ${link}` : ""}<div class="cite-excerpt">${escapeHtml(c.excerpt)}…</div></li>`;
    })
    .join("")}</ol></div>`;
}

export function renderNote(note: NoteView, lang: Lang): string {
  return `<div class="note${note.tier ? " note-hint" : ""}"><div class="note-title">${escapeHtml(note.title)}${note.tier ? ` · ${escapeHtml(ui(lang).hintTier(note.tier))}` : ""}</div><div class="note-text">${escapeHtml(note.text)}</div>${renderCitations(note.citations ?? [], lang)}</div>`;
}

/**
 * A9.4.1: how far the module has come. "Schritt m von n" answers where the
 * student is; without the bar nothing answers how much is left, and visibility
 * of system status is the first usability heuristic there is.
 */
export function renderModuleProgress(view: StepView): string {
  const s = ui(view.lang);
  const { done, total } = view.moduleProgress;
  const pct = total > 0 ? Math.round((Math.min(done, total) / total) * 100) : 0;
  const label = s.moduleProgress(done, total);
  return `<span class="modbar" role="img" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}"><span class="modbar-fill" style="width:${pct}%"></span></span>`;
}

/**
 * A9.4.2 / R11a.5: the one next action, in the sticky header so it survives
 * scrolling, with the page's only primary button. While the orientation card is
 * up, that card owns the primary button instead - there is still exactly one.
 */
export function renderNextAction(view: StepView): string {
  const s = ui(view.lang);
  const next = view.nextAction;
  const button =
    next && next.label && next.kind !== "none"
      ? `<button class="btn${view.orientation ? "" : " primary"}" id="next-action" data-next-kind="${next.kind}"${
          next.taskId ? ` data-task="${escapeHtml(next.taskId)}"` : ""
        }${next.stepId ? ` data-step="${escapeHtml(next.stepId)}"` : ""}${next.needsInput ? ` data-needs-input="1"` : ""}>${escapeHtml(next.label)}</button>`
      : "";
  return `<div class="nextbar">
    <span class="next-label">${escapeHtml(s.nextActionLabel)}:</span>
    <span class="next-line" id="next-line">${next ? escapeHtml(next.text) : ""}</span>
    <span id="next-button">${button}</span>
  </div>`;
}

export function renderStepHtml(view: StepView, cspSource: string, scriptNonce: string = nonce()): string {
  const s = ui(view.lang);
  const locked = view.status === "locked";
  const lockedBanner = locked
    ? `<div class="banner locked">${s.locked} ${view.lockedBy.map((r) => `<a ${tutorLinkAttrs({ kind: "step", stepId: r.stepId })}>${escapeHtml(r.title)}</a>`).join(", ")}</div>`
    : "";
  const doneBanner = view.status === "done" ? `<div class="banner done" id="done-banner">${s.done}</div>` : `<div class="banner done" id="done-banner" hidden></div>`;
  const links = view.links.length
    ? `<div class="links"><span class="links-title">${s.links}:</span> ${view.links.map((l) => `<a ${tutorLinkAttrs(l.link)} class="tutor-link tutor-link-${l.link.kind}">${escapeHtml(l.label)}</a>`).join(" · ")}</div>`
    : "";
  const objectives = view.objectives.length ? `<span class="meta-item" title="${s.objectives}">${view.objectives.map(escapeHtml).join(", ")}</span>` : "";
  const creates = view.creates.length ? `<span class="meta-item" title="${s.creates}">${s.creates}: <code>${view.creates.map(escapeHtml).join("</code>, <code>")}</code></span>` : "";

  return `<!DOCTYPE html>
<html lang="${view.lang}">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} https: data:; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${scriptNonce}'; font-src ${cspSource};">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(view.title)}</title>
<style nonce="${scriptNonce}">
  :root { color-scheme: light dark; }
  html, body { height: 100%; }
  body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); background: var(--vscode-editor-background); line-height: 1.55; margin: 0; padding: 0; }
  /* "Frag den Tutor" pinned at the bottom, everything else scrolls above it - the
     operator's own finding: on a long step, the ask box used to scroll away with
     the rest of the page, so it was never where the eye already was. */
  .page { display: flex; flex-direction: column; height: 100vh; max-width: 62rem; margin: 0 auto; box-sizing: border-box; }
  .scroll-area { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 0 1.2rem 1rem; }
  .ask-footer { flex: none; border-top: 1px solid var(--vscode-panel-border); background: var(--vscode-editor-background); padding: 0.6em 1.2rem 0.8em; max-height: 45vh; overflow-y: auto; }
  a { color: var(--vscode-textLink-foreground); text-decoration: none; } a:hover { text-decoration: underline; }
  code { font-family: var(--vscode-editor-font-family); background: var(--vscode-textCodeBlock-background); padding: 0.1em 0.3em; border-radius: 3px; }
  pre { background: var(--vscode-textCodeBlock-background); padding: 0.8em; border-radius: 4px; overflow-x: auto; } pre code { background: none; padding: 0; }
  h1 { font-size: 1.5em; margin: 0.4em 0 0.2em; } h2 { font-size: 1.2em; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 0.2em; margin-top: 1.4em; }
  blockquote { border-left: 3px solid var(--vscode-textBlockQuote-border); background: var(--vscode-textBlockQuote-background); margin: 0.8em 0; padding: 0.4em 0.8em; }
  img { max-width: 100%; }
  table { border-collapse: collapse; } td, th { border: 1px solid var(--vscode-panel-border); padding: 0.2em 0.6em; }
  .topbar { flex: none; background: var(--vscode-editor-background); padding: 0.6em 1.2rem 0.5em; border-bottom: 1px solid var(--vscode-panel-border); }
  .topbar-row { display: flex; align-items: center; gap: 0.6em; flex-wrap: wrap; }
  .crumbs { opacity: 0.75; font-size: 0.9em; flex: 1; }
  /* A9.4.1: the module bar - "Schritt m von n" says where, the bar says how much is left. */
  .modbar { display: inline-block; width: 7em; height: 0.5em; border-radius: 0.25em; background: var(--vscode-panel-border); overflow: hidden; flex: none; }
  .modbar-fill { display: block; height: 100%; background: var(--vscode-progressBar-background, var(--vscode-textLink-foreground)); }
  /* A9.4.2: the one next action, and the page's one primary button, in the sticky header. */
  .nextbar { display: flex; align-items: center; gap: 0.5em; flex-wrap: wrap; margin-top: 0.45em; }
  .next-label { font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.04em; opacity: 0.65; }
  .btn { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: none; padding: 0.35em 0.8em; border-radius: 3px; cursor: pointer; font-family: inherit; font-size: 0.95em; }
  .btn:hover { background: var(--vscode-button-secondaryHoverBackground); } .btn.primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); } .btn.primary:hover { background: var(--vscode-button-hoverBackground); }
  .btn:disabled { opacity: 0.5; cursor: default; }
  .meta { display: flex; gap: 0.8em; flex-wrap: wrap; font-size: 0.88em; opacity: 0.8; margin-bottom: 0.6em; }
  .meta-item { border: 1px solid var(--vscode-panel-border); border-radius: 10px; padding: 0 0.6em; }
  .bloom { background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); border: none; }
  .banner { padding: 0.5em 0.8em; border-radius: 4px; margin: 0.6em 0; }
  .banner.locked { background: var(--vscode-inputValidation-warningBackground); border: 1px solid var(--vscode-inputValidation-warningBorder); }
  .banner.done { background: var(--vscode-inputValidation-infoBackground); border: 1px solid var(--vscode-inputValidation-infoBorder); }
  .links { font-size: 0.92em; margin: 0.6em 0; } .links-title { opacity: 0.7; }
  ul.tasks { list-style: none; padding: 0; margin: 0; }
  .task { border: 1px solid var(--vscode-panel-border); border-left: 4px solid var(--vscode-panel-border); border-radius: 4px; padding: 0.5em 0.8em; margin: 0.5em 0; }
  .task.status-passed { border-left-color: var(--vscode-testing-iconPassed, #3c9); } .task.status-failed { border-left-color: var(--vscode-testing-iconFailed, #e55); } .task.status-running { border-left-color: var(--vscode-progressBar-background); } .task.status-unavailable { border-left-color: var(--vscode-testing-iconSkipped, #999); }
  .task-head { display: flex; gap: 0.5em; align-items: baseline; } .task-title { font-weight: 600; flex: 1; } .task-type { font-size: 0.8em; opacity: 0.6; font-family: var(--vscode-editor-font-family); }
  .task-icon { width: 1.2em; display: inline-block; } .status-passed .task-icon { color: var(--vscode-testing-iconPassed, #3c9); } .status-failed .task-icon { color: var(--vscode-testing-iconFailed, #e55); }
  .task-msg { font-size: 0.88em; opacity: 0.85; margin: 0.3em 0; font-family: var(--vscode-editor-font-family); white-space: pre-wrap; }
  .task-desc { font-size: 0.92em; opacity: 0.85; }
  .row { display: flex; gap: 0.5em; flex-wrap: wrap; align-items: center; margin-top: 0.3em; }
  .hint { border: 1px dashed var(--vscode-focusBorder); border-radius: 4px; padding: 0.4em 0.7em; margin-top: 0.4em; }
  .hint-tier { font-size: 0.8em; opacity: 0.7; } .hint-q { font-style: italic; } .hint-h { margin-top: 0.2em; }
  textarea, input[type=text] { width: 100%; box-sizing: border-box; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, transparent); padding: 0.4em; border-radius: 3px; font-family: inherit; }
  /* .ask-footer already draws the separating border above this - a second one
     here (from .ask's pre-pin styling) only ate space a short panel does not
     have to spare. */
  .ask-footer h2 { font-size: 1em; margin: 0 0 0.4em; }
  .ask-footer .meta { margin-bottom: 0.4em; }
  .ask-row { display: flex; gap: 0.5em; } .ask-row input { flex: 1; }
  .answer-box { margin-top: 0.6em; padding: 0.6em 0.8em; border-radius: 4px; border: 1px solid var(--vscode-panel-border); white-space: pre-wrap; } .answer-box[hidden] { display: none; }
  /* Addendum v1.1: scaffold badge, predict panel, recall and reflection cards. */
  .selfcheck { margin-top: 0.6em; padding: 0.5em 0.7em; border-left: 3px solid var(--vscode-inputValidation-warningBorder, var(--vscode-panel-border)); background: var(--vscode-textBlockQuote-background); border-radius: 3px; }
  .selfcheck-title { font-weight: 600; }
  .selfcheck-intro { font-size: 0.92em; opacity: 0.85; margin: 0.2em 0 0.3em; }
  .selfcheck-rubric { font-family: var(--vscode-editor-font-family); }
  .task-waiting { margin-top: 0.5em; padding: 0.5em 0.7em; border-left: 3px solid var(--vscode-panel-border); background: var(--vscode-textBlockQuote-background); border-radius: 3px; font-size: 0.92em; }
  .task-waiting[hidden] { display: none; }
  .waiting-position { opacity: 0.85; margin: 0.15em 0; }
  .waiting-elapsed { font-family: var(--vscode-editor-font-family); opacity: 0.75; }
  .actions { margin-top: 0.5em; }
  .action-manual { font-size: 0.88em; opacity: 0.75; margin-top: 0.25em; }
  /* A9.1: the instruction card. Set off from the prose so an instruction is never mistaken for narration. */
  .card.do { border-left: 4px solid var(--vscode-textLink-foreground); }
  .card.do .do-instruction > p:first-child { margin-top: 0.2em; } .card.do .do-instruction > p:last-child { margin-bottom: 0.4em; }
  .do-label { font-weight: 600; opacity: 0.8; }
  .do-route { margin: 0.3em 0; font-size: 0.92em; }
  .do-route code { font-size: 0.95em; }
  .do-expect, .do-recover { margin-top: 0.4em; font-size: 0.94em; }
  .do-recover { opacity: 0.9; }
  .do-problem { margin-top: 0.4em; padding: 0.3em 0.5em; border-radius: 3px; background: var(--vscode-inputValidation-warningBackground); border: 1px solid var(--vscode-inputValidation-warningBorder); font-size: 0.9em; }
  .howto { margin: 0.9em 0; border: 1px solid var(--vscode-panel-border); border-radius: 4px; padding: 0.4em 0.7em; }
  .howto > summary { cursor: pointer; font-weight: 600; }
  .howto-body ol { margin: 0.4em 0 0.2em 1.2em; padding: 0; }
  .howto-body li { margin: 0.3em 0; }
  .card.orientation ul { margin: 0.3em 0 0.5em 1.2em; padding: 0; }
  .card.orientation li { margin: 0.25em 0; }
  .next-line { font-weight: 600; flex: 1; min-width: 12em; }
  /* R11a.4: the cause sentence sits above the tool output and reads like prose, not like a log line. */
  .task-cause { font-size: 0.94em; margin: 0.35em 0 0.1em; }
  .task-cause:empty { display: none; }
  .cause-label { font-weight: 600; opacity: 0.8; }
  .status-failed .task-cause { border-left: 3px solid var(--vscode-testing-iconFailed, #e55); padding-left: 0.5em; }
  .lang-group { display: inline-flex; gap: 0; border: 1px solid var(--vscode-panel-border); border-radius: 4px; overflow: hidden; }
  .lang-group .btn.lang-choice { border: none; border-radius: 0; margin: 0; opacity: 0.75; }
  .lang-group .btn.lang-choice + .btn.lang-choice { border-left: 1px solid var(--vscode-panel-border); }
  .lang-group .btn.lang-choice.active { background: var(--vscode-button-background); color: var(--vscode-button-foreground); opacity: 1; font-weight: 600; }
  .meta-item.scaffold { border-color: var(--vscode-textLink-foreground); }
  .scaffold-note { margin: 0.4em 0 0.8em; opacity: 0.85; font-style: italic; }
  .predict { margin-top: 0.6em; padding: 0.6em 0.8em; border-left: 3px solid var(--vscode-textLink-foreground); background: var(--vscode-textBlockQuote-background); border-radius: 3px; }
  .predict-head { font-weight: 600; }
  .predict-prompt { margin: 0.3em 0 0.5em; }
  .predict-compare { display: flex; gap: 0.8em; flex-wrap: wrap; margin: 0.5em 0; }
  .predict-col { flex: 1 1 16em; min-width: 0; }
  .predict-label { font-size: 0.9em; opacity: 0.8; margin-bottom: 0.2em; }
  .predict-col pre { margin: 0; padding: 0.4em 0.6em; max-height: 14em; overflow: auto; white-space: pre-wrap; word-break: break-word; background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); border-radius: 3px; }
  .predict-verdict { margin: 0.4em 0; }
  .predict-verdict.match { color: var(--vscode-testing-iconPassed, var(--vscode-charts-green)); }
  .predict-verdict.differ { color: var(--vscode-charts-yellow); }
  .predict-feedback { margin: 0.3em 0; opacity: 0.9; }
  .card { margin: 0.8em 0; padding: 0.7em 0.9em; border: 1px solid var(--vscode-panel-border); border-radius: 4px; background: var(--vscode-textBlockQuote-background); }
  .card-head { font-weight: 600; }
  .card-sub { font-size: 0.92em; opacity: 0.85; margin: 0.2em 0 0.5em; }
  .card-prompt { margin: 0.35em 0 0.3em; }
  .card textarea, .predict textarea { width: 100%; box-sizing: border-box; font-family: var(--vscode-editor-font-family); background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, var(--vscode-panel-border)); border-radius: 3px; padding: 0.4em; }
  .card.recall.settled { opacity: 0.8; }
  #reflection-state { align-self: center; opacity: 0.85; }
  /* A9.3 competence and can-do cards. The level is a word, never a number or a bar. */
  .competence-list, .can-list, .can-open-list { list-style: none; margin: 0.3em 0; padding: 0; }
  .can-open-list { list-style: disc; margin-left: 1.2em; opacity: 0.85; font-size: 0.92em; }
  .competence-item, .can-item { margin: 0.45em 0; padding-left: 0.6em; border-left: 3px solid var(--vscode-panel-border); }
  .competence-row { display: flex; gap: 0.6em; align-items: baseline; justify-content: space-between; }
  .competence-statement, .can-statement { flex: 1; }
  .competence-level { font-size: 0.85em; text-transform: lowercase; opacity: 0.9; white-space: nowrap; border: 1px solid var(--vscode-panel-border); border-radius: 3px; padding: 0 0.4em; }
  .competence-evidence { font-size: 0.86em; opacity: 0.75; margin-top: 0.15em; }
  .competence-note { font-size: 0.85em; opacity: 0.7; margin-top: 0.5em; }
  .competence-ceiling { font-size: 0.86em; margin-top: 0.2em; padding-left: 0.5em; border-left: 2px solid var(--vscode-inputValidation-infoBorder, var(--vscode-focusBorder)); opacity: 0.9; }
  .level-practised { border-left-color: var(--vscode-charts-blue, var(--vscode-focusBorder)); }
  .level-demonstrated { border-left-color: var(--vscode-testing-iconPassed, var(--vscode-charts-green)); }
  .level-touched { border-left-color: var(--vscode-charts-yellow, var(--vscode-panel-border)); }
  .answer-box.refused { border-color: var(--vscode-inputValidation-infoBorder); } .answer-box.llm-error, .answer-box.unconfigured { border-color: var(--vscode-inputValidation-warningBorder); }
  .citations { margin-top: 0.5em; font-size: 0.88em; } .citations ol { padding-left: 1.3em; margin: 0.2em 0; } .cite-excerpt { opacity: 0.7; } .citations-title { opacity: 0.7; }
  .note { border: 1px solid var(--vscode-focusBorder); background: var(--vscode-editorWidget-background); border-radius: 4px; padding: 0.6em 0.8em; margin: 0.8em 0; }
  .note-title { font-weight: 600; margin-bottom: 0.2em; } .note-text { white-space: pre-wrap; }
  .nav { display: flex; justify-content: space-between; margin-top: 1.5em; gap: 0.5em; }
  .busy { opacity: 0.6; pointer-events: none; }
  .tutor-link-file::before { content: "📄 "; } .tutor-link-doc::before { content: "📘 "; } .tutor-link-step::before { content: "➜ "; }
</style>
</head>
<body class="status-${view.status}">
  <div class="page">
  <div class="topbar">
    <div class="topbar-row">
      <span class="crumbs">${escapeHtml(view.courseTitle)} › ${escapeHtml(view.moduleTitle)} › ${escapeHtml(s.stepOf(view.index + 1, view.total))}</span>
      ${renderModuleProgress(view)}
      <button class="btn" id="run-all" ${locked ? "disabled" : ""}>${s.checkAll}</button>
      ${renderLanguageChoice(view.lang)}
    </div>
    ${renderNextAction(view)}
  </div>
  <div class="scroll-area">
  <h1 id="step-title">${escapeHtml(view.title)}</h1>
  <div class="meta">
    <span class="meta-item bloom" title="${s.bloom}">${escapeHtml(s.bloom)}: ${escapeHtml(s.bloomLabel[view.bloom])}</span>
    <span class="meta-item scaffold scaffold-${view.scaffold}" title="${escapeHtml(s.scaffoldHint[view.scaffold])}">${escapeHtml(s.scaffold[view.scaffold])}</span>
    ${view.estimatedMinutes ? `<span class="meta-item">${escapeHtml(s.minutes(view.estimatedMinutes))}</span>` : ""}
    ${objectives}
    ${creates}
    <span class="meta-item" id="step-status">${escapeHtml(s.status[view.status])}</span>
  </div>
  ${lockedBanner}
  ${doneBanner}
  <div id="orientation-area">${view.orientation ? renderOrientation(view.orientation, view.lang) : ""}</div>
  <div id="note-area">${view.note ? renderNote(view.note, view.lang) : ""}</div>
  <div class="scaffold-note">${escapeHtml(s.scaffoldHint[view.scaffold])}</div>
  <div class="body">${view.bodyHtml}</div>
  ${links}
  <h2>${s.tasks}</h2>
  <ul class="tasks" id="tasks">${view.tasks.map((t) => renderTask(t, view.lang)).join("")}</ul>
  ${renderHowTo(view.lang)}
  <!-- A9.4.5: recall, then reflection, after the tasks - not before them. A
       recall card above the step's own work asked the student to look backwards
       before they had done anything. -->
  <div id="recall-area">${view.recall ? renderRecall(view.recall, view.lang) : ""}</div>
  <div id="reflection-area">${view.reflection ? renderReflection(view.reflection, view.lang) : ""}</div>
  <div class="nav">
    <button class="btn" id="prev" ${view.prev ? `data-step="${escapeHtml(view.prev.stepId)}"` : "disabled"}>${s.prev}${view.prev ? `: ${escapeHtml(view.prev.title)}` : ""}</button>
    <button class="btn" id="next" ${view.next ? `data-step="${escapeHtml(view.next.stepId)}"` : "disabled"}>${s.next}${view.next ? `: ${escapeHtml(view.next.title)}` : ""}</button>
  </div>
  </div>
  <div class="ask-footer">
  <div class="ask">
    <h2 style="border:none;margin-top:0">${s.ask}</h2>
    <div class="ask-row"><input id="question" type="text" maxlength="800" placeholder="${escapeHtml(s.askPlaceholder)}" /><button class="btn" id="ask-btn">${s.askButton}</button></div>
    <div class="meta" style="margin-top:0.3em"><span class="meta-item bloom">${escapeHtml(s.bloom)}: ${escapeHtml(s.bloomLabel[view.bloom])}</span>${view.llmConfigured ? "" : `<span class="meta-item" id="llm-state">${escapeHtml(s.llmUnconfigured)}</span>`}</div>
    <div id="answer" class="answer-box" hidden></div>
  </div>
  </div>
  </div>
  <script nonce="${scriptNonce}">${clientScript(view)}</script>
</body>
</html>`;
}

/** Client-side behaviour: click routing → postMessage; incoming messages patch the DOM. */
function clientScript(view: StepView): string {
  const strings = JSON.stringify({
    lang: view.lang,
    // The panel no longer toggles to "the other" language; it names both and
    // marks the active one, so the client only needs to know which is active.
    thinking: ui(view.lang).askThinking,
    copied: ui(view.lang).copied,
    copyLabel: view.lang === "de" ? "Kopieren" : "Copy",
    running: ui(view.lang).running,
    sources: ui(view.lang).sources,
    causeLabel: ui(view.lang).causeLabel,
    moduleProgress: ui(view.lang).moduleProgress(0, 0).replace("0", "{d}").replace("0", "{t}"),
    hintTier: ui(view.lang).hintTier(0).replace("0", "{n}"),
    unlocked: ui(view.lang).unlocked("{t}"),
    done: ui(view.lang).done,
    icons: STATUS_ICON,
    statusText: ui(view.lang).taskStatus,
    gradingWait: ui(view.lang).gradingWait,
    gradingWaitPosition: ui(view.lang).gradingWaitPosition(1, 2).replace("1", "{p}").replace("2", "{t}"),
    gradingElapsed: ui(view.lang).gradingElapsed(7).replace("7", "{s}"),
    gradingGiveUp: ui(view.lang).gradingGiveUp,
  });
  return `
(function () {
  const vscode = acquireVsCodeApi();
  const S = ${strings};
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const post = (m) => vscode.postMessage(m);

  document.addEventListener("click", (ev) => {
    const a = ev.target.closest("a[data-tutor-link]");
    if (a) {
      ev.preventDefault();
      const kind = a.getAttribute("data-tutor-link");
      if (kind === "step") post({ type: "nav", stepId: a.getAttribute("data-step") });
      else if (kind === "file") post({ type: "link", link: { kind: "file", path: a.getAttribute("data-path"), line: a.getAttribute("data-line") ? Number(a.getAttribute("data-line")) : undefined } });
      else if (kind === "doc") post({ type: "link", link: { kind: "doc", path: a.getAttribute("data-path") } });
      else post({ type: "link", link: { kind: "url", url: a.getAttribute("href") } });
      return;
    }
    const b = ev.target.closest("button");
    if (!b) return;
    const taskId = b.getAttribute("data-task");
    if (b.classList.contains("run-check")) { setRunning(taskId); post({ type: "runCheck", taskId }); }
    else if (b.classList.contains("confirm")) { setRunning(taskId); post({ type: "confirm", taskId }); }
    else if (b.classList.contains("hint-btn")) post({ type: "hint", taskId });
    else if (b.classList.contains("give-up")) { stopWaiting(taskId); post({ type: "giveUp", taskId }); }
    else if (b.classList.contains("submit-answer")) {
      const ta = document.querySelector('textarea.answer[data-task="' + CSS.escape(taskId) + '"]');
      setRunning(taskId); post({ type: "answer", taskId, text: ta ? ta.value : "" });
    }
    else if (b.classList.contains("submit-predict")) {
      const ta = document.querySelector('textarea.prediction[data-task="' + CSS.escape(taskId) + '"]');
      setRunning(taskId); post({ type: "predict", taskId, text: ta ? ta.value : "" });
    }
    else if (b.classList.contains("predict-self")) { post({ type: "predict", taskId, text: b.getAttribute("data-outcome") === "correct" ? "__self:correct" : "__self:deviated" }); }
    else if (b.classList.contains("action")) {
      const kind = b.getAttribute("data-kind");
      // A ::: do card carries its own cwd and line and belongs to no task, so
      // taskId is absent there; the controller keys off the attributes instead.
      const line = b.getAttribute("data-line");
      post({ type: "action", taskId: taskId || undefined, kind, arg: b.getAttribute("data-arg") || undefined, cwd: b.getAttribute("data-cwd") || undefined, line: line ? Number(line) : undefined });
      if (kind === "copyCommand") { b.textContent = S.copied; setTimeout(() => { b.textContent = S.copyLabel; }, 1500); }
    }
    else if (b.id === "orientation-dismiss") {
      const card = document.getElementById("orientation");
      if (card) card.remove();
      post({ type: "dismissOrientation" });
    }
    else if (b.id === "recall-submit") { const ta = document.getElementById("recall-answer"); post({ type: "recallAnswer", text: ta ? ta.value : "" }); }
    else if (b.id === "recall-skip") post({ type: "recallSkip" });
    else if (b.id === "reflection-submit") {
      const answers = Array.from(document.querySelectorAll("textarea.reflect-answer")).map((ta) => ta.value);
      post({ type: "reflection", answers });
    }
    else if (b.id === "next-action") nextAction(b);
    else if (b.id === "run-all") { document.querySelectorAll("li.task").forEach((li) => setRunning(li.getAttribute("data-task"))); post({ type: "runAll" }); }
    else if (b.classList.contains("lang-choice")) {
      const chosen = b.getAttribute("data-lang");
      if (chosen && chosen !== S.lang) post({ type: "setLang", lang: chosen });
    }
    else if (b.id === "ask-btn") ask();
    else if ((b.id === "prev" || b.id === "next") && b.getAttribute("data-step")) post({ type: "nav", stepId: b.getAttribute("data-step") });
  });
  document.getElementById("question").addEventListener("keydown", (ev) => { if (ev.key === "Enter") ask(); });

  function ask() {
    const input = document.getElementById("question");
    const q = input.value.trim();
    if (!q) return;
    const box = document.getElementById("answer");
    box.hidden = false; box.className = "answer-box"; box.textContent = S.thinking;
    post({ type: "ask", question: q });
  }

  // A9.4.2: the header button performs the next action. A task that still needs
  // typing is scrolled to and focused rather than run - checking an empty answer
  // would only produce a failure the student did not cause.
  function nextAction(b) {
    const kind = b.getAttribute("data-next-kind");
    if (kind === "step") { post({ type: "nav", stepId: b.getAttribute("data-step") }); return; }
    if (kind !== "task") return;
    const id = b.getAttribute("data-task");
    const li = document.querySelector('li.task[data-task="' + CSS.escape(id) + '"]');
    if (li) li.scrollIntoView({ behavior: "smooth", block: "center" });
    const field = li && li.querySelector("textarea.prediction, textarea.answer");
    if (b.getAttribute("data-needs-input") && field) { field.focus(); return; }
    setRunning(id);
    post({ type: "runCheck", taskId: id });
  }

  function setRunning(taskId) {
    const li = document.querySelector('li.task[data-task="' + CSS.escape(taskId) + '"]');
    if (!li) return;
    li.className = "task status-running";
    li.querySelector(".task-icon").textContent = S.icons.running;
    li.querySelector(".task-msg").textContent = S.running;
  }

  // The model answers one request at a time; a burst of students (a whole class
  // checking the same step at once) queues behind it for real seconds, not a
  // network blip. Never leave that silent: say why, show time actually passing
  // (a counter, not a bar claiming progress this side does not know), and after
  // 20s offer a way out that does not depend on the model ever answering - the
  // same self-check path a question task without one falls back to (R11a.8, no
  // third state). .task-waiting is owned entirely by this script: postTask's
  // taskUpdateFields (controller.ts) never touches it, the way it never touches
  // an in-progress answer textarea, for the same reason.
  const waiting = {};

  function startWaiting(taskId) {
    stopWaiting(taskId);
    const li = document.querySelector('li.task[data-task="' + CSS.escape(taskId) + '"]');
    const box = li && li.querySelector(".task-waiting");
    if (!box) return;
    const start = Date.now();
    box.hidden = false;
    box.innerHTML = '<div class="waiting-text">' + esc(S.gradingWait) + '</div><div class="waiting-position"></div><div class="waiting-elapsed"></div>';
    const tick = () => {
      const el = box.querySelector(".waiting-elapsed");
      if (el) el.textContent = S.gradingElapsed.replace("{s}", String(Math.floor((Date.now() - start) / 1000)));
      if (Date.now() - start >= 20000 && !box.querySelector(".give-up")) {
        box.insertAdjacentHTML("beforeend", '<div class="row"><button class="btn give-up" data-task="' + esc(taskId) + '">' + esc(S.gradingGiveUp) + '</button></div>');
      }
    };
    tick();
    waiting[taskId] = setInterval(tick, 1000);
    li.querySelectorAll(".run-check, .submit-answer").forEach((btn) => { btn.disabled = true; });
  }

  function stopWaiting(taskId) {
    if (waiting[taskId]) { clearInterval(waiting[taskId]); delete waiting[taskId]; }
    const li = document.querySelector('li.task[data-task="' + CSS.escape(taskId) + '"]');
    if (!li) return;
    const box = li.querySelector(".task-waiting");
    if (box) { box.hidden = true; box.innerHTML = ""; }
    li.querySelectorAll(".run-check, .submit-answer").forEach((btn) => { btn.disabled = false; });
  }

  function setQueueInfo(taskId, position, length) {
    if (!waiting[taskId] || position === undefined || length === undefined) return;
    const li = document.querySelector('li.task[data-task="' + CSS.escape(taskId) + '"]');
    const el = li && li.querySelector(".waiting-position");
    if (el) el.textContent = S.gradingWaitPosition.replace("{p}", String(position)).replace("{t}", String(length));
  }

  function renderCitations(cs) {
    if (!cs || !cs.length) return "";
    return '<div class="citations"><div class="citations-title">' + esc(S.sources) + '</div><ol>' + cs.map((c) => {
      const step = /^step:[^/]+\\/([^#]+)#\\w+$/.exec(c.url);
      const link = step
        ? '<a href="#" data-tutor-link="step" data-step="' + esc(step[1]) + '">↗</a>'
        : (c.url && /^https?:/.test(c.url) ? '<a href="' + esc(c.url) + '" data-tutor-link="url">↗</a>' : '');
      return '<li><span class="cite-title">' + esc(c.title) + '</span> – ' + esc(c.section) + (link ? ' ' + link : '') + '<div class="cite-excerpt">' + esc(c.excerpt) + '…</div></li>';
    }).join("") + '</ol></div>';
  }

  window.addEventListener("message", (ev) => {
    const m = ev.data;
    if (m.type === "task") {
      const t = m.task;
      const li = document.querySelector('li.task[data-task="' + CSS.escape(t.id) + '"]');
      if (!li) return;
      li.className = "task status-" + t.status;
      li.querySelector(".task-icon").textContent = S.icons[t.status];
      li.querySelector(".task-icon").title = S.statusText[t.status];
      li.querySelector(".task-msg").textContent = t.message || S.statusText[t.status];
      if (t.typeLabel !== undefined) li.querySelector(".task-type").textContent = t.typeLabel;
      // R11a.4: the course's sentence about the probable cause, above the output.
      const cause = li.querySelector(".task-cause");
      if (cause) cause.innerHTML = t.cause ? '<span class="cause-label">' + esc(S.causeLabel) + ':</span> ' + esc(t.cause) : "";
      // Whether a task is manually confirmable, and whether its rubric is shown,
      // both depend on state (an answer, a graded-or-not outcome) that only exists
      // after this run - re-sent every time rather than computed once when the
      // step first opened, or a question task falling back to manual would never
      // get a confirm button or its self-check rubric at all.
      if (t.buttonsHtml !== undefined) {
        const actions = li.querySelector(".task-actions");
        if (actions) actions.outerHTML = t.buttonsHtml;
      }
      if (t.selfCheckHtml !== undefined) {
        const existingSelf = li.querySelector(".selfcheck");
        if (t.selfCheckHtml) {
          if (existingSelf) existingSelf.outerHTML = t.selfCheckHtml;
          else li.querySelector(".task-cause").insertAdjacentHTML("beforebegin", t.selfCheckHtml);
        } else if (existingSelf) {
          existingSelf.remove();
        }
      }
      if (t.status === "passed") li.querySelector(".task-hint").innerHTML = "";
      if (t.hint) li.querySelector(".task-hint").innerHTML = '<div class="hint"><div class="hint-tier">' + esc(S.hintTier.replace("{n}", t.hint.tier)) + '</div><div class="hint-q">' + esc(t.hint.question) + '</div><div class="hint-h">' + esc(t.hint.hint) + '</div></div>';
      // The predict panel is re-rendered by the extension, which is the only side
      // that knows whether a prediction exists and may therefore reveal the output.
      if (t.predictHtml !== undefined) {
        const old = li.querySelector(".predict");
        if (old) old.outerHTML = t.predictHtml;
        else li.querySelector(".task-head").insertAdjacentHTML("afterend", t.predictHtml);
      }
    } else if (m.type === "next") {
      const line = document.getElementById("next-line");
      if (line) line.textContent = m.next ? m.next.text : "";
      if (m.moduleProgress) {
        const fill = document.querySelector(".modbar-fill");
        const bar = document.querySelector(".modbar");
        const total = m.moduleProgress.total;
        const pct = total > 0 ? Math.round((Math.min(m.moduleProgress.done, total) / total) * 100) : 0;
        if (fill) fill.style.width = pct + "%";
        if (bar) { const label = S.moduleProgress.replace("{d}", m.moduleProgress.done).replace("{t}", total); bar.title = label; bar.setAttribute("aria-label", label); }
      }
      const slot = document.getElementById("next-button");
      if (slot) {
        const n = m.next;
        slot.innerHTML = n && n.label && n.kind !== "none"
          ? '<button class="btn primary" id="next-action" data-next-kind="' + esc(n.kind) + '"' +
            (n.taskId ? ' data-task="' + esc(n.taskId) + '"' : "") +
            (n.stepId ? ' data-step="' + esc(n.stepId) + '"' : "") +
            (n.needsInput ? ' data-needs-input="1"' : "") + '>' + esc(n.label) + '</button>'
          : "";
      }
    } else if (m.type === "recall") {
      document.getElementById("recall-area").innerHTML = m.html;
    } else if (m.type === "reflection") {
      const area = document.getElementById("reflection-area");
      area.innerHTML = m.html;
      area.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else if (m.type === "competence") {
      // A9.4 order: the reflection card first, the can-do card behind it. Appending
      // rather than replacing keeps whatever the reflection put there.
      const area = document.getElementById("reflection-area");
      const box = document.createElement("div");
      box.id = "competence-area";
      box.innerHTML = m.html;
      const old = document.getElementById("competence-area");
      if (old) old.replaceWith(box); else area.appendChild(box);
      box.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else if (m.type === "ask") {
      const box = document.getElementById("answer");
      box.hidden = false; box.className = "answer-box " + m.outcome.kind;
      let html = esc(m.outcome.text);
      if (m.outcome.kind === "answer" && m.outcome.hintTier) html = '<div class="hint-tier">' + esc(S.hintTier.replace("{n}", m.outcome.hintTier)) + ' · ' + esc(m.outcome.bloomLevel || "") + '</div>' + html;
      if (m.outcome.next) html += '<div class="hint-tier" style="margin-top:0.4em">→ ' + esc(m.outcome.next) + '</div>';
      box.innerHTML = html + renderCitations(m.outcome.citations);
    } else if (m.type === "note") {
      const area = document.getElementById("note-area");
      area.innerHTML = '<div class="note' + (m.note.tier ? ' note-hint' : '') + '"><div class="note-title">' + esc(m.note.title) + (m.note.tier ? ' · ' + esc(S.hintTier.replace("{n}", m.note.tier)) : '') + '</div><div class="note-text">' + esc(m.note.text) + '</div>' + renderCitations(m.note.citations) + '</div>';
      area.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else if (m.type === "stepDone") {
      const b = document.getElementById("done-banner");
      b.hidden = false; b.textContent = S.done + (m.unlocked.length ? " " + S.unlocked.replace("{t}", m.unlocked.map((u) => u.title).join(", ")) : "");
      document.body.className = "status-done";
      document.getElementById("step-status").textContent = ${JSON.stringify(ui(view.lang).status.done)};
    } else if (m.type === "busy") {
      document.getElementById("tasks").classList.toggle("busy", m.busy);
    } else if (m.type === "grading") {
      if (m.state === "started") startWaiting(m.taskId);
      else if (m.state === "progress") setQueueInfo(m.taskId, m.queuePosition, m.queueLength);
      else if (m.state === "done") stopWaiting(m.taskId);
    }
  });
  post({ type: "ready" });
})();`;
}

// ---------------------------------------------------------------------------------------------
// Addendum A9.3: competence card and can-do card.
//
// Deliberately at the end of the file and independent of renderStepHtml: the panel's
// assembly is being reworked in parallel, and these two cards are pushed into the panel
// as HTML, so they never have to share a line with it.
//
// What is NOT here, and will not be: a points total, a level number, a streak, a league,
// a rank. A9.3 / R11a.9 forbid them, because reward-and-status mechanics are the part of
// gamification with the weakest effect on competence (E9). The recognition is the level,
// the sentence, and the evidence underneath it.
// ---------------------------------------------------------------------------------------------

export interface CompetenceObjectiveView {
  objectiveId: string;
  /** The curriculum's statement of the objective; the id when the pack has none. */
  statement: string;
  level: CompetenceLevel;
  /** The evidence that carried the objective to its level (A9.3 asks for the kind, not a count). */
  evidenceKind?: EvidenceKind;
  /** Step the evidence was produced in, for the reference the card has to carry (E10). */
  evidenceStepId?: string;
  evidenceStepTitle?: string;
  /** ISO date or timestamp of that evidence. */
  evidenceAt?: string;
  /**
   * A9.2: the highest level this course can produce for the objective on this
   * deployment. Below `demonstrated` it means the gap is in the course or the
   * installation, and the card must say so rather than leave a mark that never fills.
   */
  ceiling?: CompetenceLevel;
  /** The ceiling is lower only because no language model is configured. */
  limitedByLlm?: boolean;
  /** No later module asks about this objective again (K8). */
  noLaterRecall?: boolean;
  /** R11a.7c: the last module alone teaches it, so there is no later module - not a gap. */
  terminal?: boolean;
}

export interface CompetenceCardView {
  moduleId: string;
  moduleTitle: string;
  objectives: CompetenceObjectiveView[];
  /** A9.2: every objective at least "practised". */
  complete: boolean;
}

export interface CanDoCardView {
  moduleId: string;
  moduleTitle: string;
  /** The objectives that reached at least "practised", strongest first, at most three (A9.3: three sentences). */
  can: CompetenceObjectiveView[];
  /** What is not there yet - named, not hidden: a card that only praises is a sticker (E10). */
  open: CompetenceObjectiveView[];
}

/**
 * The sentence that tells "not reached" from "not reachable". Shown only where it
 * changes what the student should conclude - never on an objective that is already
 * at its ceiling for a reason the student can act on.
 */
function ceilingLine(o: CompetenceObjectiveView, lang: Lang): string {
  const s = ui(lang);
  const reached = o.level;
  if (o.limitedByLlm && o.ceiling && reached === o.ceiling) {
    return `<div class="competence-ceiling">${escapeHtml(s.ceilingLlm(s.competenceLevel[o.ceiling]))}</div>`;
  }
  if (o.noLaterRecall && reached === "practised") {
    // R11a.7c: the last module has no successor. Saying "the course never asks
    // again" there would report the shape of the course as somebody's failure.
    return `<div class="competence-ceiling">${escapeHtml(o.terminal ? s.ceilingTerminal : s.ceilingNoRecall)}</div>`;
  }
  return "";
}

/** One line of provenance: which kind of evidence, in which step, when. */
function evidenceLine(o: CompetenceObjectiveView, lang: Lang): string {
  const s = ui(lang);
  if (!o.evidenceKind) return escapeHtml(s.competenceNoEvidence);
  const where = o.evidenceStepTitle ?? o.evidenceStepId;
  const when = o.evidenceAt ? o.evidenceAt.slice(0, 10) : "";
  return [escapeHtml(s.evidenceLabel[o.evidenceKind]), where ? escapeHtml(s.evidenceIn(where)) : "", when ? `· ${escapeHtml(when)}` : ""]
    .filter(Boolean)
    .join(" ");
}

/**
 * A9.3: one card per module listing every objective with its level and the kind of
 * evidence that produced it. The evidence is the point - a level without the check it
 * came from is exactly the badge-without-proof that E10 rules out.
 */
export function renderCompetence(view: CompetenceCardView, lang: Lang): string {
  const s = ui(lang);
  const rows = view.objectives
    .map(
      (o) => `<li class="competence-item level-${o.level}">
      <div class="competence-row"><span class="competence-statement">${escapeHtml(o.statement)}</span>
        <span class="competence-level" title="${escapeHtml(s.competenceLevelWhy[o.level])}">${escapeHtml(s.competenceLevel[o.level])}</span></div>
      <div class="competence-evidence"${o.evidenceStepId ? ` data-step="${escapeHtml(o.evidenceStepId)}"` : ""}>${evidenceLine(o, lang)}</div>
      ${ceilingLine(o, lang)}
    </li>`,
    )
    .join("");
  const notPractised = view.objectives.filter((o) => o.level === "none" || o.level === "touched").length;
  return `<div class="card competence"><div class="card-head">${escapeHtml(s.competenceTitle)}</div>
    <div class="card-sub">${escapeHtml(s.competenceIntro(view.moduleTitle))}</div>
    <ul class="competence-list">${rows}</ul>
    <div class="card-sub">${escapeHtml(view.complete ? s.competenceComplete : s.competenceIncomplete(notPractised))}</div>
    <div class="competence-note">${escapeHtml(s.competenceNoPoints)}</div>
  </div>`;
}

/**
 * A9.3: the card at the end of a module. "You can now …" in the student's own
 * objectives, each with the evidence behind it. This is what replaces a score:
 * three sentences that are true because something was checked.
 */
export function renderCanDo(view: CanDoCardView, lang: Lang): string {
  const s = ui(lang);
  const can = view.can
    .map(
      (o) => `<li class="can-item level-${o.level}"><span class="can-statement">${escapeHtml(o.statement)}</span>
      <span class="competence-level">${escapeHtml(s.competenceLevel[o.level])}</span>
      <div class="competence-evidence"${o.evidenceStepId ? ` data-step="${escapeHtml(o.evidenceStepId)}"` : ""}>${evidenceLine(o, lang)}</div></li>`,
    )
    .join("");
  const open = view.open.length
    ? `<div class="can-open"><div class="card-sub">${escapeHtml(s.canDoOpen)}</div><ul class="can-open-list">${view.open
        .map((o) => `<li>${escapeHtml(o.statement)} – ${escapeHtml(s.competenceLevel[o.level])}${ceilingLine(o, lang)}</li>`)
        .join("")}</ul></div>`
    : "";
  return `<div class="card can-do"><div class="card-head">${escapeHtml(s.canDoTitle)}</div>
    <div class="card-sub">${escapeHtml(s.canDoIntro(view.moduleTitle))}</div>
    ${can ? `<ul class="can-list">${can}</ul>` : `<div class="card-sub">${escapeHtml(s.canDoNone)}</div>`}
    ${open}
    <div class="competence-note">${escapeHtml(s.canDoRecordHint)}</div>
  </div>`;
}
