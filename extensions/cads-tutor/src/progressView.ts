/**
 * "Fortschritt" tree: mastery per learning objective, computed from the LearningEvent log
 * (tutor-platform computeMastery), grouped by course. Objectives come from the steps' front
 * matter; the curriculum (if it knows the objective) supplies the statement.
 */
import * as vscode from "vscode";
import { masteryFor, type EventStoreLike } from "./events";
import { ui } from "./i18n";
import { orderedSteps } from "./loader";
import { loc, type Course, type Lang, type SessionState } from "./types";

export interface ProgressState {
  courses(): Course[];
  session(): SessionState;
  lang(): Lang;
  events(): EventStoreLike | undefined;
  objectiveStatement(courseId: string, objectiveId: string): string | undefined;
}

export type ProgressNode = { kind: "course"; course: Course } | { kind: "objective"; course: Course; objectiveId: string; steps: string[] };

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

  getChildren(node?: ProgressNode): ProgressNode[] {
    if (!node) return this.state.courses().map((course) => ({ kind: "course", course }));
    if (node.kind !== "course") return [];
    const byObjective = new Map<string, string[]>();
    for (const step of orderedSteps(node.course)) {
      for (const o of step.variants.en?.meta.objectives ?? []) {
        const list = byObjective.get(o) ?? [];
        list.push(step.id);
        byObjective.set(o, list);
      }
    }
    return [...byObjective].map(([objectiveId, steps]) => ({ kind: "objective", course: node.course, objectiveId, steps }));
  }
}
