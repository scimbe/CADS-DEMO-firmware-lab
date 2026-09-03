/**
 * Hand-written schema validation for course.json and step front matter (SPEC §3.3). Produces
 * human-readable error messages that name the offending field, instead of a generic JSON-schema
 * dump, because course authors read them in the "CaDS Tutor" output channel.
 */
import {
  BLOOM_LEVELS,
  CHECK_TYPES,
  SCAFFOLD_LEVELS,
  TEST_RUNNERS,
  type BloomLevel,
  type CheckSpec,
  type CourseManifest,
  type CourseModule,
  type Localized,
  type Misconception,
  type Scaffold,
  type SocraticHint,
  type StepFrontMatter,
  type StepLink,
  type TaskSpec,
  type TestRunner,
} from "./types";

export class ValidationError extends Error {
  constructor(message: string, readonly path: string) {
    super(`${path}: ${message}`);
    this.name = "ValidationError";
  }
}

export interface ValidationResult<T> {
  value?: T;
  errors: string[];
  warnings: string[];
}

const ID_RE = /^[a-z0-9][a-z0-9._-]*$/i;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function fail(path: string, message: string): never {
  throw new ValidationError(message, path);
}

function str(v: unknown, path: string): string {
  if (typeof v !== "string" || v.trim() === "") fail(path, "must be a non-empty string");
  return v;
}

function optStr(v: unknown, path: string): string | undefined {
  if (v === undefined || v === null) return undefined;
  return str(v, path);
}

function optNum(v: unknown, path: string): number | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "number" || !Number.isFinite(v)) fail(path, "must be a number");
  return v;
}

function optBloom(v: unknown, path: string): BloomLevel | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "string" || !(BLOOM_LEVELS as readonly string[]).includes(v)) {
    fail(path, `must be one of ${BLOOM_LEVELS.join("|")}`);
  }
  return v as BloomLevel;
}

function optBool(v: unknown, path: string): boolean | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "boolean") fail(path, "must be true or false");
  return v;
}

function regex(pattern: string, path: string, flags?: string): void {
  try {
    new RegExp(pattern, flags);
  } catch (err) {
    fail(path, `invalid regular expression: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function optRegex(v: unknown, path: string): string | undefined {
  const s = optStr(v, path);
  if (s !== undefined) regex(s, path);
  return s;
}

function id(v: unknown, path: string): string {
  const s = str(v, path);
  if (!ID_RE.test(s)) fail(path, `"${s}" is not a valid id (letters, digits, '.', '_', '-')`);
  return s;
}

function localized(v: unknown, path: string, required = true): Localized {
  if (v === undefined || v === null) {
    if (required) fail(path, "is required");
    return "";
  }
  if (typeof v === "string") return v;
  if (isRecord(v)) {
    const out: { de?: string; en?: string } = {};
    if (v.de !== undefined) out.de = str(v.de, `${path}.de`);
    if (v.en !== undefined) out.en = str(v.en, `${path}.en`);
    if (out.de === undefined && out.en === undefined) fail(path, "needs at least one of de/en");
    return out;
  }
  fail(path, "must be a string or {de, en}");
}

function strArray(v: unknown, path: string): string[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) fail(path, "must be an array of strings");
  return v.map((x, i) => str(x, `${path}[${i}]`));
}

// ---------------------------------------------------------------------------------------------
// course.json
// ---------------------------------------------------------------------------------------------

export function validateCourseManifest(raw: unknown): ValidationResult<CourseManifest> {
  const warnings: string[] = [];
  try {
    if (!isRecord(raw)) fail("course.json", "must be a JSON object");
    const schema = raw.schema;
    if (schema !== 1) fail("schema", `unsupported course schema ${JSON.stringify(schema)} (expected 1)`);
    const courseId = id(raw.id, "id");
    const version = str(raw.version, "version");
    const title = localized(raw.title, "title");
    const description = raw.description === undefined ? undefined : localized(raw.description, "description");

    let project: CourseManifest["project"];
    if (raw.project !== undefined) {
      if (!isRecord(raw.project)) fail("project", "must be an object");
      project = { root: optStr(raw.project.root, "project.root"), repo: optStr(raw.project.repo, "project.repo") };
    }
    const prerequisites = strArray(raw.prerequisites, "prerequisites");

    let grounding: CourseManifest["grounding"];
    if (raw.grounding !== undefined) {
      if (!isRecord(raw.grounding)) fail("grounding", "must be an object");
      grounding = { pack: optStr(raw.grounding.pack, "grounding.pack"), threshold: optNum(raw.grounding.threshold, "grounding.threshold") };
    }

    if (!Array.isArray(raw.modules) || raw.modules.length === 0) fail("modules", "must be a non-empty array");
    const modules: CourseModule[] = [];
    const seenModules = new Set<string>();
    const seenSteps = new Set<string>();
    raw.modules.forEach((m: unknown, i: number) => {
      const p = `modules[${i}]`;
      if (!isRecord(m)) fail(p, "must be an object");
      const mid = id(m.id, `${p}.id`);
      if (seenModules.has(mid)) fail(`${p}.id`, `duplicate module id "${mid}"`);
      seenModules.add(mid);
      const mtitle = localized(m.title, `${p}.title`);
      if (!Array.isArray(m.steps) || m.steps.length === 0) fail(`${p}.steps`, "must be a non-empty array of step ids");
      const steps = m.steps.map((s: unknown, j: number) => {
        const sid = id(s, `${p}.steps[${j}]`);
        if (seenSteps.has(sid)) fail(`${p}.steps[${j}]`, `step "${sid}" is listed twice`);
        seenSteps.add(sid);
        return sid;
      });
      let reflection: CourseModule["reflection"];
      if (m.reflection !== undefined && m.reflection !== null) {
        if (!isRecord(m.reflection)) fail(`${p}.reflection`, "must be an object { prompts: [...] }");
        if (!Array.isArray(m.reflection.prompts) || m.reflection.prompts.length === 0) fail(`${p}.reflection.prompts`, "must be a non-empty array of prompts ({de, en} or string)");
        const prompts = m.reflection.prompts.map((q: unknown, k: number) => localized(q, `${p}.reflection.prompts[${k}]`));
        if (prompts.length > 3) warnings.push(`${p}.reflection.prompts: ${prompts.length} prompts; the reflection card is meant for 1-3`);
        reflection = { prompts };
      }
      modules.push({ id: mid, title: mtitle, steps, reflection });
    });

    const known = new Set(["id", "version", "schema", "title", "description", "project", "prerequisites", "grounding", "modules", "$schema", "_comment"]);
    for (const key of Object.keys(raw)) {
      if (!known.has(key)) warnings.push(`course.json: unknown field "${key}" ignored`);
    }

    return {
      value: { id: courseId, version, schema: 1, title, description, project, prerequisites, grounding, modules },
      errors: [],
      warnings,
    };
  } catch (err) {
    return { errors: [err instanceof Error ? err.message : String(err)], warnings };
  }
}

// ---------------------------------------------------------------------------------------------
// Step front matter
// ---------------------------------------------------------------------------------------------

function link(v: unknown, path: string): StepLink {
  if (!isRecord(v)) fail(path, "must be an object with one of step/file/doc/url");
  const title = v.title === undefined ? undefined : localized(v.title, `${path}.title`);
  if (typeof v.step === "string") return { step: id(v.step, `${path}.step`), title };
  if (typeof v.file === "string") {
    const line = optNum(v.line, `${path}.line`);
    return { file: str(v.file, `${path}.file`), line, title };
  }
  if (typeof v.doc === "string") return { doc: str(v.doc, `${path}.doc`), title };
  if (typeof v.url === "string") {
    const url = str(v.url, `${path}.url`);
    // command: URIs address a VS Code command (e.g. opening a walkthrough) and are rendered as
    // buttons by the panel, which enables command URIs; everything else must be a real web address.
    if (!/^(https?:\/\/|command:)/.test(url)) fail(`${path}.url`, "must start with http://, https:// or command:");
    return { url, title };
  }
  fail(path, "needs one of step/file/doc/url");
}

export function validateCheck(v: unknown, path: string): CheckSpec {
  if (!isRecord(v)) fail(path, "must be an object with a `type`");
  const type = str(v.type, `${path}.type`);
  if (!(CHECK_TYPES as readonly string[]).includes(type)) fail(`${path}.type`, `unknown check type "${type}" (known: ${CHECK_TYPES.join(", ")})`);
  switch (type as CheckSpec["type"]) {
    case "board": {
      const state = optStr(v.state, `${path}.state`);
      if (state && !["connected", "disconnected", "halted", "running"].includes(state)) fail(`${path}.state`, "must be connected|disconnected|halted|running");
      return { type: "board", state: state as "connected" | undefined };
    }
    case "task":
      return { type: "task", label: str(v.label, `${path}.label`), expectExitCode: optNum(v.expectExitCode, `${path}.expectExitCode`), timeoutMs: optNum(v.timeoutMs, `${path}.timeoutMs`) };
    case "build":
      return { type: "build", label: optStr(v.label, `${path}.label`), preset: optStr(v.preset, `${path}.preset`), expectExitCode: optNum(v.expectExitCode, `${path}.expectExitCode`), timeoutMs: optNum(v.timeoutMs, `${path}.timeoutMs`) };
    case "fileMatches":
    case "fileNotMatches": {
      const pattern = str(v.pattern, `${path}.pattern`);
      const flags = optStr(v.flags, `${path}.flags`);
      try {
        new RegExp(pattern, flags);
      } catch (err) {
        fail(`${path}.pattern`, `invalid regular expression: ${err instanceof Error ? err.message : String(err)}`);
      }
      return { type: type as "fileMatches", file: str(v.file, `${path}.file`), pattern, flags };
    }
    case "symbolInElf":
      return { type: "symbolInElf", elf: str(v.elf, `${path}.elf`), symbol: str(v.symbol, `${path}.symbol`) };
    case "flash": {
      const since = optStr(v.since, `${path}.since`);
      if (since && !["stepStart", "sessionStart", "any"].includes(since)) fail(`${path}.since`, "must be stepStart|sessionStart|any");
      return { type: "flash", since: since as "stepStart" | undefined, file: optStr(v.file, `${path}.file`) };
    }
    case "serialExpect": {
      const pattern = str(v.pattern, `${path}.pattern`);
      try {
        new RegExp(pattern);
      } catch (err) {
        fail(`${path}.pattern`, `invalid regular expression: ${err instanceof Error ? err.message : String(err)}`);
      }
      return { type: "serialExpect", send: optStr(v.send, `${path}.send`), pattern, timeoutMs: optNum(v.timeoutMs, `${path}.timeoutMs`) };
    }
    case "debugStop":
      return { type: "debugStop", file: optStr(v.file, `${path}.file`), line: optNum(v.line, `${path}.line`), timeoutMs: optNum(v.timeoutMs, `${path}.timeoutMs`) };
    case "question":
      return { type: "question", prompt: localized(v.prompt, `${path}.prompt`), rubric: str(v.rubric, `${path}.rubric`), bloom: optBloom(v.bloom, `${path}.bloom`), minChars: optNum(v.minChars, `${path}.minChars`) };
    case "manual":
      return { type: "manual", label: v.label === undefined ? undefined : localized(v.label, `${path}.label`) };
    case "all":
    case "any": {
      if (!Array.isArray(v.checks) || v.checks.length === 0) fail(`${path}.checks`, "must be a non-empty array of checks");
      return { type: type as "all", checks: v.checks.map((c: unknown, i: number) => validateCheck(c, `${path}.checks[${i}]`)) };
    }
    case "command": {
      const command = str(v.command, `${path}.command`);
      const cwd = optStr(v.cwd, `${path}.cwd`);
      if (cwd !== undefined && (cwd.startsWith("/") || cwd.split(/[\\/]/).includes(".."))) fail(`${path}.cwd`, "must be a relative path inside the project root");
      return {
        type: "command",
        command,
        cwd,
        expectExitCode: optNum(v.expectExitCode, `${path}.expectExitCode`),
        expectStdout: optRegex(v.expectStdout, `${path}.expectStdout`),
        expectStderr: optRegex(v.expectStderr, `${path}.expectStderr`),
        timeoutMs: optNum(v.timeoutMs, `${path}.timeoutMs`),
        seedMustFail: optBool(v.seedMustFail, `${path}.seedMustFail`),
      };
    }
    case "testSuite": {
      const runner = str(v.runner, `${path}.runner`);
      if (!(TEST_RUNNERS as readonly string[]).includes(runner)) fail(`${path}.runner`, `must be one of ${TEST_RUNNERS.join("|")}`);
      const command = optStr(v.command, `${path}.command`);
      if ((runner === "tap" || runner === "custom") && !command) fail(`${path}.command`, `is required for runner "${runner}"`);
      const cwd = optStr(v.cwd, `${path}.cwd`);
      if (cwd !== undefined && (cwd.startsWith("/") || cwd.split(/[\\/]/).includes(".."))) fail(`${path}.cwd`, "must be a relative path inside the project root");
      const expectPass = strArray(v.expectPass, `${path}.expectPass`);
      const expectFail = strArray(v.expectFail, `${path}.expectFail`);
      const minPass = optNum(v.minPass, `${path}.minPass`);
      if (minPass !== undefined && (minPass < 0 || !Number.isInteger(minPass))) fail(`${path}.minPass`, "must be a non-negative integer");
      const dup = expectPass.find((n) => expectFail.includes(n));
      if (dup) fail(`${path}.expectFail`, `"${dup}" is listed in both expectPass and expectFail`);
      return { type: "testSuite", runner: runner as TestRunner, cwd, command, expectPass, minPass, expectFail, timeoutMs: optNum(v.timeoutMs, `${path}.timeoutMs`), seedMustFail: optBool(v.seedMustFail, `${path}.seedMustFail`) };
    }
    case "predict": {
      const prompt = localized(v.prompt, `${path}.prompt`);
      if (v.then === undefined || v.then === null) fail(`${path}.then`, "is required (the check that runs after the prediction, e.g. { type: command, ... })");
      const then = validateCheck(v.then, `${path}.then`);
      if (then.type === "predict") fail(`${path}.then.type`, "a predict check cannot nest another predict check");
      if (then.type === "question" || then.type === "manual") fail(`${path}.then.type`, `"${then.type}" cannot be the observed check of a prediction – use a command, testSuite, task, build or hardware check`);
      const minChars = optNum(v.minChars, `${path}.minChars`);
      return { type: "predict", prompt, then, rubric: optStr(v.rubric, `${path}.rubric`), bloom: optBloom(v.bloom, `${path}.bloom`), minChars };
    }
  }
}

function task(v: unknown, path: string): TaskSpec {
  if (!isRecord(v)) fail(path, "must be an object");
  const tid = id(v.id, `${path}.id`);
  const check = validateCheck(v.check, `${path}.check`);
  // `title` is optional in the SPEC example for some tasks – derive a fallback from the id.
  const title = v.title === undefined ? tid : localized(v.title, `${path}.title`);
  const description = v.description === undefined ? undefined : localized(v.description, `${path}.description`);
  return { id: tid, title, check, description };
}

export const KNOWN_TRIGGER_RE = /^(\*|task:[^:\s]+:(failed|stuck)|question:[^:\s]+:weak|event:[a-z-]+|test:.+:failed|output:.+)$/s;

/** Parses `output:<regex>` / `test:<name>:failed` triggers; `undefined` for the classic ones. */
export function parseTrigger(trigger: string): { kind: "output"; pattern: string } | { kind: "test"; name: string } | undefined {
  if (trigger.startsWith("output:")) return { kind: "output", pattern: trigger.slice("output:".length) };
  const m = /^test:(.+):failed$/s.exec(trigger);
  if (m) return { kind: "test", name: m[1] };
  return undefined;
}

function hintsList(v: unknown, path: string): Localized[] {
  if (!Array.isArray(v) || v.length === 0) fail(path, "must be a non-empty array (max 3 tiers)");
  return v.map((h: unknown, i: number) => localized(h, `${path}[${i}]`));
}

function socratic(v: unknown, path: string): SocraticHint {
  if (!isRecord(v)) fail(path, "must be an object");
  const trigger = str(v.trigger, `${path}.trigger`);
  if (!KNOWN_TRIGGER_RE.test(trigger)) {
    fail(`${path}.trigger`, `"${trigger}" is not a known trigger (task:<taskId>:failed|stuck, question:<taskId>:weak, test:<name>:failed, output:<regex>, event:<name>, *)`);
  }
  const parsed = parseTrigger(trigger);
  if (parsed?.kind === "output") regex(parsed.pattern, `${path}.trigger`);
  const question = localized(v.question, `${path}.question`);
  const hints = hintsList(v.hints, `${path}.hints`);
  return { trigger, question, hints };
}

function misconception(v: unknown, path: string): Misconception {
  if (!isRecord(v)) fail(path, "must be an object { pattern, question, hints }");
  const pattern = str(v.pattern, `${path}.pattern`);
  const flags = optStr(v.flags, `${path}.flags`);
  regex(pattern, `${path}.pattern`, flags);
  const question = localized(v.question, `${path}.question`);
  const hints = hintsList(v.hints, `${path}.hints`);
  return { pattern, flags, question, hints };
}

function optScaffold(v: unknown, path: string): Scaffold {
  if (v === undefined || v === null) return "independent";
  if (typeof v !== "string" || !(SCAFFOLD_LEVELS as readonly string[]).includes(v)) fail(path, `must be one of ${SCAFFOLD_LEVELS.join("|")}`);
  return v as Scaffold;
}

/** True if `spec` or any nested check (all/any/predict.then) has the given type. */
export function hasCheckType(spec: CheckSpec, type: CheckSpec["type"]): boolean {
  if (spec.type === type) return true;
  if (spec.type === "all" || spec.type === "any") return spec.checks.some((c) => hasCheckType(c, type));
  if (spec.type === "predict") return hasCheckType(spec.then, type);
  return false;
}

export function validateStepFrontMatter(raw: unknown, expectedId?: string): ValidationResult<StepFrontMatter> {
  const warnings: string[] = [];
  try {
    if (!isRecord(raw)) fail("front matter", "missing or not a YAML mapping");
    const sid = id(raw.id, "id");
    if (expectedId && sid !== expectedId) fail("id", `"${sid}" does not match the file name (expected "${expectedId}")`);
    const title = str(raw.title, "title");
    const bloom = optBloom(raw.bloom, "bloom") ?? (fail("bloom", `is required (${BLOOM_LEVELS.join("|")})`) as never);
    const objectives = strArray(raw.objectives, "objectives");
    const requires = strArray(raw.requires, "requires").map((r, i) => id(r, `requires[${i}]`));
    const estimatedMinutes = optNum(raw.estimatedMinutes, "estimatedMinutes");
    const links = raw.links === undefined ? [] : Array.isArray(raw.links) ? raw.links.map((l: unknown, i: number) => link(l, `links[${i}]`)) : fail("links", "must be an array");
    const tasks: TaskSpec[] = raw.tasks === undefined ? [] : Array.isArray(raw.tasks) ? raw.tasks.map((t: unknown, i: number) => task(t, `tasks[${i}]`)) : fail("tasks", "must be an array");
    const seen = new Set<string>();
    for (const t of tasks) {
      if (seen.has(t.id)) fail("tasks", `duplicate task id "${t.id}"`);
      seen.add(t.id);
    }
    const socraticHints: SocraticHint[] = raw.socratic === undefined ? [] : Array.isArray(raw.socratic) ? raw.socratic.map((s: unknown, i: number) => socratic(s, `socratic[${i}]`)) : fail("socratic", "must be an array");
    const creates = strArray(raw.creates, "creates");
    const sources = strArray(raw.sources, "sources");
    const scaffold = optScaffold(raw.scaffold, "scaffold");
    const recallFrom = strArray(raw.recallFrom, "recallFrom").map((r, i) => id(r, `recallFrom[${i}]`));
    if (recallFrom.includes(sid)) fail("recallFrom", "a step cannot recall from itself");
    const misconceptions: Misconception[] = raw.misconceptions === undefined ? [] : Array.isArray(raw.misconceptions) ? raw.misconceptions.map((m: unknown, i: number) => misconception(m, `misconceptions[${i}]`)) : fail("misconceptions", "must be an array");
    for (const s of socraticHints) {
      const m = /^(?:task|question):([^:]+):(?:failed|stuck|weak)$/.exec(s.trigger);
      if (m && !seen.has(m[1])) warnings.push(`socratic trigger "${s.trigger}" references unknown task "${m[1]}"`);
      if (s.hints.length > 3) warnings.push(`socratic trigger "${s.trigger}" has ${s.hints.length} hints; only the first 3 tiers are used`);
      if (s.trigger.startsWith("test:") && !tasks.some((t) => hasCheckType(t.check, "testSuite"))) warnings.push(`socratic trigger "${s.trigger}" needs a testSuite task in this step to ever fire`);
      if (s.trigger.startsWith("output:") && !tasks.some((t) => hasCheckType(t.check, "command") || hasCheckType(t.check, "testSuite"))) warnings.push(`socratic trigger "${s.trigger}" needs a command/testSuite task in this step to ever fire`);
    }
    for (const m of misconceptions) {
      if (m.hints.length > 3) warnings.push(`misconception /${m.pattern}/ has ${m.hints.length} hints; only the first 3 tiers are used`);
    }
    if (misconceptions.length > 0 && !tasks.some((t) => hasCheckType(t.check, "command") || hasCheckType(t.check, "testSuite"))) {
      warnings.push(`step "${sid}" declares misconceptions but has no command/testSuite task whose output they could match`);
    }
    // Unknown keys are tolerated so a pack written against a newer format still
    // loads, but a typo like `misconception:` would otherwise do nothing at all
    // and look like a runtime bug to the author.
    const KNOWN_STEP_FIELDS = new Set([
      "id", "title", "bloom", "objectives", "requires", "estimatedMinutes", "links", "tasks",
      "socratic", "creates", "sources", "scaffold", "recallFrom", "misconceptions",
      "description", "$schema", "_comment",
    ]);
    for (const key of Object.keys(raw)) {
      if (!KNOWN_STEP_FIELDS.has(key)) warnings.push(`step "${sid}": unknown front-matter field "${key}" is ignored`);
    }
    if (objectives.length === 0) warnings.push(`step "${sid}" has no objectives – mastery tracking and check-ins are disabled for it`);

    return { value: { id: sid, title, bloom, objectives, requires, estimatedMinutes, links, tasks, socratic: socraticHints, creates, sources, scaffold, recallFrom, misconceptions }, errors: [], warnings };
  } catch (err) {
    return { errors: [err instanceof Error ? err.message : String(err)], warnings };
  }
}
