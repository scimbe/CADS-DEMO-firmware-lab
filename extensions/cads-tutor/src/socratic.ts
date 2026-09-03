/**
 * Socratic hint selection (SPEC §3.3): when a task fails for the n-th time, tier n (max 3) of
 * the step's matching `socratic` entry is shown. Pure module; the generic LLM fallback lives in
 * platform.ts.
 */
import { loc, type Lang, type SocraticHint, type StepFrontMatter } from "./types";

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
