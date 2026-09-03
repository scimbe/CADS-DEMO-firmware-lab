/**
 * TutorController – owns courses, session, panel, tree views, status bar, checks, the tutor
 * dialog and the proactive triggers. extension.ts only registers commands that call into it.
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as vscode from "vscode";
import { SERIAL_ERROR_PATTERNS, type BoardBridgeApi } from "./bridge";
import { actionLabels, actionsForCheck, allowedActions, BOARD_COMMANDS, courseCapabilities, isBoardAction, type ActionKind } from "./actions";
import { runCommand } from "./checks/commandRunner";
import { failedTestNames } from "./checks/testParsers";
import { DEFAULT_PREDICTION_MIN_CHARS, isLocalCheck, referencedFiles, runCheck, type CheckContext, type CheckResult } from "./checks/runner";
import { openEventStore, type OpenedEventStore } from "./events";
import { normalizeLang, ui } from "./i18n";
import { loadCourses, orderedSteps, resolveProjectRoot, type ExtensionCourseContribution } from "./loader";
import { createRenderer, type TutorLink } from "./markdown";
import { PANEL_VIEW_TYPE, StepPanel } from "./panel";
import { readLlmConfig, TutorPlatform, type AskOutcome } from "./platform";
import { ProgressTreeProvider } from "./progressView";
import {
  accumulateEdit,
  classifyQuestionText,
  emptyEditMetrics,
  excerptOutput,
  hasEdits,
  resolveStudentId,
  TelemetryClient,
  type EditMetrics,
  type TelemetryInput,
} from "./telemetry";
import {
  adjacentStep,
  defaultStart,
  ensureStepProgress,
  getStepProgress,
  getTaskState,
  isStepDone,
  newSession,
  nextOpenStep,
  readSession,
  recordTaskResult,
  sessionFilePath,
  setAnswer,
  setCurrentStep,
  setHintTier,
  setLanguage,
  stepStatus,
  writeSession,
} from "./session";
import { eventTrigger, hintTierForFailures, selectInsight, selectTaskHint, type MatchedInsight } from "./socratic";
import { TutorTerminal, type TerminalLike } from "./terminal";
import { CoursesTreeProvider, type TreeNode } from "./tree";
import { loc, stepKey, type Course, type Lang, type LoadDiagnostic, type SessionState, type Step, type StepContent, type TaskSpec, type TaskState, type TaskStatus } from "./types";
import { DebugStopTracker, ensureBridge, runShellTask, runTaskByLabel } from "./vscodeChecks";
import { renderPredict, renderRecall, renderReflection, type AskView, type FromWebview, type HintView, type LinkView, type NoteView, type PredictView, type RecallView, type ReflectionView, type StepRef, type StepView, type TaskView } from "./webview";

const SAVE_DEBOUNCE_MS = 2000;
const NOTIFY_MIN_INTERVAL_MS = 60_000;

export class TutorController implements vscode.Disposable {
  readonly output = vscode.window.createOutputChannel("CaDS Tutor");
  private readonly disposables: vscode.Disposable[] = [];
  private courses: Course[] = [];
  private diagnostics: LoadDiagnostic[] = [];
  private session: SessionState = newSession();
  private sessionFile: string | undefined;
  private readonly panel: StepPanel;
  readonly tree: CoursesTreeProvider;
  readonly progress: ProgressTreeProvider;
  private treeView: vscode.TreeView<TreeNode> | undefined;
  private readonly statusBar: vscode.StatusBarItem;
  private eventStore: OpenedEventStore | undefined;
  private telemetry: TelemetryClient | undefined;
  /** A5: typed vs pasted characters, aggregated per step and emitted on save. */
  private readonly editMetrics = new Map<string, EditMetrics>();
  private readonly platforms = new Map<string, TutorPlatform>();
  private readonly debugTracker = new DebugStopTracker();
  private bridge: BoardBridgeApi | undefined;
  private watchers: vscode.FileSystemWatcher[] = [];
  private saveTimer: NodeJS.Timeout | undefined;
  private lastNotifyAt = 0;
  private readonly running = new Set<string>();
  private pendingNote: NoteView | undefined;
  private reloadTimer: NodeJS.Timeout | undefined;
  private disposed = false;
  /** One terminal for the whole session, created lazily on the first Run in terminal. */
  private readonly terminal = new TutorTerminal({
    find: (name) => vscode.window.terminals.find((t) => t.name === name) as TerminalLike | undefined,
    create: (name) => vscode.window.createTerminal({ name, cwd: this.terminalCwd() }) as TerminalLike,
  });

  constructor(private readonly context: vscode.ExtensionContext) {
    this.panel = new StepPanel(context.extensionUri, () => this.courses.map((c) => vscode.Uri.file(c.dir)));
    this.tree = new CoursesTreeProvider({ courses: () => this.courses, session: () => this.session, lang: () => this.lang });
    this.progress = new ProgressTreeProvider({
      courses: () => this.courses,
      session: () => this.session,
      lang: () => this.lang,
      events: () => this.eventStore?.store,
      objectiveStatement: (courseId, objectiveId) => this.platforms.get(courseId)?.curriculum?.get(objectiveId)?.statement,
    });
    this.statusBar = vscode.window.createStatusBarItem("cadsTutor.status", vscode.StatusBarAlignment.Left, 50);
    this.statusBar.command = "cads.tutor.open";
    this.disposables.push(this.output, this.panel, this.statusBar, this.debugTracker);
    this.disposables.push(this.panel.onMessage((m) => void this.handleWebviewMessage(m)));
    // After a browser reload VS Code restores the panel; re-render the current step into it.
    this.disposables.push(
      vscode.window.registerWebviewPanelSerializer(PANEL_VIEW_TYPE, {
        deserializeWebviewPanel: async (panel) => {
          this.panel.adopt(panel);
          this.renderCurrent(false, true);
        },
      })
    );
  }

  // ------------------------------------------------------------------------------------------
  // Lifecycle
  // ------------------------------------------------------------------------------------------

  log(message: string): void {
    this.output.appendLine(`[${new Date().toISOString().slice(11, 19)}] ${message}`);
  }

  get workspaceRoot(): string | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  }

  get lang(): Lang {
    const setting = vscode.workspace.getConfiguration("cadsTutor").get<string>("language", "auto");
    return this.session.language ?? (setting !== "auto" ? normalizeLang(setting) : undefined) ?? normalizeLang(vscode.env.language) ?? "en";
  }

  async activate(): Promise<void> {
    this.loadSession();
    this.openEvents();
    this.reloadCourses(true);
    this.treeView = vscode.window.createTreeView("cadsTutor.courses", { treeDataProvider: this.tree, showCollapseAll: true });
    this.disposables.push(this.treeView, vscode.window.registerTreeDataProvider("cadsTutor.progress", this.progress));
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((e) => this.onDocumentChanged(e)),
      vscode.workspace.onDidSaveTextDocument((doc) => this.onSaved(doc)),
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("cadsTutor.extraCourseDirs")) this.reloadCourses();
        if (e.affectsConfiguration("cadsTutor.language")) this.renderCurrent(true);
      }),
      vscode.extensions.onDidChange(() => this.scheduleReload())
    );
    void this.connectBridge();
    this.updateStatusBar();
    await this.onboarding();
  }

  private loadSession(): void {
    const root = this.workspaceRoot;
    this.sessionFile = root ? sessionFilePath(root) : path.join(this.context.globalStorageUri.fsPath, "session.json");
    const existing = readSession(this.sessionFile);
    this.session = existing ?? newSession();
    if (!existing) this.log(`new session ${this.session.studentId} (${this.sessionFile})`);
    else this.log(`resumed session ${this.session.studentId}: ${this.session.courseId ?? "-"}/${this.session.stepId ?? "-"}`);
  }

  private saveSession(): void {
    if (!this.sessionFile) return;
    try {
      writeSession(this.sessionFile, this.session);
    } catch (err) {
      this.log(`cannot write session: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private openEvents(): void {
    const dir = path.join(os.homedir(), ".cads-tutor");
    this.eventStore = openEventStore(dir, (m) => this.log(m));
    this.log(`learning events: ${this.eventStore.backend} (${this.eventStore.file})`);
    // A5: the JSONL log is written whether or not a portal is configured, so a
    // course can be evaluated later even when telemetry was off during the run.
    this.telemetry = new TelemetryClient({
      dir,
      student: resolveStudentId(process.env, this.session.studentId),
      url: process.env.CADS_TUTOR_TELEMETRY_URL?.trim() || undefined,
      token: process.env.CADS_TUTOR_TELEMETRY_TOKEN?.trim() || undefined,
      log: (m) => this.log(m),
    });
    this.log(`telemetry: ${this.telemetry.enabled ? `${process.env.CADS_TUTOR_TELEMETRY_URL}/ingest` : "local only"}`);
    this.emit({ type: "session.start" });
  }

  /**
   * Records one telemetry event, filling in the current course/module/step.
   * Deliberately fire-and-forget: A5 requires that a portal outage never
   * disturbs the student, so no caller awaits delivery.
   */
  private emit(input: TelemetryInput): void {
    const cur = this.current;
    this.telemetry?.record({
      course: input.course ?? cur?.course.manifest.id,
      module: input.module ?? cur?.step.moduleId,
      step: input.step ?? cur?.step.id,
      ...input,
    });
  }

  private get hasSession(): boolean {
    return !!(this.session.courseId && this.session.stepId && Object.keys(this.session.steps).length > 0);
  }

  private async onboarding(): Promise<void> {
    const autoOpen = vscode.workspace.getConfiguration("cadsTutor").get<boolean>("autoOpen", true);
    if (this.courses.length === 0) {
      this.log("no courses – onboarding skipped");
      return;
    }
    if (!this.hasSession) {
      const start = defaultStart(this.courses);
      if (!start) return;
      setCurrentStep(this.session, start.course.manifest.id, start.step.id);
      this.saveSession();
      if (autoOpen) {
        await this.gotoStep(start.course.manifest.id, start.step.id, false);
        await this.revealInTree(start.course.manifest.id, start.step.id, true);
      }
    } else {
      // Returning student: status bar shows the step, the panel is not forced open.
      const course = this.courseById(this.session.courseId!);
      if (!course || !course.steps.get(this.session.stepId!)) {
        const start = defaultStart(this.courses);
        if (start) setCurrentStep(this.session, start.course.manifest.id, start.step.id);
        this.saveSession();
      }
    }
    this.updateStatusBar();
  }

  // ------------------------------------------------------------------------------------------
  // Courses
  // ------------------------------------------------------------------------------------------

  private extensionContributions(): ExtensionCourseContribution[] {
    const out: ExtensionCourseContribution[] = [];
    for (const ext of vscode.extensions.all) {
      const contrib = (ext.packageJSON as { contributes?: { cadsTutorCourses?: { path?: string }[] } }).contributes?.cadsTutorCourses;
      if (!Array.isArray(contrib) || contrib.length === 0) continue;
      const paths = contrib.map((c) => c?.path).filter((p): p is string => typeof p === "string" && p.length > 0);
      if (paths.length) out.push({ extensionId: ext.id, extensionPath: ext.extensionPath, paths });
    }
    return out;
  }

  private scheduleReload(): void {
    if (this.reloadTimer) clearTimeout(this.reloadTimer);
    this.reloadTimer = setTimeout(() => this.reloadCourses(), 500);
  }

  reloadCourses(initial = false): void {
    const extra = vscode.workspace.getConfiguration("cadsTutor").get<string[]>("extraCourseDirs", []);
    const result = loadCourses({ workspaceRoot: this.workspaceRoot, extensionContributions: this.extensionContributions(), extraDirs: extra });
    this.courses = result.courses;
    this.diagnostics = result.diagnostics;
    for (const d of result.diagnostics) this.log(`${d.level.toUpperCase()} ${d.file ? `${d.file}: ` : ""}${d.message}`);
    const errors = result.diagnostics.filter((d) => d.level === "error").length;
    this.log(`courses: ${result.courses.map((c) => c.manifest.id).join(", ") || "(none)"}; ${errors} error(s)`);
    this.platforms.clear();
    this.setupWatchers(result.watchedDirs);
    this.tree.refresh();
    this.progress.refresh();
    void vscode.commands.executeCommand("setContext", "cadsTutor.hasCourses", result.courses.length > 0);
    if (!initial) {
      const s = ui(this.lang);
      if (errors > 0) {
        void vscode.window.showWarningMessage(s.coursesReloaded(result.courses.length, errors), "Log").then((c) => c && this.output.show());
      } else {
        void vscode.window.setStatusBarMessage(s.coursesReloaded(result.courses.length, 0), 4000);
      }
      this.renderCurrent(true);
      this.updateStatusBar();
    }
  }

  private setupWatchers(dirs: string[]): void {
    for (const w of this.watchers) w.dispose();
    this.watchers = [];
    const seen = new Set<string>();
    for (const dir of dirs) {
      if (seen.has(dir)) continue;
      seen.add(dir);
      const w = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(vscode.Uri.file(dir), "**/*.{json,md}"));
      w.onDidChange(() => this.scheduleReload());
      w.onDidCreate(() => this.scheduleReload());
      w.onDidDelete(() => this.scheduleReload());
      this.watchers.push(w);
    }
    // Also watch for a course directory appearing in the workspace later.
    if (this.workspaceRoot) {
      const w = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(vscode.Uri.file(this.workspaceRoot), ".cads-tutor/courses/**"));
      w.onDidCreate(() => this.scheduleReload());
      w.onDidDelete(() => this.scheduleReload());
      this.watchers.push(w);
    }
  }

  courseById(id: string): Course | undefined {
    return this.courses.find((c) => c.manifest.id === id);
  }

  get current(): { course: Course; step: Step; content: StepContent } | undefined {
    if (!this.session.courseId || !this.session.stepId) return undefined;
    const course = this.courseById(this.session.courseId);
    const step = course?.steps.get(this.session.stepId);
    if (!course || !step) return undefined;
    return { course, step, content: this.contentFor(step) };
  }

  private contentFor(step: Step): StepContent {
    return (step.variants[this.lang] ?? step.variants.en)!;
  }

  private platformFor(course: Course): TutorPlatform {
    let p = this.platforms.get(course.manifest.id);
    if (!p) {
      const cfg = vscode.workspace.getConfiguration("cadsTutor");
      const llm = readLlmConfig(process.env, { baseUrl: cfg.get<string>("llm.baseUrl"), model: cfg.get<string>("llm.model") });
      p = new TutorPlatform({
        course,
        packsDir: path.join(this.context.extensionPath, "dist", "content-packs"),
        projectRoot: resolveProjectRoot(course, this.workspaceRoot),
        studentId: this.session.studentId,
        eventStore: this.eventStore?.store,
        memoryDir: path.join(os.homedir(), ".cads-tutor"),
        llm,
        // Read per call: the platform is cached per course, but the student can
        // switch language at any time and the next answer must follow.
        lang: () => this.lang,
        log: (m) => this.log(`[platform:${course.manifest.id}] ${m}`),
      });
      this.log(`[platform:${course.manifest.id}] LLM ${p.hasLlm ? `configured (${llm?.model})` : "not configured"}`);
      this.platforms.set(course.manifest.id, p);
    }
    return p;
  }

  // ------------------------------------------------------------------------------------------
  // Navigation & rendering
  // ------------------------------------------------------------------------------------------

  async open(): Promise<void> {
    const cur = this.current ?? (() => {
      const start = defaultStart(this.courses);
      return start ? { course: start.course, step: start.step } : undefined;
    })();
    if (!cur) {
      void vscode.window.showInformationMessage(ui(this.lang).noCourses, "Log").then((c) => c && this.output.show());
      return;
    }
    await this.gotoStep(cur.course.manifest.id, cur.step.id, false);
  }

  async gotoStep(courseId: string, stepId: string, preserveFocus = false): Promise<void> {
    const course = this.courseById(courseId);
    const step = course?.steps.get(stepId);
    if (!course || !step) {
      this.log(`gotoStep: unknown ${courseId}/${stepId}`);
      return;
    }
    if (step.placeholder) {
      // Listed in course.json, no file yet. Say so instead of opening an empty step.
      this.log(`gotoStep: "${stepId}" is a placeholder (no step file in the pack)`);
      void vscode.window.showInformationMessage(
        this.lang === "de"
          ? `Dieser Step ist noch nicht verfügbar: "${stepId}" ist im Kurs angekündigt, die Inhaltsdatei fehlt aber noch.`
          : `This step is not available yet: "${stepId}" is announced in the course, but its content file is still missing.`
      );
      return;
    }
    setCurrentStep(this.session, courseId, stepId);
    this.saveSession();
    this.emit({
      type: "step.open",
      course: courseId,
      module: step.moduleId,
      step: stepId,
      data: { bloom: step.variants.en!.meta.bloom, scaffold: step.variants.en!.meta.scaffold },
    });
    this.renderCurrent(false, preserveFocus);
    this.tree.refresh();
    this.updateStatusBar();
    await this.revealInTree(courseId, stepId, false);
    // Re-evaluate cheap local checks so the student sees the live status immediately.
    void this.runLocalChecks();
  }

  private async revealInTree(courseId: string, stepId: string, focus: boolean): Promise<void> {
    const node = this.tree.nodeFor(courseId, stepId);
    if (!node || !this.treeView) return;
    try {
      await this.treeView.reveal(node, { select: true, focus, expand: true });
    } catch {
      /* view not visible yet */
    }
  }

  async nextStep(): Promise<void> {
    const cur = this.current;
    if (!cur) return this.open();
    const next = adjacentStep(cur.course, cur.step.id, 1) ?? nextOpenStep(this.session, cur.course, this.courses);
    if (next) await this.gotoStep(cur.course.manifest.id, next.id);
  }

  async prevStep(): Promise<void> {
    const cur = this.current;
    if (!cur) return this.open();
    const prev = adjacentStep(cur.course, cur.step.id, -1);
    if (prev) await this.gotoStep(cur.course.manifest.id, prev.id);
  }

  /** Re-renders the panel if it is open (`force` also when a language/course change happened). */
  renderCurrent(force = false, preserveFocus = false): void {
    const cur = this.current;
    if (!cur) return;
    if (!this.panel.isOpen && force) return;
    this.panel.ensurePanel(preserveFocus);
    const view = this.buildView(cur.course, cur.step);
    this.panel.show(view, cur.course.dir, preserveFocus);
  }

  private buildView(course: Course, step: Step): StepView {
    const lang = this.lang;
    const content = this.contentFor(step);
    const meta = content.meta;
    const steps = orderedSteps(course);
    const index = steps.findIndex((s) => s.id === step.id);
    const progress = getStepProgress(this.session, course.manifest.id, step.id);
    const status = stepStatus(this.session, course, step, this.courses);
    const platform = this.platformFor(course);
    const render = createRenderer({ resolveAsset: (rel) => this.panel.assetUri(course.dir, path.dirname(content.file), rel) });
    const enMeta = step.variants.en!.meta;
    const tasks: TaskView[] = enMeta.tasks.map((t) => {
      const localizedTask = meta.tasks.find((x) => x.id === t.id) ?? t;
      const state = getTaskState(progress, t.id);
      const manual = t.check.type === "manual" || (t.check.type === "question" && !platform.hasLlm);
      const hint = state.status === "failed" && state.hintTier > 0 ? this.hintFor(content, t, state.failures, lang) : undefined;
      return {
        id: t.id,
        title: loc(localizedTask.title, lang),
        description: localizedTask.description ? loc(localizedTask.description, lang) : t.check.type === "question" ? loc(t.check.prompt, lang) : undefined,
        type: t.check.type,
        status: state.status,
        message: state.message,
        answer: state.answer,
        hint,
        needsAnswer: t.check.type === "question",
        manual,
        live: isLocalCheck(t.check),
        predict: t.check.type === "predict" ? this.predictView(t, state, lang) : undefined,
        actions: this.actionViews(course, t, lang),
      };
    });
    const ref = (s: Step | undefined): StepRef | undefined => (s ? { stepId: s.id, title: this.contentFor(s).meta.title } : undefined);
    const lockedBy: StepRef[] = status === "locked" ? enMeta.requires.map((r) => course.steps.get(r)).filter((s): s is Step => !!s && !isStepDone(this.session, s)).map((s) => ref(s)!) : [];
    const links: LinkView[] = meta.links.map((l) => {
      const link: TutorLink = "step" in l ? { kind: "step", stepId: l.step } : "file" in l ? { kind: "file", path: l.file, line: l.line } : "doc" in l ? { kind: "doc", path: l.doc } : { kind: "url", url: l.url };
      const label = l.title ? loc(l.title, lang) : "step" in l ? (course.steps.get(l.step) ? this.contentFor(course.steps.get(l.step)!).meta.title : l.step) : "file" in l ? `${l.file}${l.line ? `:${l.line}` : ""}` : "doc" in l ? l.doc : l.url;
      return { label, link };
    });
    const mod = course.manifest.modules.find((m) => m.id === step.moduleId);
    const note = this.pendingNote;
    this.pendingNote = undefined;
    return {
      lang,
      courseId: course.manifest.id,
      courseTitle: loc(course.manifest.title, lang),
      moduleTitle: mod ? loc(mod.title, lang) : step.moduleId,
      stepId: step.id,
      title: meta.title,
      index,
      total: steps.length,
      bloom: meta.bloom,
      estimatedMinutes: meta.estimatedMinutes,
      objectives: meta.objectives,
      creates: meta.creates,
      status,
      lockedBy,
      bodyHtml: render(content.body),
      links,
      tasks,
      prev: ref(adjacentStep(course, step.id, -1)),
      next: ref(adjacentStep(course, step.id, 1)),
      llmConfigured: platform.hasLlm,
      bridgeAvailable: !!this.bridge,
      note,
      scaffold: enMeta.scaffold,
      recall: this.recallView(course, step, lang),
      reflection: this.reflectionView(course, step, lang),
      orientation: this.orientationDue(course) ? { board: this.capabilitiesFor(course).has("board") } : undefined,
      hasBoard: this.capabilitiesFor(course).has("board"),
      nextAction: this.nextActionText(course, step, tasks, lang),
    };
  }

  private readonly capabilityCache = new Map<string, Set<"board">>();

  /** A4 correction: board actions only where the course actually uses hardware. */
  private capabilitiesFor(course: Course): Set<"board"> {
    let caps = this.capabilityCache.get(course.manifest.id);
    if (!caps) {
      caps = courseCapabilities(course);
      this.capabilityCache.set(course.manifest.id, caps);
      this.log(`[${course.manifest.id}] capabilities: ${[...caps].join(", ") || "none"}`);
    }
    return caps;
  }

  /** The buttons a task offers, after capability and bridge gating. */
  private actionViews(course: Course, task: TaskSpec, lang: Lang) {
    const cfg = vscode.workspace.getConfiguration("cadsTutor");
    const derived = actionsForCheck(task.check, { buildTaskLabel: cfg.get<string>("buildTaskLabel", "CaDS: Build") });
    const allowed = allowedActions(derived, {
      capabilities: this.capabilitiesFor(course),
      bridgeAvailable: !!this.bridge,
    });
    return allowed.map((a) => ({ kind: a.kind, arg: a.arg, ...actionLabels(a, lang) }));
  }

  /**
   * The single next thing to do, shown in the header and refreshed after every
   * check. A student who is lost needs one instruction, not a status report.
   */
  private nextActionText(course: Course, step: Step, tasks: TaskView[], lang: Lang): string | undefined {
    const s = ui(lang);
    const open = tasks.find((t) => t.status !== "passed");
    if (open) return s.nextTaskIs(open.title);
    const next = adjacentStep(course, step.id, 1);
    if (next) return s.nextStepIs(this.contentFor(next).meta.title);
    return s.allTasksDone;
  }

  /** Orientation is shown once, before the first step of a session that has no progress. */
  private orientationDue(course: Course): boolean {
    if (this.session.orientationSeen) return false;
    return Object.keys(this.session.steps).length === 0 && !!course;
  }

  /**
   * A1: the observed output is only put into the view once a prediction exists.
   * Withholding it here rather than hiding it in the page means it is never in
   * the DOM to be read.
   */
  private predictView(task: TaskSpec, state: TaskState, lang: Lang): PredictView | undefined {
    if (task.check.type !== "predict") return undefined;
    const ran = (state.prediction ?? "").trim().length > 0 && state.output !== undefined;
    return {
      prompt: loc(task.check.prompt, lang),
      prediction: state.prediction,
      actual: ran ? excerptOutput(state.output, 4000) : undefined,
      outcome: state.predictionOutcome,
      feedback: state.predictionFeedback,
      ran,
    };
  }

  /**
   * A2: one question task from a completed step named in `recallFrom`. Chosen
   * deterministically per step and day, so a reload shows the same card rather
   * than shuffling through the whole set.
   */
  private recallView(course: Course, step: Step, lang: Lang): RecallView | undefined {
    const meta = step.variants.en!.meta;
    if (meta.recallFrom.length === 0) return undefined;
    const key = stepKey(course.manifest.id, step.id);
    const today = new Date().toISOString().slice(0, 10);
    const existing = this.session.recall?.[key];
    if (existing && existing.date === today) {
      const from = course.steps.get(existing.fromStepId);
      const src = from ? this.contentFor(from) : undefined;
      const task = src?.meta.tasks.find((t) => t.id === existing.taskId);
      if (!src || !task || task.check.type !== "question") return undefined;
      return {
        fromStepId: existing.fromStepId,
        fromTitle: src.meta.title,
        taskId: existing.taskId,
        prompt: loc(task.check.prompt, lang),
        answer: existing.answer,
        settled: existing.answer !== undefined || existing.dismissed === true,
      };
    }
    // Only completed steps can be recalled: asking about material the student
    // has not worked through yet is a quiz, not a repetition.
    const candidates: { stepId: string; taskId: string }[] = [];
    for (const sid of meta.recallFrom) {
      const from = course.steps.get(sid);
      if (!from || !isStepDone(this.session, from)) continue;
      for (const t of from.variants.en!.meta.tasks) {
        if (t.check.type === "question") candidates.push({ stepId: sid, taskId: t.id });
      }
    }
    if (candidates.length === 0) return undefined;
    const pick = candidates[hashString(`${key}:${today}`) % candidates.length];
    this.session.recall = { ...(this.session.recall ?? {}), [key]: { date: today, fromStepId: pick.stepId, taskId: pick.taskId } };
    this.saveSession();
    const src = this.contentFor(course.steps.get(pick.stepId)!);
    const task = src.meta.tasks.find((t) => t.id === pick.taskId)!;
    return {
      fromStepId: pick.stepId,
      fromTitle: src.meta.title,
      taskId: pick.taskId,
      prompt: task.check.type === "question" ? loc(task.check.prompt, lang) : "",
      settled: false,
    };
  }

  /** A3: the module's reflection card, once its last step is done. */
  private reflectionView(course: Course, step: Step, lang: Lang): ReflectionView | undefined {
    const mod = course.manifest.modules.find((m) => m.id === step.moduleId);
    if (!mod?.reflection || mod.reflection.prompts.length === 0) return undefined;
    const lastStepId = mod.steps[mod.steps.length - 1];
    if (lastStepId !== step.id) return undefined;
    const moduleDone = mod.steps.every((sid) => {
      const st = course.steps.get(sid);
      return st ? isStepDone(this.session, st) : true;
    });
    if (!moduleDone) return undefined;
    const record = this.session.reflections?.[stepKey(course.manifest.id, mod.id)];
    return {
      moduleId: mod.id,
      moduleTitle: loc(mod.title, lang),
      prompts: mod.reflection.prompts.map((p) => loc(p, lang)),
      answers: record?.answers,
      saved: record !== undefined,
    };
  }

  private hintFor(content: StepContent, task: TaskSpec, failures: number, lang: Lang): HintView | undefined {
    const h = selectTaskHint(content.meta, task.id, task.check.type, "failed", failures, lang);
    if (h) return { tier: h.tier, question: h.question, hint: h.hint };
    return undefined;
  }

  updateStatusBar(): void {
    const s = ui(this.lang);
    const cur = this.current;
    if (cur) {
      const status = stepStatus(this.session, cur.course, cur.step, this.courses);
      this.statusBar.text = s.statusLabel(cur.content.meta.title) + (status === "done" ? " ✔" : "");
      this.statusBar.tooltip = `${s.statusTooltip}\n${loc(cur.course.manifest.title, this.lang)} · ${s.status[status]}`;
    } else {
      this.statusBar.text = s.statusNone;
      this.statusBar.tooltip = s.statusTooltip;
    }
    this.statusBar.show();
  }

  async setLang(lang: Lang): Promise<void> {
    setLanguage(this.session, lang);
    this.saveSession();
    this.renderCurrent(true);
    this.tree.refresh();
    this.progress.refresh();
    this.updateStatusBar();
  }

  async resetProgress(): Promise<void> {
    const s = ui(this.lang);
    const choice = await vscode.window.showWarningMessage(s.resetConfirm, { modal: true }, s.reset);
    if (choice !== s.reset) return;
    const fresh = newSession();
    fresh.studentId = this.session.studentId;
    fresh.language = this.session.language;
    this.session = fresh;
    const start = defaultStart(this.courses);
    if (start) setCurrentStep(this.session, start.course.manifest.id, start.step.id);
    this.saveSession();
    this.tree.refresh();
    this.progress.refresh();
    this.updateStatusBar();
    this.renderCurrent(true);
  }

  // ------------------------------------------------------------------------------------------
  // Webview messages
  // ------------------------------------------------------------------------------------------

  private async handleWebviewMessage(m: FromWebview): Promise<void> {
    try {
      switch (m.type) {
        case "ready":
          return;
        case "runCheck":
          await this.runTask(m.taskId);
          return;
        case "runAll":
          await this.runAllTasks();
          return;
        case "confirm":
          await this.confirmTask(m.taskId);
          return;
        case "answer":
          await this.answerTask(m.taskId, m.text);
          return;
        case "hint":
          await this.showHint(m.taskId);
          return;
        case "predict":
          await this.submitPrediction(m.taskId, m.text);
          return;
        case "recallAnswer":
          await this.answerRecall(m.text);
          return;
        case "recallSkip":
          await this.answerRecall(undefined);
          return;
        case "reflection":
          await this.saveReflection(m.answers);
          return;
        case "action":
          await this.runAction(m.taskId, m.kind, m.arg);
          return;
        case "dismissOrientation":
          this.dismissOrientation();
          return;
        case "ask":
          await this.ask(m.question);
          return;
        case "nav": {
          const cur = this.current;
          if (cur) await this.gotoStep(cur.course.manifest.id, m.stepId);
          return;
        }
        case "setLang":
          await this.setLang(m.lang);
          return;
        case "link":
          await this.openLink(m.link);
          return;
      }
    } catch (err) {
      this.log(`webview message ${m.type} failed: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
    }
  }

  private async openLink(link: TutorLink): Promise<void> {
    const cur = this.current;
    switch (link.kind) {
      case "step":
        if (cur) await this.gotoStep(cur.course.manifest.id, link.stepId);
        return;
      case "url":
        await vscode.env.openExternal(vscode.Uri.parse(link.url));
        return;
      case "file":
      case "doc": {
        const root = cur ? resolveProjectRoot(cur.course, this.workspaceRoot) : this.workspaceRoot;
        if (!root) return;
        const abs = path.resolve(root, link.path);
        if (!fs.existsSync(abs)) {
          void vscode.window.showWarningMessage(this.lang === "de" ? `Datei nicht gefunden: ${link.path}` : `File not found: ${link.path}`);
          return;
        }
        if (link.kind === "doc" && /\.md$/i.test(abs)) {
          await vscode.commands.executeCommand("markdown.showPreview", vscode.Uri.file(abs));
          return;
        }
        const doc = await vscode.workspace.openTextDocument(abs);
        const line = link.kind === "file" && link.line ? Math.max(0, link.line - 1) : 0;
        const range = new vscode.Range(line, 0, line, 0);
        await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.One, selection: range, preserveFocus: false });
        return;
      }
    }
  }

  // ------------------------------------------------------------------------------------------
  // Checks
  // ------------------------------------------------------------------------------------------

  private checkContext(course: Course, step: Step): CheckContext {
    const root = resolveProjectRoot(course, this.workspaceRoot) ?? this.workspaceRoot ?? process.cwd();
    const progress = ensureStepProgress(this.session, course.manifest.id, step.id);
    const platform = this.platformFor(course);
    const cfg = vscode.workspace.getConfiguration("cadsTutor");
    return {
      projectRoot: root,
      lang: this.lang,
      stepStartedAt: progress.startedAt ? Date.parse(progress.startedAt) : Date.now(),
      sessionStartedAt: Date.parse(this.session.startedAt),
      runTask: (label, timeout) => runTaskByLabel(label, timeout),
      runShell: (name, command, timeout) => runShellTask(name, command, root, timeout),
      bridge: this.bridge,
      debugStops: this.debugTracker.stops,
      waitForDebugStop: (match, timeout) => this.debugTracker.waitFor(match, timeout),
      gradeAnswer: (prompt, rubric, answer, bloom) => platform.gradeAnswer(prompt, rubric, answer, bloom),
      answerFor: (taskId) => getTaskState(progress, taskId).answer,
      manualConfirmed: (taskId) => getTaskState(progress, taskId).status === "passed" || this.confirmedNow.has(stepKey(course.manifest.id, step.id) + "/" + taskId),
      buildTaskLabel: cfg.get<string>("buildTaskLabel", "CaDS: Build"),
      env: process.env,
      runCommand: (command, cwd, timeoutMs) => runCommand({ command, root, cwd, timeoutMs, env: process.env }),
      predictionFor: (taskId) => getTaskState(progress, taskId).prediction,
    };
  }

  private readonly confirmedNow = new Set<string>();

  private findTask(step: Step, taskId: string): TaskSpec | undefined {
    return step.variants.en!.meta.tasks.find((t) => t.id === taskId);
  }

  async runTask(taskId: string, opts: { silent?: boolean } = {}): Promise<TaskStatus | undefined> {
    const cur = this.current;
    if (!cur) return undefined;
    const task = this.findTask(cur.step, taskId);
    if (!task) return undefined;
    if (stepStatus(this.session, cur.course, cur.step, this.courses) === "locked" && !opts.silent) {
      this.postTask(cur, task, "pending", ui(this.lang).locked);
      return "pending";
    }
    const key = `${stepKey(cur.course.manifest.id, cur.step.id)}/${taskId}`;
    if (this.running.has(key)) return undefined;
    this.running.add(key);
    try {
      const ctx = this.checkContext(cur.course, cur.step);
      const before = getTaskState(getStepProgress(this.session, cur.course.manifest.id, cur.step.id), taskId);
      const startedAt = Date.now();
      this.emit({ type: "check.run", data: { taskId, checkType: task.check.type, attempt: (before.attempts ?? 0) + 1 } });
      const result = await runCheck(task.check, taskId, ctx);
      this.confirmedNow.delete(key);
      const wasDone = stepStatus(this.session, cur.course, cur.step, this.courses) === "done";
      const rec = recordTaskResult(this.session, cur.course, cur.step, taskId, result.status, result.message, this.courses, new Date(), {
        output: result.output,
        tests: result.tests,
        prediction: result.prediction,
        predictionOutcome: result.predictionOutcome,
        predictionFeedback: result.predictionOutcome !== undefined ? result.detail : undefined,
      });
      this.saveSession();
      this.recordLearningEvent(cur.course, cur.step, task, result.status, rec.state.hintTier);
      this.emitCheckOutcome(task, rec.state, result, Date.now() - startedAt);
      this.log(`check ${cur.step.id}/${taskId} [${task.check.type}] → ${result.status}: ${result.message}`);

      let hint: HintView | undefined;
      if (result.status === "failed") {
        const reason = task.check.type === "question" && ctx.answerFor(taskId) ? "weak" : "failed";
        hint = await this.escalate(cur, task, rec.state.failures, result.message, opts.silent ?? false, reason, result);
      }
      this.postTask(cur, task, result.status, result.message, hint);
      this.postNextAction(cur);
      if (rec.stepCompleted || (!wasDone && stepStatus(this.session, cur.course, cur.step, this.courses) === "done")) {
        this.onStepCompleted(cur, rec.unlocked);
      }
      this.tree.refresh();
      this.progress.refresh();
      this.updateStatusBar();
      return result.status;
    } finally {
      this.running.delete(key);
    }
  }

  /**
   * Recomputes the one-line "what now" in the header. After a failed check this
   * is the difference between "Fehler" and knowing which task to return to.
   */
  private postNextAction(cur: { course: Course; step: Step; content: StepContent }): void {
    const view = this.panel.currentView;
    if (!view || view.stepId !== cur.step.id || view.courseId !== cur.course.manifest.id) return;
    const progress = getStepProgress(this.session, cur.course.manifest.id, cur.step.id);
    const tasks: TaskView[] = cur.step.variants.en!.meta.tasks.map((t) => {
      const localized = cur.content.meta.tasks.find((x) => x.id === t.id) ?? t;
      return { id: t.id, title: loc(localized.title, this.lang), type: t.check.type, status: getTaskState(progress, t.id).status } as TaskView;
    });
    const text = this.nextActionText(cur.course, cur.step, tasks, this.lang);
    this.panel.post({ type: "next", text: text ?? "" });
  }

  private postTask(cur: { course: Course; step: Step; content: StepContent }, task: TaskSpec, status: TaskStatus, message: string | undefined, hint?: HintView): void {
    const view = this.panel.currentView;
    if (!view || view.stepId !== cur.step.id || view.courseId !== cur.course.manifest.id) return;
    const localized = cur.content.meta.tasks.find((t) => t.id === task.id) ?? task;
    const platform = this.platformFor(cur.course);
    const state = getTaskState(getStepProgress(this.session, cur.course.manifest.id, cur.step.id), task.id);
    const predict = this.predictView(localized, state, this.lang);
    const taskView: TaskView = {
      id: task.id,
      title: loc(localized.title, this.lang),
      type: task.check.type,
      status,
      message,
      hint,
      needsAnswer: task.check.type === "question",
      manual: task.check.type === "manual" || (task.check.type === "question" && !platform.hasLlm),
      live: isLocalCheck(task.check),
      predict,
    };
    this.panel.post({
      type: "task",
      task: { ...taskView, predictHtml: predict ? renderPredict(taskView, this.lang) : undefined },
    });
  }

  private onStepCompleted(cur: { course: Course; step: Step; content: StepContent }, unlocked: Step[]): void {
    const progress = getStepProgress(this.session, cur.course.manifest.id, cur.step.id);
    const started = progress?.startedAt ? Date.parse(progress.startedAt) : undefined;
    const tasks = Object.values(progress?.tasks ?? {});
    this.emit({
      type: "step.done",
      course: cur.course.manifest.id,
      module: cur.step.moduleId,
      step: cur.step.id,
      data: {
        durationMs: started !== undefined ? Date.now() - started : undefined,
        bloom: cur.step.variants.en!.meta.bloom,
        // "First try" means every check passed on its first run with no hint shown.
        firstTry: tasks.every((t) => (t.attempts ?? 1) <= 1 && t.hintTier === 0),
        maxHintTier: tasks.reduce((m, t) => Math.max(m, t.hintTier), 0),
      },
    });
    const s = ui(this.lang);
    const refs: StepRef[] = unlocked.map((u) => ({ stepId: u.id, title: this.contentFor(u).meta.title }));
    this.panel.post({ type: "stepDone", unlocked: refs });
    const next = unlocked[0] ?? adjacentStep(cur.course, cur.step.id, 1);
    const msg = `${s.done} ${cur.content.meta.title}` + (refs.length ? ` – ${s.unlocked(refs.map((r) => r.title).join(", "))}` : "");
    if (next) {
      const nextTitle = this.contentFor(next).meta.title;
      void vscode.window.showInformationMessage(msg, `${s.next} ${nextTitle}`).then((choice) => {
        if (choice) void this.gotoStep(cur.course.manifest.id, next.id);
      });
    } else {
      void vscode.window.showInformationMessage(msg);
    }
  }

  async runAllTasks(): Promise<void> {
    const cur = this.current;
    if (!cur) return;
    this.panel.post({ type: "busy", busy: true });
    try {
      for (const t of cur.step.variants.en!.meta.tasks) {
        const state = getTaskState(getStepProgress(this.session, cur.course.manifest.id, cur.step.id), t.id);
        if (state.status === "passed" && t.check.type !== "fileMatches" && t.check.type !== "fileNotMatches") {
          this.postTask(cur, t, state.status, state.message);
          continue;
        }
        await this.runTask(t.id, { silent: true });
      }
    } finally {
      this.panel.post({ type: "busy", busy: false });
    }
  }

  /** Runs only the cheap file-based checks of the current step (on open and on save). */
  async runLocalChecks(): Promise<void> {
    const cur = this.current;
    if (!cur) return;
    if (stepStatus(this.session, cur.course, cur.step, this.courses) === "locked") return;
    for (const t of cur.step.variants.en!.meta.tasks) {
      if (isLocalCheck(t.check)) await this.runTask(t.id, { silent: true });
    }
  }

  async confirmTask(taskId: string): Promise<void> {
    const cur = this.current;
    if (!cur) return;
    this.confirmedNow.add(`${stepKey(cur.course.manifest.id, cur.step.id)}/${taskId}`);
    await this.runTask(taskId);
  }

  /**
   * A1: stores the prediction, then runs the check. The self-assessment buttons
   * (used when no LLM graded the comparison) come through the same channel with
   * a `__self:` marker and only record the outcome.
   */
  async submitPrediction(taskId: string, text: string): Promise<void> {
    const cur = this.current;
    if (!cur) return;
    const key = stepKey(cur.course.manifest.id, cur.step.id);
    const progress = ensureStepProgress(this.session, cur.course.manifest.id, cur.step.id);

    if (text === "__self:correct" || text === "__self:deviated") {
      const state = getTaskState(progress, taskId);
      state.predictionOutcome = text === "__self:correct" ? "correct" : "deviated";
      progress.tasks[taskId] = state;
      this.saveSession();
      this.emit({ type: "predict.compared", data: { taskId, verdict: state.predictionOutcome, graded: false } });
      this.repostTask(cur, taskId);
      return;
    }

    const prediction = text.trim();
    const state = getTaskState(progress, taskId);
    state.prediction = prediction;
    // A new prediction invalidates the previous comparison.
    delete state.predictionOutcome;
    delete state.predictionFeedback;
    progress.tasks[taskId] = state;
    this.saveSession();
    // The text is kept either way so the student does not lose it, but a
    // prediction too short for the check to run is not a prediction: recording
    // it would tell the portal a student predicted when they did not.
    const task = this.findTask(cur.step, taskId);
    const minChars = task?.check.type === "predict" ? (task.check.minChars ?? DEFAULT_PREDICTION_MIN_CHARS) : DEFAULT_PREDICTION_MIN_CHARS;
    if (prediction.length >= minChars) {
      this.emit({ type: "predict.made", data: { taskId, length: prediction.length } });
    }
    this.log(`prediction for ${key}/${taskId}: ${prediction.length} chars`);
    await this.runTask(taskId);
  }

  /** Re-sends one task to the panel without re-running its check. */
  private repostTask(cur: { course: Course; step: Step; content: StepContent }, taskId: string): void {
    const task = this.findTask(cur.step, taskId);
    if (!task) return;
    const state = getTaskState(getStepProgress(this.session, cur.course.manifest.id, cur.step.id), taskId);
    this.postTask(cur, task, state.status, state.message);
  }

  /**
   * A2: records the recall answer. Never blocking and never graded as a check -
   * it is a repetition prompt, so an empty answer simply dismisses the card.
   */
  /** Where a terminal opened from the panel should start. */
  private terminalCwd(): string | undefined {
    const cur = this.current;
    if (!cur) return this.workspaceRoot;
    return resolveProjectRoot(cur.course, this.workspaceRoot) ?? this.workspaceRoot;
  }

  /**
   * Performs what a task asks for. Everything goes through an existing VS Code or
   * bridge command, or the tutor's terminal; nothing here runs a shell directly,
   * so what happens is visible to the student and reproducible by hand.
   */
  async runAction(taskId: string, kind: ActionKind, arg?: string): Promise<void> {
    const cur = this.current;
    if (!cur) return;
    const task = this.findTask(cur.step, taskId);
    const s = ui(this.lang);

    if (isBoardAction(kind)) {
      // Belt and braces: the panel already hides these for language courses, but
      // a stale webview must not be able to flash a board from a Rust course.
      if (!this.capabilitiesFor(cur.course).has("board") || !this.bridge) {
        this.log(`action ${kind} refused: course has no board capability or the bridge is missing`);
        return;
      }
      const command = BOARD_COMMANDS[kind];
      if (command) await vscode.commands.executeCommand(command);
      return;
    }

    switch (kind) {
      case "runTask": {
        if (!arg) return;
        this.log(`action: run task "${arg}"`);
        this.panel.post({ type: "busy", busy: true });
        try {
          await runTaskByLabel(arg, 10 * 60 * 1000);
        } finally {
          this.panel.post({ type: "busy", busy: false });
        }
        // Re-check straight away so the student sees the effect of what they ran.
        if (task) await this.runTask(taskId, { silent: true });
        return;
      }
      case "runInTerminal": {
        if (!arg) return;
        const cwd = task && "cwd" in task.check ? (task.check as { cwd?: string }).cwd : undefined;
        this.log(`action: run in terminal "${arg}"${cwd ? ` (cwd ${cwd})` : ""}`);
        this.terminal.run(arg, cwd);
        return;
      }
      case "copyCommand": {
        if (!arg) return;
        await vscode.env.clipboard.writeText(arg);
        return;
      }
      case "openFile": {
        if (!arg) return;
        const root = resolveProjectRoot(cur.course, this.workspaceRoot) ?? this.workspaceRoot;
        if (!root) return;
        await this.openLink({ kind: "file", path: arg, line: this.lineForFile(task, arg) });
        return;
      }
      default:
        void vscode.window.showInformationMessage(s.howToTitle);
    }
  }

  /** A debugStop check names a line; a file check does not. */
  private lineForFile(task: TaskSpec | undefined, file: string): number | undefined {
    if (!task) return undefined;
    const find = (c: typeof task.check): number | undefined => {
      if (c.type === "debugStop" && c.file === file) return c.line;
      if (c.type === "all" || c.type === "any") {
        for (const sub of c.checks) {
          const l = find(sub);
          if (l !== undefined) return l;
        }
      }
      if (c.type === "predict") return find(c.then);
      return undefined;
    };
    return find(task.check);
  }

  /** The orientation card was dismissed; the command brings it back. */
  dismissOrientation(): void {
    this.session.orientationSeen = true;
    this.saveSession();
    this.log("orientation dismissed");
  }

  showOrientation(): void {
    this.session.orientationSeen = false;
    this.saveSession();
    this.renderCurrent(true);
  }

  async answerRecall(text: string | undefined): Promise<void> {
    const cur = this.current;
    if (!cur) return;
    const key = stepKey(cur.course.manifest.id, cur.step.id);
    const record = this.session.recall?.[key];
    if (!record) return;
    const answer = text?.trim();
    this.session.recall = {
      ...(this.session.recall ?? {}),
      [key]: { ...record, ...(answer ? { answer } : { dismissed: true }) },
    };
    this.saveSession();
    this.emit({
      type: "recall.answered",
      data: {
        fromStep: record.fromStepId,
        taskId: record.taskId,
        skipped: !answer,
        answer,
        // A2: recall exercises retrieval, so it is recorded at the lower Bloom levels.
        bloom: "remember",
      },
    });
    const view = this.recallView(cur.course, cur.step, this.lang);
    if (view) this.panel.post({ type: "recall", html: renderRecall(view, this.lang) });
  }

  /** A3: stores the module reflection and records it as a learning event. */
  async saveReflection(answers: string[]): Promise<void> {
    const cur = this.current;
    if (!cur) return;
    const view = this.reflectionView(cur.course, cur.step, this.lang);
    if (!view) return;
    const cleaned = answers.map((a) => a.trim());
    if (cleaned.every((a) => !a)) return;
    this.session.reflections = {
      ...(this.session.reflections ?? {}),
      [stepKey(cur.course.manifest.id, view.moduleId)]: { answers: cleaned, at: new Date().toISOString() },
    };
    this.saveSession();
    this.emit({
      type: "reflection.written",
      module: view.moduleId,
      data: { prompts: view.prompts.length, reflection: cleaned.join("\n---\n"), chars: cleaned.join("").length, bloom: "evaluate" },
    });
    this.log(`reflection for ${cur.course.manifest.id}/${view.moduleId} saved (${cleaned.length} answer(s))`);
    const refreshed = this.reflectionView(cur.course, cur.step, this.lang);
    if (refreshed) this.panel.post({ type: "reflection", html: renderReflection(refreshed, this.lang) });
    this.progress.refresh();
  }

  async answerTask(taskId: string, text: string): Promise<void> {
    const cur = this.current;
    if (!cur) return;
    setAnswer(this.session, cur.course.manifest.id, cur.step.id, taskId, text);
    this.saveSession();
    await this.runTask(taskId);
  }

  /** Socratic escalation after a failure: authored hint tier n, else LLM/generic. */
  private async escalate(cur: { course: Course; step: Step; content: StepContent }, task: TaskSpec, failures: number, message: string, silent: boolean, reason: "failed" | "stuck" | "weak" = "failed", result?: CheckResult): Promise<HintView | undefined> {
    const tier = hintTierForFailures(failures);
    setHintTier(this.session, cur.course.manifest.id, cur.step.id, task.id, tier);
    this.saveSession();
    // A2: a misconception or a named failing test explains THIS error, while
    // `task:<id>:failed` only knows the task broke, so the specific hint wins.
    const insight = selectInsight(cur.content.meta, {
      output: result?.output,
      failedTests: result?.tests ? failedTestNames(result.tests) : undefined,
      failures,
      lang: this.lang,
    });
    if (insight) {
      this.recordInsightEvent(cur, task, insight);
      return { tier: insight.tier, question: insight.question, hint: insight.hint };
    }
    const authored = selectTaskHint(cur.content.meta, task.id, task.check.type, reason, failures, this.lang);
    if (authored) return { tier: authored.tier, question: authored.question, hint: authored.hint };
    if (silent) return undefined;
    const s = ui(this.lang);
    const platform = this.platformFor(cur.course);
    const title = loc((cur.content.meta.tasks.find((t) => t.id === task.id) ?? task).title, this.lang);
    let text: string | undefined;
    if (platform.hasLlm) {
      try {
        text = await platform.genericHint(title, message, cur.content.meta.bloom, failures, this.lang, cur.content.meta.objectives);
      } catch (err) {
        this.log(`generic hint failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    return { tier, question: s.genericHint(tier), hint: text ?? "" };
  }

  async showHint(taskId: string): Promise<void> {
    const cur = this.current;
    if (!cur) return;
    const task = this.findTask(cur.step, taskId);
    if (!task) return;
    const state = getTaskState(getStepProgress(this.session, cur.course.manifest.id, cur.step.id), taskId);
    // Explicit hint requests escalate too (tier = requests so far + 1), and use the "stuck" trigger first
    // unless the task actually failed.
    const failures = Math.max(state.failures, state.hintTier + 1);
    const reason = state.status === "failed" ? (task.check.type === "question" ? "weak" : "failed") : "stuck";
    const hint = await this.escalate(cur, task, failures, state.message ?? "", false, reason);
    if (hint) this.postTask(cur, task, state.status, state.message, hint);
  }

  /** A5: check.pass / check.fail, plus the predict pair when the check was one. */
  private emitCheckOutcome(task: TaskSpec, state: TaskState, result: CheckResult, durationMs: number): void {
    if (result.status !== "passed" && result.status !== "failed") return;
    const failedTests = result.tests ? failedTestNames(result.tests) : [];
    this.emit({
      type: result.status === "passed" ? "check.pass" : "check.fail",
      data: {
        taskId: task.id,
        checkType: task.check.type,
        attempt: state.attempts ?? 1,
        hintTier: state.hintTier,
        durationMs,
        // Only an excerpt: the full output can be 64 KB and may hold anything
        // the student's code printed.
        outputExcerpt: result.status === "failed" ? excerptOutput(result.output) : undefined,
        failedTests: failedTests.length > 0 ? failedTests.slice(0, 10) : undefined,
      },
    });
    if (result.prediction !== undefined) {
      this.emit({
        type: "predict.compared",
        data: {
          taskId: task.id,
          bloom: task.check.type === "predict" ? (task.check.bloom ?? "evaluate") : undefined,
          verdict: result.predictionOutcome,
          graded: result.predictionOutcome !== undefined,
        },
      });
    }
  }

  /** A5: hint.shown, with the misconception or failing test that triggered it. */
  private recordInsightEvent(cur: { course: Course; step: Step }, task: TaskSpec, insight: MatchedInsight): void {
    this.emit({
      type: "hint.shown",
      course: cur.course.manifest.id,
      module: cur.step.moduleId,
      step: cur.step.id,
      data: { taskId: task.id, hintTier: insight.tier, source: insight.source, matched: insight.matched, outputExcerpt: insight.excerpt },
    });
  }

  private recordLearningEvent(course: Course, step: Step, task: TaskSpec, status: TaskStatus, hintTier: number): void {
    const store = this.eventStore?.store;
    if (!store) return;
    if (status !== "passed" && status !== "failed") return;
    const meta = step.variants.en!.meta;
    const platform = this.platformFor(course);
    const objectiveId = meta.objectives[0];
    try {
      store.record({
        entityId: this.session.studentId,
        sessionId: this.session.startedAt,
        track: platform.track,
        objectiveId,
        unitId: step.moduleId,
        bloomLevel: task.check.type === "question" && task.check.bloom ? task.check.bloom : meta.bloom,
        exchangeType: null,
        source: task.check.type === "question" ? "explicit_quiz" : task.check.type === "task" || task.check.type === "build" ? "task_run" : "tool_check",
        hintTierReached: hintTier,
        outcome: status === "passed" ? (hintTier > 0 ? "assisted_success" : "independent_success") : "failure",
        artifactRef: `${course.manifest.id}/${step.id}/${task.id}`,
      });
    } catch (err) {
      this.log(`learning event not recorded: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ------------------------------------------------------------------------------------------
  // Dialog
  // ------------------------------------------------------------------------------------------

  async ask(question?: string): Promise<void> {
    const cur = this.current;
    if (!cur) return this.open();
    const s = ui(this.lang);
    let q = question;
    if (!q) {
      q = await vscode.window.showInputBox({ prompt: s.ask, placeHolder: s.askPlaceholder });
      if (!q) return;
      this.renderCurrent(false, false);
    }
    const platform = this.platformFor(cur.course);
    const progress = getStepProgress(this.session, cur.course.manifest.id, cur.step.id);
    const attempts = Math.max(1, ...Object.values(progress?.tasks ?? {}).map((t) => t.failures));
    // A5 field finding: this is the ONLY place that emits question.asked. Rubric
    // strings, objective ids and save-triggered check-ins are not questions and
    // must never reach the question log, which is why they do not call emit here.
    this.emit({ type: "question.asked", data: { question: q, kind: classifyQuestionText(q), bloom: cur.content.meta.bloom, attempt: attempts } });
    const outcome = await platform.ask(q, this.lang, { bloomLevel: cur.content.meta.bloom, attemptNumber: attempts });
    this.emit({
      type: "question.answered",
      data: (() => {
        const citations = "citations" in outcome ? outcome.citations.length : 0;
        return { kind: outcome.kind, grounded: outcome.kind === "answer" && citations > 0, citations };
      })(),
    });
    this.log(`ask "${q.slice(0, 80)}" → ${outcome.kind}`);
    this.panel.post({ type: "ask", outcome: this.toAskView(outcome) });
  }

  private toAskView(outcome: AskOutcome): AskView {
    const s = ui(this.lang);
    switch (outcome.kind) {
      case "unconfigured":
        return { kind: "unconfigured", text: s.llmUnconfigured, citations: outcome.citations };
      case "refused":
        return { kind: "refused", text: `${s.refused}\n\n${outcome.reason}`, citations: [] };
      case "llm-error":
        return { kind: "llm-error", text: `${s.llmError} ${outcome.message}`, citations: outcome.citations };
      case "answer":
        return { kind: "answer", text: outcome.text, citations: outcome.citations, bloomLevel: outcome.bloomLevel, hintTier: outcome.hintTier, next: outcome.nextObjective };
    }
  }

  // ------------------------------------------------------------------------------------------
  // Proactive: save → checks + check-in; bridge events → contextual question
  // ------------------------------------------------------------------------------------------

  /**
   * A5: aggregates typed vs pasted characters per step. Runs on every keystroke,
   * so it does no more than add up lengths - anything heavier here would be felt
   * while typing.
   */
  private onDocumentChanged(e: vscode.TextDocumentChangeEvent): void {
    const cur = this.current;
    if (!cur || e.document.uri.scheme !== "file" || e.contentChanges.length === 0) return;
    const root = resolveProjectRoot(cur.course, this.workspaceRoot);
    if (!root) return;
    const rel = path.relative(root, e.document.uri.fsPath).replace(/\\/g, "/");
    if (rel.startsWith("..")) return; // outside the project: not the student's exercise
    const key = stepKey(cur.course.manifest.id, cur.step.id);
    const metrics = this.editMetrics.get(key) ?? emptyEditMetrics();
    for (const change of e.contentChanges) accumulateEdit(metrics, change.text.length);
    this.editMetrics.set(key, metrics);
  }

  /** Emits and clears the accumulated edit metrics (on save, on step change, on exit). */
  private flushEditMetrics(): void {
    for (const [key, metrics] of this.editMetrics) {
      if (!hasEdits(metrics)) continue;
      const [courseId, stepId] = key.split("/");
      this.emit({
        type: "edit.metrics",
        course: courseId,
        step: stepId,
        module: this.courseById(courseId)?.steps.get(stepId)?.moduleId,
        data: { ...metrics },
      });
    }
    this.editMetrics.clear();
  }

  private onSaved(doc: vscode.TextDocument): void {
    if (!vscode.workspace.getConfiguration("cadsTutor").get<boolean>("checkInOnSave", true)) return;
    const cur = this.current;
    if (!cur || doc.uri.scheme !== "file") return;
    const root = resolveProjectRoot(cur.course, this.workspaceRoot);
    if (!root) return;
    const rel = path.relative(root, doc.uri.fsPath).replace(/\\/g, "/");
    if (rel.startsWith("..")) return;
    const meta = cur.step.variants.en!.meta;
    const referenced = new Set<string>([...meta.tasks.flatMap((t) => referencedFiles(t.check)), ...meta.links.flatMap((l) => ("file" in l ? [l.file] : "doc" in l ? [l.doc] : []))]);
    const isReferenced = referenced.has(rel);
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => void this.afterSave(doc, rel, isReferenced), SAVE_DEBOUNCE_MS);
  }

  private async afterSave(doc: vscode.TextDocument, rel: string, isReferenced: boolean): Promise<void> {
    const cur = this.current;
    if (!cur) return;
    this.flushEditMetrics();
    await this.runLocalChecks();
    if (!isReferenced) return;
    const platform = this.platformFor(cur.course);
    const objectiveId = platform.knownObjective(cur.content.meta.objectives);
    if (!platform.hasLlm || !objectiveId) return;
    const outcome = await platform.checkIn(objectiveId, `// ${rel}\n${doc.getText()}`);
    if (!outcome || outcome.kind !== "answer") return;
    this.showNote({ title: ui(this.lang).checkInTitle, text: outcome.text, citations: outcome.citations });
  }

  /** Shows a tutor note in the panel; if the panel is hidden, a non-blocking notification offers to show it (rate-limited). */
  private showNote(note: NoteView): void {
    const s = ui(this.lang);
    if (this.panel.visible) {
      this.panel.post({ type: "note", note });
      return;
    }
    this.pendingNote = note;
    const now = Date.now();
    if (now - this.lastNotifyAt < NOTIFY_MIN_INTERVAL_MS) return;
    this.lastNotifyAt = now;
    void vscode.window.showInformationMessage(`${s.tutorNote}: ${note.text.slice(0, 120)}${note.text.length > 120 ? "…" : ""}`, s.show, s.later).then((choice) => {
      if (choice === s.show) {
        this.pendingNote = note;
        this.renderCurrent(false, false);
      }
    });
  }

  private async connectBridge(): Promise<void> {
    this.bridge = await ensureBridge();
    if (!this.bridge) {
      this.log("Board-Bridge not installed – board/flash/serial checks report 'unavailable'");
      return;
    }
    this.log("Board-Bridge connected");
    this.debugTracker.attachBridge(this.bridge);
    const s = () => ui(this.lang);
    try {
      this.disposables.push(
        this.bridge.onEvent((e) => {
          const cur = this.current;
          if (!cur) return;
          if (e.type === "flash-failed") this.contextualQuestion("flash-failed", s().eventFlashFailed);
          if (e.type === "debug-stop") {
            const d = (e.detail ?? {}) as { file?: string; line?: number };
            if (d.file) this.contextualQuestion("debug-stop", s().eventDebugStop(`${path.basename(d.file)}:${d.line ?? "?"}`));
          }
        }) as vscode.Disposable,
        this.bridge.onSerialLine((line) => {
          for (const p of SERIAL_ERROR_PATTERNS) {
            if (!p.re.test(line)) continue;
            const text = p.name === "hardfault" ? s().eventHardFault : p.name === "assert" ? s().eventAssert : s().eventResultFail;
            this.contextualQuestion(p.name, text);
            break;
          }
        }) as vscode.Disposable
      );
    } catch (err) {
      this.log(`bridge events unavailable: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private lastEventAt = new Map<string, number>();

  /** Socratic question after a board event: authored `event:<name>` entry of the step if present, else the generic one. */
  private contextualQuestion(name: string, generic: string): void {
    const cur = this.current;
    if (!cur) return;
    const now = Date.now();
    if (now - (this.lastEventAt.get(name) ?? 0) < 15_000) return;
    this.lastEventAt.set(name, now);
    const authored = cur.content.meta.socratic.find((x) => x.trigger === eventTrigger(name));
    const text = authored ? `${loc(authored.question, this.lang)}\n${loc(authored.hints[0], this.lang)}` : generic;
    this.log(`event ${name} → contextual question`);
    this.showNote({ title: ui(this.lang).tutorNote, text });
  }

  getDiagnostics(): LoadDiagnostic[] {
    return this.diagnostics;
  }

  dispose(): void {
    // VS Code disposes the controller through context.subscriptions AND
    // deactivate() calls it again, so without this guard every shutdown emitted
    // two session.end events and the portal saw twice as many sessions as ended.
    if (this.disposed) return;
    this.disposed = true;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    if (this.reloadTimer) clearTimeout(this.reloadTimer);
    this.flushEditMetrics();
    this.emit({ type: "session.end" });
    // Best effort: whatever does not make it stays in the on-disk queue and is
    // sent by the next session.
    void this.telemetry?.dispose();
    for (const w of this.watchers) w.dispose();
    for (const d of this.disposables) d.dispose();
    this.eventStore?.store.close();
  }
}

/**
 * Small stable hash, used only to pick a recall card deterministically for a
 * given step and day. Not a security primitive.
 */
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
