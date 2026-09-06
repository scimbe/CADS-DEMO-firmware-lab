import assert from "node:assert/strict";
import * as path from "node:path";
import { describe, it } from "node:test";
import { loadCoursePack } from "../src/loader";
import { competenceRecordEntries, moduleRowText, objectiveRowText, renderCompetenceRecordMarkdown, type RecordLookups } from "../src/record";
import { ensureStepProgress, newSession, objectiveCompetence } from "../src/session";
import type { SessionState, TaskState } from "../src/types";

const EXAMPLE = path.resolve(__dirname, "..", "..", "courses", "_example");
const course = loadCoursePack(EXAMPLE, "test").course!;

const lookups: RecordLookups = {
  lang: "de",
  statementFor: (id) => (id === "firmware-how-to-build" ? "Die Firmware bauen" : undefined),
  stepTitleFor: (id) => (id === "m0-02-build" ? "Bauen" : undefined),
};

function pass(session: SessionState, stepId: string, taskId: string, state: Partial<TaskState> = {}): void {
  const p = ensureStepProgress(session, course.manifest.id, stepId);
  p.tasks[taskId] = { status: "passed", failures: 0, hintTier: 0, attempts: 1, checkedAt: "2026-09-06T10:00:00.000Z", ...state };
}

describe("A9.3 record of competence", () => {
  it("lists every objective of the course in module order", () => {
    const entries = competenceRecordEntries(course, newSession(), lookups);
    assert.deepEqual(entries.map((e) => e.moduleId), ["m0", "m0", "m0", "m1", "m1", "m1", "m2"]);
    assert.equal(entries.every((e) => e.level === "none"), true);
    // A pack without a curriculum sentence falls back to the id rather than inventing one.
    assert.equal(entries.find((e) => e.objectiveId === "example.orientation")!.statement, "example.orientation");
    assert.equal(entries.find((e) => e.objectiveId === "firmware-how-to-build")!.statement, "Die Firmware bauen");
  });

  it("carries level, criterion, date, evidence type and step for each entry", () => {
    const s = newSession();
    pass(s, "m0-02-build", "build");
    const entry = competenceRecordEntries(course, s, lookups).find((e) => e.objectiveId === "firmware-how-to-build")!;
    assert.equal(entry.level, "practised");
    assert.equal(entry.criterion, "Ein starker Beleg oder zwei mittlere.");
    assert.equal(entry.leading!.kind, "checkFirstTry");
    assert.equal(entry.leading!.stepId, "m0-02-build");
    assert.equal(entry.leading!.at, "2026-09-06T10:00:00.000Z");
  });

  it("writes a markdown sheet whose rows name the evidence", () => {
    const s = newSession();
    pass(s, "m0-02-build", "build");
    pass(s, "m0-02-build", "preset", { attempts: 2, hintTier: 1, checkedAt: "2026-09-06T11:00:00.000Z" });
    const entries = competenceRecordEntries(course, s, lookups);
    const md = renderCompetenceRecordMarkdown(course, s, entries, lookups, new Date("2026-09-07T08:00:00.000Z"));
    assert.match(md, /^# Kompetenznachweis/m);
    assert.match(md, /Stand: 2026-09-07/);
    assert.match(md, new RegExp(s.studentId));
    assert.match(md, /\| Die Firmware bauen \| geübt \| 2026-09-06 \| Prüfung im ersten Versuch ohne Hinweis bestanden \| `m0-02-build \(Bauen\)` \|/);
    assert.match(md, /alle Belege/, "an objective with several pieces lists them all");
    assert.match(md, /Kriterium: geübt/);
    assert.match(md, /Erreichte Stufen: 0 nachgewiesen, 1 geübt/);
  });

  it("names no points currency outside the sentence that rules it out", () => {
    const md = renderCompetenceRecordMarkdown(course, newSession(), competenceRecordEntries(course, newSession(), lookups), lookups);
    // The intro says there are none, so it is the one line allowed to name them.
    const body = md.split("\n").filter((l) => !l.includes("R11a")).join("\n");
    for (const forbidden of [/\bXP\b/, /Level \d/, /Streak/i, /Rangliste/, /Liga\b/, /Punkte/]) assert.doesNotMatch(body, forbidden);
    assert.match(md, /keine Punkte, Level oder Ranglisten/);
  });

  it("escapes a pipe in a statement so the table survives it", () => {
    const md = renderCompetenceRecordMarkdown(course, newSession(), competenceRecordEntries(course, newSession(), { ...lookups, statementFor: () => "a | b" }), lookups);
    assert.match(md, /a \\\| b/);
    assert.doesNotMatch(md, /\| a \| b \|/);
  });
});

describe("A9.2 progress rows show levels, not raw counters", () => {
  it("puts the level and the evidence on the objective row and the whole trail in the tooltip", () => {
    const s = newSession();
    pass(s, "m0-02-build", "build");
    pass(s, "m0-02-build", "preset", { attempts: 4, hintTier: 3, checkedAt: "2026-09-06T11:00:00.000Z" });
    const row = objectiveRowText(objectiveCompetence(course, s, "firmware-how-to-build"), lookups);
    assert.equal(row.label, "firmware-how-to-build");
    assert.equal(row.description, "geübt · Prüfung im ersten Versuch ohne Hinweis bestanden");
    assert.match(row.tooltip, /Stufe: geübt — Ein starker Beleg oder zwei mittlere\./);
    assert.match(row.tooltip, /2026-09-06 Prüfung mit weiterem Versuch oder Hinweis bestanden/);
    assert.doesNotMatch(row.description, /\d+ %/, "a percentage is a score by another name");
  });

  it("says so plainly when an objective has no verified evidence", () => {
    const row = objectiveRowText(objectiveCompetence(course, newSession(), "firmware-safety"), lookups);
    assert.equal(row.description, "nicht begonnen");
    assert.match(row.tooltip, /noch kein geprüfter Beleg/);
  });

  it("leads the module row with steps and practised objectives, and keeps the counters in the tooltip", () => {
    const s = newSession();
    pass(s, "m0-01-welcome", "readme");
    pass(s, "m0-01-welcome", "hello");
    const row = moduleRowText(course, s, "m0", lookups);
    assert.equal(row.label, "Orientierung");
    assert.equal(row.description, "1/2 · 2/3 geübt");
    assert.match(row.tooltip, /nachgewiesen: 0\/3/);
    assert.match(row.tooltip, /im Erstversuch bestanden: 2/, "the old counters are still reachable, just not the headline");
  });
});
