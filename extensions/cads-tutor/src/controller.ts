/**
 * TutorController – owns courses, session, panel, tree views, status bar, checks, the tutor
 * dialog and the proactive triggers. extension.ts only registers commands that call into it.
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as vscode from "vscode";
import { SERIAL_ERROR_PATTERNS, type BoardBridgeApi } from "./bridge";
import { isLocalCheck, referencedFiles, runCheck, type CheckContext } from "./checks/runner";
import { openEventStore, type OpenedEventStore } from "./events";
import { normalizeLang, ui } from "./i18n";
import { loadCourses, orderedSteps, resolveProjectRoot, type ExtensionCourseContribution } from "./loader";
import { createRenderer, type TutorLink } from "./markdown";
import { PANEL_VIEW_TYPE, StepPanel } from "./panel";
import { readLlmConfig, TutorPlatform, type AskOutcome } from "./platform";
import { ProgressTreeProvider } from "./progressView";
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
import { eventTrigger, hintTierForFailures, selectTaskHint } from "./socratic";
import { CoursesTreeProvider, type TreeNode } from "./tree";
import { loc, stepKey, type Course, type Lang, type LoadDiagnostic, type SessionState, type Step, type StepContent, type TaskSpec, type TaskStatus } from "./types";
import { DebugStopTracker, ensureBridge, runShellTask, runTaskByLabel } from "./vscodeChecks";
import type { AskView, FromWebview, HintView, LinkView, NoteView, StepRef, StepView, TaskView } from "./webview";

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
  private readonly platforms = new Map<string, TutorPlatform>();
  private readonly debugTracker = new DebugStopTracker();
  private bridge: BoardBridgeApi | undefined;
  private watchers: vscode.FileSystemWatcher[] = [];
  private saveTimer: NodeJS.Timeout | undefined;
  private lastNotifyAt = 0;
  private readonly running = new Set<string>();
  private pendingNote: NoteView | undefined;
  private reloadTimer: NodeJS.Timeout | undefined;

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
    setCurrentStep(this.session, courseId, stepId);
    this.saveSession();
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
      const result = await runCheck(task.check, taskId, ctx);
      this.confirmedNow.delete(key);
      const wasDone = stepStatus(this.session, cur.course, cur.step, this.courses) === "done";
      const rec = recordTaskResult(this.session, cur.course, cur.step, taskId, result.status, result.message, this.courses);
      this.saveSession();
      this.recordLearningEvent(cur.course, cur.step, task, result.status, rec.state.hintTier);
      this.log(`check ${cur.step.id}/${taskId} [${task.check.type}] → ${result.status}: ${result.message}`);

      let hint: HintView | undefined;
      if (result.status === "failed") {
        const reason = task.check.type === "question" && ctx.answerFor(taskId) ? "weak" : "failed";
        hint = await this.escalate(cur, task, rec.state.failures, result.message, opts.silent ?? false, reason);
      }
      this.postTask(cur, task, result.status, result.message, hint);
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

  private postTask(cur: { course: Course; step: Step; content: StepContent }, task: TaskSpec, status: TaskStatus, message: string | undefined, hint?: HintView): void {
    const view = this.panel.currentView;
    if (!view || view.stepId !== cur.step.id || view.courseId !== cur.course.manifest.id) return;
    const localized = cur.content.meta.tasks.find((t) => t.id === task.id) ?? task;
    const platform = this.platformFor(cur.course);
    this.panel.post({
      type: "task",
      task: {
        id: task.id,
        title: loc(localized.title, this.lang),
        type: task.check.type,
        status,
        message,
        hint,
        needsAnswer: task.check.type === "question",
        manual: task.check.type === "manual" || (task.check.type === "question" && !platform.hasLlm),
        live: isLocalCheck(task.check),
      },
    });
  }

  private onStepCompleted(cur: { course: Course; step: Step; content: StepContent }, unlocked: Step[]): void {
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

  async answerTask(taskId: string, text: string): Promise<void> {
    const cur = this.current;
    if (!cur) return;
    setAnswer(this.session, cur.course.manifest.id, cur.step.id, taskId, text);
    this.saveSession();
    await this.runTask(taskId);
  }

  /** Socratic escalation after a failure: authored hint tier n, else LLM/generic. */
  private async escalate(cur: { course: Course; step: Step; content: StepContent }, task: TaskSpec, failures: number, message: string, silent: boolean, reason: "failed" | "stuck" | "weak" = "failed"): Promise<HintView | undefined> {
    const tier = hintTierForFailures(failures);
    setHintTier(this.session, cur.course.manifest.id, cur.step.id, task.id, tier);
    this.saveSession();
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
    const outcome = await platform.ask(q, this.lang, { bloomLevel: cur.content.meta.bloom, attemptNumber: attempts });
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
    if (this.saveTimer) clearTimeout(this.saveTimer);
    if (this.reloadTimer) clearTimeout(this.reloadTimer);
    for (const w of this.watchers) w.dispose();
    for (const d of this.disposables) d.dispose();
    this.eventStore?.store.close();
  }
}

