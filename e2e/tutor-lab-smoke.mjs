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
// A check that is independent of the others records its failure and lets the
// run continue, so one broken thing does not hide the evidence for everything
// after it. The run still ends non-zero.
const failures = [];
function problem(msg) {
  console.error(`FAIL: ${msg}`);
  failures.push(msg);
}
// Behaviour that is specified and being built elsewhere: report it, name the
// stream, and do not fail the run. Turn these into problem() once it lands.
function pending(msg) {
  console.log(`pending - ${msg}`);
}
function ok(msg) {
  console.log(`ok - ${msg}`);
}
function dexec(cmd) {
  return execFileSync("docker", ["exec", CONTAINER, "bash", "-lc", cmd], { encoding: "utf8" });
}
// The tutor writes why it rejected a pack into its output channel, which
// code-server mirrors to a log file. When packs are on disk but the tutor
// loaded none, that file holds the actual reason (a check type the extension
// does not know, a step file that failed to parse) - say it instead of making
// the reader guess.
function tutorLog(maxLines = 8) {
  const cmd =
    'f=$(ls -t "$HOME"/.local/share/code-server/logs/*/exthost*/output_logging_*/*"CaDS Tutor.log" 2>/dev/null | head -1); ' +
    '[ -n "$f" ] && grep -E "ERROR|WARN" "$f" | head -' + maxLines + ' || echo "(no CaDS Tutor output channel log found)"';
  try {
    return dexec(cmd).trim();
  } catch {
    return "(could not read the CaDS Tutor output channel log)";
  }
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

// 0c. reference solutions must never reach a student's container. Both the
// .dockerignore and the seed stage drop workspaces/*/solutions; if either is
// ever loosened, the exercises stop being exercises.
const solutions = dexec(
  `find /opt/cads-seed ${ROOT} /opt/cads-tutor -iname '*solution*' 2>/dev/null | head -20 || true`
).trim();
if (solutions) fail(`reference solutions are in the image or the workspace:\n${solutions}`);
ok("no reference solutions in the image, the seed or the workspace");

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
  // code-server reopens whatever this browser had open last, so a bare visit
  // lands on ?workspace= on a fresh volume and on ?folder= after someone has
  // used one of the two entry links. Both are legitimate.
  await page.waitForURL(/(workspace|folder)=/);
  const landed = page.url();
  if (!/workspace=.*cads-tutor\.code-workspace/.test(landed)) {
    // put the multi-root workspace back so the rest of the run, and the next
    // run, start from the documented default
    await page.goto(`${URL}/?workspace=${ROOT}/cads-tutor.code-workspace`);
    await page.waitForSelector(".monaco-workbench");
    await sleep(6000);
  }
  ok(`login accepted, landed on ${landed}${landed === page.url() ? "" : ` -> reset to ${page.url()}`}`);

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
    const opened = await runCommandMatching(page, "CaDS Tutor", /open tutor|tutor öffnen/i);
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
      // Packs ARE in the image. If the tutor still says it found none, the pack
      // and the extension disagree - that is an integration break worth naming,
      // not a missing course.
      const rejected = tutorUi.notifications.some((n) => /no course packs|keine kurse/i.test(n));
      if (rejected) {
        problem(
          `the image ships ${courses.length} course pack(s) (${JSON.stringify(courses)}) but the tutor loaded none.\n` +
            `The extension rejected them; the CaDS Tutor output channel says:\n${tutorLog(10)}`
        );
      } else if (!tutorOpen) {
        problem(`tutor view did not open: ${JSON.stringify(tutorUi)}\ntutor log:\n${tutorLog(6)}`);
      } else {
        // The lab's promise is a course PICKER: every pack in the image has to
        // appear in the tree, not just the one the tutor happened to open.
        // The tree renders only the rows it can show, and an expanded course
        // fills the panel, so the second course is not in the DOM at all. The
        // list scrolls virtually (scrollTop on the container does nothing), so
        // walk it with the keyboard and collect what each view shows.
        const tree = [];
        const collect = async () => {
          const batch = await page.evaluate(() =>
            [...document.querySelectorAll(".sidebar .monaco-list-row")]
              .map((r) => (r.getAttribute("aria-label") || r.innerText).replace(/\s+/g, " ").trim())
              .filter(Boolean)
          );
          for (const b of batch) if (!tree.includes(b)) tree.push(b);
        };
        await page.click(".sidebar .monaco-list-row");
        await sleep(400);
        await collect();
        for (let i = 0; i < 40; i++) {
          await page.keyboard.press("PageDown");
          await sleep(250);
          await collect();
          const last = await page.evaluate(() => {
            const rows = [...document.querySelectorAll(".sidebar .monaco-list-row")];
            const focused = rows.find((r) => r.classList.contains("focused"));
            return focused === rows[rows.length - 1];
          });
          if (last && i > 2) break;
        }
        await page.keyboard.press("End");
        await sleep(500);
        await collect();
        const missing = courses.filter(
          (c) => !tree.some((row) => new RegExp(c.replace(/-/g, "[ -]?"), "i").test(row))
        );
        if (missing.length) {
          problem(`course pack(s) ${JSON.stringify(missing)} are in the image but not in the tutor tree: ${JSON.stringify(tree.slice(0, 8))}`);
        }
        const openStep = tutorUi.editors.find((e) => /tutor/i.test(e ?? ""));
        if (!openStep) problem(`the tutor opened no step: editors=${JSON.stringify(tutorUi.editors)}`);
        await page.screenshot({ path: join(OUT, "02b-tutor-tree.png") });
        ok(
          `tutor: side bar="${tutorUi.sidebar}", views=${JSON.stringify(tutorUi.views)}, ` +
            `tree lists all ${courses.length} course pack(s) ${JSON.stringify(courses)}, ` +
            `first step open as "${openStep}"`
        );
      }
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

  await languageLabChecks(page);
  await entryLinkChecks(page);

  if (failures.length) {
    console.error(`\nFAIL: tutor-lab smoke test - ${failures.length} check(s) failed`);
    process.exitCode = 1;
  } else {
    console.log("PASS: tutor-lab smoke test");
  }
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

// Pick a palette entry by pattern rather than by an exact title: the tutor's
// command titles are localised (they used to read "Tutor öffnen / Open Tutor"
// and now resolve per UI language), and a hard-coded title turns a working
// image into a red test the day someone improves the wording.
async function runCommandMatching(page, filter, pattern) {
  await page.keyboard.press("Escape");
  await sleep(300);
  await page.keyboard.press("F1");
  const input = page.locator('.quick-input-widget input[placeholder*="command" i]');
  await input.waitFor({ state: "visible" });
  await input.fill(">" + filter);
  await sleep(1200);
  const rows = page.locator(".quick-input-list .monaco-list-row");
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const label = (await rows.nth(i).getAttribute("aria-label")) ?? "";
    if (pattern.test(label)) {
      await rows.nth(i).click();
      return label;
    }
  }
  const seen = [];
  for (let i = 0; i < Math.min(count, 8); i++) seen.push(await rows.nth(i).getAttribute("aria-label"));
  throw new Error(`no command matching ${pattern} under "${filter}"; the palette offered ${JSON.stringify(seen)}`);
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

// ---------------------------------------------------------------------------
// 5. The details a language lab lives or dies by: is the code actually
//    coloured, does the language server answer, does saving format, and are
//    the small things (icons, search, line numbers) there. One screenshot per
//    point, so the notes can show rather than claim.
// ---------------------------------------------------------------------------
async function languageLabChecks(page) {
  const shot = (n) => page.screenshot({ path: join(OUT, `${n}.png`) });

  // Written first so the file watcher and the quick-open index have the whole
  // highlighting and rust-analyzer section to notice it.
  const jsProbe = `${JS_WS}/src/e2e-diagnostics-probe.js`;
  dexec(`printf 'const probe = 1;\\nprobe = 2;\\nexport { probe };\\n' > ${jsProbe}`);

  async function openFile(name) {
    // Ctrl+P is swallowed by the browser; go through the command palette.
    await runCommand(page, "Go to File...");
    const input = page.locator(".quick-input-widget input");
    await input.waitFor({ state: "visible" });
    await input.fill(name);
    await sleep(2000);
    await page.keyboard.press("Enter");
    // Wait for the editor to really be on that file before anything is read
    // from the status bar or the DOM - otherwise a slow switch is reported as
    // "wrong language" for the file that was open before.
    for (let i = 0; i < 20; i++) {
      const active = await page.evaluate(
        () => document.querySelector(".editor-group-container .tab.active")?.getAttribute("aria-label") ?? ""
      );
      if (active.includes(name)) break;
      await sleep(1000);
      if (i === 19) problem(`the editor never switched to ${name} (active tab: "${active}")`);
    }
    await sleep(1500);
  }
  const statusItems = () =>
    page.evaluate(() =>
      [...document.querySelectorAll("#workbench\\.parts\\.statusbar .statusbar-item")]
        .map((e) => e.innerText.trim().replace(/\n/g, " "))
        .filter(Boolean)
    );
  // Monaco names token colours mtk<N>. One class for the whole file means the
  // text is painted in the default colour, i.e. not highlighted. TextMate
  // grammars load lazily on the first file of a language, so poll.
  const readTokenClasses = () =>
    page.evaluate(() => {
      const c = new Set();
      for (const t of document.querySelectorAll(".monaco-editor .view-line span span"))
        for (const k of t.classList) if (/^mtk\d/.test(k)) c.add(k);
      return [...c].sort();
    });
  async function tokenClasses(file, maxWaitS = 40) {
    let classes = [];
    for (let i = 0; i < maxWaitS; i++) {
      classes = await readTokenClasses();
      if (classes.length > 1) return classes;
      // The first file of a language waits for its TextMate grammar, and the
      // extension host may be busy (rust-analyzer indexing) when it arrives.
      // Re-opening forces a re-tokenisation once the grammar is there.
      if (i === Math.floor(maxWaitS / 2)) await openFile(file);
      await sleep(1000);
    }
    return classes;
  }

  // --- 5a. syntax highlighting per language ---------------------------------
  // File names come from the courses and the courses rename them, so pick a
  // real source file of each language at run time instead of hard-coding one.
  const pick = (cmd, fallback) => {
    const out = dexec(`${cmd} 2>/dev/null | head -1 || true`).trim();
    return out ? out.split("/").pop() : fallback;
  };
  const rustFile = pick(`find ${RUST_WS}/src -name '*.rs' ! -name 'mod.rs' ! -name 'lib.rs'`, "lib.rs");
  const jsFile = pick(`find ${JS_WS}/src -name '*.js'`, "hello.js");

  // Rust goes last on purpose: opening a .rs file starts rust-analyzer, which
  // saturates the extension host while it indexes, and a TextMate grammar
  // asked for during that wait can take a minute to arrive. A student opens
  // one file at a time; this order keeps the check honest instead of
  // measuring our own thundering herd.
  const wanted = [
    ["README.md", "Markdown"],
    ["package.json", "JSON"],
    [jsFile, "JavaScript"],
    ["Cargo.toml", "TOML"],
    [rustFile, "Rust"],
  ];
  const hl = [];
  // The clock for rust-analyzer starts when the first Rust file is opened -
  // that is when the server is spawned and starts indexing. Measuring later
  // would report a warm start and hide exactly the wait a student feels.
  let raStart = null;
  for (const [file, language] of wanted) {
    await openFile(file);
    if (file.endsWith(".rs") && raStart === null) raStart = Date.now();
    const classes = await tokenClasses(file);
    const status = await statusItems();
    const detected = status.includes(language);
    if (!detected) {
      problem(`${file}: the language indicator does not say "${language}" - status bar was ${JSON.stringify(status)}`);
    } else if (classes.length < 2) {
      problem(`${file}: detected as ${language} but rendered in a single colour (${JSON.stringify(classes)}) - no syntax highlighting`);
    }
    hl.push(`${file} -> ${detected ? language : "?"} (${classes.length} token colours)`);
    await shot(`10-highlight-${language.toLowerCase()}`);
  }
  ok(`syntax highlighting: ${hl.join(", ")}`);

  // --- 5b. rust-analyzer ----------------------------------------------------
  await openFile(rustFile);
  if (raStart === null) raStart = Date.now();
  let raReady = false;
  for (let i = 0; i < 120; i++) {
    const s = (await statusItems()).join(" | ");
    if (/rust-analyzer/.test(s) && !/Indexing|Loading|Fetching|Roots/i.test(s)) { raReady = true; break; }
    await sleep(1000);
  }
  const raSeconds = Math.round((Date.now() - raStart) / 1000);
  if (!raReady) problem(`rust-analyzer never reported itself ready (${raSeconds} s): ${JSON.stringify(await statusItems())}`);
  else if (raSeconds > 120) problem(`rust-analyzer took ${raSeconds} s to become ready - students would sit in front of a dead editor`);
  await sleep(2000);

  // hover over an identifier: type and doc comment must come back
  const idents = await page.evaluate(() =>
    [...document.querySelectorAll(".monaco-editor .view-line span span")]
      .map((s) => ({ t: s.innerText.trim(), r: s.getBoundingClientRect() }))
      .filter((o) => o.r.width > 0 && /^[A-Za-z_][A-Za-z0-9_]*$/.test(o.t))
      .map((o) => ({ t: o.t, x: Math.round(o.r.x + o.r.width / 2), y: Math.round(o.r.y + o.r.height / 2) }))
  );
  let hover = null;
  // any identifier will do - the point is that the server answers, not which
  // symbol the course happens to define today
  for (const c of idents.filter((i) => i.t.length > 2 && !/^(pub|fn|let|mod|use|impl)$/.test(i.t)).slice(0, 6)) {
    await page.mouse.move(10, 10);
    await sleep(400);
    await page.mouse.move(c.x, c.y);
    await sleep(3500);
    hover = await page.evaluate(() => {
      const el = document.querySelector(".monaco-hover .hover-contents") ?? document.querySelector(".monaco-hover");
      return el ? el.innerText.replace(/\s+/g, " ").trim().slice(0, 200) : null;
    });
    if (hover) break;
  }
  await shot("11-rust-hover");
  if (!hover) problem(`rust-analyzer gave no hover for any identifier in ${rustFile}`);

  // completion: a fresh function at the end of the file, so nothing else in
  // the file has to parse for the request to make sense
  await page.keyboard.press("Escape");
  await runCommand(page, "Go to Line/Column...");
  await page.keyboard.type("999");
  await page.keyboard.press("Enter");
  await sleep(600);
  await page.keyboard.press("End");
  await page.keyboard.type("\npub fn e2e_probe() {\n    let _v: Vec<i32> = Vec::");
  let completion = { count: 0, first: [] };
  for (let i = 0; i < 20; i++) {
    await sleep(1000);
    completion = await page.evaluate(() => {
      const rows = [...document.querySelectorAll(".suggest-widget .monaco-list-row")];
      return { count: rows.length, first: rows.slice(0, 4).map((r) => r.innerText.trim().split("\n")[0]) };
    });
    if (completion.count > 0) break;
    if (i === 9) {
      // nudge the request again - the server may have been mid-index
      await page.keyboard.press("Backspace");
      await page.keyboard.type(":");
    }
  }
  await shot("12-rust-completion");
  if (completion.count === 0) problem("rust-analyzer offered no completion after `Vec::`");
  await page.keyboard.press("Escape");
  await runCommand(page, "File: Revert File");
  await sleep(1500);

  // diagnostics in the Problems view
  await runCommand(page, "View: Focus Problems");
  await sleep(3000);
  const problemRows = await page.evaluate(() =>
    [...document.querySelectorAll(".markers-panel .monaco-list-row")].map((r) => r.innerText.replace(/\n/g, " ").slice(0, 130))
  );
  await shot("13-problems");
  const hasRustc = problemRows.some((r) => /rustc/.test(r));
  const hasClippy = problemRows.some((r) => /clippy/.test(r));
  if (!hasRustc && !hasClippy) problem(`the Problems view shows no rustc/clippy diagnostics: ${JSON.stringify(problemRows.slice(0, 5))}`);
  ok(
    `rust-analyzer: ready ${raSeconds} s after the first Rust file was opened, hover=${JSON.stringify((hover ?? "").slice(0, 70))}, ` +
      `${completion.count} completions after "Vec::" (${JSON.stringify(completion.first.slice(0, 3))}), ` +
      `Problems has rustc=${hasRustc} clippy=${hasClippy} (${problemRows.length} rows)`
  );

  // --- 5c. JavaScript -------------------------------------------------------
  // Which of the course's own files carries a deliberate bug is the course's
  // business and it changes. What must be true is that the built-in language
  // service checks plain JavaScript at all, so put an unambiguous error in a
  // scratch file inside the workspace and require it to be reported. Without
  // checkJs in effect a .js file gets no semantic diagnostics whatsoever, so
  // this is exactly the failure that would otherwise go unnoticed.
  let squigglies = 0;
  await openFile("e2e-diagnostics-probe.js");
  for (let i = 0; i < 25; i++) {
    squigglies = await page.evaluate(
      () => document.querySelectorAll(".monaco-editor .squiggly-error, .monaco-editor .squiggly-warning").length
    );
    if (squigglies > 0) break;
    await sleep(1000);
  }
  const jsFileWithDiag = squigglies > 0 ? "the scratch probe (assignment to a const)" : null;
  await runCommand(page, "View: Focus Problems");
  await sleep(2500);
  const jsRows = await page.evaluate(() =>
    [...document.querySelectorAll(".markers-panel .monaco-list-row")].map((r) => r.innerText.replace(/\n/g, " ").slice(0, 130))
  );
  await shot("14-javascript-diagnostics");
  const jsDiag = jsRows.filter((r) => /\bts\b|\.js\b/.test(r));
  // The starter file carries the bugs its step is about, so the built-in
  // service MUST have something to say. checkJs is window-scoped and only
  // works from the image's user settings - if it ever moves back into a
  // folder's .vscode/settings.json this check goes red.
  if (squigglies === 0) {
    problem(
      `the JavaScript starter shows no diagnostics from the built-in language service. ` +
        `js/ts.implicitProjectConfig.checkJs is window-scoped: it only takes effect in the user settings.`
    );
  }
  const eslintCfg = dexec(
    `ls ${JS_WS}/eslint.config.* ${JS_WS}/.eslintrc* 2>/dev/null | wc -l`
  ).trim();
  const eslintEnabled = dexec(`grep -c '"eslint.enable": true' ${JS_WS}/.vscode/settings.json || true`).trim();
  if (eslintCfg === "0" && eslintEnabled !== "0") {
    problem("the workspace has no ESLint configuration but eslint.enable is true - ESLint will complain on every file");
  }
  // No TypeScript jargon on correct JavaScript: noImplicitAny (ts 7006) would
  // flag every untyped parameter in the course's own starter files.
  const implicitAny = jsRows.filter((r) => /ts\(?7006/.test(r) || /implicitly has an 'any' type/.test(r));
  if (implicitAny.length) {
    problem(
      `the Problems view reports TypeScript implicit-any on plain JavaScript (${implicitAny.length} row(s), e.g. ` +
        `${JSON.stringify(implicitAny[0])}) - js/ts.implicitProjectConfig.strict should be off`
    );
  }
  dexec(`rm -f ${jsProbe}`);
  ok(
    `javascript: ${squigglies} squiggle(s) in ${jsFileWithDiag ?? "(nothing reported)"}, ${jsDiag.length} diagnostic row(s) ` +
      `${JSON.stringify(jsDiag.slice(0, 2))}; ESLint config files=${eslintCfg}, eslint.enable=${eslintEnabled !== "0"}`
  );

  // --- 5d. formatting on save ----------------------------------------------
  // The badly formatted line has to be typed IN the editor: a file changed on
  // disk opens clean, and "File: Save" on a clean document is a no-op, so
  // nothing would be formatted and the check would lie.
  const fmt = [];
  const jsFmtPath = dexec(`find ${JS_WS}/src -name '*.js' | head -1`).trim();
  const jsFmtFile = jsFmtPath.split("/").pop();
  async function formatOnSave({ file, type, expect, what }) {
    await openFile(file);
    await sleep(2500);
    await runCommand(page, "Go to Line/Column...");
    await page.keyboard.type("999");
    await page.keyboard.press("Enter");
    await sleep(500);
    await page.keyboard.press("End");
    await page.keyboard.type("\n" + type);
    await sleep(1500);
    const dirty = await page.evaluate(() => !!document.querySelector(".editor-group-container .tab.active.dirty"));
    await runCommand(page, "File: Save");
    await sleep(5000);
    const onDisk = dexec(`tail -4 ${file === "lib.rs" ? `${RUST_WS}/src/lib.rs` : jsFmtPath}`);
    if (expect.test(onDisk)) fmt.push(what);
    else problem(`${what} did not happen on save (document was dirty: ${dirty}); the file ends with:\n${onDisk}`);
    await runCommand(page, "File: Revert File");
    await sleep(1500);
  }
  await formatOnSave({
    file: "lib.rs",
    type: "pub fn fmt_probe( a:i32,b:i32 )->i32{a+b}",
    expect: /pub fn fmt_probe\(a: i32, b: i32\) -> i32 \{/,
    what: "rustfmt on save",
  });
  await shot("15-format-rust");
  dexec(`sed -i '/fmt_probe/,+2d' ${RUST_WS}/src/lib.rs; true`);
  await formatOnSave({
    file: jsFmtFile,
    type: "export function fmtProbe(  a,b ){return a+b}",
    expect: /export function fmtProbe\(a, b\)/,
    what: "the built-in JavaScript formatter on save",
  });
  await shot("16-format-javascript");
  dexec(`sed -i '/fmtProbe/d' ${jsFmtPath}; true`);
  ok(`formatting works with no setup: ${fmt.join(", ") || "(nothing)"}`);

  // --- 5e. the small things -------------------------------------------------
  await runCommand(page, "Search: Find in Files");
  await sleep(800);
  await page.keyboard.type("countWords");
  await sleep(6000);
  const search = await page.evaluate(() => ({
    message: document.querySelector(".search-view .message")?.innerText?.trim() ?? "",
    rows: [...document.querySelectorAll(".search-view .monaco-list-row")].map((r) => r.innerText.replace(/\n/g, " ").trim().slice(0, 60)),
  }));
  await shot("17-search");
  if (!/\d+ result/.test(search.message)) problem(`search for an exercise symbol found nothing: ${JSON.stringify(search)}`);

  await runCommand(page, "View: Show Explorer");
  await sleep(2000);
  const small = await page.evaluate(() => ({
    fileIconClasses: [
      ...new Set(
        [...document.querySelectorAll(".explorer-folders-view .monaco-icon-label")]
          .flatMap((e) => [...e.classList])
          .filter((c) => /-ext-file-icon|-lang-file-icon/.test(c))
      ),
    ].slice(0, 6),
    lineNumbers: document.querySelectorAll(".monaco-editor .line-numbers").length,
    bracketColours: [
      ...new Set(
        [...document.querySelectorAll(".monaco-editor .view-line span span")]
          .flatMap((e) => [...e.classList])
          .filter((c) => /^bracket-highlighting-/.test(c))
      ),
    ],
    notifications: [...document.querySelectorAll(".notification-list-item-message")].map((e) => e.innerText),
    welcomeTabs: [...document.querySelectorAll(".editor-group-container .tab")]
      .map((t) => t.getAttribute("aria-label"))
      .filter((t) => /welcome|get started/i.test(t ?? "")),
  }));
  await shot("18-small-things");
  if (small.fileIconClasses.length === 0) problem("the Explorer shows no per-file-type icons (icon theme missing?)");
  if (small.lineNumbers === 0) problem("the editor shows no line numbers");
  if (small.notifications.length) problem(`notifications are on screen at the end of the run: ${JSON.stringify(small.notifications)}`);
  if (small.welcomeTabs.length) problem(`a welcome/get-started tab is open: ${JSON.stringify(small.welcomeTabs)}`);
  ok(
    `small things: search "${search.message}", file icons ${JSON.stringify(small.fileIconClasses.slice(0, 3))}, ` +
      `${small.lineNumbers} line numbers, ${small.bracketColours.length} bracket-pair colours, ` +
      `no notifications, no welcome tab`
  );
}

// ---------------------------------------------------------------------------
// 6. The two entry links. The demo page gives Rust and JavaScript one address
//    each, and each address must open only its own course. The folder part is
//    the image's job and is asserted; the "only its own course" part is the
//    tutor runtime filtering by open folder, which is being built in the
//    runtime stream - reported as pending until it lands.
// ---------------------------------------------------------------------------
async function entryLinkChecks(page) {
  // Reuse the logged-in page: these checks run last, and navigating it keeps
  // the session cookie without needing a second browser context.
  const p2 = page;
  for (const folder of ["rust-foundations", "javascript-foundations"]) {
    {
      await p2.goto(`${URL}/?folder=${ROOT}/${folder}`);
      await p2.waitForSelector(".monaco-workbench");
      await p2.waitForFunction(() => document.title.length > 0);
      await sleep(20_000);

      const title = await p2.title();
      if (!title.includes(folder)) problem(`${folder} link: the window title does not name the folder ("${title}")`);
      const restricted = await p2.evaluate(() => document.body.innerText.includes("Restricted Mode"));
      if (restricted) problem(`${folder} link: opened in Restricted Mode`);

      // exactly this folder as the single Explorer root, and no workspace file
      await runCommand(p2, "View: Show Explorer");
      await sleep(2500);
      const roots = await p2.evaluate(() => {
        // With one folder open the Explorer's own pane header carries its name;
        // a multi-root workspace instead lists each folder as a level-1 row.
        const header = [...document.querySelectorAll(".explorer-viewlet .pane-header")]
          .map((e) => e.innerText.trim().split("\n")[0])
          .filter(Boolean);
        const level1 = [...document.querySelectorAll(".explorer-folders-view .monaco-list-row[aria-level='1']")]
          .map((e) => e.innerText.trim().split("\n")[0])
          .filter(Boolean);
        return [...new Set([...header, ...level1])];
      });
      if (!roots.length) problem(`${folder} link: could not read any Explorer root - the check would pass vacuously`);
      const foreign = roots.filter((r) => /foundations/i.test(r) && !new RegExp(folder.replace(/-/g, "[ -]?"), "i").test(r));
      if (foreign.length) problem(`${folder} link: the Explorer also shows ${JSON.stringify(foreign)} - the link is not scoped to one folder`);

      // which courses does the tutor offer here?
      let courses = [];
      try {
        await runCommandMatching(p2, "CaDS Tutor", /open tutor|tutor öffnen/i);
        // Wait for the tutor side bar to actually be the visible one. Reading
        // rows too early collects the EXPLORER's files instead, which then look
        // like course names and make the check meaningless.
        let sidebarIsTutor = false;
        for (let i = 0; i < 25; i++) {
          const t = await p2.evaluate(() => document.querySelector(".sidebar .composite.title h2")?.innerText.trim() ?? "");
          if (/cads.?tutor/i.test(t)) { sidebarIsTutor = true; break; }
          await sleep(1000);
        }
        if (!sidebarIsTutor) {
          problem(`${folder} link: the CaDS Tutor side bar did not come up, so its course list could not be read`);
          continue;
        }
        const tree = [];
        await p2.click(".sidebar .monaco-list-row").catch(() => {});
        await sleep(400);
        for (let i = 0; i < 30; i++) {
          const batch = await p2.evaluate(() =>
            [...document.querySelectorAll(".sidebar .monaco-list-row")]
              .filter((r) => r.getAttribute("aria-level") === "1")
              .map((r) => r.innerText.replace(/\s+/g, " ").trim())
          );
          for (const b of batch) if (!tree.includes(b)) tree.push(b);
          await p2.keyboard.press("PageDown");
          await sleep(200);
        }
        courses = tree;
      } catch (err) {
        pending(`${folder} link: could not read the course tree (${String(err).slice(0, 80)})`);
      }
      const wrong = courses.filter((c) => !new RegExp(folder.split("-")[0], "i").test(c));
      await p2.screenshot({ path: join(OUT, `20-entry-${folder}.png`) });
      if (!courses.length) {
        // An empty read is not a pass: without a course row there is nothing to
        // judge, and "no wrong courses" would be true of a broken tutor too.
        problem(`${folder} link: read no course rows from the tutor tree - cannot tell which courses this link offers`);
        continue;
      }
      if (wrong.length) {
        pending(
          `${folder} link still offers ${JSON.stringify(wrong)} - the tutor does not filter courses by the open folder yet ` +
            `(runtime stream). Turn this into a failure once that ships.`
        );
      } else {
        ok(`${folder} link: opens scoped to its folder and the tutor offers only ${JSON.stringify(courses)}`);
      }
      if (wrong.length) ok(`${folder} link: opens cleanly, Explorer root ${JSON.stringify(roots)}, no Restricted Mode`);
    }
  }
  // Leave the session on the documented default, otherwise the next visit to
  // the bare URL reopens the folder this check happened to open last.
  await p2.goto(`${URL}/?workspace=${ROOT}/cads-tutor.code-workspace`);
  await p2.waitForSelector(".monaco-workbench");
  await sleep(4000);
  ok("session left on the multi-root workspace (a bare URL reopens whatever was open last)");
}
