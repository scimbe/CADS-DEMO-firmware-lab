/**
 * "Fortschritt" tree: mastery per learning objective, computed from the LearningEvent log
 * (tutor-platform computeMastery), grouped by course. Objectives come from the steps' front
 * matter; the curriculum (if it knows the objective) supplies the statement.
 */
import * as vscode from "vscode";
import { masteryFor, type EventStoreLike } from "./events";
import { ui } from "./i18n";
import { orderedSteps } from "./loader";
import { moduleProgress } from "./session";
import { loc, type Course, type Lang, type SessionState } from "./types";

export interface ProgressState {
  courses(): Course[];
  session(): SessionState;
  lang(): Lang;
  events(): EventStoreLike | undefined;
  objectiveStatement(courseId: string, objectiveId: string): string | undefined;
}

export type ProgressNode =
  | { kind: "course"; course: Course }
  /** A3: one row per module with its first-try / assisted / prediction / reflection counts. */
  | { kind: "module"; course: Course; moduleId: string }
  | { kind: "objective"; course: Course; objectiveId: string; steps: string[] };

export class ProgressTreeProvider implements vscode.TreeDataProvider<ProgressNode> {
  private readonly emitter = new vscode.EventEmitter<ProgressNode | undefined>();
  readonly onDidChangeTreeData = this.emitter.event;

  constructor(private readonly state: ProgressState) {}

  refresh(): void {
    this.emitter.fire(undefined);
  }

  getTreeItem(node: ProgressNode): vscode.TreeItem {
    const lang = this.state.lang();
    const s = ui(lang);
    if (node.kind === "course") {
      const item = new vscode.TreeItem(loc(node.course.manifest.title, lang), vscode.TreeItemCollapsibleState.Expanded);
      item.iconPath = new vscode.ThemeIcon("graph");
      item.id = `progress:${node.course.manifest.id}`;
      return item;
    }
    if (node.kind === "module") return this.moduleItem(node, lang);
    const store = this.state.events();
    const session = this.state.session();
    const m = store ? masteryFor(store, session.studentId, node.objectiveId) : { mastery: 0, events: 0 };
    const pct = Math.round(m.mastery * 100);
    const statement = this.state.objectiveStatement(node.course.manifest.id, node.objectiveId);
    const item = new vscode.TreeItem(node.objectiveId, vscode.TreeItemCollapsibleState.None);
    item.id = `progress:${node.course.manifest.id}/${node.objectiveId}`;
    item.description = m.events === 0 ? s.noEvents : `${s.mastery} ${pct} % (${m.events})`;
    item.tooltip = `${statement ?? node.objectiveId}\n${s.step}: ${node.steps.join(", ")}\n${s.mastery}: ${pct} % · ${m.events} events`;
    item.iconPath = new vscode.ThemeIcon(pct >= 85 ? "star-full" : pct > 0 ? "star-half" : "star-empty", pct >= 85 ? new vscode.ThemeColor("testing.iconPassed") : undefined);
    if (node.steps[0]) item.command = { command: "cads.tutor.gotoStep", title: "Open step", arguments: [node.course.manifest.id, node.steps[0]] };
    return item;
  }

  /** A3 row: what the module cost the student, not just whether it is done. */
  private moduleItem(node: { course: Course; moduleId: string }, lang: Lang): vscode.TreeItem {
    const s = ui(lang);
    const p = moduleProgress(node.course, node.moduleId, this.state.session());
    const mod = node.course.manifest.modules.find((m) => m.id === node.moduleId);
    const item = new vscode.TreeItem(mod ? loc(mod.title, lang) : node.moduleId, vscode.TreeItemCollapsibleState.Collapsed);
    item.id = `progress:${node.course.manifest.id}/module/${node.moduleId}`;
    const predictions = p.predictionsCorrect + p.predictionsDeviated + p.predictionsOpen;
    item.description = `${p.stepsDone}/${p.stepsTotal} · ${p.firstTry} ${s.progressFirstTry}`;
    const lines = [
      `${s.step}: ${p.stepsDone}/${p.stepsTotal}`,
      `${s.progressFirstTry}: ${p.firstTry}`,
      `${s.progressAssisted}: ${p.assisted}`,
      `${s.pending}: ${p.open}`,
    ];
    if (predictions > 0) {
      lines.push(`${s.progressPredictions}: ${p.predictionsCorrect} ✔ / ${p.predictionsDeviated} ✘${p.predictionsOpen > 0 ? ` / ${p.predictionsOpen} ?` : ""}`);
    }
    if (p.reflectionOffered) lines.push(`${s.progressReflection}: ${p.reflection ? s.progressYes : s.progressNo}`);
    item.tooltip = lines.join("\n");
    item.iconPath = new vscode.ThemeIcon(
      p.stepsTotal > 0 && p.stepsDone === p.stepsTotal ? "pass-filled" : p.stepsDone > 0 ? "circle-large-outline" : "circle-outline",
      p.stepsTotal > 0 && p.stepsDone === p.stepsTotal ? new vscode.ThemeColor("testing.iconPassed") : undefined
    );
    return item;
  }

  getChildren(node?: ProgressNode): ProgressNode[] {
    if (!node) return this.state.courses().map((course) => ({ kind: "course", course }));
    if (node.kind === "course") {
      return node.course.manifest.modules.map((m) => ({ kind: "module" as const, course: node.course, moduleId: m.id }));
    }
    if (node.kind !== "module") return [];
    // Objectives are listed under the module whose steps carry them, so a
    // teacher reading the tree sees mastery next to the module it belongs to.
    const stepIds = new Set(node.course.manifest.modules.find((m) => m.id === node.moduleId)?.steps ?? []);
    const byObjective = new Map<string, string[]>();
    for (const step of orderedSteps(node.course)) {
      if (!stepIds.has(step.id)) continue;
      for (const o of step.variants.en?.meta.objectives ?? []) {
        const list = byObjective.get(o) ?? [];
        list.push(step.id);
        byObjective.set(o, list);
      }
    }
    return [...byObjective].map(([objectiveId, steps]) => ({ kind: "objective", course: node.course, objectiveId, steps }));
  }
}
