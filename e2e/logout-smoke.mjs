#!/usr/bin/env node
// CaDS Firmware Lab - browser test for "Abmelden" (docs/LOGOUT.md), headless Chromium.
//
// Two code-server instances of the image (or of a code-server prepared with
// image/logout/install.sh + the cads-logout VSIX), one per operating mode:
//
//   portal    CADS_LOGOUT_NONE_URL      code-server with --auth none. The test puts
//             its own reverse proxy in front: /u/e2e/ with the prefix stripped (as
//             Traefik does behind the portal) and a stub page at /logout on the
//             host. Checks: status bar entry visible, command "CaDS: Abmelden"
//             (cancel keeps the session), dirty file is saved, the TAB lands on
//             <host>/logout - not on /u/e2e/logout - and no "leave site?" prompt.
//   password  CADS_LOGOUT_PASSWORD_URL  code-server with --auth password
//             (CADS_LAB_PASSWORD). Checks: "Abmelden" ends code-server's own
//             session - the tab shows the login page and the cookie is gone.
//
//   fallback  CADS_LOGOUT_FALLBACK_URL  code-server with --auth none and WITHOUT the
//             cads-logout extension (e.g. an empty --extensions-dir). Checks: the
//             page script shows its own "Abmelden" button and it logs out.
//
// At least one of the three must be set. Further env:
//   CADS_LOGOUT_EDIT_FILE   file in the opened workspace to edit (default README.md)
//   CADS_LOGOUT_READ_CMD    shell command printing that file from disk, to prove it
//                           was saved (e.g. "docker exec <name> cat <path>"); unset:
//                           the on-disk check is skipped and reported as such
//   PW_MODULE, E2E_OUT      as in e2e/image-smoke.mjs
//
// Not covered here: a real board (WebUSB/WebSerial needs hardware) and the real
// portal chain behind /logout (oauth2-proxy, Keycloak).

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import http from "node:http";
import net from "node:net";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const NONE_URL = process.env.CADS_LOGOUT_NONE_URL;
const PASSWORD_URL = process.env.CADS_LOGOUT_PASSWORD_URL;
const FALLBACK_URL = process.env.CADS_LOGOUT_FALLBACK_URL;
const PASSWORD = process.env.CADS_LAB_PASSWORD;
const EDIT_FILE = process.env.CADS_LOGOUT_EDIT_FILE ?? "README.md";
const READ_CMD = process.env.CADS_LOGOUT_READ_CMD;
const OUT = process.env.E2E_OUT ?? "e2e/out";
const PREFIX = "/u/e2e";
const ITEM = '[id="cads.cads-logout.abmelden"]';
const FALLBACK = "#cads-logout-fallback";
const STUB_TEXT = "portal logout stub";

let failed = 0;
function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}
function ok(msg) {
  console.log(`ok - ${msg}`);
}
function check(cond, msg) {
  if (cond) ok(msg);
  else {
    failed++;
    console.error(`FAIL - ${msg}`);
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

if (!NONE_URL && !PASSWORD_URL && !FALLBACK_URL) fail("set CADS_LOGOUT_NONE_URL, CADS_LOGOUT_PASSWORD_URL and/or CADS_LOGOUT_FALLBACK_URL");
if (PASSWORD_URL && !PASSWORD) fail("CADS_LAB_PASSWORD is required with CADS_LOGOUT_PASSWORD_URL");

// ---- the portal stand-in: /u/e2e/* -> upstream with the prefix stripped, /logout -> stub ----
function startPortalStub(upstream) {
  const target = new URL(upstream);
  const port = Number(target.port || 80);
  const strip = (url) => (url.startsWith(`${PREFIX}/`) ? url.slice(PREFIX.length) : null);
  const server = http.createServer((req, res) => {
    if (req.url === "/logout") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(`<!doctype html><title>abgemeldet</title><p id="stub">${STUB_TEXT}</p>`);
      return;
    }
    const path = strip(req.url ?? "");
    if (path === null) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("portal stub: not below the session prefix");
      return;
    }
    const proxied = http.request(
      { host: target.hostname, port, method: req.method, path, headers: req.headers },
      (upstreamRes) => {
        res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
        upstreamRes.pipe(res);
      },
    );
    proxied.on("error", () => {
      res.writeHead(502);
      res.end();
    });
    req.pipe(proxied);
  });
  server.on("upgrade", (req, socket, head) => {
    const path = strip(req.url ?? "");
    if (path === null) return socket.destroy();
    const upstreamSocket = net.connect(port, target.hostname, () => {
      const headers = Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`).join("\r\n");
      upstreamSocket.write(`GET ${path} HTTP/1.1\r\n${headers}\r\n\r\n`);
      if (head.length) upstreamSocket.write(head);
      upstreamSocket.pipe(socket);
      socket.pipe(upstreamSocket);
    });
    upstreamSocket.on("error", () => socket.destroy());
    socket.on("error", () => upstreamSocket.destroy());
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

const pwPath = findPlaywright();
const { chromium } = await import(pathToFileURL(join(pwPath, "index.js")).href).then((m) => m.default ?? m);
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();

async function openLab(context, url) {
  const page = await context.newPage();
  const dialogs = [];
  page.on("dialog", (d) => {
    dialogs.push(`${d.type()}: ${d.message()}`);
    void d.accept();
  });
  await page.goto(url);
  return { page, dialogs };
}
async function waitForItem(page, label) {
  await page.locator(ITEM).waitFor({ state: "visible", timeout: 120_000 });
  ok(`${label}: status bar entry "Abmelden" is visible`);
  const text = (await page.locator(ITEM).innerText()).trim();
  check(text === "Abmelden", `${label}: its label is "Abmelden" (got "${text}")`);
}
// Quick Open through the command center in the title bar: a mouse click works
// wherever the keyboard focus is (in the image it sits in the tutor's webview,
// where Ctrl+P did not reach the workbench). Ctrl+P is the fallback.
async function quickOpen(page, file) {
  const input = page.locator(".quick-input-widget .quick-input-box input").first();
  const row = page.locator(".quick-input-list .monaco-list-row", { hasText: file }).first();
  for (let attempt = 1; ; attempt++) {
    try {
      const center = page.locator(".command-center-center").first();
      if (attempt % 2 === 1 && (await center.count())) await center.click();
      else await page.keyboard.press("ControlOrMeta+P");
      await input.waitFor({ state: "visible", timeout: 5000 });
      await input.fill(file);
      await row.waitFor({ state: "visible", timeout: 15_000 });
      await input.press("Enter");
      return;
    } catch (err) {
      if (attempt >= 4) throw err;
      await page.keyboard.press("Escape");
      await page.waitForTimeout(1000);
    }
  }
}
async function confirmDialog(page, button) {
  const dialog = page.locator(".monaco-dialog-box");
  await dialog.waitFor({ state: "visible", timeout: 20_000 });
  const message = await dialog.innerText();
  await dialog.getByRole("button", { name: button, exact: true }).click();
  return message;
}

try {
  // ---------------------------------------------------------------- portal mode
  if (NONE_URL) {
    const stub = await startPortalStub(NONE_URL);
    const host = `http://127.0.0.1:${stub.address().port}`;
    const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const { page, dialogs } = await openLab(context, `${host}${PREFIX}/`);
    await waitForItem(page, "portal");
    check((await page.locator(FALLBACK).count()) === 0, "portal: no fallback button while the status bar entry is there");
    await page.screenshot({ path: join(OUT, "logout-01-statusbar.png") });

    // Command palette -> "CaDS: Abmelden" -> cancel: nothing happens.
    await page.keyboard.press("F1");
    await page.keyboard.type("CaDS: Abmelden");
    await page.locator(".quick-input-list .monaco-list-row", { hasText: "CaDS: Abmelden" }).first().waitFor({ timeout: 20_000 });
    await page.keyboard.press("Enter");
    const question = await confirmDialog(page, "Cancel").catch(() => confirmDialog(page, "Abbrechen"));
    check(question.includes("Vom Firmware-Labor abmelden?"), "portal: the command asks before logging out");
    await page.screenshot({ path: join(OUT, "logout-02-cancelled.png") });
    await page.waitForTimeout(1500);
    check(new URL(page.url()).pathname.startsWith(`${PREFIX}/`), "portal: cancel keeps the tab in the workbench");

    // Make a file dirty, then log out through the status bar entry.
    const marker = `logout-e2e-${Date.now()}`;
    await quickOpen(page, EDIT_FILE);
    // Click into the text: on a fresh profile the focus may sit in another panel.
    const editor = page.locator(".editor-group-container .monaco-editor .view-lines").first();
    await editor.waitFor({ timeout: 20_000 });
    await editor.click({ position: { x: 5, y: 5 } });
    await page.keyboard.press("Home");
    await page.keyboard.type(`${marker}\n`);
    // With files.autoSave off (the image default) the tab stays dirty until the
    // logout saves it; with auto save on, the delay may win the race - say which.
    const dirty = await page.locator(".tab.dirty").first().waitFor({ timeout: 3000 }).then(() => true, () => false);
    console.log(dirty ? `ok - portal: ${EDIT_FILE} is dirty` : `note - portal: ${EDIT_FILE} not seen dirty (auto save?)`);

    await page.locator(ITEM).click();
    await confirmDialog(page, "Abmelden");
    await page.waitForURL(`${host}/logout`, { timeout: 30_000 });
    check((await page.locator("#stub").innerText()) === STUB_TEXT, `portal: the tab itself is on ${host}/logout (host root, not ${PREFIX}/logout)`);
    check(context.pages().length === 1, "portal: no second tab was opened");
    check(dialogs.length === 0, `portal: no "leave site?" prompt (${dialogs.join(" | ") || "none"})`);
    await page.screenshot({ path: join(OUT, "logout-03-portal-logout.png") });
    if (READ_CMD) {
      const onDisk = execSync(READ_CMD, { encoding: "utf8" });
      check(onDisk.includes(marker), `portal: the edit was saved before leaving (${EDIT_FILE} on disk has the marker)`);
    } else {
      console.log("skip - on-disk check of the saved file (CADS_LOGOUT_READ_CMD not set)");
    }
    await context.close();
    stub.close();
  }

  // -------------------------------------------------------------- password mode
  if (PASSWORD_URL) {
    const base = PASSWORD_URL.replace(/\/+$/, "");
    const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const { page, dialogs } = await openLab(context, `${base}/`);
    await page.locator('input[type="password"]').fill(PASSWORD);
    await page.keyboard.press("Enter");
    await waitForItem(page, "password");
    const before = (await context.cookies()).filter((c) => c.name.startsWith("code-server-session"));
    check(before.length > 0 && before.every((c) => c.value !== ""), "password: a code-server session cookie exists");

    await page.locator(ITEM).click();
    await confirmDialog(page, "Abmelden");
    await page.locator('input[type="password"]').waitFor({ state: "visible", timeout: 30_000 });
    check(new URL(page.url()).pathname.endsWith("/login"), `password: the tab shows code-server's login page (${page.url()})`);
    const after = (await context.cookies()).filter((c) => c.name.startsWith("code-server-session") && c.value !== "");
    check(after.length === 0, "password: the session cookie is gone");
    check(dialogs.length === 0, `password: no "leave site?" prompt (${dialogs.join(" | ") || "none"})`);
    await page.goto(`${base}/`);
    await page.locator('input[type="password"]').waitFor({ state: "visible", timeout: 30_000 });
    ok("password: reopening the lab asks for the password again");
    await page.screenshot({ path: join(OUT, "logout-04-password-login.png") });
    await context.close();
  }

  // -------------------------------------------------------------- fallback button
  if (FALLBACK_URL) {
    const stub = await startPortalStub(FALLBACK_URL);
    const host = `http://127.0.0.1:${stub.address().port}`;
    const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const { page, dialogs } = await openLab(context, `${host}${PREFIX}/`);
    await page.locator(".statusbar").waitFor({ state: "visible", timeout: 120_000 });
    await page.locator(FALLBACK).waitFor({ state: "visible", timeout: 60_000 });
    check((await page.locator(ITEM).count()) === 0, "fallback: the extension's status bar entry is absent");
    ok('fallback: the page script shows its own "Abmelden" button');
    await page.screenshot({ path: join(OUT, "logout-05-fallback-button.png") });
    await page.locator(FALLBACK).click();
    await page.waitForURL(`${host}/logout`, { timeout: 30_000 });
    check(dialogs.some((d) => d.startsWith("confirm: Vom Firmware-Labor abmelden?")), "fallback: it asks before logging out");
    check((await page.locator("#stub").innerText()) === STUB_TEXT, `fallback: the tab is on ${host}/logout`);
    await context.close();
    stub.close();
  }
} catch (err) {
  failed++;
  console.error(`FAIL - ${err?.stack ?? err}`);
  for (const context of browser.contexts()) {
    for (const [i, page] of context.pages().entries()) {
      await page.screenshot({ path: join(OUT, `logout-failure-${i}.png`) }).catch(() => {});
      console.error(`  page ${i}: ${page.url()}`);
    }
  }
} finally {
  await browser.close();
}

if (failed) fail(`${failed} check(s) failed - screenshots in ${OUT}`);
console.log("logout smoke test passed");
process.exit(0);
