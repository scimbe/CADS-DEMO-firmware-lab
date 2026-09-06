/**
 * Addendum A9.3: the competence model in human-readable form outside the panel -
 * the evidence sheet ("Kompetenznachweis") and the rows of the progress tree.
 *
 * The sheet holds one entry per learning objective with its level, the criterion
 * that level stands for, the date, the kind of evidence and the step it happened in.
 *
 * Pure: it takes the course, the session and two lookups, and returns rows and a
 * Markdown document. Open Badges 3.0 asks a claim to carry its criterion and its
 * evidence and to be checkable by a third party (E10) - which is only possible if
 * the sheet is generated from the same model the panel shows, never from a second
 * count of its own.
 */
import { ui } from "./i18n";
import { atLeast, moduleCompetence, moduleProgress, objectiveCeiling, type ObjectiveCeiling } from "./session";
import { courseCompetence } from "./session";
import { loc, type CompetenceLevel, type Course, type Evidence, type Lang, type ObjectiveCompetence, type SessionState } from "./types";

export interface RecordEntry {
  moduleId: string;
  moduleTitle: string;
  objectiveId: string;
  statement: string;
  level: CompetenceLevel;
  /** What the level stands for - the criterion the claim is made against. */
  criterion: string;
  /** The evidence that carried the objective to its level. */
  leading?: Evidence;
  /** Everything the session holds for this objective, oldest first. */
  evidence: Evidence[];
  /**
   * A9.2: the highest level this course can produce for the objective on this
   * deployment. The teacher's portal has to be able to tell "not reached" from
   * "not reachable" - the second is a defect of the course or the installation.
   */
  ceiling: ObjectiveCeiling;
}

export interface RecordLookups {
  lang: Lang;
  /** Whether a language model is configured here; without one, rubric-graded evidence cannot happen. */
  hasLlm: boolean;
  /** The curriculum's sentence for an objective, when the pack ships one. */
  statementFor(objectiveId: string): string | undefined;
  /** The title of a step, for the human-readable evidence reference. */
  stepTitleFor(stepId: string): string | undefined;
}

export function competenceRecordEntries(course: Course, session: SessionState, lookups: RecordLookups): RecordEntry[] {
  const s = ui(lookups.lang);
  const out: RecordEntry[] = [];
  for (const mod of courseCompetence(course, session)) {
    const manifest = course.manifest.modules.find((m) => m.id === mod.moduleId);
    for (const c of mod.objectives) out.push(entry(course, c, mod.moduleId, manifest ? loc(manifest.title, lookups.lang) : mod.moduleId, s, lookups));
  }
  return out;
}

function entry(course: Course, c: ObjectiveCompetence, moduleId: string, moduleTitle: string, s: ReturnType<typeof ui>, lookups: RecordLookups): RecordEntry {
  return {
    ceiling: objectiveCeiling(course, c.objectiveId, lookups.hasLlm),
    moduleId,
    moduleTitle,
    objectiveId: c.objectiveId,
    statement: lookups.statementFor(c.objectiveId) ?? c.objectiveId,
    level: c.level,
    criterion: s.competenceLevelWhy[c.level],
    leading: c.leading,
    evidence: c.evidence,
  };
}

/** `2026-09-06T09:00:00.000Z` and `2026-09-06` both become `2026-09-06`; nothing else is shown. */
function day(at: string | undefined): string {
  return at ? at.slice(0, 10) : "–";
}

function evidenceCell(e: Evidence | undefined, lookups: RecordLookups, s: ReturnType<typeof ui>): { kind: string; step: string } {
  if (!e) return { kind: s.competenceNoEvidence, step: "–" };
  const title = lookups.stepTitleFor(e.stepId);
  return { kind: s.evidenceLabel[e.kind], step: title ? `${e.stepId} (${title})` : e.stepId };
}

/**
 * The "reachable" cell: the ceiling, and - when it is below "demonstrated" - the
 * reason in a fixed marker the portal can match on. Naming the reason is the whole
 * point: an empty mark that is impossible to fill is not the student's failure.
 */
function reachable(r: RecordEntry, s: ReturnType<typeof ui>): string {
  const level: CompetenceLevel = r.ceiling.level;
  const marks: string[] = [];
  if (r.ceiling.limitedByLlm) marks.push(s.ceilingMarkLlm);
  if (r.ceiling.noLaterRecall) marks.push(s.ceilingMarkRecall);
  return `${s.competenceLevel[level]}${marks.length ? ` (${marks.join(", ")})` : ""}`;
}

/** Escapes the pipe so a statement containing one cannot break the table. */
function cell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n+/g, " ").trim();
}

/**
 * The sheet as Markdown: a table per module, and under it the full evidence for
 * every objective that has more than one piece. No score, no total, no rank - the
 * only numbers are how many objectives reached which level (R11a.9).
 */
export function renderCompetenceRecordMarkdown(course: Course, session: SessionState, entries: RecordEntry[], lookups: RecordLookups, now = new Date()): string {
  const s = ui(lookups.lang);
  const lines: string[] = [];
  lines.push(`# ${s.recordTitle}`, "");
  lines.push(`${s.course}: ${cell(loc(course.manifest.title, lookups.lang))} (\`${course.manifest.id}\`)`, "");
  lines.push(`${s.recordAsOf}: ${day(now.toISOString())}`, "");
  lines.push(`${s.recordStudent}: \`${session.studentId}\``, "");
  lines.push("", s.recordIntro, "");
  const counted = (level: CompetenceLevel) => entries.filter((e) => e.level === level).length;
  lines.push(
    `${s.recordSummary}: ${counted("demonstrated")} ${s.competenceLevel.demonstrated}, ${counted("practised")} ${s.competenceLevel.practised}, ` +
      `${counted("touched")} ${s.competenceLevel.touched}, ${counted("none")} ${s.competenceLevel.none} (${entries.length} ${s.recordObjectives}).`,
    "",
  );
  for (const mod of course.manifest.modules) {
    const rows = entries.filter((e) => e.moduleId === mod.id);
    if (rows.length === 0) continue;
    lines.push(`## ${cell(loc(mod.title, lookups.lang))}`, "");
    lines.push(`| ${s.recordColObjective} | ${s.recordColLevel} | ${s.ceilingColumn} | ${s.recordColDate} | ${s.recordColEvidence} | ${s.recordColStep} |`);
    lines.push("|---|---|---|---|---|---|");
    for (const r of rows) {
      const cellsOf = evidenceCell(r.leading, lookups, s);
      lines.push(
        `| ${cell(r.statement)} | ${s.competenceLevel[r.level]} | ${cell(reachable(r, s))} | ${day(r.leading?.at)} | ${cell(cellsOf.kind)} | \`${cell(cellsOf.step)}\` |`,
      );
    }
    lines.push("");
    for (const r of rows) {
      if (r.evidence.length < 2) continue;
      lines.push(`**${cell(r.statement)}** — ${s.recordAllEvidence}:`);
      for (const e of r.evidence) {
        const c = evidenceCell(e, lookups, s);
        lines.push(`- ${day(e.at)} · ${cell(c.kind)} · \`${cell(c.step)}\` · \`${e.taskId}\``);
      }
      lines.push("");
    }
    lines.push(`${s.recordCriterion}: ${s.competenceLevel.practised} — ${s.competenceLevelWhy.practised} · ${s.competenceLevel.demonstrated} — ${s.competenceLevelWhy.demonstrated}`, "");
    lines.push(s.ceilingFootnote, "");
  }
  return lines.join("\n") + "\n";
}


// ---------------------------------------------------------------------------
// A9.3 / A9.4: the progress tree shows levels, not raw counters.
//
// Kept here rather than in progressView.ts because that module imports `vscode`
// and cannot be unit-tested; the text a teacher reads off the tree is exactly the
// part that must not drift from the model.
// ---------------------------------------------------------------------------

export interface RowText {
  label: string;
  description: string;
  tooltip: string;
}

/** One objective row: its level, and the evidence that produced it. */
export function objectiveRowText(course: Course, c: ObjectiveCompetence, lookups: RecordLookups): RowText {
  const s = ui(lookups.lang);
  const statement = lookups.statementFor(c.objectiveId) ?? c.objectiveId;
  const cellsOf = evidenceCell(c.leading, lookups, s);
  const ceiling = objectiveCeiling(course, c.objectiveId, lookups.hasLlm);
  const lines = [statement, `${s.recordColLevel}: ${s.competenceLevel[c.level]} — ${s.competenceLevelWhy[c.level]}`];
  if (ceiling.limitedByLlm || ceiling.noLaterRecall) {
    lines.push(`${s.ceilingColumn}: ${s.competenceLevel[ceiling.level]}${ceiling.limitedByLlm ? ` (${s.ceilingMarkLlm})` : ""}${ceiling.noLaterRecall ? ` (${s.ceilingMarkRecall})` : ""}`);
  }
  if (c.evidence.length === 0) lines.push(s.competenceNoEvidence);
  for (const e of c.evidence) {
    const cell = evidenceCell(e, lookups, s);
    lines.push(`· ${day(e.at)} ${cell.kind} (${cell.step})`);
  }
  if (c.steps.length > 0) lines.push(`${s.step}: ${c.steps.join(", ")}`);
  return {
    label: c.objectiveId,
    description: c.leading ? `${s.competenceLevel[c.level]} · ${cellsOf.kind}` : s.competenceLevel[c.level],
    tooltip: lines.join("\n"),
  };
}

/**
 * One module row. The counters that used to be the headline (first try, assisted,
 * predictions) move into the tooltip: they say how the work went, not what the
 * student can do, and A9 asks the view to answer the second question.
 */
export function moduleRowText(course: Course, session: SessionState, moduleId: string, lookups: RecordLookups): RowText {
  const s = ui(lookups.lang);
  const mod = course.manifest.modules.find((m) => m.id === moduleId);
  const objectives = moduleCompetence(course, session, moduleId);
  const practised = objectives.filter((o) => atLeast(o.level, "practised")).length;
  const demonstrated = objectives.filter((o) => o.level === "demonstrated").length;
  const p = moduleProgress(course, moduleId, session);
  const lines = [
    `${s.step}: ${p.stepsDone}/${p.stepsTotal}`,
    `${s.competenceLevel.practised}: ${practised}/${objectives.length}`,
    `${s.competenceLevel.demonstrated}: ${demonstrated}/${objectives.length}`,
    ...objectives.map((o) => `· ${lookups.statementFor(o.objectiveId) ?? o.objectiveId} — ${s.competenceLevel[o.level]}`),
    "",
    `${s.progressFirstTry}: ${p.firstTry} · ${s.progressAssisted}: ${p.assisted} · ${s.pending}: ${p.open}`,
  ];
  if (p.predictionsCorrect + p.predictionsDeviated + p.predictionsOpen > 0) {
    lines.push(`${s.progressPredictions}: ${p.predictionsCorrect} ✔ / ${p.predictionsDeviated} ✘${p.predictionsOpen > 0 ? ` / ${p.predictionsOpen} ?` : ""}`);
  }
  if (p.reflectionOffered) lines.push(`${s.progressReflection}: ${p.reflection ? s.progressYes : s.progressNo}`);
  return {
    label: mod ? loc(mod.title, lookups.lang) : moduleId,
    description: `${p.stepsDone}/${p.stepsTotal} · ${practised}/${objectives.length} ${s.competenceLevel.practised}`,
    tooltip: lines.join("\n"),
  };
}
