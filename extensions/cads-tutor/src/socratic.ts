/**
 * Socratic hint selection (SPEC §3.3): when a task fails for the n-th time, tier n (max 3) of
 * the step's matching `socratic` entry is shown. Pure module; the generic LLM fallback lives in
 * platform.ts.
 */
import { loc, type Lang, type Localized, type SocraticHint, type StepFrontMatter } from "./types";

export const MAX_HINT_TIER = 3;

export function hintTierForFailures(failures: number): number {
  return Math.min(Math.max(failures, 1), MAX_HINT_TIER);
}

export function findSocratic(meta: StepFrontMatter, trigger: string): SocraticHint | undefined {
  return meta.socratic.find((s) => s.trigger === trigger) ?? meta.socratic.find((s) => s.trigger === "*");
}

/** Triggers to try, in order, when a task needs a hint: failed → weak (question) → stuck → any. */
export function triggersForTask(taskId: string, checkType: string, reason: "failed" | "stuck" | "weak"): string[] {
  const order: string[] = [];
  if (reason === "weak" || checkType === "question") order.push(`question:${taskId}:weak`);
  if (reason !== "weak") order.unshift(`task:${taskId}:failed`);
  order.push(`task:${taskId}:stuck`, "*");
  if (reason === "weak") order.push(`task:${taskId}:failed`);
  return [...new Set(order)];
}

/** First authored hint along the trigger chain. */
export function selectTaskHint(meta: StepFrontMatter, taskId: string, checkType: string, reason: "failed" | "stuck" | "weak", failures: number, lang: Lang): SelectedHint | undefined {
  for (const trigger of triggersForTask(taskId, checkType, reason)) {
    const entry = meta.socratic.find((s) => s.trigger === trigger);
    if (!entry) continue;
    const tier = hintTierForFailures(failures);
    const idx = Math.min(tier, entry.hints.length) - 1;
    if (idx < 0) continue;
    return { tier, question: loc(entry.question, lang), hint: loc(entry.hints[idx], lang), authored: true };
  }
  return undefined;
}

export interface SelectedHint {
  tier: number;
  question: string;
  hint: string;
  /** True if the pack authored this hint; false means the caller should use a generic/LLM one. */
  authored: boolean;
}

/** Picks the authored hint for `trigger` at the tier implied by `failures`; `undefined` if none authored. */
export function selectHint(meta: StepFrontMatter, trigger: string, failures: number, lang: Lang): SelectedHint | undefined {
  const entry = findSocratic(meta, trigger);
  if (!entry) return undefined;
  const tier = hintTierForFailures(failures);
  const idx = Math.min(tier, entry.hints.length) - 1;
  if (idx < 0) return undefined;
  return { tier, question: loc(entry.question, lang), hint: loc(entry.hints[idx], lang), authored: true };
}

export function taskFailedTrigger(taskId: string): string {
  return `task:${taskId}:failed`;
}

export function eventTrigger(name: string): string {
  return `event:${name}`;
}

// ---------------------------------------------------------------------------
// Addendum v1.1 A2: hints driven by what a check actually printed.
// ---------------------------------------------------------------------------

/** Where a hint came from, so the learning event can say why it was shown. */
export type InsightSource = "misconception" | "output" | "test";

export interface MatchedInsight extends SelectedHint {
  source: InsightSource;
  /** The regex that matched, or the name of the failed test. */
  matched: string;
  /** The matched text, capped, for the event log and the panel. */
  excerpt?: string;
}

/** Compiles a pack-supplied pattern, treating an uncompilable one as "no match". */
function tryMatch(pattern: string, flags: string | undefined, text: string): RegExpExecArray | null {
  try {
    return new RegExp(pattern, flags ?? "m").exec(text);
  } catch {
    // The schema rejects these at load time; a hand-edited pack must not throw here.
    return null;
  }
}

function tierHint(entry: { question: Localized; hints: Localized[] }, failures: number, lang: Lang): { tier: number; question: string; hint: string } | undefined {
  const tier = hintTierForFailures(failures);
  const idx = Math.min(tier, entry.hints.length) - 1;
  if (idx < 0) return undefined;
  return { tier, question: loc(entry.question, lang), hint: loc(entry.hints[idx], lang) };
}

/**
 * Matches a step's misconceptions and `output:<regex>` triggers against what a
 * check printed. `misconceptions` is checked first: A2 calls the two equivalent
 * and names the short form the preferred one, so a pack that declares both for
 * the same error gets the misconception's wording.
 */
export function selectOutputInsight(meta: StepFrontMatter, output: string, failures: number, lang: Lang): MatchedInsight | undefined {
  if (!output) return undefined;
  for (const mc of meta.misconceptions) {
    const m = tryMatch(mc.pattern, mc.flags, output);
    if (!m) continue;
    const picked = tierHint(mc, failures, lang);
    if (picked) return { ...picked, authored: true, source: "misconception", matched: mc.pattern, excerpt: excerpt(m[0]) };
  }
  for (const s of meta.socratic) {
    if (!s.trigger.startsWith("output:")) continue;
    const pattern = s.trigger.slice("output:".length);
    const m = tryMatch(pattern, undefined, output);
    if (!m) continue;
    const picked = tierHint(s, failures, lang);
    if (picked) return { ...picked, authored: true, source: "output", matched: pattern, excerpt: excerpt(m[0]) };
  }
  return undefined;
}

/**
 * Matches `test:<name>:failed` triggers against the tests a `testSuite` check
 * reported as failed. Names are compared literally against both the leaf name
 * and the `outer > inner` path, so a pack may address a test either way.
 */
export function selectTestInsight(meta: StepFrontMatter, failedNames: readonly string[], failures: number, lang: Lang): MatchedInsight | undefined {
  if (failedNames.length === 0) return undefined;
  const failed = new Set(failedNames);
  for (const s of meta.socratic) {
    const m = /^test:(.+):failed$/s.exec(s.trigger);
    if (!m) continue;
    const name = m[1];
    if (!failed.has(name)) continue;
    const picked = tierHint(s, failures, lang);
    if (picked) return { ...picked, authored: true, source: "test", matched: name };
  }
  return undefined;
}

/** Test-specific hints beat generic output matches: they name the failing case. */
export function selectInsight(
  meta: StepFrontMatter,
  opts: { output?: string; failedTests?: readonly string[]; failures: number; lang: Lang },
): MatchedInsight | undefined {
  return (
    selectTestInsight(meta, opts.failedTests ?? [], opts.failures, opts.lang) ??
    selectOutputInsight(meta, opts.output ?? "", opts.failures, opts.lang)
  );
}

const EXCERPT_MAX = 200;

function excerpt(s: string): string {
  const one = s.replace(/\s+/g, " ").trim();
  return one.length > EXCERPT_MAX ? `${one.slice(0, EXCERPT_MAX)}…` : one;
}
