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

  // Navigate to step 2 (predict).
  if (!/Predict the output/.test(await p.locator("#step-title").innerText())) {
    await p.locator("#next").click();
    await page.waitForTimeout(6000);
    p = await panel(page);
  }
  log("STEP TITLE:", await p.locator("#step-title").innerText());
  check("step 2 is reachable, so step 1 completed", /Predict the output/.test(await p.locator("#step-title").innerText()));

  // --- recall card -------------------------------------------------------
  const recallCount = await p.locator(".card.recall").count();
  check("a recall card is shown, sourced from the completed step", recallCount > 0);
  if (recallCount > 0) {
    const rc = await p.locator(".card.recall").innerText();
    check("the recall card names the step it repeats", /From an earlier step|Aus einem/.test(rc), rc.replace(/\n/g, " | ").slice(0, 160));
    check("the recall card can be skipped", await p.locator("#recall-skip").count() > 0);
  }
  await shot("34-v11-recall-card");

  // --- predict: output withheld until a prediction exists ----------------
  const before = await p.locator('li.task[data-task="guess"]').innerText();
  check("the predict task asks for a prediction first", /Predict first|Erst vorhersagen/.test(before), before.replace(/\n/g, " | ").slice(0, 140));
  check("no Check button that would skip the prediction", await p.locator('li.task[data-task="guess"] .run-check').count() === 0);
  check("the observed output is NOT in the page before a prediction", !/ANSWER=42/.test(await p.locator("body").innerText()));
  await shot("35-v11-predict-before");

  // Too short a prediction must not run the check.
  await p.locator('li.task[data-task="guess"] textarea.prediction').fill("no");
  await p.locator('li.task[data-task="guess"] .submit-predict').click();
  await page.waitForTimeout(6000);
  const short = await p.locator('li.task[data-task="guess"] .task-msg').innerText();
  check("a too-short prediction is refused and nothing runs", /at least 10 characters|mindestens 10/.test(short), short);

  // A real prediction runs the check and reveals the output.
  await p.locator('li.task[data-task="guess"] textarea.prediction').fill("I predict it prints ANSWER=42 because we corrected the file in the previous step");
  await p.locator('li.task[data-task="guess"] .submit-predict').click();
  await p.locator('li.task[data-task="guess"].status-passed').waitFor({ timeout: 90000 });
  const after = await p.locator('li.task[data-task="guess"]').innerText();
  check("prediction and actual output are shown side by side", /Your prediction/.test(after) && /What actually happened/.test(after), after.replace(/\n/g, " | ").slice(0, 220));
  check("the actual output appears only now", /ANSWER=42/.test(after));
  check("self-assessment is offered when no LLM graded it", await p.locator('li.task[data-task="guess"] .predict-self').count() === 2);
  await shot("36-v11-predict-after");

  await p.locator('li.task[data-task="guess"] .predict-self[data-outcome="deviated"]').click();
  await page.waitForTimeout(4000);
  check("self-assessment is recorded without failing the check",
        await p.locator('li.task[data-task="guess"].status-passed').count() === 1);
  await shot("37-v11-predict-selfassessed");

  // --- step 3: misconception hint ---------------------------------------
  await p.locator("#next").click();
  await page.waitForTimeout(6000);
  p = await panel(page);
  log("STEP TITLE:", await p.locator("#step-title").innerText());
  inContainer("rm -f /home/coder/workspace/cads-zero/e2e-notes.txt");
  await p.locator('li.task[data-task="notes"] .run-check').click();
  await p.locator('li.task[data-task="notes"].status-failed').waitFor({ timeout: 90000 });
  const mHint = await p.locator('li.task[data-task="notes"] .task-hint').innerText();
  check("a misconception hint fires on what the command printed",
        /project root|Projekt-Root/.test(mHint), mHint.replace(/\n/g, " | "));
  check("the misconception question is the authored one",
        /could not find the file|nicht gefunden/.test(mHint), mHint.replace(/\n/g, " | ").slice(0, 160));
  await shot("38-v11-misconception");

  // Fix and finish the module.
  inContainer("printf 'ready\\n' > /home/coder/workspace/cads-zero/e2e-notes.txt");
  await p.locator('li.task[data-task="notes"] .run-check').click();
  await p.locator('li.task[data-task="notes"].status-passed').waitFor({ timeout: 90000 });
  check("the command check passes once the file exists", true);
  await page.waitForTimeout(4000);

  // --- reflection card ---------------------------------------------------
  p = await panel(page);
  let reflect = await p.locator(".card.reflection").count();
  if (!reflect) { await openPanel(page); await page.waitForTimeout(4000); p = await panel(page); reflect = await p.locator(".card.reflection").count(); }
  check("the module reflection card appears after the last step", reflect > 0);
  if (reflect > 0) {
    const rt = await p.locator(".card.reflection").innerText();
    check("the reflection card carries the module's prompts",
          /failing test/.test(rt) && /prediction differ/.test(rt), rt.replace(/\n/g, " | ").slice(0, 200));
    await p.locator("textarea.reflect-answer").first().fill("It told me the file held the wrong value, not that the file was missing.");
    await p.locator("textarea.reflect-answer").nth(1).fill("I expected the old value, so my model was one step behind the fix.");
    await p.locator("#reflection-submit").click();
    await page.waitForTimeout(5000);
    p = await panel(page);
    const state = await p.locator("#reflection-state").innerText();
    check("the reflection is saved", /saved|gespeichert/.test(state), state);
  }
  await shot("39-v11-reflection");

  console.log("RESULT-PART-2", fails.length === 0 ? "ALL PASS" : "FAILURES: " + fails.join(", "));
} catch (err) {
  console.log("ERROR", err.message);
  await shot("98-error2");
  fails.push("exception: " + err.message);
} finally {
  await browser.close();
}
process.exit(fails.length === 0 ? 0 : 1);
