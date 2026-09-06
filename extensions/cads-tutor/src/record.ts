/**
 * Addendum A9.3: the evidence sheet ("Kompetenznachweis"). One entry per learning
 * objective with its level, the criterion that level stands for, the date, the kind
 * of evidence and the step it happened in.
 *
 * Pure: it takes the course, the session and two lookups, and returns rows and a
 * Markdown document. Open Badges 3.0 asks a claim to carry its criterion and its
 * evidence and to be checkable by a third party (E10) - which is only possible if
 * the sheet is generated from the same model the panel shows, never from a second
 * count of its own.
 */
import { ui } from "./i18n";
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
}

export interface RecordLookups {
  lang: Lang;
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
    for (const c of mod.objectives) out.push(entry(c, mod.moduleId, manifest ? loc(manifest.title, lookups.lang) : mod.moduleId, s, lookups));
  }
  return out;
}

function entry(c: ObjectiveCompetence, moduleId: string, moduleTitle: string, s: ReturnType<typeof ui>, lookups: RecordLookups): RecordEntry {
  return {
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
    lines.push(`| ${s.recordColObjective} | ${s.recordColLevel} | ${s.recordColDate} | ${s.recordColEvidence} | ${s.recordColStep} |`);
    lines.push("|---|---|---|---|---|");
    for (const r of rows) {
      const cellsOf = evidenceCell(r.leading, lookups, s);
      lines.push(`| ${cell(r.statement)} | ${s.competenceLevel[r.level]} | ${day(r.leading?.at)} | ${cell(cellsOf.kind)} | \`${cell(cellsOf.step)}\` |`);
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
  }
  return lines.join("\n") + "\n";
}
