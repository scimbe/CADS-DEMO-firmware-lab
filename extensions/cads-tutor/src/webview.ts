/**
 * HTML for the step panel. Pure (no vscode import): takes a `StepView` model and returns the
 * document. Theme colors come from VS Code's CSS variables; scripts are nonce-gated (CSP).
 */
import { randomBytes } from "node:crypto";
import { ui } from "./i18n";
import { escapeHtml, tutorLinkAttrs, type TutorLink } from "./markdown";
import type { Citation } from "./platform";
import type { BloomLevel, CheckType, Lang, StepStatus, TaskStatus } from "./types";

export interface HintView {
  tier: number;
  question: string;
  hint: string;
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
  /** `question` tasks need a free-text answer before the check can run. */
  needsAnswer: boolean;
  /** `manual` tasks (and `question` tasks without LLM) are confirmed by the student. */
  manual: boolean;
  /** true when the task's check runs automatically on save (fileMatches & co.). */
  live: boolean;
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
  | { type: "hint"; taskId: string };

export function nonce(): string {
  return randomBytes(16).toString("hex");
}

const STATUS_ICON: Record<TaskStatus, string> = { pending: "○", running: "◌", passed: "✔", failed: "✘", unavailable: "–" };

function renderTask(t: TaskView, lang: Lang): string {
  const s = ui(lang);
  const canCheck = !t.manual || t.type === "question";
  const answerBox = t.needsAnswer
    ? `<textarea class="answer" data-task="${escapeHtml(t.id)}" placeholder="${escapeHtml(s.answerPlaceholder)}" rows="3">${escapeHtml(t.answer ?? "")}</textarea>
       <div class="row"><button class="btn primary submit-answer" data-task="${escapeHtml(t.id)}">${s.submitAnswer}</button></div>`
    : "";
  const buttons: string[] = [];
  if (canCheck && !t.needsAnswer) buttons.push(`<button class="btn primary run-check" data-task="${escapeHtml(t.id)}">${s.check}</button>`);
  if (t.manual) buttons.push(`<button class="btn confirm" data-task="${escapeHtml(t.id)}">${s.markDone}</button>`);
  buttons.push(`<button class="btn hint-btn" data-task="${escapeHtml(t.id)}">${s.showHint}</button>`);
  const hint = t.hint
    ? `<div class="hint"><div class="hint-tier">${escapeHtml(s.hintTier(t.hint.tier))}</div><div class="hint-q">${escapeHtml(t.hint.question)}</div><div class="hint-h">${escapeHtml(t.hint.hint)}</div></div>`
    : "";
  return `<li class="task status-${t.status}" data-task="${escapeHtml(t.id)}" data-type="${t.type}">
    <div class="task-head">
      <span class="task-icon" title="${escapeHtml(s.taskStatus[t.status])}">${STATUS_ICON[t.status]}</span>
      <span class="task-title">${escapeHtml(t.title)}</span>
      <span class="task-type">${t.type}${t.live ? " · live" : ""}</span>
    </div>
    ${t.description ? `<div class="task-desc">${escapeHtml(t.description)}</div>` : ""}
    ${answerBox}
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
    <button class="btn" id="lang-toggle" title="${escapeHtml(s.languageTitle)}">${s.language}</button>
  </div>
  <h1 id="step-title">${escapeHtml(view.title)}</h1>
  <div class="meta">
    <span class="meta-item bloom" title="${s.bloom}">${escapeHtml(s.bloom)}: ${escapeHtml(s.bloomLabel[view.bloom])}</span>
    ${view.estimatedMinutes ? `<span class="meta-item">${escapeHtml(s.minutes(view.estimatedMinutes))}</span>` : ""}
    ${objectives}
    ${creates}
    <span class="meta-item" id="step-status">${escapeHtml(s.status[view.status])}</span>
  </div>
  ${lockedBanner}
  ${doneBanner}
  <div id="note-area">${view.note ? renderNote(view.note, view.lang) : ""}</div>
  <div class="body">${view.bodyHtml}</div>
  ${links}
  <h2>${s.tasks}</h2>
  <ul class="tasks" id="tasks">${view.tasks.map((t) => renderTask(t, view.lang)).join("")}</ul>
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
    otherLang: view.lang === "de" ? "en" : "de",
    thinking: ui(view.lang).askThinking,
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
    else if (b.id === "run-all") { document.querySelectorAll("li.task").forEach((li) => setRunning(li.getAttribute("data-task"))); post({ type: "runAll" }); }
    else if (b.id === "lang-toggle") post({ type: "setLang", lang: S.otherLang });
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
