/**
 * "Fortschritt" tree: A9.2 competence level per learning objective, grouped by course
 * and module. Objectives come from the steps' front matter; the curriculum (if it knows
 * the objective) supplies the statement. The row texts are built in record.ts so they
 * can be tested; the mastery estimate from the event log stays as a second opinion in
 * the tooltip, since it is what the teacher's portal reports.
 */
import * as vscode from "vscode";
import { masteryFor, type EventStoreLike } from "./events";
import { ui } from "./i18n";
import { orderedSteps } from "./loader";
import { moduleRowText, objectiveRowText, type RecordLookups } from "./record";
import { isModuleCompetenceComplete, objectiveCompetence } from "./session";
import { loc, type CompetenceLevel, type Course, type Lang, type SessionState } from "./types";

export interface ProgressState {
  courses(): Course[];
  session(): SessionState;
  lang(): Lang;
  events(): EventStoreLike | undefined;
  objectiveStatement(courseId: string, objectiveId: string): string | undefined;
  /** A9.2: whether this deployment can grade rubric answers at all - it decides what a level can reach. */
  hasLlm(courseId: string): boolean;
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
    const competence = objectiveCompetence(node.course, session, node.objectiveId);
    const row = objectiveRowText(node.course, competence, this.lookups(node.course, lang));
    const item = new vscode.TreeItem(row.label, vscode.TreeItemCollapsibleState.None);
    item.id = `progress:${node.course.manifest.id}/${node.objectiveId}`;
    item.description = row.description;
    const m = store ? masteryFor(store, session.studentId, node.objectiveId) : { mastery: 0, events: 0 };
    item.tooltip = `${row.tooltip}\n${s.mastery}: ${Math.round(m.mastery * 100)} % · ${m.events === 0 ? s.noEvents : `${m.events} events`}`;
    item.iconPath = levelIcon(competence.level);
    if (node.steps[0]) item.command = { command: "cads.tutor.gotoStep", title: "Open step", arguments: [node.course.manifest.id, node.steps[0]] };
    return item;
  }

  /** The statement and step titles the row texts need, pulled from the pack. */
  private lookups(course: Course, lang: Lang): RecordLookups {
    return {
      lang,
      hasLlm: this.state.hasLlm(course.manifest.id),
      statementFor: (id) => this.state.objectiveStatement(course.manifest.id, id),
      stepTitleFor: (id) => {
        const step = course.steps.get(id);
        return step?.variants[lang]?.meta.title ?? step?.variants.en?.meta.title;
      },
    };
  }

  /**
   * A9.2 row: how far the module got and how many of its objectives are at least
   * practised. What the module cost (first try, assisted, predictions) is still
   * there, in the tooltip - it describes the work, not what the student can do.
   */
  private moduleItem(node: { course: Course; moduleId: string }, lang: Lang): vscode.TreeItem {
    const session = this.state.session();
    const row = moduleRowText(node.course, session, node.moduleId, this.lookups(node.course, lang));
    const item = new vscode.TreeItem(row.label, vscode.TreeItemCollapsibleState.Collapsed);
    item.id = `progress:${node.course.manifest.id}/module/${node.moduleId}`;
    item.description = row.description;
    item.tooltip = row.tooltip;
    const complete = isModuleCompetenceComplete(node.course, session, node.moduleId);
    item.iconPath = new vscode.ThemeIcon(
      complete ? "pass-filled" : "circle-large-outline",
      complete ? new vscode.ThemeColor("testing.iconPassed") : undefined
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

/** The level as an icon: a filled star only for "nachgewiesen", so the tree cannot flatter. */
function levelIcon(level: CompetenceLevel): vscode.ThemeIcon {
  if (level === "demonstrated") return new vscode.ThemeIcon("star-full", new vscode.ThemeColor("testing.iconPassed"));
  if (level === "practised") return new vscode.ThemeIcon("star-half");
  if (level === "touched") return new vscode.ThemeIcon("star-empty");
  return new vscode.ThemeIcon("circle-outline");
}
