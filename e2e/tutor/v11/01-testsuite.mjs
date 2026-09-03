import { execFileSync } from "node:child_process";
import { open, openPanel, panel, SHOTS, log } from "./lib.mjs";

const fails = [];
function check(name, cond, detail = "") {
  log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  :: " + detail : ""}`);
  if (!cond) fails.push(name);
}
const inContainer = (cmd) => execFileSync("docker", ["exec", "cads-tutor-e2e", "bash", "-lc", cmd]).toString();

const { browser, page } = await open();
const shot = async (n) => { await page.screenshot({ path: `${SHOTS}/${n}.png` }); log("shot", n); };

try {
  await openPanel(page);
  let p = await panel(page);
  log("STEP TITLE:", await p.locator("#step-title").innerText());

  // --- 1. scaffold badge -------------------------------------------------
  const meta = await p.locator(".meta").first().innerText();
  check("scaffold badge is shown on the step", /Guided|Mit L/.test(meta), meta.replace(/\n/g, " | "));
  await shot("30-v11-step-open");

  // --- 2. failing testSuite ---------------------------------------------
  log("answer file before:", inContainer("cat /home/coder/workspace/cads-zero/e2e-answer.txt").trim());
  await p.locator('li.task[data-task="suite"] .run-check').click();
  await p.locator('li.task[data-task="suite"].status-failed').waitFor({ timeout: 90000 });
  const failMsg = await p.locator('li.task[data-task="suite"] .task-msg').innerText();
  check("failing testSuite names the test that broke", /answer is 42/.test(failMsg), failMsg);
  const hint = await p.locator('li.task[data-task="suite"] .task-hint').innerText();
  check("a hint is shown for the failing test", hint.trim().length > 0, hint.replace(/\n/g, " | "));
  check("the hint is the authored one, not a generic fallback",
        /whole line|ganze Zeile|file right now|in der Datei/.test(hint), hint.replace(/\n/g, " | "));
  await shot("31-v11-testsuite-failed");

  // --- 3. fix the file, re-run ------------------------------------------
  inContainer("printf 'ANSWER=42\\n' > /home/coder/workspace/cads-zero/e2e-answer.txt");
  log("answer file after:", inContainer("cat /home/coder/workspace/cads-zero/e2e-answer.txt").trim());
  await p.locator('li.task[data-task="suite"] .run-check').click();
  await p.locator('li.task[data-task="suite"].status-passed').waitFor({ timeout: 90000 });
  const okMsg = await p.locator('li.task[data-task="suite"] .task-msg').innerText();
  check("corrected file makes the same suite pass", /2 test\(s\) passed/.test(okMsg), okMsg);
  const hintAfter = await p.locator('li.task[data-task="suite"] .task-hint').innerText();
  check("the hint is cleared once the check passes", hintAfter.trim() === "", JSON.stringify(hintAfter));
  await shot("32-v11-testsuite-passed");

  // --- 4. answer the question so the step completes ----------------------
  await p.locator('li.task[data-task="why"] textarea.answer').fill(
    "Because it cannot tell a solved exercise from an unsolved one, so it proves nothing about the student's work.");
  await p.locator('li.task[data-task="why"] .submit-answer').click();
  await page.waitForTimeout(4000);
  await p.locator('li.task[data-task="why"] .confirm').click();
  await p.locator('li.task[data-task="why"].status-passed').waitFor({ timeout: 60000 });
  check("question task confirmed without an LLM", true);
  await shot("33-v11-step1-done");

  console.log("RESULT-PART-1", fails.length === 0 ? "ALL PASS" : "FAILURES: " + fails.join(", "));
} catch (err) {
  console.log("ERROR", err.message);
  await shot("99-error");
  fails.push("exception: " + err.message);
} finally {
  await browser.close();
}
process.exit(fails.length === 0 ? 0 : 1);
