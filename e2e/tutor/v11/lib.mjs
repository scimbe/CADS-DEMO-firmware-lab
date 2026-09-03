import { chromium } from "/Users/dev/.npm/_npx/86170c4cd1c5da32/node_modules/playwright/index.mjs";
export const EXEC = process.env.HOME + "/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell";
export const URL = "http://127.0.0.1:8086/?folder=/home/coder/workspace/cads-zero";
export const SHOTS = process.env.SHOTS || "e2e/tutor/screenshots";

export async function open() {
  const browser = await chromium.launch({ executablePath: EXEC, headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(40000);
  return { browser, page };
}

/** Clears notification toasts, which otherwise sit over the workbench and swallow clicks. */
export async function dismissNotifications(page) {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  await page.keyboard.press("F1");
  await page.waitForTimeout(1200);
  await page.keyboard.type("Clear All Notifications");
  await page.waitForTimeout(2000);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1500);
}

/** Opens the tutor panel through the command palette (autoOpen only fires on a fresh session). */
export async function openPanel(page) {
  await page.keyboard.press("F1");
  await page.waitForTimeout(1500);
  await page.keyboard.type("CaDS Tutor: Tutor \u00f6ffnen");
  await page.waitForTimeout(2500);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(6000);
}

/** The tutor step panel lives in a nested webview iframe; find the one that has our markup. */
export async function panel(page, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const f of page.frames()) {
      try {
        if (await f.locator("#step-title").count()) return f;
      } catch { /* frame detached mid-scan */ }
    }
    await page.waitForTimeout(1000);
  }
  throw new Error("tutor panel frame not found");
}

export async function text(frame, sel) {
  return (await frame.locator(sel).first().innerText()).trim();
}

export function log(...a) { console.log(...a); }
