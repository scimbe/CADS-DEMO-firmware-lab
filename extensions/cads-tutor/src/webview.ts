/**
 * HTML for the step panel. Pure (no vscode import): takes a `StepView` model and returns the
 * document. Theme colors come from VS Code's CSS variables; scripts are nonce-gated (CSP).
 */
import { randomBytes } from "node:crypto";
import { ui } from "./i18n";
import { escapeHtml, tutorLinkAttrs, type TutorLink } from "./markdown";
import type { Citation } from "./platform";
import type { ActionKind } from "./actions";
import type { BloomLevel, CheckType, Lang, Scaffold, StepStatus, TaskStatus } from "./types";

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
  /** The single next thing to do, always visible in the header. */
  nextAction?: string;
}

export interface OrientationView {
  /** Board-specific lines are omitted entirely for language courses. */
  board: boolean;
}

export interface RecallView {
  fromStepId: string;
  fromTitle: string;
  taskId: string;
  prompt: string;
  answer?: string;
  /** True once answered or skipped; the card then shows only an acknowledgement. */
  settled: boolean;
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
  /** The one line in the header saying what to do next; recomputed after each check. */
  | { type: "next"; text: string }
  | { type: "ask"; outcome: AskView }
  | { type: "note"; note: NoteView }
  | { type: "stepDone"; unlocked: StepRef[] }
  | { type: "busy"; busy: boolean };

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
  | { type: "recallAnswer"; text: string }
  | { type: "recallSkip" }
  | { type: "reflection"; answers: string[] }
  | { type: "action"; taskId: string; kind: ActionKind; arg?: string; cwd?: string }
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
      <div class="row"><button class="btn primary submit-predict" data-task="${id}">${escapeHtml(s.predictSubmit)}</button></div>
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
    return `<div class="card recall settled"><div class="card-head">${escapeHtml(s.recallTitle)}</div><div>${escapeHtml(s.recallThanks)}</div></div>`;
  }
  return `<div class="card recall"><div class="card-head">${escapeHtml(s.recallTitle)}</div>
    <div class="card-sub">${escapeHtml(s.recallFrom(r.fromTitle))}</div>
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

function renderTask(t: TaskView, lang: Lang): string {
  const s = ui(lang);
  const canCheck = !t.manual || t.type === "question";
  const answerBox = t.needsAnswer
    ? `<textarea class="answer" data-task="${escapeHtml(t.id)}" placeholder="${escapeHtml(s.answerPlaceholder)}" rows="3">${escapeHtml(t.answer ?? "")}</textarea>
       <div class="row"><button class="btn primary submit-answer" data-task="${escapeHtml(t.id)}">${s.submitAnswer}</button></div>`
    : "";
  const buttons: string[] = [];
  // A predict task is run from its own "save prediction and run" button, so the
  // plain Check button would let the student skip the prediction.
  if (canCheck && !t.needsAnswer && !t.predict) buttons.push(`<button class="btn primary run-check" data-task="${escapeHtml(t.id)}">${s.check}</button>`);
  // A `question` without a model is confirmed only AFTER an answer exists, and
  // the button says what the student is actually attesting to. Offering it
  // beside "Submit answer" taught weaker students that it was the easier route.
  if (t.manual && t.type !== "question") buttons.push(`<button class="btn confirm" data-task="${escapeHtml(t.id)}">${s.markDone}</button>`);
  if (t.manual && t.type === "question" && t.selfCheck) buttons.push(`<button class="btn confirm" data-task="${escapeHtml(t.id)}">${s.selfCheckConfirm}</button>`);
  buttons.push(`<button class="btn hint-btn" data-task="${escapeHtml(t.id)}">${s.showHint}</button>`);
  const self = t.selfCheck
    ? `<div class="selfcheck"><div class="selfcheck-title">${escapeHtml(s.selfCheckTitle)}</div>
       <div class="selfcheck-intro">${escapeHtml(s.selfCheckIntro)}</div>
       <div class="selfcheck-rubric">${escapeHtml(t.selfCheck)}</div></div>`
    : "";
  const hint = t.hint
    ? `<div class="hint"><div class="hint-tier">${escapeHtml(s.hintTier(t.hint.tier))}</div><div class="hint-q">${escapeHtml(t.hint.question)}</div><div class="hint-h">${escapeHtml(t.hint.hint)}</div></div>`
    : "";
  return `<li class="task status-${t.status}" data-task="${escapeHtml(t.id)}" data-type="${t.type}">
    <div class="task-head">
      <span class="task-icon" title="${escapeHtml(s.taskStatus[t.status])}">${STATUS_ICON[t.status]}</span>
      <span class="task-title">${escapeHtml(t.title)}</span>
      <span class="task-type">${t.type}${t.live ? " · live" : ""}${t.selfReported && t.status === "passed" ? ` · ${escapeHtml(s.selfReportedBadge)}` : ""}</span>
    </div>
    ${t.description ? `<div class="task-desc">${escapeHtml(t.description)}</div>` : ""}
    ${renderPredict(t, lang)}
    ${renderActions(t, lang)}
    ${answerBox}
    ${self}
    <div class="task-msg">${t.message ? escapeHtml(t.message) : escapeHtml(s.taskStatus[t.status])}</div>
    <div class="row task-actions">${buttons.join(" ")}</div>
    <div class="task-hint">${hint}</div>
  </li>`;
}

function renderCitations(citations: Citation[], lang: Lang): string {
  if (citations.length === 0) return "";
  const s = ui(lang);
  return `<div class="citations"><div class="citations-title">${s.sources}</div><ol>${citations
    .map((c) => `<li><span class="cite-title">${escapeHtml(c.title)}</span> – ${escapeHtml(c.section)}${c.url && /^https?:/.test(c.url) ? ` <a href="${escapeHtml(c.url)}" data-tutor-link="url">↗</a>` : ""}<div class="cite-excerpt">${escapeHtml(c.excerpt)}…</div></li>`)
    .join("")}</ol></div>`;
}

export function renderNote(note: NoteView, lang: Lang): string {
  return `<div class="note${note.tier ? " note-hint" : ""}"><div class="note-title">${escapeHtml(note.title)}${note.tier ? ` · ${escapeHtml(ui(lang).hintTier(note.tier))}` : ""}</div><div class="note-text">${escapeHtml(note.text)}</div>${renderCitations(note.citations ?? [], lang)}</div>`;
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
  body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 0 1.2rem 2rem; line-height: 1.55; max-width: 62rem; margin: 0 auto; }
  a { color: var(--vscode-textLink-foreground); text-decoration: none; } a:hover { text-decoration: underline; }
  code { font-family: var(--vscode-editor-font-family); background: var(--vscode-textCodeBlock-background); padding: 0.1em 0.3em; border-radius: 3px; }
  pre { background: var(--vscode-textCodeBlock-background); padding: 0.8em; border-radius: 4px; overflow-x: auto; } pre code { background: none; padding: 0; }
  h1 { font-size: 1.5em; margin: 0.4em 0 0.2em; } h2 { font-size: 1.2em; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 0.2em; margin-top: 1.4em; }
  blockquote { border-left: 3px solid var(--vscode-textBlockQuote-border); background: var(--vscode-textBlockQuote-background); margin: 0.8em 0; padding: 0.4em 0.8em; }
  img { max-width: 100%; }
  table { border-collapse: collapse; } td, th { border: 1px solid var(--vscode-panel-border); padding: 0.2em 0.6em; }
  .topbar { position: sticky; top: 0; background: var(--vscode-editor-background); display: flex; align-items: center; gap: 0.6em; padding: 0.6em 0; border-bottom: 1px solid var(--vscode-panel-border); z-index: 2; flex-wrap: wrap; }
  .crumbs { opacity: 0.75; font-size: 0.9em; flex: 1; }
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
  .ask { border-top: 1px solid var(--vscode-panel-border); margin-top: 1.5em; padding-top: 0.8em; }
  .ask-row { display: flex; gap: 0.5em; } .ask-row input { flex: 1; }
  .answer-box { margin-top: 0.6em; padding: 0.6em 0.8em; border-radius: 4px; border: 1px solid var(--vscode-panel-border); white-space: pre-wrap; } .answer-box[hidden] { display: none; }
  /* Addendum v1.1: scaffold badge, predict panel, recall and reflection cards. */
  .selfcheck { margin-top: 0.6em; padding: 0.5em 0.7em; border-left: 3px solid var(--vscode-inputValidation-warningBorder, var(--vscode-panel-border)); background: var(--vscode-textBlockQuote-background); border-radius: 3px; }
  .selfcheck-title { font-weight: 600; }
  .selfcheck-intro { font-size: 0.92em; opacity: 0.85; margin: 0.2em 0 0.3em; }
  .selfcheck-rubric { font-family: var(--vscode-editor-font-family); }
  .actions { margin-top: 0.5em; }
  .action-manual { font-size: 0.88em; opacity: 0.75; margin-top: 0.25em; }
  .howto { margin: 0.9em 0; border: 1px solid var(--vscode-panel-border); border-radius: 4px; padding: 0.4em 0.7em; }
  .howto > summary { cursor: pointer; font-weight: 600; }
  .howto-body ol { margin: 0.4em 0 0.2em 1.2em; padding: 0; }
  .howto-body li { margin: 0.3em 0; }
  .card.orientation ul { margin: 0.3em 0 0.5em 1.2em; padding: 0; }
  .card.orientation li { margin: 0.25em 0; }
  .next-line { margin: 0.3em 0 0.6em; font-weight: 600; color: var(--vscode-textLink-foreground); }
  .next-line:empty { display: none; }
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
  <div class="topbar">
    <span class="crumbs">${escapeHtml(view.courseTitle)} › ${escapeHtml(view.moduleTitle)} › ${escapeHtml(s.stepOf(view.index + 1, view.total))}</span>
    <button class="btn" id="run-all" ${locked ? "disabled" : ""}>${s.checkAll}</button>
    ${renderLanguageChoice(view.lang)}
  </div>
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
  <div class="next-line" id="next-line">${view.nextAction ? escapeHtml(view.nextAction) : ""}</div>
  <div id="orientation-area">${view.orientation ? renderOrientation(view.orientation, view.lang) : ""}</div>
  <div id="note-area">${view.note ? renderNote(view.note, view.lang) : ""}</div>
  <div id="recall-area">${view.recall ? renderRecall(view.recall, view.lang) : ""}</div>
  <div class="scaffold-note">${escapeHtml(s.scaffoldHint[view.scaffold])}</div>
  <div class="body">${view.bodyHtml}</div>
  ${links}
  <h2>${s.tasks}</h2>
  <ul class="tasks" id="tasks">${view.tasks.map((t) => renderTask(t, view.lang)).join("")}</ul>
  ${renderHowTo(view.lang)}
  <div id="reflection-area">${view.reflection ? renderReflection(view.reflection, view.lang) : ""}</div>
  <div class="ask">
    <h2 style="border:none;margin-top:0">${s.ask}</h2>
    <div class="ask-row"><input id="question" type="text" maxlength="800" placeholder="${escapeHtml(s.askPlaceholder)}" /><button class="btn primary" id="ask-btn">${s.askButton}</button></div>
    <div class="meta" style="margin-top:0.3em"><span class="meta-item bloom">${escapeHtml(s.bloom)}: ${escapeHtml(s.bloomLabel[view.bloom])}</span>${view.llmConfigured ? "" : `<span class="meta-item" id="llm-state">${escapeHtml(s.llmUnconfigured)}</span>`}</div>
    <div id="answer" class="answer-box" hidden></div>
  </div>
  <div class="nav">
    <button class="btn" id="prev" ${view.prev ? `data-step="${escapeHtml(view.prev.stepId)}"` : "disabled"}>${s.prev}${view.prev ? `: ${escapeHtml(view.prev.title)}` : ""}</button>
    <button class="btn primary" id="next" ${view.next ? `data-step="${escapeHtml(view.next.stepId)}"` : "disabled"}>${s.next}${view.next ? `: ${escapeHtml(view.next.title)}` : ""}</button>
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
    hintTier: ui(view.lang).hintTier(0).replace("0", "{n}"),
    unlocked: ui(view.lang).unlocked("{t}"),
    done: ui(view.lang).done,
    icons: STATUS_ICON,
    statusText: ui(view.lang).taskStatus,
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
      post({ type: "action", taskId, kind, arg: b.getAttribute("data-arg") || undefined });
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

  function setRunning(taskId) {
    const li = document.querySelector('li.task[data-task="' + CSS.escape(taskId) + '"]');
    if (!li) return;
    li.className = "task status-running";
    li.querySelector(".task-icon").textContent = S.icons.running;
    li.querySelector(".task-msg").textContent = S.running;
  }

  function renderCitations(cs) {
    if (!cs || !cs.length) return "";
    return '<div class="citations"><div class="citations-title">' + esc(S.sources) + '</div><ol>' + cs.map((c) =>
      '<li><span class="cite-title">' + esc(c.title) + '</span> – ' + esc(c.section) + (c.url && /^https?:/.test(c.url) ? ' <a href="' + esc(c.url) + '" data-tutor-link="url">↗</a>' : '') + '<div class="cite-excerpt">' + esc(c.excerpt) + '…</div></li>').join("") + '</ol></div>';
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
      const actions = li.querySelector(".task-actions");
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
      if (line) line.textContent = m.text || "";
    } else if (m.type === "recall") {
      document.getElementById("recall-area").innerHTML = m.html;
    } else if (m.type === "reflection") {
      const area = document.getElementById("reflection-area");
      area.innerHTML = m.html;
      area.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
    }
  });
  post({ type: "ready" });
})();`;
}
