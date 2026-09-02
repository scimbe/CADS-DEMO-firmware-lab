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
