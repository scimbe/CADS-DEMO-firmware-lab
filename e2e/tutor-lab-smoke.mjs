#!/usr/bin/env node
// CaDS Tutor Lab - browser smoke test for images/tutor-lab (SPEC.md Addendum A4).
//
// Against a running container (scripts/run-local-tutor-lab.sh), headless Chromium:
//   1. login with the password -> multi-root workspace cads-tutor.code-workspace
//   2. workbench: app name in the title, no Restricted Mode, both folders in the
//      Explorer, no prompt / chat side bar / notification 30 s after load
//   3. tutor: the CaDS Tutor view opens (with or without course packs)
//   4. integrated terminal: cargo --version, node --version (22.x),
//      `cargo test` in rust-foundations (< 60 s, warm cache),
//      `node --test` in javascript-foundations (0 failures)
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
    await sleep(4000);
    const tutorUi = await page.evaluate(() => ({
      sidebar: document.querySelector(".sidebar .composite.title h2")?.innerText.trim() ?? "",
      views: [...document.querySelectorAll(".sidebar .pane-header")].map((h) => h.innerText.trim()),
      editors: [...document.querySelectorAll(".editor-group-container .tab")].map((t) => t.getAttribute("aria-label") ?? t.innerText.trim()),
      welcome: document.querySelector(".sidebar .welcome-view-content")?.innerText.trim().slice(0, 120) ?? "",
    }));
    await page.screenshot({ path: join(OUT, "02-tutor.png") });
    const tutorOpen = /tutor/i.test(tutorUi.sidebar) || tutorUi.editors.some((e) => /tutor/i.test(e));
    if (!tutorOpen) fail(`tutor view did not open: ${JSON.stringify(tutorUi)}`);
    if (courses.length === 0 && !/keine kurse|no courses/i.test(tutorUi.welcome)) {
      fail(`no course packs in the image, but the tutor view does not say so: ${JSON.stringify(tutorUi)}`);
    }
    ok(`tutor view open: side bar="${tutorUi.sidebar}", views=${JSON.stringify(tutorUi.views)}, editors=${JSON.stringify(tutorUi.editors)}, course packs=${JSON.stringify(courses)}`);
  }

  // 4. terminal: toolchains + tests
  const marker = "/tmp/e2e-tutor-lab.txt";
  dexec(`rm -f ${marker}`);
  const shells = () => Number(dexec("pgrep -u coder -x bash | wc -l").trim());
  const shellsBefore = shells();
  await runCommand(page, "Terminal: Create New Terminal");
  for (let i = 0; i < 30 && shells() <= shellsBefore; i++) await sleep(1000);
  await sleep(1500);
  await page.focus(".terminal-wrapper.active .xterm-helper-textarea");
  const script =
    `{ cargo --version; node --version; s=$(date +%s); (cd ${RUST_WS} && cargo test 2>&1 | tail -n 25); echo "cargo_test_exit=\${PIPESTATUS[0]} cargo_test_s=$(( $(date +%s) - s ))"; ` +
    `(cd ${JS_WS} && node --test 2>&1 | tail -n 12); echo "node_test_exit=\${PIPESTATUS[0]}"; echo E2E_DONE; } > ${marker} 2>&1`;
  await page.keyboard.type(script);
  await page.keyboard.press("Enter");
  let out = "";
  for (let i = 0; i < 180 && !out.includes("E2E_DONE"); i++) {
    await sleep(1000);
    out = dexec(`cat ${marker} 2>/dev/null || true`);
  }
  await page.screenshot({ path: join(OUT, "03-terminal.png") });
  if (!out.includes("E2E_DONE")) fail(`terminal script did not finish within 180 s:\n${out}`);
  const cargoV = out.match(/^cargo \S+/m)?.[0];
  const nodeV = out.match(/^v22\.\d+\.\d+/m)?.[0];
  if (!cargoV) fail(`cargo --version missing:\n${out}`);
  if (!nodeV) fail(`node --version is not 22.x:\n${out}`);
  const cargoExit = out.match(/cargo_test_exit=(\d+) cargo_test_s=(\d+)/);
  if (!cargoExit || cargoExit[1] !== "0") fail(`cargo test failed:\n${out}`);
  const cargoS = Number(cargoExit[2]);
  if (cargoS > CARGO_TEST_BUDGET_S) fail(`cargo test took ${cargoS} s (> ${CARGO_TEST_BUDGET_S} s, cache not warm?):\n${out}`);
  const testResults = [...out.matchAll(/^test result: ok\. (\d+) passed/gm)].map((m) => Number(m[1]));
  const nodeExit = out.match(/node_test_exit=(\d+)/)?.[1];
  const nodeFail = out.match(/^# fail (\d+)/m)?.[1];
  const nodePass = out.match(/^# pass (\d+)/m)?.[1];
  if (nodeExit !== "0" || nodeFail !== "0") fail(`node --test failed (exit=${nodeExit}, fail=${nodeFail}):\n${out}`);
  ok(`terminal: ${cargoV}, node ${nodeV}; cargo test ok in ${cargoS} s (${testResults.reduce((a, b) => a + b, 0)} tests in ${testResults.length} binaries); node --test pass=${nodePass} fail=0`);

  console.log("PASS: tutor-lab smoke test");
} finally {
  await browser.close();
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
