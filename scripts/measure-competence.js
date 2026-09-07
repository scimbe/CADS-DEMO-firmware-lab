#!/usr/bin/env node
/**
 * What competence level a real course pack actually produces (SPEC A9.2).
 *
 * The number this prints is the answer to "does our notion of competence carry, or
 * does it only look good", so it is measured AGAINST THE SHIPPED CODE, not against a
 * model of it: it loads the real packs with the extension's own loader, walks them
 * with the extension's own session functions, and draws the recall card with the
 * extension's own selection (one card per step and day, chosen by the same hash, out
 * of the same candidate pool). A hand count gets this wrong, which is why this file
 * exists - the selection alone makes a naive count of `recallFrom` too optimistic.
 *
 * The two runs, so the numbers are never quoted without their meaning:
 *
 *   perfect      every check passes on the first attempt with no hint, a language
 *                model is configured, every recall card is answered correctly.
 *                This is the CEILING a course allows, not a prediction.
 *   realistic    every third check passes only after a hint, every fourth recall
 *                answer misses the rubric. Deliberately pessimistic about hints,
 *                because that is where "geübt" is decided.
 *   no-llm       no language model: rubric-graded questions become self-reported and
 *                carry nothing (R11a.8), and no recall can be graded at all.
 *
 * Both runs are deterministic: same tree, same numbers.
 *
 * Usage:
 *   npm --prefix extensions/cads-tutor run compile-tests     # once, this reads its output
 *   node scripts/measure-competence.js [courseId ...]
 *   node scripts/measure-competence.js --assume-recall-prompts
 *
 * `--assume-recall-prompts` projects the state after the course streams deliver the
 * A9.2a texts: it treats every gradable question/predict as a recall target. Without
 * it you measure what the packs do today. Say which one you are quoting.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "extensions", "cads-tutor", "out-test", "src");
if (!fs.existsSync(path.join(OUT, "session.js"))) {
  console.error(
    "measure-competence: extensions/cads-tutor/out-test is missing.\n" +
      "Build it first:  npm --prefix extensions/cads-tutor run compile-tests",
  );
  process.exit(2);
}
const { loadCoursePack, orderedSteps } = require(path.join(OUT, "loader.js"));
const S = require(path.join(OUT, "session.js"));
const T = require(path.join(OUT, "types.js"));

/** The controller's recall-card hash, copied so this measures the real selection. */
function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const SCENARIOS = {
  perfect: { llm: true, assistedEvery: 0, recallFailEvery: 0 },
  realistic: { llm: true, assistedEvery: 3, recallFailEvery: 4 },
  "no-llm": { llm: false, assistedEvery: 3, recallFailEvery: 0 },
};

const DAY = "2026-09-06";

/** Walks the whole course once, recording what a student of this kind would produce. */
function run(course, opts) {
  const session = S.newSession();
  const cid = course.manifest.id;
  let n = 0;
  for (const step of orderedSteps(course)) {
    if (step.placeholder) continue;
    const meta = step.variants.en.meta;

    // The recall card, exactly as recallView assembles it.
    if (meta.recallFrom.length > 0) {
      const candidates = [];
      for (const sid of meta.recallFrom) {
        const from = course.steps.get(sid);
        if (!from || !S.isStepDone(session, from)) continue;
        for (const t of from.variants.en.meta.tasks) {
          const gradable = (t.check.type === "question" || t.check.type === "predict") && !!t.check.rubric;
          const target = opts.assumeRecallPrompts ? gradable : gradable && T.recallPromptOf(t.check) !== undefined;
          if (target) candidates.push({ stepId: sid, taskId: t.id });
        }
      }
      if (candidates.length > 0) {
        const pool = S.recallDrawPool(session, cid, candidates);
        const pick = pool[hashString(`${cid}/${step.id}:${DAY}`) % pool.length];
        const failed = opts.recallFailEvery > 0 && n % opts.recallFailEvery === 0;
        const outcome = failed ? "failed" : "passed";
        session.recall = { ...(session.recall ?? {}), [`${cid}/${step.id}`]: { date: DAY, fromStepId: pick.stepId, taskId: pick.taskId, answer: "…", ...(opts.llm ? { outcome, graded: true } : {}) } };
        if (opts.llm) S.recordRecallEvidence(session, cid, { date: DAY, onStepId: step.id, fromStepId: pick.stepId, taskId: pick.taskId, outcome });
      }
    }

    for (const task of meta.tasks) {
      n++;
      const type = task.check.type;
      // Without a model a question falls back to manual confirmation (R11a.8).
      const selfReported = type === "manual" || (type === "question" && !opts.llm);
      const assisted = opts.assistedEvery > 0 && n % opts.assistedEvery === 0;
      const progress = S.ensureStepProgress(session, cid, step.id);
      progress.tasks[task.id] = {
        status: "passed",
        failures: 0,
        attempts: assisted ? 2 : 1,
        hintTier: assisted ? 1 : 0,
        checkedAt: `${DAY}T10:00:00.000Z`,
        ...(selfReported ? { selfReported: true } : {}),
        ...(type === "predict" ? { predictionOutcome: "correct", predictionGraded: opts.llm } : {}),
      };
    }
  }
  return session;
}

function report(course, name, opts) {
  const session = run(course, opts);
  const levels = { none: 0, touched: 0, practised: 0, demonstrated: 0 };
  const seen = new Map();
  let complete = 0;
  for (const mod of S.courseCompetence(course, session)) {
    for (const o of mod.objectives) if (!seen.has(o.objectiveId)) seen.set(o.objectiveId, o);
    if (S.isModuleCompetenceComplete(course, session, mod.moduleId)) complete++;
  }
  let terminal = 0, noPointer = 0, noText = 0;
  for (const o of seen.values()) {
    levels[o.level]++;
    const c = S.objectiveCeiling(course, o.objectiveId, opts.llm);
    if (c.terminal) terminal++;
    else if (c.noLaterRecall) noPointer++;
    else if (c.recallTargetMissing) noText++;
  }
  const log = (session.recallLog ?? {})[course.manifest.id] ?? [];
  console.log(
    `  ${name.padEnd(10)} ${String(levels.demonstrated).padStart(3)} demonstrated · ${String(levels.practised).padStart(3)} practised · ` +
      `${String(levels.touched).padStart(3)} touched · ${String(levels.none).padStart(3)} none   ` +
      `modules complete ${complete}/${course.manifest.modules.length}   recall cards ${log.length}, passed ${log.filter((r) => r.outcome === "passed").length}`,
  );
  return { terminal, noPointer, noText, total: seen.size };
}

const args = process.argv.slice(2);
const assumeRecallPrompts = args.includes("--assume-recall-prompts");
const wanted = args.filter((a) => !a.startsWith("--"));
const coursesDir = path.join(ROOT, "courses");
const ids = wanted.length ? wanted : fs.readdirSync(coursesDir).filter((d) => fs.existsSync(path.join(coursesDir, d, "course.json"))).sort();

console.log(`measure-competence · ${assumeRecallPrompts ? "PROJECTED (every gradable task treated as a recall target)" : "as the packs stand today"}`);
let failed = false;
for (const id of ids) {
  const { course, diagnostics } = loadCoursePack(path.join(coursesDir, id), "measure");
  if (!course) {
    console.error(`\n### ${id}: pack did not load - ${JSON.stringify(diagnostics)}`);
    failed = true;
    continue;
  }
  console.log(`\n### ${id}`);
  let shape;
  for (const [name, opts] of Object.entries(SCENARIOS)) shape = report(course, name, { ...opts, assumeRecallPrompts });
  console.log(
    `  of ${shape.total} objectives: ${shape.terminal} terminal (R11a.7c, not a gap) · ` +
      `${shape.noPointer} with no later recall pointer (K8 gap) · ${shape.noText} pointed at but without recallPrompt (A9.2a)`,
  );
}
process.exit(failed ? 1 : 0);
