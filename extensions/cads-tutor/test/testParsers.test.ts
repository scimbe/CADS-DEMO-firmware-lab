import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { defaultSuiteCommand, evaluateSuite, failedTestNames, indexTests, parseCargo, parseTap } from "../src/checks/testParsers";

const FIXTURES = path.resolve(__dirname, "..", "..", "test", "fixtures");
/** Recorded from a real `cargo test` and a real `node --test --test-reporter=tap` run. */
const CARGO = fs.readFileSync(path.join(FIXTURES, "cargo-test.txt"), "utf8");
const NODE_TAP = fs.readFileSync(path.join(FIXTURES, "node-test.tap.txt"), "utf8");

describe("cargo output parser", () => {
  const tests = parseCargo(CARGO);

  it("reads every test line of a real cargo run", () => {
    assert.deepEqual(
      tests.map((t) => [t.name, t.status]),
      [
        ["tests::ignored_one", "skipped"],
        ["tests::adds", "passed"],
        ["tests::nested::deep_case", "passed"],
        ["tests::fails_on_purpose", "failed"],
      ],
    );
  });
  it("treats every libtest case as a flat leaf", () => {
    assert.ok(tests.every((t) => t.leaf && t.depth === 0 && t.path === t.name));
  });
  it("keeps module paths intact so expectPass can name them", () => {
    assert.ok(tests.some((t) => t.name === "tests::nested::deep_case"));
  });
  it("returns nothing for terse output rather than inventing passes", () => {
    assert.deepEqual(parseCargo("running 4 tests\n....\ntest result: ok. 4 passed;"), []);
  });
});

describe("TAP / node --test parser", () => {
  const tests = parseTap(NODE_TAP);
  const byPath = new Map(tests.map((t) => [t.path, t]));

  it("recovers the nesting of a real node --test run", () => {
    assert.equal(byPath.get("outer suite > inner passes")?.status, "passed");
    assert.equal(byPath.get("outer suite > inner fails")?.status, "failed");
    assert.equal(byPath.get("outer suite > deep > deepest ok")?.status, "passed");
    assert.equal(byPath.get("top level ok")?.status, "passed");
  });
  it("records the depth of each subtest", () => {
    assert.equal(byPath.get("outer suite > inner passes")?.depth, 1);
    assert.equal(byPath.get("outer suite > deep > deepest ok")?.depth, 2);
    assert.equal(byPath.get("top level ok")?.depth, 0);
  });
  it("marks a test that owns subtests as a non-leaf", () => {
    assert.equal(byPath.get("outer suite")?.leaf, false);
    assert.equal(byPath.get("outer suite > deep")?.leaf, false);
    assert.equal(byPath.get("outer suite > inner passes")?.leaf, true);
  });
  it("reads SKIP and TODO directives as skipped, not as passes", () => {
    assert.equal(byPath.get("skipped one")?.status, "skipped");
    assert.equal(byPath.get("todo one")?.status, "skipped");
  });
  it("strips the directive from the test name", () => {
    assert.ok(tests.some((t) => t.name === "skipped one"));
    assert.ok(!tests.some((t) => /#/.test(t.name)));
  });
  it("propagates a child failure to its parent, as node reports it", () => {
    assert.equal(byPath.get("outer suite")?.status, "failed");
  });
  it("parses plain TAP without subtests", () => {
    const t = parseTap("TAP version 13\nok 1 - alpha\nnot ok 2 - beta\n1..2\n");
    assert.deepEqual(t.map((x) => [x.name, x.status, x.leaf]), [["alpha", "passed", true], ["beta", "failed", true]]);
  });
  it("ignores the plan line and YAML diagnostic blocks", () => {
    assert.ok(!tests.some((t) => t.name.startsWith("1..")));
    assert.ok(!tests.some((t) => t.name.includes("duration_ms")));
  });
});

describe("test indexing", () => {
  it("addresses a nested test by leaf name and by full path", () => {
    const idx = indexTests(parseTap(NODE_TAP));
    assert.equal(idx.get("inner passes")?.status, "passed");
    assert.equal(idx.get("outer suite > inner passes")?.status, "passed");
  });
  it("lets a failure win over an earlier same-named pass", () => {
    const idx = indexTests(parseTap("ok 1 - dup\nnot ok 2 - dup\n"));
    assert.equal(idx.get("dup")?.status, "failed");
  });
});

describe("suite evaluation", () => {
  const tests = parseTap(NODE_TAP);
  const cargo = parseCargo(CARGO);

  it("passes when every expectPass test passed", () => {
    const v = evaluateSuite(tests, { expectPass: ["inner passes", "top level ok"] });
    assert.equal(v.passed, true);
  });
  it("fails and names the test when an expectPass test failed", () => {
    const v = evaluateSuite(tests, { expectPass: ["inner fails"] });
    assert.equal(v.passed, false);
    assert.match(v.message, /"inner fails" to pass, but it failed/);
    assert.deepEqual(v.failedNames, ["inner fails"]);
  });
  it("distinguishes a missing test from a failing one", () => {
    assert.match(evaluateSuite(tests, { expectPass: ["never written"] }).message, /no test of that name ran/);
  });
  it("treats a skipped test as not passing", () => {
    assert.match(evaluateSuite(tests, { expectPass: ["skipped one"] }).message, /was skipped/);
  });
  it("supports expectFail for a test that must still be red", () => {
    assert.equal(evaluateSuite(tests, { expectFail: ["inner fails"] }).passed, true);
    assert.match(evaluateSuite(tests, { expectFail: ["top level ok"] }).message, /to fail, but it passed/);
  });
  it("counts only leaves towards minPass, so a parent is not double-counted", () => {
    // Leaves that passed: inner passes, deepest ok, top level ok = 3.
    assert.equal(evaluateSuite(tests, { minPass: 3 }).passed, true);
    assert.match(evaluateSuite(tests, { minPass: 4 }).message, /only 3 of the required 4/);
  });
  it("with no expectation set, passes only when nothing failed", () => {
    assert.equal(evaluateSuite(tests, {}).passed, false);
    assert.equal(evaluateSuite(parseTap("ok 1 - a\nok 2 - b\n"), {}).passed, true);
  });
  it("reports unparseable output instead of silently passing", () => {
    const v = evaluateSuite([], {});
    assert.equal(v.passed, false);
    assert.match(v.message, /no test results could be parsed/);
  });
  it("evaluates cargo results the same way", () => {
    assert.equal(evaluateSuite(cargo, { expectPass: ["tests::adds", "tests::nested::deep_case"] }).passed, true);
    assert.equal(evaluateSuite(cargo, { minPass: 2 }).passed, true);
    assert.match(evaluateSuite(cargo, { expectPass: ["tests::fails_on_purpose"] }).message, /it failed/);
  });
});

describe("failed test names for triggers", () => {
  it("lists a failed test under both its leaf name and its path", () => {
    const names = failedTestNames(parseTap(NODE_TAP));
    assert.ok(names.includes("inner fails"));
    assert.ok(names.includes("outer suite > inner fails"));
  });
  it("is empty when everything passed", () => {
    assert.deepEqual(failedTestNames(parseTap("ok 1 - a\n")), []);
  });
});

describe("default suite commands", () => {
  it("matches the runners documented in the addendum", () => {
    assert.equal(defaultSuiteCommand("cargo"), "cargo test");
    assert.equal(defaultSuiteCommand("node-test"), "node --test --test-reporter=tap");
    assert.equal(defaultSuiteCommand("tap"), undefined);
    assert.equal(defaultSuiteCommand("custom"), undefined);
  });
  it("lets a check override the default", () => {
    assert.equal(defaultSuiteCommand("cargo", "cargo test --all"), "cargo test --all");
  });
});

describe("cargo #[should_panic] tests", () => {
  // rust2's report: the marker between the name and the dots made the parser
  // drop the line, so expectPass naming such a test reported it as never run.
  const SP = fs.readFileSync(path.join(FIXTURES, "cargo-should-panic.txt"), "utf8");
  const tests = parseCargo(SP);

  it("reads a should-panic test that passed", () => {
    const t = tests.find((x) => x.name === "m5_01_panic_vs_result::element_at_panics_with_a_useful_message");
    assert.ok(t, `parsed: ${tests.map((x) => x.name).join(", ")}`);
    assert.equal(t!.status, "passed");
  });
  it("reads a should-panic test that failed", () => {
    assert.equal(tests.find((x) => x.name === "m5_01_panic_vs_result::broken_should_panic")!.status, "failed");
  });
  it("reads a should-panic test that was ignored", () => {
    assert.equal(tests.find((x) => x.name === "m5_01_panic_vs_result::ignored_case")!.status, "skipped");
  });
  it("finds every one of the eight printed lines, marked or not", () => {
    assert.equal(tests.length, 6, `got ${tests.length}: ${tests.map((x) => x.name).join(", ")}`);
  });
  it("lets expectPass name a should-panic test", () => {
    const v = evaluateSuite(tests, { expectPass: ["m5_01_panic_vs_result::divide_panics_on_zero"] });
    assert.equal(v.passed, true, v.message);
  });
  it("keeps the marker out of the test name", () => {
    // One test is genuinely called broken_should_panic, so look for the marker
    // itself rather than the word.
    assert.ok(!tests.some((t) => / - should panic/.test(t.name)));
    assert.ok(tests.some((t) => t.name === "m5_01_panic_vs_result::broken_should_panic"));
  });
});

describe("a test file that could not be loaded", () => {
  // node reports the whole FILE as a failed test; its named tests never run.
  // "no test of that name ran" is true but useless to a beginner.
  const OUT = [
    "TAP version 13",
    "# Subtest: test/m0-04-modules.test.js",
    "not ok 1 - test/m0-04-modules.test.js",
    "  ---",
    "  error: 'test failed'",
    "  ...",
    "# Subtest: m0-01 the workspace is ready",
    "ok 2 - m0-01 the workspace is ready",
    "1..2",
  ].join("\n");
  const tests = parseTap(OUT);

  it("marks the file entry as a file, not as a test the student wrote", () => {
    const f = tests.find((t) => t.name === "test/m0-04-modules.test.js")!;
    assert.equal(f.file, true);
    const real = tests.find((t) => t.name === "m0-01 the workspace is ready")!;
    assert.equal(real.file, false);
  });
  it("explains that the file failed to load instead of denying the test exists", () => {
    const v = evaluateSuite(tests, { expectPass: ["m0-04 named exports square and cube"] });
    assert.equal(v.passed, false);
    assert.match(v.message, /never ran/);
    assert.match(v.message, /test\/m0-04-modules\.test\.js could not be loaded/);
    assert.doesNotMatch(v.message, /no test of that name ran/);
  });
  it("still says so plainly when nothing failed to load", () => {
    const clean = parseTap("ok 1 - something else\n");
    assert.match(evaluateSuite(clean, { expectPass: ["absent"] }).message, /no test of that name ran/);
  });
  it("does not count a file entry towards minPass", () => {
    const v = evaluateSuite(tests, { minPass: 2 });
    assert.equal(v.passed, false, "only one real test passed");
    assert.equal(evaluateSuite(tests, { minPass: 1 }).passed, true);
  });
});
