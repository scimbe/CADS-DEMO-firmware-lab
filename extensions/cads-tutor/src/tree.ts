/**
 * Activity-bar tree "Kurse": Course → Module → Step with status icons (locked / open / active / done).
 */
import * as vscode from "vscode";
import { ui } from "./i18n";
import { orderedSteps } from "./loader";
import { courseProgress, stepStatus } from "./session";
import { loc, type Course, type Lang, type SessionState, type Step, type StepStatus } from "./types";

export interface TreeState {
  courses(): Course[];
  session(): SessionState;
  lang(): Lang;
}

export type TreeNode =
  | { kind: "course"; course: Course }
  | { kind: "module"; course: Course; moduleId: string }
  | { kind: "step"; course: Course; step: Step };

const STATUS_ICONS: Record<StepStatus, vscode.ThemeIcon> = {
  locked: new vscode.ThemeIcon("lock", new vscode.ThemeColor("disabledForeground")),
  open: new vscode.ThemeIcon("circle-large-outline"),
  active: new vscode.ThemeIcon("play-circle", new vscode.ThemeColor("charts.blue")),
  done: new vscode.ThemeIcon("pass-filled", new vscode.ThemeColor("testing.iconPassed")),
};

export class CoursesTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private readonly emitter = new vscode.EventEmitter<TreeNode | undefined>();
  readonly onDidChangeTreeData = this.emitter.event;

  constructor(private readonly state: TreeState) {}

  refresh(): void {
    this.emitter.fire(undefined);
  }

  getTreeItem(node: TreeNode): vscode.TreeItem {
    const lang = this.state.lang();
    const session = this.state.session();
    const s = ui(lang);
    switch (node.kind) {
      case "course": {
        const p = courseProgress(session, node.course);
        const item = new vscode.TreeItem(loc(node.course.manifest.title, lang), vscode.TreeItemCollapsibleState.Expanded);
        item.id = `course:${node.course.manifest.id}`;
        item.description = `${p.done}/${p.total}`;
        item.tooltip = `${loc(node.course.manifest.description, lang)}\n${node.course.origin}: ${node.course.dir}`;
        item.iconPath = new vscode.ThemeIcon(p.done === p.total && p.total > 0 ? "verified-filled" : "book");
        item.contextValue = "course";
        return item;
      }
      case "module": {
        const mod = node.course.manifest.modules.find((m) => m.id === node.moduleId)!;
        const steps = mod.steps.map((id) => node.course.steps.get(id)).filter((x): x is Step => !!x);
        const done = steps.filter((st) => stepStatus(session, node.course, st, this.state.courses()) === "done").length;
        const active = session.courseId === node.course.manifest.id && mod.steps.includes(session.stepId ?? "");
        const item = new vscode.TreeItem(loc(mod.title, lang), active || done < steps.length ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed);
        item.id = `module:${node.course.manifest.id}/${mod.id}`;
        item.description = `${done}/${steps.length}`;
        item.iconPath = new vscode.ThemeIcon(done === steps.length && steps.length > 0 ? "folder-active" : "folder");
        item.contextValue = "module";
        return item;
      }
      case "step": {
        const meta = (node.step.variants[lang] ?? node.step.variants.en)!.meta;
        const status = stepStatus(session, node.course, node.step, this.state.courses());
        const item = new vscode.TreeItem(meta.title, vscode.TreeItemCollapsibleState.None);
        item.id = `step:${node.course.manifest.id}/${node.step.id}`;
        item.iconPath = STATUS_ICONS[status];
        item.description = status === "active" ? s.status.active : meta.estimatedMinutes ? s.minutes(meta.estimatedMinutes) : undefined;
        item.tooltip = `${meta.title}\n${s.bloom}: ${s.bloomLabel[meta.bloom]} · ${s.status[status]}${meta.requires.length ? `\nrequires: ${meta.requires.join(", ")}` : ""}`;
        item.contextValue = `step-${status}`;
        item.command = { command: "cads.tutor.gotoStep", title: "Open step", arguments: [node.course.manifest.id, node.step.id] };
        return item;
      }
    }
  }

  getChildren(node?: TreeNode): TreeNode[] {
    if (!node) return this.state.courses().map((course) => ({ kind: "course", course }));
    if (node.kind === "course") return node.course.manifest.modules.map((m) => ({ kind: "module", course: node.course, moduleId: m.id }));
    if (node.kind === "module") {
      const mod = node.course.manifest.modules.find((m) => m.id === node.moduleId)!;
      return mod.steps.map((id) => node.course.steps.get(id)).filter((x): x is Step => !!x).map((step) => ({ kind: "step", course: node.course, step }));
    }
    return [];
  }

  getParent(node: TreeNode): TreeNode | undefined {
    if (node.kind === "step") return { kind: "module", course: node.course, moduleId: node.step.moduleId };
    if (node.kind === "module") return { kind: "course", course: node.course };
    return undefined;
  }

  nodeFor(courseId: string, stepId: string): TreeNode | undefined {
    const course = this.state.courses().find((c) => c.manifest.id === courseId);
    const step = course?.steps.get(stepId);
    return course && step ? { kind: "step", course, step } : undefined;
  }

  allSteps(course: Course): Step[] {
    return orderedSteps(course);
  }
}
