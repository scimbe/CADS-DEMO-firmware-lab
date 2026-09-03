/**
 * Parsers for the test runners named in SPEC Addendum v1.1 A1 (`testSuite` check).
 *
 * Both parsers are pure string -> TestCaseResult[] functions so the same code is
 * exercised by unit tests and by the extension, and so a course author can rely on
 * `expectPass` naming a test exactly as its runner prints it.
 *
 * The shapes below were taken from real output (Node 26 `node --test
 * --test-reporter=tap`, cargo 1.x `cargo test`), not from documentation.
 */
import type { TestCaseResult, TestRunner } from "../types";

/** `test tests::nested::deep_case ... ok` (libtest's default, non-terse format). */
const CARGO_LINE = /^test\s+(\S+)\s+\.\.\.\s+(ok|FAILED|ignored)\b/;

/**
 * libtest prints one flat line per test, so every cargo case is a leaf at depth 0.
 * `--format terse` prints dots instead of names; nothing can be parsed from it and
 * the caller ends up with an empty list, which `evaluateSuite` reports as such.
 */
export function parseCargo(output: string): TestCaseResult[] {
  const out: TestCaseResult[] = [];
  for (const line of output.split(/\r?\n/)) {
    const m = CARGO_LINE.exec(line.trim());
    if (!m) continue;
    out.push({
      name: m[1],
      path: m[1],
      status: m[2] === "ok" ? "passed" : m[2] === "FAILED" ? "failed" : "skipped",
      depth: 0,
      leaf: true,
    });
  }
  return out;
}

const TAP_RESULT = /^(not ok|ok)\b\s*(\d+)?\s*(?:-\s*)?(.*)$/;
const TAP_SUBTEST = /^#\s*Subtest:\s*(.*)$/;

interface Frame {
  indent: number;
  name: string;
  children: number;
}

/**
 * Generic TAP 13, including the nesting `node --test` emits: a `# Subtest: <name>`
 * line opens a scope, its children are indented by four spaces, and the matching
 * `ok N - <name>` closes it at the opening indent.
 *
 * A test that opened subtests is reported with `leaf: false`. That distinction
 * matters because a parent's status only mirrors its children, so counting parents
 * towards `minPass` would double-count. `# SKIP` and `# TODO` directives are
 * recorded as `skipped` rather than as passes.
 */
export function parseTap(output: string): TestCaseResult[] {
  const out: TestCaseResult[] = [];
  const stack: Frame[] = [];
  for (const raw of output.split(/\r?\n/)) {
    const indent = raw.length - raw.replace(/^ +/, "").length;
    const line = raw.trim();

    const sub = TAP_SUBTEST.exec(line);
    if (sub) {
      while (stack.length > 0 && stack[stack.length - 1].indent >= indent) stack.pop();
      if (stack.length > 0) stack[stack.length - 1].children += 1;
      stack.push({ indent, name: sub[1].trim(), children: 0 });
      continue;
    }

    if (!/^(ok|not ok)\b/.test(line)) continue;
    const m = TAP_RESULT.exec(line);
    if (!m) continue;

    while (stack.length > 0 && stack[stack.length - 1].indent > indent) stack.pop();
    let frame: Frame | undefined;
    if (stack.length > 0 && stack[stack.length - 1].indent === indent) frame = stack.pop();

    // Everything after a bare `#` is a TAP directive, not part of the name.
    const rest = m[3];
    const hash = rest.indexOf("#");
    const name = (hash >= 0 ? rest.slice(0, hash) : rest).trim();
    const directive = hash >= 0 ? rest.slice(hash + 1).toLowerCase() : "";

    const status: TestCaseResult["status"] = /\b(skip|todo)\b/.test(directive)
      ? "skipped"
      : m[1] === "ok"
        ? "passed"
        : "failed";

    out.push({
      name: name || frame?.name || "",
      path: [...stack.map((f) => f.name), name || frame?.name || ""].join(" > "),
      status,
      depth: stack.length,
      leaf: (frame?.children ?? 0) === 0,
    });
  }
  return out;
}

export function parseTestOutput(output: string, runner: TestRunner): TestCaseResult[] {
  return runner === "cargo" ? parseCargo(output) : parseTap(output);
}

/**
 * A test is addressable by its leaf name and, when nested, by its full
 * `outer > inner` path, so `expectPass` may use whichever is unambiguous.
 * A later duplicate name does not hide an earlier failure: once a name has failed,
 * it stays failed, which keeps `expectPass` honest when a name repeats across files.
 */
export function indexTests(tests: TestCaseResult[]): Map<string, TestCaseResult> {
  const byKey = new Map<string, TestCaseResult>();
  const put = (key: string, t: TestCaseResult) => {
    if (!key) return;
    const prev = byKey.get(key);
    if (prev === undefined || (prev.status === "passed" && t.status !== "passed")) byKey.set(key, t);
  };
  for (const t of tests) {
    put(t.name, t);
    put(t.path, t);
  }
  return byKey;
}

export interface SuiteExpectation {
  expectPass?: string[];
  expectFail?: string[];
  minPass?: number;
}

export interface SuiteVerdict {
  passed: boolean;
  message: string;
  /** Names from `expectPass` that did not pass, and `expectFail` names that did. */
  failedNames: string[];
}

/**
 * Applies the A1 rule: passed when every `expectPass` test passed, every
 * `expectFail` test failed, and at least `minPass` leaf tests passed. With none
 * of the three given, the suite passes when it produced results and none failed.
 */
export function evaluateSuite(tests: TestCaseResult[], expect: SuiteExpectation): SuiteVerdict {
  const byKey = indexTests(tests);
  const leaves = tests.filter((t) => t.leaf);
  const passedLeaves = leaves.filter((t) => t.status === "passed").length;
  const failedNames: string[] = [];
  const problems: string[] = [];

  for (const name of expect.expectPass ?? []) {
    const t = byKey.get(name);
    if (t === undefined) {
      failedNames.push(name);
      problems.push(`expected test "${name}" to pass, but no test of that name ran`);
    } else if (t.status !== "passed") {
      failedNames.push(name);
      problems.push(`expected test "${name}" to pass, but it ${t.status === "failed" ? "failed" : "was skipped"}`);
    }
  }
  for (const name of expect.expectFail ?? []) {
    const t = byKey.get(name);
    if (t === undefined) {
      failedNames.push(name);
      problems.push(`expected test "${name}" to fail, but no test of that name ran`);
    } else if (t.status === "passed") {
      failedNames.push(name);
      problems.push(`expected test "${name}" to fail, but it passed`);
    }
  }
  if (expect.minPass !== undefined && passedLeaves < expect.minPass) {
    problems.push(`only ${passedLeaves} of the required ${expect.minPass} tests passed`);
  }

  const hasExpectation = (expect.expectPass?.length ?? 0) > 0 || (expect.expectFail?.length ?? 0) > 0 || expect.minPass !== undefined;
  if (!hasExpectation) {
    if (tests.length === 0) return { passed: false, message: "no test results could be parsed from the output", failedNames };
    const failed = leaves.filter((t) => t.status === "failed");
    if (failed.length > 0) {
      return { passed: false, message: `${failed.length} test(s) failed: ${failed.slice(0, 5).map((t) => t.path || t.name).join(", ")}`, failedNames: failed.map((t) => t.name) };
    }
  }

  if (problems.length > 0) return { passed: false, message: problems.join("; "), failedNames };
  const skipped = leaves.filter((t) => t.status === "skipped").length;
  return {
    passed: true,
    message: `${passedLeaves} test(s) passed${skipped > 0 ? `, ${skipped} skipped` : ""}`,
    failedNames,
  };
}

/** Names of the tests that failed, for the `test:<name>:failed` trigger (A2). */
export function failedTestNames(tests: TestCaseResult[]): string[] {
  const names = new Set<string>();
  for (const t of tests) {
    if (t.status !== "failed") continue;
    if (t.name) names.add(t.name);
    if (t.path && t.path !== t.name) names.add(t.path);
  }
  return [...names];
}

/** The command a runner uses when the check does not override it. */
export function defaultSuiteCommand(runner: TestRunner, command?: string): string | undefined {
  if (command) return command;
  if (runner === "cargo") return "cargo test";
  if (runner === "node-test") return "node --test --test-reporter=tap";
  return undefined; // `tap` and `custom` require an explicit command (enforced by the schema).
}
