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
import { isProceduralQuestion, proceduralAnswer, stepTerms } from "./askRouting";
import { runCommand } from "./checks/commandRunner";
import { failedTestNames } from "./checks/testParsers";
import { DEFAULT_PREDICTION_MIN_CHARS, isLocalCheck, referencedFiles, runCheck, type CheckContext, type CheckResult } from "./checks/runner";
import { openEventStore, type OpenedEventStore } from "./events";
import { normalizeLang, ui } from "./i18n";
import { coursesForFolders, loadCourses, orderedSteps, resolveProjectRoot, type ExtensionCourseContribution } from "./loader";
import { raceWithGiveUp } from "./llmClient";
import { createRenderer, type TutorLink } from "./markdown";
import { PANEL_VIEW_TYPE, StepPanel } from "./panel";
import { readLlmConfig, TutorPlatform, type AskOutcome } from "./platform";
import { ProgressTreeProvider } from "./progressView";
import { competenceRecordEntries, renderCompetenceRecordMarkdown, type RecordLookups } from "./record";
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
  atLeast,
  defaultStart,
  ensureStepProgress,
  getStepProgress,
  getTaskState,
  isModuleCompetenceComplete,
  isStepDone,
  moduleCompetence,
  moduleCompletedAt,
  objectiveCeiling,
  moduleReflectionDue,
  newSession,
  nextOpenStep,
  readSession,
  recallDrawPool,
  recordRecallEvidence,
  recordTaskResult,
  sessionFilePath,
  setAnswer,
  setCurrentStep,
  setHintTier,
  setLanguage,
  stepStatus,
  writeSession,
} from "./session";
import { eventTrigger, hintTierForFailures, selectCause, selectInsight, selectTaskHint, type MatchedInsight } from "./socratic";
import { TutorTerminal, type TerminalLike } from "./terminal";
import { CoursesTreeProvider, type TreeNode } from "./tree";
import { loc, recallPromptOf, stepKey, type Course, type Lang, type LoadDiagnostic, type ObjectiveCompetence, type SessionState, type Step, type StepContent, type TaskSpec, type TaskState, type TaskStatus } from "./types";
import { DebugStopTracker, ensureBridge, runShellTask, runTaskByLabel } from "./vscodeChecks";
import { renderCanDo, renderCompetence, renderDoCard, renderRecall, renderReflection, taskUpdateFields, type AskView, type CanDoCardView, type CompetenceCardView, type CompetenceObjectiveView, type FromWebview, type HintView, type NextActionView, type LinkView, type NoteView, type PredictView, type RecallView, type ReflectionView, type StepRef, type StepView, type TaskView } from "./webview";

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
      hasLlm: (courseId) => this.platforms.get(courseId)?.hasLlm ?? false,
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
        if (e.affectsConfiguration("cadsTutor.showAllCourses")) this.reloadCourses();
        if (e.affectsConfiguration("cadsTutor.language")) this.renderCurrent(true);
      }),
      vscode.extensions.onDidChange(() => this.scheduleReload()),
      // Adding or removing a folder changes which courses belong to this window.
      vscode.workspace.onDidChangeWorkspaceFolders(() => this.reloadCourses())
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
    this.diagnostics = result.diagnostics;
    for (const d of result.diagnostics) this.log(`${d.level.toUpperCase()} ${d.file ? `${d.file}: ` : ""}${d.message}`);
    const errors = result.diagnostics.filter((d) => d.level === "error").length;
    this.log(`courses loaded: ${result.courses.map((c) => c.manifest.id).join(", ") || "(none)"}; ${errors} error(s)`);

    // One link per track opens one workspace folder, and each link must show
    // only its own course. Filtering here rather than in the loader keeps the
    // diagnostics complete: everything that loaded is still reported.
    const showAll = vscode.workspace.getConfiguration("cadsTutor").get<boolean>("showAllCourses", false);
    const folders = (vscode.workspace.workspaceFolders ?? []).map((f) => f.uri.fsPath);
    if (showAll) {
      this.courses = result.courses;
      this.log("showAllCourses is on: every loaded course is shown");
    } else {
      const { visible, matched } = coursesForFolders(result.courses, folders);
      this.courses = visible;
      if (matched) {
        this.log(`courses shown for the opened folder(s) ${folders.join(", ")}: ${visible.map((c) => c.manifest.id).join(", ")}`);
      } else if (result.courses.length > 0) {
        // An arbitrary workspace folder must stay usable, and an empty tutor
        // would look broken, so fall back to showing everything.
        this.log(`no course's project.root matches the opened folder(s) ${folders.join(", ") || "(none)"} – showing all ${result.courses.length} course(s)`);
      }
    }
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
        // Only one grading call is realistically in flight at a time in one panel,
        // so a single mutable "which task is waiting" is enough to route this to
        // the right one, without threading a taskId through platform/runner.
        onLlmProgress: (info) => {
          if (this.waitingTaskId) this.panel.post({ type: "grading", taskId: this.waitingTaskId, state: "progress", ...info });
        },
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
    const render = createRenderer({
      resolveAsset: (rel) => this.panel.assetUri(course.dir, path.dirname(content.file), rel),
      renderDo: (block) => renderDoCard(block, lang),
    });
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
        // R11a.4 survives a reload: a task that was already failing when the
        // panel opened gets its cause line back from the stored output, rather
        // than showing only the tool's message the way it did before.
        cause: state.status === "failed" ? (selectCause(content.meta, state.output, lang) ?? ui(lang).checkFailedCause) : undefined,
        answer: state.answer,
        hint,
        needsAnswer: t.check.type === "question",
        manual,
        selfCheck: t.check.type === "question" && state.answer && state.answerGraded === false ? t.check.rubric : undefined,
        // R11a.8: the badge is the student's warning that this pass carries no
        // competence weight. It reads the stored flag, not today's settings.
        selfReported: state.selfReported,
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
      nextAction: this.nextActionView(course, step, tasks, lang),
      moduleProgress: this.moduleProgress(course, step),
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
   * A9.4.2: the single next thing to do, shown in the header and refreshed after
   * every check. A student who is lost needs one instruction, not a status
   * report - and this line carries the page's only primary button (R11a.5).
   */
  private nextActionView(course: Course, step: Step, tasks: TaskView[], lang: Lang): NextActionView {
    const s = ui(lang);
    const open = tasks.find((t) => t.status !== "passed");
    if (open) {
      // A question or a prediction has to be typed before anything can be
      // checked, so the button takes the student there rather than running a
      // check against an empty box.
      const needsInput = open.needsAnswer || !!open.predict;
      return {
        text: s.nextTaskIs(open.title),
        label: needsInput ? s.goToTask(open.title) : s.runThisTask(open.title),
        kind: "task",
        taskId: open.id,
        needsInput,
      };
    }
    const next = adjacentStep(course, step.id, 1);
    if (next) return { text: s.nextStepIs(this.contentFor(next).meta.title), label: s.goToNextStep, kind: "step", stepId: next.id };
    return { text: s.allTasksDone, kind: "none" };
  }

  /** A9.4.1: steps of this module already done, for the bar in the header. */
  private moduleProgress(course: Course, step: Step): { done: number; total: number } {
    const mod = course.manifest.modules.find((m) => m.id === step.moduleId);
    const ids = mod ? mod.steps : [step.id];
    let done = 0;
    for (const id of ids) {
      const s = course.steps.get(id);
      if (s && isStepDone(this.session, s)) done += 1;
    }
    return { done, total: ids.length };
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
      const view = this.recallCard(course, existing.fromStepId, existing.taskId, lang);
      if (!view) return undefined;
      return {
        ...view,
        answer: existing.answer,
        settled: existing.answer !== undefined || existing.dismissed === true,
        outcome: existing.outcome,
        feedback: existing.feedback,
      };
    }
    // Only completed steps can be recalled: asking about material the student
    // has not worked through yet is a quiz, not a repetition.
    const candidates: { stepId: string; taskId: string }[] = [];
    for (const sid of meta.recallFrom) {
      const from = course.steps.get(sid);
      if (!from || !isStepDone(this.session, from)) continue;
      // A9.2a: a task is a recall target only if it carries a `recallPrompt`.
      // The `prompt` of a question or a prediction is written for someone looking
      // at the file; two modules later it is a question without a subject.
      for (const t of from.variants.en!.meta.tasks) {
        if (recallPromptOf(t.check) !== undefined) candidates.push({ stepId: sid, taskId: t.id });
      }
    }
    if (candidates.length === 0) return undefined;
    // E7: prefer what has not stuck yet - see recallDrawPool for why, and why it
    // still varies rather than working through a list.
    const pool = recallDrawPool(this.session, course.manifest.id, candidates);
    const pick = pool[hashString(`${key}:${today}`) % pool.length];
    const view = this.recallCard(course, pick.stepId, pick.taskId, lang);
    if (!view) return undefined;
    this.session.recall = { ...(this.session.recall ?? {}), [key]: { date: today, fromStepId: pick.stepId, taskId: pick.taskId } };
    this.saveSession();
    return { ...view, settled: false };
  }

  /**
   * A9.2a: the card's own text. It names the step *and the module* it comes from -
   * a prediction from two modules ago has no code on screen any more, and "from an
   * earlier step" alone does not tell the student how far back to reach.
   */
  private recallCard(course: Course, fromStepId: string, taskId: string, lang: Lang): Omit<RecallView, "settled"> | undefined {
    const from = course.steps.get(fromStepId);
    if (!from) return undefined;
    const src = this.contentFor(from);
    const task = src.meta.tasks.find((t) => t.id === taskId);
    const en = from.variants.en?.meta.tasks.find((t) => t.id === taskId);
    // The prompt is taken from the localized variant, the eligibility from `en`:
    // a pack that forgot the German `recallPrompt` must not silently drop the card.
    const prompt = task ? recallPromptOf(task.check) : undefined;
    if (!en || recallPromptOf(en.check) === undefined) return undefined;
    const mod = course.manifest.modules.find((m) => m.id === from.moduleId);
    return {
      fromStepId,
      fromTitle: src.meta.title,
      fromModuleTitle: mod ? loc(mod.title, lang) : from.moduleId,
      taskId,
      prompt: loc(prompt ?? recallPromptOf(en.check), lang),
    };
  }

  /** A3: the module's reflection card, once its last step is done. */
  private reflectionView(course: Course, step: Step, lang: Lang): ReflectionView | undefined {
    const mod = moduleReflectionDue(this.session, course, step);
    if (!mod?.reflection) return undefined;
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

  /**
   * A9.3: writes the evidence sheet for the current course next to the session and
   * opens it. Per course, because a level is a claim about that course's objectives
   * and its checks; one file for everything would blur whose evidence it is.
   */
  async exportCompetenceRecord(): Promise<void> {
    const s = ui(this.lang);
    const cur = this.current;
    if (!cur) {
      void vscode.window.showInformationMessage(s.recordNoCourse);
      return;
    }
    const lookups: RecordLookups = {
      lang: this.lang,
      hasLlm: this.platformFor(cur.course).hasLlm,
      statementFor: (id) => this.platforms.get(cur.course.manifest.id)?.curriculum?.get(id)?.statement,
      stepTitleFor: (id) => {
        const step = cur.course.steps.get(id);
        return step ? this.contentFor(step).meta.title : undefined;
      },
    };
    const entries = competenceRecordEntries(cur.course, this.session, lookups);
    const markdown = renderCompetenceRecordMarkdown(cur.course, this.session, entries, lookups);
    // Next to the session file, which is where the evidence itself lives.
    const dir = this.sessionFile ? path.dirname(this.sessionFile) : this.context.globalStorageUri.fsPath;
    const file = path.join(dir, `${cur.course.manifest.id}-kompetenznachweis.md`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, markdown, "utf8");
    this.log(`competence record written: ${file} (${entries.length} objectives)`);
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
    await vscode.window.showTextDocument(doc, { preview: false });
    void vscode.window.showInformationMessage(s.recordWritten(file));
  }

  // ------------------------------------------------------------------------------------------
  // Webview messages
  // ------------------------------------------------------------------------------------------

  private async handleWebviewMessage(m: FromWebview): Promise<void> {
    try {
      switch (m.type) {
        case "ready": {
          // A9.4: a re-render rebuilds the page from the StepView, which does not
          // carry the module cards. Returning to a finished module's last step must
          // still show what it was worth - and "ready" is the first moment the page
          // is listening, so pushing it from renderCurrent would race the load.
          const cur = this.current;
          if (cur) this.postModuleCards(cur);
          return;
        }
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
        case "giveUp":
          this.giveUpOnGrading(m.taskId);
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
          await this.runAction(m.taskId, m.kind, m.arg, { cwd: m.cwd, line: m.line });
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

  private checkContext(course: Course, step: Step, taskId: string): CheckContext {
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
      gradeAnswer: (prompt, rubric, answer, bloom) => {
        this.waitingTaskId = taskId;
        this.panel.post({ type: "grading", taskId, state: "started" });
        return platform.gradeAnswer(prompt, rubric, answer, bloom).finally(() => {
          if (this.waitingTaskId === taskId) this.waitingTaskId = undefined;
          this.panel.post({ type: "grading", taskId, state: "done" });
        });
      },
      answerFor: (taskId) => getTaskState(progress, taskId).answer,
      manualConfirmed: (taskId) => getTaskState(progress, taskId).status === "passed" || this.confirmedNow.has(stepKey(course.manifest.id, step.id) + "/" + taskId),
      buildTaskLabel: cfg.get<string>("buildTaskLabel", "CaDS: Build"),
      env: process.env,
      runCommand: (command, cwd, timeoutMs) => runCommand({ command, root, cwd, timeoutMs, env: process.env }),
      predictionFor: (taskId) => getTaskState(progress, taskId).prediction,
    };
  }

  private readonly confirmedNow = new Set<string>();
  /** The task whose gradeAnswer call is in flight right now, if any - see platformFor's onLlmProgress. */
  private waitingTaskId: string | undefined;
  /** Resolvers for "don't wait - check it yourself", keyed like `running`/`confirmedNow`. */
  private readonly giveUpSignals = new Map<string, () => void>();

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
    let giveUpResolve: (() => void) | undefined;
    try {
      const ctx = this.checkContext(cur.course, cur.step, taskId);
      const before = getTaskState(getStepProgress(this.session, cur.course.manifest.id, cur.step.id), taskId);
      const startedAt = Date.now();
      this.emit({ type: "check.run", data: { taskId, checkType: task.check.type, attempt: (before.attempts ?? 0) + 1 } });
      const giveUp = new Promise<void>((resolve) => { giveUpResolve = resolve; });
      this.giveUpSignals.set(key, giveUpResolve!);
      // "Don't wait - check it yourself" only ever appears on the panel after a
      // "grading" message started the wait (see checkContext's gradeAnswer), so a
      // give-up signal on a fast local check (a command, a test suite) simply
      // never arrives - this race is a no-op cost for every check type but the
      // one it exists for.
      const result = await raceWithGiveUp(runCheck(task.check, taskId, ctx), giveUp, () => ({
        status: "pending" as const,
        message: ui(this.lang).gradingGivenUp,
        graded: false,
      }));
      this.confirmedNow.delete(key);
      const wasDone = stepStatus(this.session, cur.course, cur.step, this.courses) === "done";
      // A9.2: both flags decide whether this pass is evidence, and both are
      // properties of this run - whether a model was configured now, not whether
      // one is configured when the competence card is drawn. So they are stored.
      const verified = this.isVerifiedPass(task, result);
      const rec = recordTaskResult(this.session, cur.course, cur.step, taskId, result.status, result.message, this.courses, new Date(), {
        output: result.output,
        tests: result.tests,
        prediction: result.prediction,
        predictionOutcome: result.predictionOutcome,
        predictionFeedback: result.predictionOutcome !== undefined ? result.detail : undefined,
        selfReported: result.status === "passed" ? !verified : false,
        predictionGraded: task.check.type === "predict" ? result.predictionOutcome !== undefined : undefined,
        answerGraded: task.check.type === "question" ? result.graded : undefined,
      });
      this.saveSession();
      this.recordLearningEvent(cur.course, cur.step, task, result, rec.state.hintTier);
      this.emitCheckOutcome(task, rec.state, result, Date.now() - startedAt);
      this.log(`check ${cur.step.id}/${taskId} [${task.check.type}] → ${result.status}: ${result.message}`);

      let hint: HintView | undefined;
      let cause: string | undefined;
      if (result.status === "failed") {
        const reason = task.check.type === "question" && ctx.answerFor(taskId) ? "weak" : "failed";
        hint = await this.escalate(cur, task, rec.state.failures, result.message, opts.silent ?? false, reason, result);
        cause = this.causeFor(cur, result);
      }
      this.postTask(cur, task, result.status, result.message, hint, cause);
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
      if (this.giveUpSignals.get(key) === giveUpResolve) this.giveUpSignals.delete(key);
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
      return {
        id: t.id,
        title: loc(localized.title, this.lang),
        type: t.check.type,
        status: getTaskState(progress, t.id).status,
        needsAnswer: t.check.type === "question",
        predict: t.check.type === "predict" ? ({} as PredictView) : undefined,
      } as TaskView;
    });
    this.panel.post({
      type: "next",
      next: this.nextActionView(cur.course, cur.step, tasks, this.lang),
      moduleProgress: this.moduleProgress(cur.course, cur.step),
    });
  }

  /**
   * R11a.4: one sentence in the course's language naming the probable cause,
   * put in front of the tool's output. The authored misconception wins; when
   * nothing matches, a generic line at least tells the student where to look,
   * because a bare compiler message reliably sends beginners the wrong way.
   */
  private causeFor(cur: { content: StepContent }, result: CheckResult): string {
    return selectCause(cur.content.meta, result.output, this.lang) ?? ui(this.lang).checkFailedCause;
  }

  private postTask(cur: { course: Course; step: Step; content: StepContent }, task: TaskSpec, status: TaskStatus, message: string | undefined, hint?: HintView, cause?: string): void {
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
      cause,
      hint,
      needsAnswer: task.check.type === "question",
      manual: task.check.type === "manual" || (task.check.type === "question" && !platform.hasLlm),
      selfCheck: task.check.type === "question" && state.answer && state.answerGraded === false ? task.check.rubric : undefined,
      selfReported: getTaskState(getStepProgress(this.session, cur.course.manifest.id, cur.step.id), task.id).selfReported,
      live: isLocalCheck(task.check),
      predict,
    };
    this.panel.post({
      type: "task",
      // R11a.8b: taskUpdateFields is the one place that recomputes every field a
      // task's HTML can change to after it first rendered - see its own comment.
      task: { ...taskView, ...taskUpdateFields(taskView, this.lang) },
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
    // A3: the module's reflection card only becomes due with this very completion. The step was
    // rendered while the module was still open, so the card is missing from the page - push it now,
    // otherwise it is never seen: the student is invited to the next step right away.
    const reflection = this.reflectionView(cur.course, cur.step, this.lang);
    if (reflection && !reflection.saved) this.panel.post({ type: "reflection", html: renderReflection(reflection, this.lang) });
    // A9.4: … and the can-do card directly behind it. It appears even when the
    // module authored no reflection prompts, which is the case for every module
    // of the firmware course.
    this.postModuleCards(cur);
    const next = unlocked[0] ?? adjacentStep(cur.course, cur.step.id, 1);
    const msg = `${s.done} ${cur.content.meta.title}` + (refs.length ? ` – ${s.unlocked(refs.map((r) => r.title).join(", "))}` : "")
      + (reflection && !reflection.saved ? ` – ${s.reflectionDue}` : "");
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

  /** "Don't wait - check it yourself": resolves the give-up race in runTask, if one is in flight for this task. */
  private giveUpOnGrading(taskId: string): void {
    const cur = this.current;
    if (!cur) return;
    this.giveUpSignals.get(`${stepKey(cur.course.manifest.id, cur.step.id)}/${taskId}`)?.();
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
      // A9.2: the student's own verdict is self-assessment, not a graded comparison.
      delete state.predictionGraded;
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
    delete state.predictionGraded;
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
  async runAction(taskId: string | undefined, kind: ActionKind, arg?: string, from: { cwd?: string; line?: number } = {}): Promise<void> {
    const cur = this.current;
    if (!cur) return;
    // A `::: do` card names its own working directory and line and belongs to no
    // task, so `taskId` is absent there and `from` carries what the block said.
    const task = taskId ? this.findTask(cur.step, taskId) : undefined;
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
        if (task && taskId) await this.runTask(taskId, { silent: true });
        return;
      }
      case "runInTerminal": {
        if (!arg) return;
        const cwd = from.cwd ?? (task && "cwd" in task.check ? (task.check as { cwd?: string }).cwd : undefined);
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
        await this.openLink({ kind: "file", path: arg, line: from.line ?? this.lineForFile(task, arg) });
        return;
      }
      case "openPalette": {
        // A9.1: the palette opened with the entry already typed, ">" included.
        // Leaving that prefix off is the single most common way a student
        // concludes a command does not exist - the palette answers "no matching
        // results" because it is still searching file names.
        if (!arg) return;
        this.log(`action: open command palette at "${arg}"`);
        await vscode.commands.executeCommand("workbench.action.quickOpen", arg);
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
    // A9.2: a recall is the only evidence that a learning objective survived a
    // delay, and it is the difference between "geübt" and "nachgewiesen". So the
    // answer is graded against the original task's rubric - the same rubric that
    // judged it the first time. Without a model nothing is graded and the card
    // stays what it was: a repetition prompt that carries no weight (R11a.8).
    const graded = answer ? await this.gradeRecall(cur.course, record.fromStepId, record.taskId, answer) : undefined;
    this.session.recall = {
      ...(this.session.recall ?? {}),
      [key]: { ...record, ...(answer ? { answer, ...graded } : { dismissed: true }) },
    };
    // The card in `recall` is per step and per day and is replaced the next time
    // the step is opened; a graded verdict is evidence and must outlive that.
    if (graded?.outcome) {
      recordRecallEvidence(this.session, cur.course.manifest.id, {
        date: record.date,
        onStepId: cur.step.id,
        fromStepId: record.fromStepId,
        taskId: record.taskId,
        outcome: graded.outcome,
      });
    }
    this.saveSession();
    this.emit({
      type: "recall.answered",
      data: {
        fromStep: record.fromStepId,
        taskId: record.taskId,
        skipped: !answer,
        answer,
        verdict: graded?.outcome,
        graded: graded?.graded === true,
        // A2: recall exercises retrieval, so it is recorded at the lower Bloom levels.
        bloom: "remember",
      },
    });
    const view = this.recallView(cur.course, cur.step, this.lang);
    if (view) this.panel.post({ type: "recall", html: renderRecall(view, this.lang) });
  }

  // ------------------------------------------------------------------------------------------
  // A9.3: competence card and can-do card
  // ------------------------------------------------------------------------------------------

  /** One objective, as the cards show it: statement, level, and the evidence behind the level. */
  private competenceObjectiveView(course: Course, c: ObjectiveCompetence): CompetenceObjectiveView {
    const statement = this.platforms.get(course.manifest.id)?.curriculum?.get(c.objectiveId)?.statement;
    const step = c.leading ? course.steps.get(c.leading.stepId) : undefined;
    // A9.2: what this course can produce here at all. A mark that can never fill
    // has to say why, or the student reads the installation as their own failure.
    const ceiling = objectiveCeiling(course, c.objectiveId, this.platformFor(course).hasLlm);
    return {
      ceiling: ceiling.level,
      limitedByLlm: ceiling.limitedByLlm,
      noLaterRecall: ceiling.noLaterRecall,
      terminal: ceiling.terminal,
      objectiveId: c.objectiveId,
      // The id is a poor sentence, but a wrong sentence would be worse: packs
      // without a curriculum entry get the id and the teacher sees what is missing.
      statement: statement ?? c.objectiveId,
      level: c.level,
      evidenceKind: c.leading?.kind,
      evidenceStepId: c.leading?.stepId,
      evidenceStepTitle: step ? this.contentFor(step).meta.title : undefined,
      evidenceAt: c.leading?.at,
    };
  }

  private competenceCardView(course: Course, moduleId: string, lang: Lang): CompetenceCardView {
    const mod = course.manifest.modules.find((m) => m.id === moduleId);
    return {
      moduleId,
      moduleTitle: mod ? loc(mod.title, lang) : moduleId,
      objectives: moduleCompetence(course, this.session, moduleId).map((c) => this.competenceObjectiveView(course, c)),
      complete: isModuleCompetenceComplete(course, this.session, moduleId),
    };
  }

  /**
   * A9.3: "Du kannst jetzt …" - three sentences, the objectives that reached at
   * least "geübt", strongest first. What did not reach it is listed too: a card
   * that only praises is the sticker E10 rules out.
   */
  private canDoCardView(course: Course, moduleId: string, lang: Lang): CanDoCardView {
    const card = this.competenceCardView(course, moduleId, lang);
    const rank = { demonstrated: 0, practised: 1, touched: 2, none: 3 } as const;
    const can = card.objectives.filter((o) => atLeast(o.level, "practised")).sort((a, b) => rank[a.level] - rank[b.level]);
    return {
      moduleId,
      moduleTitle: card.moduleTitle,
      can: can.slice(0, 3),
      open: card.objectives.filter((o) => !atLeast(o.level, "practised")),
    };
  }

  /**
   * A9.4 step 5: the can-do card sits directly behind the module reflection, and
   * it is pushed for the same reason the reflection card is - the module becomes
   * complete at the moment the last check passes, long after the page was drawn.
   * The competence card follows it as the detail behind the three sentences.
   */
  private postModuleCards(cur: { course: Course; step: Step }): void {
    const mod = moduleCompletedAt(this.session, cur.course, cur.step);
    if (!mod) return;
    const html =
      renderCanDo(this.canDoCardView(cur.course, mod.id, this.lang), this.lang) +
      renderCompetence(this.competenceCardView(cur.course, mod.id, this.lang), this.lang);
    this.panel.post({ type: "competence", html });
  }

  /**
   * A9.2: judges a recall answer with the rubric of the question it repeats.
   * Returns nothing gradeable when the source task is not a rubric question or
   * when no language model answered - an ungraded recall is not evidence.
   */
  private async gradeRecall(
    course: Course,
    fromStepId: string,
    taskId: string,
    answer: string,
  ): Promise<{ outcome?: "passed" | "failed"; graded?: boolean; feedback?: string } | undefined> {
    const from = course.steps.get(fromStepId);
    const check = from?.variants.en?.meta.tasks.find((t) => t.id === taskId)?.check;
    if (!from || (check?.type !== "question" && check?.type !== "predict")) return undefined;
    // A9.2a: the answer is judged against the question that was actually asked -
    // the recall prompt - not against the original one, which assumed the file was
    // on screen. A `predict` without a rubric cannot be judged at all.
    const prompt = recallPromptOf(check);
    if (!check.rubric || prompt === undefined) return undefined;
    const verdict = await this.platformFor(course).gradeAnswer(loc(prompt, this.lang), check.rubric, answer, check.bloom);
    if (verdict.kind !== "pass" && verdict.kind !== "fail") return { feedback: verdict.feedback };
    return { outcome: verdict.kind === "pass" ? "passed" : "failed", graded: true, feedback: verdict.feedback };
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

  private recordLearningEvent(course: Course, step: Step, task: TaskSpec, result: CheckResult, hintTier: number): void {
    const store = this.eventStore?.store;
    if (!store) return;
    const status = result.status;
    if (status !== "passed" && status !== "failed") return;
    const meta = step.variants.en!.meta;
    const platform = this.platformFor(course);

    // A pass the student awarded themselves is not evidence of mastery. Without
    // a language model - or when one is configured but could not answer this
    // attempt (e.g. overloaded) - every `question` check falls back to manual
    // confirmation, and `manual` never had any verification to begin with;
    // recording either as independent success made the progress view - and the
    // teacher's portal - report mastery that nobody checked. Such a pass is
    // still visible as a telemetry event, it just carries no weight in the
    // mastery estimate.
    if (status === "passed" && !this.isVerifiedPass(task, result)) {
      this.log(`self-confirmed pass ${step.id}/${task.id} [${task.check.type}] recorded WITHOUT mastery weight (no automatic verification)`);
      this.emit({ type: "check.pass", data: { taskId: task.id, checkType: task.check.type, selfReported: true } });
      return;
    }

    // Every objective of the step, not only the first: a step that serves three
    // objectives was crediting one of them.
    const objectiveIds = meta.objectives.length > 0 ? meta.objectives : [undefined];
    for (const objectiveId of objectiveIds) {
      try {
        store.record({
          entityId: this.session.studentId,
          sessionId: this.session.startedAt,
          track: platform.track,
          objectiveId: objectiveId as string,
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
  }

  /**
   * Did anything other than the student decide this passed? `manual` is a
   * self-declaration by definition, and a `question` falls back to the same thing
   * whenever THIS attempt was not actually graded - whether no language model is
   * configured at all, or one is configured but could not judge this particular
   * answer (e.g. overloaded). Deliberately not "is a model configured": that would
   * silently credit a self-confirmed pass as verified the moment grading recovers.
   */
  private isVerifiedPass(task: TaskSpec, result: CheckResult): boolean {
    if (task.check.type === "manual") return false;
    if (task.check.type === "question") return result.graded === true;
    return true;
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

    // "How do I start?" has no indexable term in any language, so it used to be
    // refused - while the last hint tells the student to go and ask exactly
    // that. It is answered from session state, with no model and no retrieval,
    // which is what the students' own configuration has.
    if (isProceduralQuestion(q)) {
      const text = proceduralAnswer(this.proceduralContext(cur));
      this.log(`ask "${q.slice(0, 60)}" answered as a procedural question (no LLM, no retrieval)`);
      this.emit({ type: "question.answered", data: { kind: "procedural", grounded: false, citations: 0 } });
      this.panel.post({ type: "ask", outcome: { kind: "answer", text, citations: [] } });
      return;
    }

    const outcome = await platform.ask(q, this.lang, {
      bloomLevel: cur.content.meta.bloom,
      attemptNumber: attempts,
      // Used for RETRIEVAL only when the question does not ground on its own.
      stepTerms: stepTerms(cur.step.variants.en!.meta),
    });
    // A refusal is a dead end for the student. The procedural answer is
    // always true - it is read straight from session state, never from the
    // question - so it costs nothing to try it before giving up: refusal is
    // now the last resort, not the first thing an ungrounded question meets.
    if (outcome.kind === "refused") {
      const text = proceduralAnswer(this.proceduralContext(cur));
      this.log(`ask "${q.slice(0, 60)}" ungrounded, fell back to a procedural answer (no LLM, no retrieval)`);
      this.emit({ type: "question.answered", data: { kind: "procedural", grounded: false, citations: 0 } });
      this.panel.post({ type: "ask", outcome: { kind: "answer", text, citations: [] } });
      return;
    }
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

  /** What a procedural answer needs to know: where the student is and what is open. */
  private proceduralContext(cur: { course: Course; step: Step; content: StepContent }) {
    const s = ui(this.lang);
    const steps = orderedSteps(cur.course);
    const progress = getStepProgress(this.session, cur.course.manifest.id, cur.step.id);
    const open = cur.step.variants.en!.meta.tasks.find((t) => getTaskState(progress, t.id).status !== "passed");
    const localized = open ? cur.content.meta.tasks.find((t) => t.id === open.id) ?? open : undefined;
    const action = open ? this.actionViews(cur.course, open, this.lang)[0] : undefined;
    return {
      stepTitle: cur.content.meta.title,
      openTaskTitle: localized ? loc(localized.title, this.lang) : undefined,
      openTaskAction: action?.label,
      position: s.stepOf(steps.findIndex((x) => x.id === cur.step.id) + 1, steps.length),
      board: this.capabilitiesFor(cur.course).has("board"),
      lang: this.lang,
    };
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
