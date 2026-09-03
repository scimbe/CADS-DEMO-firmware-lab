import { execFileSync } from "node:child_process";
import { dismissNotifications, open, openPanel, panel, SHOTS, log } from "./lib.mjs";

const fails = [];
function check(name, cond, detail = "") {
  log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  :: " + detail : ""}`);
  if (!cond) fails.push(name);
}
const inContainer = (cmd) => execFileSync("docker", ["exec", "cads-tutor-e2e", "bash", "-lc", cmd]).toString();

const { browser, page } = await open();
const shot = async (n) => { await page.screenshot({ path: `${SHOTS}/${n}.png` }); log("shot", n); };

try {
  let p = await panel(page).catch(async () => { await openPanel(page); return panel(page); });
  check("a fresh session opens the first step by itself", /Make the test suite green/.test(await p.locator("#step-title").innerText()));

  // 1. failing suite
  await p.locator('li.task[data-task="suite"] .run-check').click();
  await p.locator('li.task[data-task="suite"].status-failed').waitFor({ timeout: 90000 });
  check("testSuite fails on the seeded wrong value", true,
        await p.locator('li.task[data-task="suite"] .task-msg').innerText());

  // 2. correct the file IN THE EDITOR so edit.metrics is exercised.
  // Focus must leave the webview first: keystrokes sent while the panel has
  // focus go to the panel, not to the workbench.
  await dismissNotifications(page);
  await page.locator(".monaco-workbench").click({ position: { x: 700, y: 12 } });
  await page.waitForTimeout(1500);
  await page.keyboard.press("Control+p");
  await page.waitForTimeout(1500);
  await page.keyboard.type("e2e-answer.txt");
  await page.waitForTimeout(3000);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(5000);
  const editorOpen = await page.locator(".editor-instance .monaco-editor").count();
  check("the answer file opened in an editor", editorOpen > 0, `editors: ${editorOpen}`);
  // code-server reports a Mac platform to the browser, so the workbench uses the
  // Meta bindings for select-all and save.
  await page.locator(".editor-instance .monaco-editor").first().click();
  await page.waitForTimeout(800);
  await page.keyboard.press("Meta+a");
  await page.waitForTimeout(500);
  await page.keyboard.press("Backspace");
  await page.keyboard.type("ANSWER=42", { delay: 60 });
  await page.waitForTimeout(800);
  await page.keyboard.press("Meta+s");
  await page.waitForTimeout(6000);
  const onDisk = inContainer("cat /home/coder/workspace/cads-zero/e2e-answer.txt").trim();
  check("the file was corrected through the editor", onDisk === "ANSWER=42", JSON.stringify(onDisk));
  await shot("40-v11-editor-edit");

  // 3. re-run the suite
  await openPanel(page);
  p = await panel(page);
  await p.locator('li.task[data-task="suite"] .run-check').click();
  await p.locator('li.task[data-task="suite"].status-passed').waitFor({ timeout: 90000 });
  check("the corrected file makes the suite pass", true,
        await p.locator('li.task[data-task="suite"] .task-msg').innerText());
  await shot("41-v11-suite-green-after-editor-fix");

  // 4. answer the question, then answer the recall card on step 2
  await p.locator('li.task[data-task="why"] textarea.answer').fill(
    "A check that always passes cannot separate a solved exercise from an unsolved one, so it measures nothing.");
  await p.locator('li.task[data-task="why"] .submit-answer').click();
  await page.waitForTimeout(4000);
  await p.locator('li.task[data-task="why"] .confirm').click();
  await p.locator('li.task[data-task="why"].status-passed').waitFor({ timeout: 60000 });

  await p.locator("#next").click();
  await page.waitForTimeout(7000);
  p = await panel(page);
  if (await p.locator("#recall-answer").count()) {
    await p.locator("#recall-answer").fill("Because it cannot tell whether the work was done.");
    await p.locator("#recall-submit").click();
    await page.waitForTimeout(4000);
    p = await panel(page);
    check("answering the recall card acknowledges it", /Noted|Notiert/.test(await p.locator(".card.recall").innerText()));
  } else {
    check("recall card present on step 2", false, "no recall textarea");
  }
  await shot("42-v11-recall-answered");

  console.log("RESULT-PART-3", fails.length === 0 ? "ALL PASS" : "FAILURES: " + fails.join(", "));
} catch (err) {
  console.log("ERROR", err.message);
  await shot("97-error3");
  fails.push("exception: " + err.message);
} finally {
  await browser.close();
}
process.exit(fails.length === 0 ? 0 : 1);
