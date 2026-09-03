/**
 * Turns a task's check into the action that actually performs it.
 *
 * A student who has never used this kind of IDE cannot follow a tutorial that
 * says "run the build task" without knowing where tasks live. Every task
 * therefore offers a button that does the thing, next to a one-line note saying
 * which manual route it corresponds to, so the click teaches the route instead
 * of replacing it.
 *
 * Pure module: it decides WHAT to offer, the controller performs it. Everything
 * runs through existing VS Code or bridge commands; nothing here shells out.
 */
import type { CheckSpec, Course, Lang } from "./types";

export type ActionKind =
  | "runTask"
  | "runInTerminal"
  | "copyCommand"
  | "openFile"
  | "boardConnect"
  | "boardFlash"
  | "boardConsole"
  | "debugStart";

export interface TaskAction {
  kind: ActionKind;
  /** Task label, shell command, or project-relative file path, by kind. */
  arg?: string;
  /** For openFile, when the check names a line. */
  line?: number;
  /** Working directory for runInTerminal, relative to the project root. */
  cwd?: string;
}

/**
 * Course capabilities. Only hardware courses may show board actions; the Rust
 * and JavaScript tracks must never mention flashing or a debugger.
 */
export type Capability = "board";

const BOARD_CHECK_TYPES = new Set(["board", "flash", "serialExpect", "debugStop"]);
const BOARD_ACTIONS = new Set<ActionKind>(["boardConnect", "boardFlash", "boardConsole", "debugStart"]);

export function isBoardAction(kind: ActionKind): boolean {
  return BOARD_ACTIONS.has(kind);
}

/** Every check type in a spec tree, looking through all/any and predict.then. */
function checkTypes(spec: CheckSpec, into = new Set<string>()): Set<string> {
  into.add(spec.type);
  if (spec.type === "all" || spec.type === "any") for (const c of spec.checks) checkTypes(c, into);
  if (spec.type === "predict") checkTypes(spec.then, into);
  return into;
}

/**
 * What a course is allowed to offer. An explicit `capabilities` in course.json
 * wins; otherwise it is derived from the check types the pack actually uses, so
 * an existing firmware pack keeps its board actions without being edited and a
 * language track never gains them by accident.
 */
export function courseCapabilities(course: Course): Set<Capability> {
  const declared = course.manifest.capabilities;
  if (declared !== undefined) return new Set(declared);
  const used = new Set<string>();
  for (const step of course.steps.values()) {
    for (const task of step.variants.en?.meta.tasks ?? []) checkTypes(task.check, used);
  }
  const caps = new Set<Capability>();
  for (const t of used) if (BOARD_CHECK_TYPES.has(t)) caps.add("board");
  return caps;
}

/**
 * The actions a check offers, most useful first. A composite offers the actions
 * of its parts; `predict` offers those of the check it observes, since that is
 * what the student runs.
 */
export function actionsForCheck(spec: CheckSpec, opts: { buildTaskLabel: string }): TaskAction[] {
  const out: TaskAction[] = [];
  const push = (a: TaskAction) => {
    if (!out.some((x) => x.kind === a.kind && x.arg === a.arg)) out.push(a);
  };

  switch (spec.type) {
    case "task":
      push({ kind: "runTask", arg: spec.label });
      break;
    case "build":
      // A preset build has no task label to run, so it goes to the terminal as
      // the exact command the student would type.
      if (spec.label) push({ kind: "runTask", arg: spec.label });
      else if (spec.preset) {
        const cmd = `cmake --preset ${spec.preset} && cmake --build --preset ${spec.preset}`;
        push({ kind: "runInTerminal", arg: cmd });
        push({ kind: "copyCommand", arg: cmd });
      } else push({ kind: "runTask", arg: opts.buildTaskLabel });
      break;
    case "command":
      push({ kind: "runInTerminal", arg: spec.command, cwd: spec.cwd });
      push({ kind: "copyCommand", arg: spec.command });
      break;
    case "testSuite": {
      const cmd = suiteCommand(spec);
      if (cmd) {
        push({ kind: "runInTerminal", arg: cmd, cwd: spec.cwd });
        push({ kind: "copyCommand", arg: cmd });
      }
      break;
    }
    case "fileMatches":
    case "fileNotMatches":
      push({ kind: "openFile", arg: spec.file });
      break;
    case "symbolInElf":
      // The ELF is a build artefact; opening it would show bytes. The build is
      // the useful action here.
      push({ kind: "runTask", arg: opts.buildTaskLabel });
      break;
    case "board":
      push({ kind: "boardConnect" });
      break;
    case "flash":
      push({ kind: "boardFlash" });
      break;
    case "serialExpect":
      push({ kind: "boardConsole" });
      break;
    case "debugStop":
      push({ kind: "debugStart" });
      if (spec.file) push({ kind: "openFile", arg: spec.file, line: spec.line });
      break;
    case "predict":
      for (const a of actionsForCheck(spec.then, opts)) push(a);
      break;
    case "all":
    case "any":
      for (const c of spec.checks) for (const a of actionsForCheck(c, opts)) push(a);
      break;
    case "question":
    case "manual":
      break;
  }
  return out;
}

/** The command a testSuite runs; mirrors defaultSuiteCommand in checks/testParsers.ts. */
function suiteCommand(spec: Extract<CheckSpec, { type: "testSuite" }>): string | undefined {
  if (spec.command) return spec.command;
  if (spec.runner === "cargo") return "cargo test";
  if (spec.runner === "node-test") return "node --test --test-reporter=tap";
  return undefined;
}

/**
 * Drops actions the course is not allowed to offer, and those whose backing
 * extension is missing. A board button that reports "bridge missing" when
 * pressed is worse than no button.
 */
export function allowedActions(
  actions: TaskAction[],
  ctx: { capabilities: Set<Capability>; bridgeAvailable: boolean },
): TaskAction[] {
  return actions.filter((a) => {
    if (!isBoardAction(a.kind)) return true;
    return ctx.capabilities.has("board") && ctx.bridgeAvailable;
  });
}

/** The VS Code command each action invokes; the controller handles the rest itself. */
export const BOARD_COMMANDS: Record<string, string> = {
  boardConnect: "cads.board.connect",
  boardFlash: "cads.board.flash",
  boardConsole: "cads.board.openConsole",
  debugStart: "workbench.action.debug.start",
};

export interface ActionLabels {
  label: string;
  /** One line naming the equivalent manual route, so the click teaches it. */
  manual: string;
}

/** Button caption and the manual route it corresponds to. */
export function actionLabels(action: TaskAction, lang: Lang): ActionLabels {
  const de = lang === "de";
  switch (action.kind) {
    case "runTask":
      return de
        ? { label: "Task ausführen", manual: `entspricht: Terminal → Task ausführen → ${action.arg ?? ""}` }
        : { label: "Run task", manual: `same as: Terminal → Run Task → ${action.arg ?? ""}` };
    case "runInTerminal":
      return de
        ? { label: "Im Terminal ausführen", manual: "entspricht: Terminal öffnen und das Kommando eintippen" }
        : { label: "Run in terminal", manual: "same as: open a terminal and type the command" };
    case "copyCommand":
      return de ? { label: "Kopieren", manual: "" } : { label: "Copy", manual: "" };
    case "openFile":
      return de
        ? { label: "Datei öffnen", manual: `entspricht: Explorer → ${action.arg ?? ""}` }
        : { label: "Open file", manual: `same as: Explorer → ${action.arg ?? ""}` };
    case "boardConnect":
      return de
        ? { label: "Board verbinden", manual: "entspricht: Befehlspalette → CaDS: Board verbinden" }
        : { label: "Connect board", manual: "same as: Command Palette → CaDS: Connect board" };
    case "boardFlash":
      return de
        ? { label: "Flashen", manual: "entspricht: Befehlspalette → CaDS: Flash" }
        : { label: "Flash", manual: "same as: Command Palette → CaDS: Flash" };
    case "boardConsole":
      return de
        ? { label: "Konsole öffnen", manual: "entspricht: Befehlspalette → CaDS: Konsole öffnen" }
        : { label: "Open console", manual: "same as: Command Palette → CaDS: Open console" };
    case "debugStart":
      return de
        ? { label: "Debugging starten", manual: "entspricht: F5, oder Ausführen → Debugging starten" }
        : { label: "Start debugging", manual: "same as: F5, or Run → Start Debugging" };
  }
}
