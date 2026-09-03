#!/usr/bin/env node
// CaDS Tutor Lab - browser smoke test for images/tutor-lab (SPEC.md Addendum A4).
//
// Against a running container (scripts/run-local-tutor-lab.sh), headless Chromium:
//   0. seed + the image carries only the tutor and the language tooling
//      (no cads-probe / cads-board-bridge, no shims, no cortex-debug, no ARM gcc)
//   1. login with the password -> multi-root workspace cads-tutor.code-workspace
//   2. workbench: app name in the title, no Restricted Mode, both folders in the
//      Explorer, no prompt / chat side bar / notification 30 s after load
//   3. tutor: the CaDS Tutor view opens (with or without course packs)
//   4. integrated terminal: cargo --version, node --version (22.x), and both
//      test runners really running in their workspace (< 60 s). A starter
//      workspace is EXPECTED to fail most of its tests - the exercises are
//      unsolved - so the assertion is "a summary appears and at least one test
//      passes", which separates a broken toolchain from unsolved exercises.
//
// Usage:
//   CADS_LAB_PASSWORD=... node e2e/tutor-lab-smoke.mjs
// Env: CADS_LAB_URL (http://127.0.0.1:8089), CADS_LAB_CONTAINER (tutor-lab-local),
//      PW_MODULE / PW_CHROMIUM (see image-smoke.mjs), E2E_OUT (screenshots, e2e/out/tutor-lab).
//
// Terminal output is verified through the container (docker exec), because
// xterm.js renders to canvas and its text is not in the DOM.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const URL = process.env.CADS_LAB_URL ?? "http://127.0.0.1:8089";
const PASSWORD = process.env.CADS_LAB_PASSWORD;
const CONTAINER = process.env.CADS_LAB_CONTAINER ?? "tutor-lab-local";
const OUT = process.env.E2E_OUT ?? "e2e/out/tutor-lab";
const ROOT = "/home/coder/workspace";
const RUST_WS = `${ROOT}/rust-foundations`;
const JS_WS = `${ROOT}/javascript-foundations`;
const CARGO_TEST_BUDGET_S = Number(process.env.CARGO_TEST_BUDGET_S ?? 60);

if (!PASSWORD) fail("CADS_LAB_PASSWORD is required");

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}
function ok(msg) {
  console.log(`ok - ${msg}`);
}
function dexec(cmd) {
  return execFileSync("docker", ["exec", CONTAINER, "bash", "-lc", cmd], { encoding: "utf8" });
}
function findPlaywright() {
  if (process.env.PW_MODULE) return process.env.PW_MODULE;
  const npx = join(process.env.HOME ?? "", ".npm/_npx");
  if (existsSync(npx)) {
    for (const d of readdirSync(npx)) {
      for (const name of ["playwright", "playwright-core"]) {
        const p = join(npx, d, "node_modules", name);
        if (existsSync(p)) return p;
      }
    }
  }
  fail("no playwright module found - set PW_MODULE");
}
function findChromium() {
  if (process.env.PW_CHROMIUM) return process.env.PW_CHROMIUM;
  const cache = join(process.env.HOME ?? "", "Library/Caches/ms-playwright");
  const alt = join(process.env.HOME ?? "", ".cache/ms-playwright");
  for (const dir of [cache, alt]) {
    if (!existsSync(dir)) continue;
    const shells = readdirSync(dir).filter((d) => d.startsWith("chromium_headless_shell-")).sort().reverse();
    for (const s of shells) {
      const base = join(dir, s);
      for (const sub of readdirSync(base)) {
        const exe = join(base, sub, "chrome-headless-shell");
        if (existsSync(exe)) return exe;
      }
    }
  }
  return undefined;
}
async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// 0. container side: entrypoint seeded both workspaces + the workspace file
const seedLog = execFileSync("docker", ["logs", CONTAINER], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
  .split("\n")
  .filter((l) => l.includes("[cads-seed]"));
const seeded = dexec(
  `for d in ${RUST_WS} ${JS_WS}; do test -d $d && echo "dir $d"; done; test -f ${ROOT}/cads-tutor.code-workspace && echo wsfile; ` +
    `test -f ${RUST_WS}/.vscode/settings.json && echo rust-settings; test -f ${JS_WS}/.vscode/settings.json && echo js-settings; ` +
    `ls ${RUST_WS}/PLACEHOLDER.md ${JS_WS}/PLACEHOLDER.md 2>/dev/null | wc -l`
);
for (const want of [`dir ${RUST_WS}`, `dir ${JS_WS}`, "wsfile", "rust-settings", "js-settings"]) {
  if (!seeded.includes(want)) fail(`seed incomplete (missing "${want}"):\n${seeded}\nentrypoint log:\n${seedLog.join("\n")}`);
}
const placeholders = Number(seeded.trim().split("\n").pop());
ok(`seed: both workspaces, cads-tutor.code-workspace and .vscode/settings.json present (${placeholders} placeholder workspace(s))`);

// 0b. this image carries the tutor and the language tooling, and nothing for a
// board: no cads-probe / cads-board-bridge, no st-flash / st-info shims, no
// cortex-debug, no ARM toolchain. Rust and JavaScript students neither flash nor
// debug through a probe, and hiding board actions in a non-hardware course is the
// tutor runtime's job. Asserted here so a later "helpful" addition is caught.
const installed = dexec("code-server --list-extensions 2>/dev/null || true")
  .split("\n")
  .map((l) => l.trim())
  .filter(Boolean);
const forbiddenExtensions = installed.filter((e) => /cads-probe|cads-board-bridge|cortex-debug|peripheral-viewer|debug-tracker|rtos-views|memory-view/i.test(e));
if (forbiddenExtensions.length) fail(`board/probe extensions in the tutor-lab image: ${JSON.stringify(forbiddenExtensions)}`);
const forbiddenTools = dexec(
  "for t in st-flash st-info arm-none-eabi-gcc arm-none-eabi-gdb gdb-multiarch openocd; do command -v $t 2>/dev/null; done; true"
).trim();
if (forbiddenTools) fail(`firmware/board tooling on PATH in the tutor-lab image:\n${forbiddenTools}`);
const expected = ["cads.cads-tutor", "dbaeumer.vscode-eslint", "rust-lang.rust-analyzer", "vadimcn.vscode-lldb"];
const missing = expected.filter((e) => !installed.includes(e));
ok(`extensions: ${JSON.stringify(installed)}${missing.length ? ` (not installed: ${JSON.stringify(missing)})` : ""}; no board/probe extension, no firmware tooling on PATH`);

const pwPath = findPlaywright();
const pwModule = await import(pathToFileURL(join(pwPath, "index.js")).href);
const chromium = pwModule.chromium ?? pwModule.default?.chromium;
if (!chromium) fail(`playwright at ${pwPath} exports no chromium`);
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true, executablePath: findChromium() });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.setDefaultTimeout(60_000);

try {
  // 1. login
  await page.goto(URL + "/");
  await page.waitForURL(/\/login/);
  await page.fill('input[name="password"]', PASSWORD);
  await page.press('input[name="password"]', "Enter");
  await page.waitForURL(/workspace=/);
  ok(`login accepted, redirected to ${page.url()}`);

  // 2. workbench
  await page.waitForSelector(".monaco-workbench");
  await page.waitForSelector("#workbench\\.parts\\.statusbar");
  await page.waitForFunction(() => document.title.includes("cads-tutor"));
  await sleep(8000); // extensions activate
  const title = await page.title();
  if (!title.includes("CaDS Tutor Lab")) fail(`title lacks app name: ${title}`);
  const restricted = await page.evaluate(() => document.body.innerText.includes("Restricted Mode"));
  if (restricted) fail("workspace opened in Restricted Mode");
  const sidebarTitle = await page.evaluate(() => document.querySelector(".sidebar .composite.title h2")?.innerText.trim() ?? "");
  await page.screenshot({ path: join(OUT, "01-workbench.png") });
  ok(`workbench: title="${title}", no Restricted Mode, side bar="${sidebarTitle}"`);

  // No prompt, no Copilot chat side bar, no notifications 10 s after load ...
  await sleep(10_000);
  const startupUi = await page.evaluate(() => {
    const qi = document.querySelector(".quick-input-widget");
    const qiVisible = qi && qi.style.display !== "none" && qi.getBoundingClientRect().height > 0;
    const aux = document.getElementById("workbench.parts.auxiliarybar");
    const auxVisible = aux && aux.getBoundingClientRect().width > 0 && !aux.classList.contains("hidden");
    return {
      prompt: qiVisible ? qi.querySelector("input")?.placeholder ?? "(quick input)" : null,
      chatBar: !!auxVisible,
      notifications: [...document.querySelectorAll(".notification-list-item-message")].map((e) => e.innerText),
    };
  });
  await page.screenshot({ path: join(OUT, "01b-after-startup.png") });
  if (startupUi.prompt) fail(`a prompt is open after startup: "${startupUi.prompt}"`);
  if (startupUi.chatBar) fail("the secondary side bar (Copilot chat) is visible after startup");
  if (startupUi.notifications.length) fail(`notifications after startup: ${JSON.stringify(startupUi.notifications)}`);
  ok("no prompt, no chat side bar, no notifications 18 s after load");

  // Explorer: multi-root with both folders.
  await runCommand(page, "View: Show Explorer");
  await sleep(1500);
  const explorerHeaders = await page.evaluate(() =>
    [...document.querySelectorAll(".explorer-folders-view .monaco-list-row[aria-level='1'], .explorer-viewlet .pane-header")]
      .map((h) => h.innerText.trim())
      .filter(Boolean)
  );
  const hasRust = explorerHeaders.some((h) => /rust foundations|rust-foundations/i.test(h));
  const hasJs = explorerHeaders.some((h) => /javascript foundations|javascript-foundations/i.test(h));
  await page.screenshot({ path: join(OUT, "01c-explorer.png") });
  if (!hasRust || !hasJs) fail(`Explorer does not show both workspace folders: ${JSON.stringify(explorerHeaders)}`);
  ok(`Explorer shows both folders (${JSON.stringify(explorerHeaders.filter((h) => /foundations/i.test(h)))})`);

  // Status bar.
  const statusbar = await page.evaluate(() =>
    [...document.querySelectorAll("#workbench\\.parts\\.statusbar .statusbar-item")]
      .map((e) => e.innerText.trim())
      .filter(Boolean)
  );
  const pending = statusbar.find((t) => /pending change/i.test(t));
  if (pending) fail(`Source Control shows pending changes: "${pending}"`);
  const tutorItem = statusbar.find((t) => /tutor/i.test(t));
  ok(`status bar: ${JSON.stringify(statusbar)}${tutorItem ? ` (tutor item: "${tutorItem}")` : " (no tutor status item - no course packs?)"}`);

  // ... and still none 30 s after load (late extension notifications).
  await sleep(12_000);
  const lateNotifications = await page.evaluate(() =>
    [...document.querySelectorAll(".notification-list-item-message")].map((e) => e.innerText)
  );
  if (lateNotifications.length) fail(`notifications 30 s after load: ${JSON.stringify(lateNotifications)}`);
  ok("still no notifications 30 s after load");
  await page.keyboard.press("Escape");

  // 3. tutor view
  const courses = dexec("ls -d /opt/cads-tutor/courses/*/ 2>/dev/null | xargs -n1 basename 2>/dev/null || true").trim().split("\n").filter(Boolean);
  const tutorInstalled = dexec("code-server --list-extensions 2>/dev/null | grep -c cads-tutor || true").trim() !== "0";
  if (!tutorInstalled) {
    ok("cads-tutor is NOT installed in this image (no VSIX at build time) - tutor checks skipped");
  } else {
    await runCommand(page, "CaDS Tutor: Tutor öffnen / Open Tutor");
    await sleep(5000);
    const tutorUi = await page.evaluate(() => ({
      sidebar: document.querySelector(".sidebar .composite.title h2")?.innerText.trim() ?? "",
      views: [...document.querySelectorAll(".sidebar .pane-header")].map((h) => h.innerText.trim()),
      editors: [...document.querySelectorAll(".editor-group-container .tab")].map((t) => t.getAttribute("aria-label") ?? t.innerText.trim()),
      welcome: document.querySelector(".sidebar .welcome-view-content")?.innerText.trim().slice(0, 120) ?? "",
      notifications: [...document.querySelectorAll(".notification-list-item-message")].map((e) => e.innerText),
    }));
    await page.screenshot({ path: join(OUT, "02-tutor.png") });
    const tutorOpen = /cads.?tutor/i.test(tutorUi.sidebar) || tutorUi.editors.some((e) => /tutor/i.test(e));
    if (courses.length === 0) {
      // The rust/javascript course packs are built in their own streams. Until they
      // are merged the image ships none, the tutor has nothing to open, and the only
      // correct behaviour is to say so. Once a pack is in the image this branch is
      // skipped and the panel itself is asserted.
      const saysSo = tutorUi.notifications.some((n) => /no course packs|keine kurse/i.test(n)) ||
        /keine kurse|no courses/i.test(tutorUi.welcome);
      if (!saysSo) fail(`no course packs in the image, but the tutor does not report that: ${JSON.stringify(tutorUi)}`);
      ok(`no course packs in this image yet - tutor reports it (${JSON.stringify(tutorUi.notifications)}); panel checks skipped`);
      await page.keyboard.press("Escape");
    } else {
      if (!tutorOpen) fail(`tutor view did not open: ${JSON.stringify(tutorUi)}`);
      ok(`tutor view open: side bar="${tutorUi.sidebar}", views=${JSON.stringify(tutorUi.views)}, editors=${JSON.stringify(tutorUi.editors)}, course packs=${JSON.stringify(courses)}`);
    }
  }

  // 4. terminal: toolchains + tests
  const marker = "/tmp/e2e-tutor-lab.txt";
  dexec(`rm -f ${marker}`);
  const shells = () => Number(dexec("pgrep -u coder -x bash | wc -l").trim());
  const shellsBefore = shells();
  await runCommand(page, "Terminal: Create New Terminal");
  for (let i = 0; i < 30 && shells() <= shellsBefore; i++) await sleep(1000);
  await sleep(1500);
  // A multi-root workspace without terminal.integrated.cwd asks "Select current
  // working directory for new terminal" instead of opening one - that prompt is
  // what the image setting removes, so name it when it comes back.
  const cwdPrompt = await page.evaluate(() => {
    const qi = document.querySelector(".quick-input-widget");
    const visible = qi && qi.style.display !== "none" && qi.getBoundingClientRect().height > 0;
    return visible ? qi.querySelector("input")?.placeholder ?? "(quick input)" : null;
  });
  if (cwdPrompt) fail(`Terminal: Create New Terminal opened a prompt instead of a terminal: "${cwdPrompt}" (terminal.integrated.cwd missing?)`);
  await page.focus(".terminal-wrapper.active .xterm-helper-textarea");
  // Rust runs ONE test target, the way a course `testSuite` check does, not a
  // bare `cargo test`: a starter workspace legitimately contains a target that
  // does not compile yet (a step whose job is to make it compile), and a
  // whole-workspace `cargo test` aborts on it and reports nothing at all. The
  // target is picked at run time - the first one that compiles - so the check
  // stays independent of the course content.
  const script =
    `{ cargo --version; node --version; ` +
    `s=$(date +%s); (cd ${RUST_WS} && step=$(for f in tests/*.rs; do n=$(basename "$f" .rs); ` +
    `if cargo test --test "$n" --no-run >/dev/null 2>&1; then echo "$n"; break; fi; done); ` +
    `echo "cargo_step=$step"; cargo test --test "$step" 2>&1 | grep -E '^test result:'); ` +
    `echo "cargo_test_exit=\${PIPESTATUS[0]} cargo_test_s=$(( $(date +%s) - s ))"; ` +
    `t=$(date +%s); (cd ${JS_WS} && node --test 2>&1 | grep -E '^# (tests|pass|fail|suites)'); ` +
    `echo "node_test_exit=\${PIPESTATUS[0]} node_test_s=$(( $(date +%s) - t ))"; echo E2E_DONE; } > ${marker} 2>&1`;
  await page.keyboard.type(script);
  await page.keyboard.press("Enter");
  let out = "";
  for (let i = 0; i < 180 && !out.includes("E2E_DONE"); i++) {
    await sleep(1000);
    out = stripAnsi(dexec(`cat ${marker} 2>/dev/null || true`));
  }
  await page.screenshot({ path: join(OUT, "03-terminal.png") });
  if (!out.includes("E2E_DONE")) fail(`terminal script did not finish within 180 s:\n${out}`);
  const cargoV = out.match(/^cargo \S+/m)?.[0];
  const nodeV = out.match(/^v22\.\d+\.\d+/m)?.[0];
  if (!cargoV) fail(`cargo --version missing:\n${out}`);
  if (!nodeV) fail(`node --version is not 22.x:\n${out}`);
  // What "the test suite runs" means in a STARTER workspace: the runner must
  // execute and report results, not exit zero. The exercises are unsolved by
  // design - `todo!()` bodies in Rust, a thrown TODO or the bug the step is
  // about in JavaScript - so a green suite here would mean the exercises had
  // been solved and the course had nothing left to teach. What must hold is
  // that the toolchain really runs tests: a result summary appears, and at
  // least one test passes (the steps that hand the student a worked example).
  // A broken toolchain or a workspace cargo cannot find looks completely
  // different - no summary at all - and that is what this catches.
  const cargoExit = out.match(/cargo_test_exit=(\d+) cargo_test_s=(\d+)/);
  if (!cargoExit) fail(`cargo test did not report an exit code:\n${out}`);
  const cargoS = Number(cargoExit[2]);
  if (cargoS > CARGO_TEST_BUDGET_S) fail(`cargo test took ${cargoS} s (> ${CARGO_TEST_BUDGET_S} s):\n${out}`);
  const cargoStep = out.match(/^cargo_step=(\S+)/m)?.[1];
  if (!cargoStep) fail(`no test target in ${RUST_WS} compiles - the workspace, not one exercise, is broken:\n${out}`);
  const cargoSummaries = [...out.matchAll(/^test result: (?:ok|FAILED)\. (\d+) passed; (\d+) failed/gm)];
  if (!cargoSummaries.length) fail(`cargo test --test ${cargoStep} produced no "test result:" summary - the toolchain, not the exercises, is broken:\n${out}`);
  const cargoPassed = cargoSummaries.reduce((a, m) => a + Number(m[1]), 0);
  const cargoFailed = cargoSummaries.reduce((a, m) => a + Number(m[2]), 0);
  if (cargoPassed === 0) fail(`cargo test --test ${cargoStep} ran but not one test passed - that is a toolchain problem, not unsolved exercises:\n${out}`);

  const nodeExit = out.match(/node_test_exit=(\d+) node_test_s=(\d+)/);
  const nodeTests = out.match(/^# tests (\d+)/m)?.[1];
  const nodeFail = out.match(/^# fail (\d+)/m)?.[1];
  const nodePass = out.match(/^# pass (\d+)/m)?.[1];
  if (!nodeExit) fail(`node --test did not report an exit code:\n${out}`);
  if (nodeTests === undefined || nodePass === undefined || nodeFail === undefined) {
    fail(`node --test produced no summary - the runner itself is broken:\n${out}`);
  }
  if (Number(nodeTests) === 0) fail(`node --test found no tests in ${JS_WS} - wrong layout?:\n${out}`);
  if (Number(nodePass) === 0) fail(`node --test ran ${nodeTests} tests and not one passed - that is a runner problem, not unsolved exercises:\n${out}`);
  ok(
    `terminal: ${cargoV}, node ${nodeV}; cargo test --test ${cargoStep} ran in ${cargoS} s ` +
      `(${cargoPassed} passed, ${cargoFailed} failed - unsolved exercises are expected in a starter); ` +
      `node --test ${nodeTests} tests (${nodePass} passed, ${nodeFail} failed) in ${nodeExit[2]} s`
  );

  console.log("PASS: tutor-lab smoke test");
} finally {
  await browser.close();
}

// VS Code's shell integration writes OSC 633 sequences into the captured stream
// (";E;<command>;<uuid>" before, ";C" after), so an anchored /^cargo/ would never
// match the first command of a terminal. Drop OSC and CSI sequences before matching.
function stripAnsi(text) {
  return text
    .replace(/\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)?/g, "")
    .replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, "")
    .replace(/[\u0007]/g, "");
}

async function runCommand(page, command) {
  await page.keyboard.press("Escape");
  await sleep(300);
  await page.keyboard.press("F1");
  const input = page.locator('.quick-input-widget input[placeholder*="command" i]');
  await input.waitFor({ state: "visible" });
  await input.fill(">" + command);
  const row = `.quick-input-list .monaco-list-row[aria-label^="${command}"]`;
  await page.waitForSelector(row);
  await page.click(row);
}
