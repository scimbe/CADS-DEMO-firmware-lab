#!/usr/bin/env node
// CaDS Firmware Lab - browser smoke test for the image (SPEC.md §7 "Fertig heißt ...").
//
// Against a running container (scripts/run-local.sh), headless Chromium:
//   1. login with the password
//   2. workspace cads-zero opens, no Restricted Mode, app name in the title
//   3. task "CaDS: Build" runs and (re)creates build/itsboard/cads-zero.bin
//   4. integrated terminal: `st-info --probe` without a bridge prints the German hint
//
// Usage:
//   CADS_LAB_PASSWORD=... node e2e/image-smoke.mjs
// Env: CADS_LAB_URL (http://127.0.0.1:8084), CADS_LAB_CONTAINER (firmware-lab-local),
//      PW_MODULE (path of a playwright / playwright-core package with a browser installed;
//      default: the copy @playwright/mcp leaves in the npx cache), E2E_OUT (screenshots).
//
// Terminal/task output is verified through the container (docker exec), because
// xterm.js renders to canvas and its text is not in the DOM.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const URL = process.env.CADS_LAB_URL ?? "http://127.0.0.1:8084";
const PASSWORD = process.env.CADS_LAB_PASSWORD;
const CONTAINER = process.env.CADS_LAB_CONTAINER ?? "firmware-lab-local";
const OUT = process.env.E2E_OUT ?? "e2e/out";
const WS = "/home/coder/workspace/cads-zero";

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
async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const pwPath = findPlaywright();
const pwModule = await import(pathToFileURL(join(pwPath, "index.js")).href);
const chromium = pwModule.chromium ?? pwModule.default?.chromium;
if (!chromium) fail(`playwright at ${pwPath} exports no chromium`);
mkdirSync(OUT, { recursive: true });

// The npx-cached playwright may be a different build than the browsers in the
// cache; pick an installed headless shell explicitly (or PW_CHROMIUM).
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
  return undefined; // let playwright try its default
}
const browser = await chromium.launch({ headless: true, executablePath: findChromium() });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.setDefaultTimeout(60_000);

try {
  // 1. login
  await page.goto(URL + "/");
  await page.waitForURL(/\/login/);
  await page.fill('input[name="password"]', PASSWORD);
  await page.press('input[name="password"]', "Enter");
  await page.waitForURL(/folder=/);
  ok(`login accepted, redirected to ${page.url()}`);

  // 2. workbench
  await page.waitForSelector(".monaco-workbench");
  await page.waitForSelector("#workbench\\.parts\\.statusbar");
  await page.waitForFunction(() => document.title.includes("cads-zero"));
  await sleep(8000); // extensions activate
  const title = await page.title();
  if (!title.includes("CaDS Firmware Lab")) fail(`title lacks app name: ${title}`);
  const restricted = await page.evaluate(() => document.body.innerText.includes("Restricted Mode"));
  if (restricted) fail("workspace opened in Restricted Mode");
  const explorerRoot = await page.evaluate(() =>
    [...document.querySelectorAll(".explorer-folders-view .monaco-list-row")].map((r) => r.innerText.trim())
  );
  // Root section header "cads-zero" (folder name) or, once expanded, its top-level entries.
  const explorerHeader = await page.evaluate(() =>
    [...document.querySelectorAll(".explorer-viewlet .pane-header")].map((h) => h.innerText.trim())
  );
  if (!explorerHeader.some((h) => h.toLowerCase().includes("cads-zero")) && !explorerRoot.includes("CMakePresets.json")) {
    fail(`explorer does not show cads-zero: headers=${explorerHeader.join("|")} rows=${explorerRoot.join(",")}`);
  }
  await page.screenshot({ path: join(OUT, "01-workbench.png") });
  ok(`workbench: title="${title}", no Restricted Mode, explorer shows cads-zero (${explorerRoot.length} entries)`);

  // cmake.configureOnOpen is off in the image: no CMake Tools preset prompt
  // and no Copilot chat side bar may greet the student.
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
  ok(`no preset prompt, no chat side bar after startup (notifications: ${JSON.stringify(startupUi.notifications)})`);
  await page.keyboard.press("Escape");

  // 3. task "CaDS: Build" - force real work: drop the binary, touch a source
  dexec(`cd ${WS} && rm -f build/itsboard/cads-zero.bin && touch targets/itsboard/main.c`);
  await runCommand(page, "Tasks: Run Task");
  // The command palette closes, task providers (cmake-tools, ...) resolve, then
  // the task picker opens as a new quick input - wait for that second widget.
  const picker = page.locator('.quick-input-widget input[placeholder*="task" i]');
  await picker.waitFor({ state: "visible", timeout: 60_000 });
  await picker.fill("CaDS: ");
  // Rows carry "label, detail" as aria-label; match the label element exactly.
  const buildRow = page.locator('.quick-input-list .monaco-list-row[aria-label^="CaDS: Build,"]');
  try {
    await buildRow.first().waitFor({ timeout: 30_000 });
  } catch {
    const rows = await page.evaluate(() =>
      [...document.querySelectorAll(".quick-input-list .monaco-list-row")].map((r) => r.getAttribute("aria-label"))
    );
    fail(`task picker has no "CaDS: Build" row; rows: ${JSON.stringify(rows)}`);
  }
  const offered = await page.evaluate(() =>
    [...document.querySelectorAll(".quick-input-list .monaco-list-row")].map((r) => (r.getAttribute("aria-label") ?? "").split(",")[0])
  );
  await buildRow.first().click();
  ok(`task picker offered ${JSON.stringify(offered)}; started CaDS: Build`);
  const started = Date.now();
  let built = false;
  while (Date.now() - started < 300_000) {
    await sleep(5000);
    const r = dexec(`cd ${WS} && test -s build/itsboard/cads-zero.bin && stat -c %Y build/itsboard/cads-zero.bin || echo missing`).trim();
    if (r !== "missing") {
      built = true;
      break;
    }
  }
  if (!built) {
    await page.screenshot({ path: join(OUT, "02-build-task-FAILED.png") });
    fail("CaDS: Build did not produce build/itsboard/cads-zero.bin within 300 s (see 02-build-task-FAILED.png)");
  }
  await sleep(3000);
  await page.screenshot({ path: join(OUT, "02-build-task.png") });
  const size = dexec(`stat -c %s ${WS}/build/itsboard/cads-zero.bin`).trim();
  ok(`CaDS: Build produced cads-zero.bin (${size} bytes) in ${Math.round((Date.now() - started) / 1000)} s`);

  // 4. terminal + shim
  dexec("rm -f /tmp/e2e-st-info.txt");
  const shells = () => Number(dexec("pgrep -u coder -x bash | wc -l").trim());
  const shellsBefore = shells();
  await runCommand(page, "Terminal: Create New Terminal");
  // Wait for the new shell inside the pty before typing (keystrokes sent
  // earlier are lost), then put the focus explicitly into the active terminal.
  for (let i = 0; i < 30 && shells() <= shellsBefore; i++) await sleep(1000);
  await sleep(1500);
  await page.focus(".terminal-wrapper.active .xterm-helper-textarea");
  await page.keyboard.type("st-info --probe > /tmp/e2e-st-info.txt 2>&1; echo exit=$? >> /tmp/e2e-st-info.txt; which st-flash >> /tmp/e2e-st-info.txt");
  await page.keyboard.press("Enter");
  let probe = "";
  for (let i = 0; i < 40 && !probe.includes("st-flash"); i++) {
    await sleep(1000);
    probe = dexec("cat /tmp/e2e-st-info.txt 2>/dev/null || true");
  }
  await page.screenshot({ path: join(OUT, "03-terminal.png") });
  if (!probe.includes("Board-Bridge nicht aktiv")) fail(`st-info --probe output unexpected:\n${probe}`);
  if (!probe.includes("exit=1")) fail(`st-info --probe exit code unexpected:\n${probe}`);
  if (!probe.includes("/usr/local/bin/st-flash")) fail(`st-flash not the shim:\n${probe}`);
  ok(`terminal: st-info --probe -> "${probe.split("\n")[0]}" (exit 1), st-flash is /usr/local/bin/st-flash`);

  console.log("PASS: image smoke test");
} finally {
  await browser.close();
}

async function runCommand(page, command) {
  // Close whatever quick input might be open (e.g. a CMake preset prompt), then
  // open the command palette.
  await page.keyboard.press("Escape");
  await sleep(300);
  await page.keyboard.press("F1");
  const input = page.locator('.quick-input-widget input[placeholder*="command" i]');
  await input.waitFor({ state: "visible" });
  // F1 may land in Quick Open on some builds - the ">" prefix forces the command palette.
  await input.fill(">" + command);
  // aria-label is "<command>" or "<command>, <keybinding>".
  const row = `.quick-input-list .monaco-list-row[aria-label^="${command}"]`;
  await page.waitForSelector(row);
  await page.click(row);
}
