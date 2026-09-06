import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderCanDo, renderCompetence, renderPredict, renderRecall, renderReflection, renderStepHtml, type CanDoCardView, type CompetenceCardView, type CompetenceObjectiveView, type RecallView, type ReflectionView, type StepView, type TaskView } from "../src/webview";

function baseView(extra: Partial<StepView> = {}): StepView {
  return {
    lang: "en",
    courseId: "c",
    courseTitle: "Course",
    moduleTitle: "M1",
    stepId: "s1",
    title: "Step",
    index: 0,
    total: 3,
    bloom: "apply",
    objectives: [],
    creates: [],
    status: "active",
    lockedBy: [],
    moduleProgress: { done: 1, total: 3 },
    bodyHtml: "<p>body</p>",
    links: [],
    tasks: [],
    llmConfigured: true,
    bridgeAvailable: false,
    scaffold: "independent",
    hasBoard: false,
    ...extra,
  };
}

function predictTask(extra: Partial<TaskView["predict"]> = {}): TaskView {
  return {
    id: "guess",
    title: "Predict",
    type: "predict",
    status: "pending",
    needsAnswer: false,
    manual: false,
    live: false,
    predict: { prompt: "What does this print?", ran: false, ...extra },
  };
}

describe("scaffold badge", () => {
  it("shows the level and its explanation", () => {
    for (const [level, label] of [["worked", "Worked example"], ["faded", "Guided"], ["independent", "On your own"]] as const) {
      const html = renderStepHtml(baseView({ scaffold: level }), "vscode-webview://x", "N");
      assert.match(html, new RegExp(`scaffold-${level}`));
      assert.ok(html.includes(label), `${level} shows "${label}"`);
    }
  });
  it("carries the German wording when the panel is German", () => {
    assert.ok(renderStepHtml(baseView({ lang: "de", scaffold: "worked" }), "vscode-webview://x", "N").includes("Vorgemacht"));
  });
});

describe("predict panel", () => {
  it("asks for a prediction and shows no output before one exists", () => {
    // The guarantee: the observed output must not be in the DOM at all, since a
    // student could otherwise read it and write it down as their prediction.
    const html = renderPredict(predictTask({ ran: false, actual: "SECRET-OUTPUT-42" }), "en");
    assert.match(html, /Predict first/);
    assert.match(html, /What does this print\?/);
    assert.match(html, /class="prediction"/);
    assert.doesNotMatch(html, /SECRET-OUTPUT-42/);
  });
  it("shows prediction and actual output side by side once it ran", () => {
    const html = renderPredict(predictTask({ ran: true, prediction: "I think 42", actual: "42\n" }), "en");
    assert.match(html, /Your prediction/);
    assert.match(html, /What actually happened/);
    assert.match(html, /I think 42/);
    assert.match(html, /predict-compare/);
  });
  it("states the verdict when an LLM compared them", () => {
    assert.match(renderPredict(predictTask({ ran: true, prediction: "p", actual: "a", outcome: "correct" }), "en").replace(/\s+/g, " "), /predict-verdict match/);
    assert.match(renderPredict(predictTask({ ran: true, prediction: "p", actual: "a", outcome: "deviated" }), "en"), /that is the interesting case/);
  });
  it("offers self-assessment when nothing graded the comparison", () => {
    const html = renderPredict(predictTask({ ran: true, prediction: "p", actual: "a" }), "en");
    assert.match(html, /predict-self/);
    assert.match(html, /It matched what I expected/);
    assert.match(html, /It differed from what I expected/);
  });
  it("escapes output that contains markup", () => {
    const html = renderPredict(predictTask({ ran: true, prediction: "p", actual: "<script>alert(1)</script>" }), "en");
    assert.doesNotMatch(html, /<script>alert/);
    assert.match(html, /&lt;script&gt;/);
  });
  it("omits the plain Check button so the prediction cannot be skipped", () => {
    const html = renderStepHtml(baseView({ tasks: [predictTask()] }), "vscode-webview://x", "N");
    assert.doesNotMatch(html, /class="btn primary run-check"/);
    assert.match(html, /submit-predict/);
  });
  it("keeps the Check button for ordinary tasks", () => {
    const plain: TaskView = { id: "t", title: "T", type: "command", status: "pending", needsAnswer: false, manual: false, live: false };
    assert.match(renderStepHtml(baseView({ tasks: [plain] }), "vscode-webview://x", "N"), /run-check/);
  });
});

describe("recall card", () => {
  const card: RecallView = { fromStepId: "m1-01", fromTitle: "Ownership", taskId: "why", prompt: "Why is the value gone?", settled: false };

  it("names the module the question comes from and says to answer from memory", () => {
    const html = renderRecall({ ...card, fromModuleTitle: "Ownership" }, "de");
    assert.match(html, /Ownership/);
    assert.match(html, /aus dem Gedächtnis/i, "A9.2a: a recall is answered without the file");
  });

  it("names the step it repeats and offers skipping", () => {
    const html = renderRecall(card, "en");
    assert.match(html, /Recall/);
    assert.match(html, /From an earlier step: Ownership/);
    assert.match(html, /Why is the value gone\?/);
    assert.match(html, /id="recall-skip"/, "recall must be skippable: A2 calls it non-blocking");
  });
  it("collapses to an acknowledgement once settled", () => {
    const html = renderRecall({ ...card, settled: true }, "en");
    assert.match(html, /Noted/);
    assert.doesNotMatch(html, /id="recall-submit"/);
  });
  it("names the rubric verdict once a model graded the answer", () => {
    const passed = renderRecall({ ...card, settled: true, outcome: "passed", feedback: "Names the move." }, "en");
    assert.match(passed, /counts as evidence/);
    assert.match(passed, /Names the move\./);
    assert.match(renderRecall({ ...card, settled: true, outcome: "failed" }, "en"), /Not yet/);
    // Ungraded stays a repetition prompt: no verdict is claimed.
    assert.match(renderRecall({ ...card, settled: true }, "en"), /Noted/);
  });
  it("escapes the recalled prompt", () => {
    assert.doesNotMatch(renderRecall({ ...card, prompt: "<img onerror=x>" }, "en"), /<img/);
  });
});

describe("reflection card", () => {
  const card: ReflectionView = { moduleId: "m1", moduleTitle: "Ownership", prompts: ["What surprised you?", "What is still unclear?"], saved: false };

  it("renders one box per prompt and names the module", () => {
    const html = renderReflection(card, "en");
    assert.match(html, /Module reflection/);
    assert.match(html, /Ownership/);
    assert.equal((html.match(/class="reflect-answer"/g) ?? []).length, 2);
  });
  it("shows previous answers and the saved state on return", () => {
    const html = renderReflection({ ...card, answers: ["borrowing", "lifetimes"], saved: true }, "en");
    assert.match(html, /borrowing/);
    assert.match(html, /lifetimes/);
    assert.match(html, /Reflection saved/);
  });
  it("uses the German wording when the panel is German", () => {
    assert.match(renderReflection(card, "de"), /Modul-Reflexion/);
  });
});

/**
 * SPEC A9.4: the panel's order is binding. These tests hold the two parts a
 * student notices when they are missing - how far it still is, and what to do
 * next - and the rule that there is never a second primary button to choose.
 */
describe("A9.4: header, progress and the one next action", () => {
  // The client script carries button templates of its own, so the assertions
  // look at the rendered document only.
  const markup = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, "");
  const countPrimary = (html: string) => (markup(html).match(/class="btn[^"]*\bprimary\b/g) ?? []).length;

  it("names the place and the progress in the header", () => {
    const html = renderStepHtml(
      baseView({ courseTitle: "CaDS Zero", moduleTitle: "M0", index: 2, total: 9, moduleProgress: { done: 1, total: 4 } }),
      "cs",
      "N",
    );
    assert.match(html, /CaDS Zero › M0 › Step 3 of 9/);
    assert.match(html, /class="modbar-fill" style="width:25%"/);
    assert.match(html, /Module: 1 of 4 steps done/);
  });

  it("draws an empty bar for a module nobody has started, and a full one when it is done", () => {
    assert.match(renderStepHtml(baseView({ moduleProgress: { done: 0, total: 4 } }), "cs", "N"), /width:0%/);
    assert.match(renderStepHtml(baseView({ moduleProgress: { done: 4, total: 4 } }), "cs", "N"), /width:100%/);
  });

  it("keeps the next action in the sticky header, with the page's only primary button", () => {
    const html = renderStepHtml(
      baseView({ nextAction: { text: "Next task: Build it", label: "Check: Build it", kind: "task", taskId: "t1" } }),
      "cs",
      "N",
    );
    assert.match(html, /id="next-line"[^>]*>Next task: Build it</);
    assert.match(html, /id="next-action"[^>]*data-next-kind="task"/);
    assert.match(html, /data-task="t1"/);
    assert.equal(countPrimary(html), 1);
  });

  it("sends the student to a task that has to be typed instead of checking an empty box", () => {
    const html = renderStepHtml(
      baseView({ nextAction: { text: "Next task: Answer", label: "Go to: Answer", kind: "task", taskId: "q", needsInput: true } }),
      "cs",
      "N",
    );
    assert.match(html, /data-needs-input="1"/);
  });

  it("offers the next step once every task is done", () => {
    const html = renderStepHtml(baseView({ nextAction: { text: "Continue to: Two", label: "Next step", kind: "step", stepId: "s2" } }), "cs", "N");
    assert.match(html, /id="next-action"[^>]*data-next-kind="step"[^>]*data-step="s2"/);
    assert.equal(countPrimary(html), 1);
  });

  it("offers no button at all when there is nothing left to do", () => {
    const html = renderStepHtml(baseView({ nextAction: { text: "Every task in this step is done.", kind: "none" } }), "cs", "N");
    assert.doesNotMatch(markup(html), /id="next-action"/);
    assert.equal(countPrimary(html), 0);
  });

  it("hands the one primary button to the orientation card while it is up", () => {
    const html = renderStepHtml(
      baseView({ orientation: { board: false }, nextAction: { text: "Next task: Build it", label: "Check: Build it", kind: "task", taskId: "t1" } }),
      "cs",
      "N",
    );
    assert.equal(countPrimary(html), 1);
    assert.match(html, /id="orientation-dismiss"/);
  });

  it("teaches the client the module label as a template, so the bar can move without a reload", () => {
    const html = renderStepHtml(baseView({ moduleProgress: { done: 1, total: 4 } }), "cs", "N");
    assert.match(html, /"moduleProgress":"Module: \{d\} of \{t\} steps done"/);
    assert.match(renderStepHtml(baseView({ lang: "de", moduleProgress: { done: 1, total: 4 } }), "cs", "N"), /Modul: \{d\} von \{t\} Schritten fertig/);
  });

  it("puts the recall and reflection cards after the tasks, not before them", () => {
    const html = renderStepHtml(
      baseView({
        tasks: [{ id: "t1", title: "T", type: "manual", status: "pending", needsAnswer: false, manual: true, live: false }],
        recall: { fromStepId: "s0", fromTitle: "Earlier", taskId: "q", prompt: "Why?", settled: false },
      }),
      "cs",
      "N",
    );
    assert.ok(html.indexOf('id="tasks"') < html.indexOf('id="recall-area"'), "tasks come first");
    assert.ok(html.indexOf('id="recall-area"') < html.indexOf('id="reflection-area"'), "recall before reflection");
  });
});

/** R11a.4: the course's sentence about the cause stands above the tool's output. */
describe("A9.4.4: a failed check explains itself before it quotes the tool", () => {
  it("puts the cause line ahead of the tool output", () => {
    const html = renderStepHtml(
      baseView({
        tasks: [{
          id: "t1", title: "Build", type: "command", status: "failed",
          message: "error[E0382]: borrow of moved value: `s`",
          cause: "The value was moved out of `s`.",
          needsAnswer: false, manual: false, live: false,
        }],
      }),
      "cs",
      "N",
    );
    const cause = html.indexOf("The value was moved out of");
    const output = html.indexOf("borrow of moved value");
    assert.ok(cause > 0 && output > 0, "both are rendered");
    assert.ok(cause < output, "the course's sentence comes first");
    assert.match(html, /class="cause-label"/);
  });

  it("leaves the cause line out of the way when a task has not failed", () => {
    const html = renderStepHtml(
      baseView({ tasks: [{ id: "t1", title: "Build", type: "command", status: "pending", needsAnswer: false, manual: false, live: false }] }),
      "cs",
      "N",
    );
    assert.match(html, /<div class="task-cause"><\/div>/);
  });
});

describe("R11a.8 self-assessed passes are marked", () => {
  it("marks a pass nobody verified and leaves a graded one alone", () => {
    const base: TaskView = { id: "q", title: "Why?", type: "question", status: "passed", needsAnswer: true, manual: true, live: false };
    assert.match(renderStepHtml(baseView({ tasks: [{ ...base, selfReported: true }] }), "cs", "N"), /selbst eingeschätzt|self-assessed/);
    assert.doesNotMatch(renderStepHtml(baseView({ tasks: [base] }), "cs", "N"), /selbst eingeschätzt|self-assessed/);
  });
});

describe("A9.3 competence card", () => {
  const objectives: CompetenceObjectiveView[] = [
    { objectiveId: "own", statement: "Explain who owns a value", level: "demonstrated", evidenceKind: "recall", evidenceStepId: "m2-01", evidenceStepTitle: "Shared references", evidenceAt: "2026-09-06T09:00:00.000Z" },
    { objectiveId: "borrow", statement: "Borrow instead of moving", level: "practised", evidenceKind: "checkFirstTry", evidenceStepId: "m1-02", evidenceStepTitle: "Move vs clone" },
    { objectiveId: "slices", statement: "Take a slice", level: "touched", evidenceKind: "question", evidenceStepId: "m1-03", evidenceStepTitle: "Slices" },
    { objectiveId: "life", statement: "Name a lifetime", level: "none" },
  ];
  const card: CompetenceCardView = { moduleId: "m1", moduleTitle: "Ownership", objectives, complete: false };

  it("names the level and the evidence that produced it", () => {
    const html = renderCompetence(card, "de");
    assert.match(html, /nachgewiesen/);
    assert.match(html, /Abruf aus einem späteren Modul bestanden/);
    assert.match(html, /in Shared references/);
    assert.match(html, /2026-09-06/, "K10: an entry carries its date");
    assert.match(html, /noch kein geprüfter Beleg/, "an objective without evidence says so");
  });

  it("reports module completion by the competence rule, not by steps", () => {
    assert.match(renderCompetence(card, "en"), /2 objective\(s\) of this module are not practised yet/);
    assert.match(renderCompetence({ ...card, complete: true }, "en"), /at least practised/);
  });

  it("carries no points currency", () => {
    const html = renderCompetence(card, "de") + renderCanDo({ moduleId: "m1", moduleTitle: "Ownership", can: objectives.slice(0, 2), open: objectives.slice(2) }, "de");
    // The footnote is the one place allowed to name them, because it says there are none.
    const body = html.replace(/<div class="competence-note">[^<]*<\/div>/g, "");
    for (const forbidden of [/\bXP\b/, /Level \d/, /Serien/, /Streak/i, /Liga/, /Rangliste/, /Punkte/]) {
      assert.doesNotMatch(body, forbidden, `R11a.9 forbids ${forbidden}`);
    }
    assert.match(html, /Keine Punkte, keine Serien/);
  });

  it("tells 'not reached' from 'not reachable without a model'", () => {
    const stuck: CompetenceObjectiveView = {
      objectiveId: "clean", statement: "Explain a clean-room PR", level: "touched",
      evidenceKind: "question", evidenceStepId: "m8-03", ceiling: "touched", limitedByLlm: true,
    };
    const html = renderCompetence({ ...card, objectives: [stuck] }, "de");
    assert.match(html, /Ohne Sprachmodell/);
    assert.match(html, /liegt an der Installation, nicht an deiner Arbeit/);
  });

  it("says when the course itself never asks again, so demonstrated cannot come", () => {
    const capped: CompetenceObjectiveView = {
      objectiveId: "build", statement: "Build the firmware", level: "practised",
      evidenceKind: "checkFirstTry", evidenceStepId: "m0-02", ceiling: "practised", noLaterRecall: true,
    };
    assert.match(renderCompetence({ ...card, objectives: [capped] }, "de"), /Kein späteres Modul fragt dieses Lernziel erneut ab/);
  });

  it("stays quiet where the student can still do something about it", () => {
    // Reachable is above reached: this is work left, not a ceiling.
    const open: CompetenceObjectiveView = {
      objectiveId: "own", statement: "Own a value", level: "touched", ceiling: "demonstrated", limitedByLlm: false,
    };
    const html = renderCompetence({ ...card, objectives: [open] }, "de");
    assert.doesNotMatch(html, /Ohne Sprachmodell/);
    assert.doesNotMatch(html, /Kein späteres Modul/);
  });

  it("escapes an objective statement from the pack", () => {
    const html = renderCompetence({ ...card, objectives: [{ objectiveId: "x", statement: "<img onerror=x>", level: "touched" }] }, "en");
    assert.doesNotMatch(html, /<img/);
  });
});

describe("A9.3 can-do card", () => {
  const can: CompetenceObjectiveView[] = [
    { objectiveId: "a", statement: "Explain ownership", level: "demonstrated", evidenceKind: "recall", evidenceStepId: "m2-01", evidenceStepTitle: "Shared references" },
    { objectiveId: "b", statement: "Borrow a value", level: "practised", evidenceKind: "checkFirstTry", evidenceStepId: "m1-02", evidenceStepTitle: "Move vs clone" },
  ];
  const open: CompetenceObjectiveView[] = [{ objectiveId: "c", statement: "Name a lifetime", level: "touched", evidenceKind: "question" }];

  const card: CanDoCardView = { moduleId: "m1", moduleTitle: "Ownership", can, open };

  it("says what the student can do and what it rests on", () => {
    const html = renderCanDo(card, "de");
    assert.match(html, /Du kannst jetzt/);
    assert.match(html, /Explain ownership/);
    assert.match(html, /Prüfung im ersten Versuch ohne Hinweis bestanden/);
    assert.match(html, /Noch offen:/);
    assert.match(html, /Name a lifetime/, "what is missing is named, not hidden");
  });

  it("says so plainly when nothing is verified yet", () => {
    const html = renderCanDo({ ...card, can: [] }, "en");
    assert.match(html, /Nothing verified in this module yet/);
    assert.doesNotMatch(html, /<ul class="can-list">/);
  });
});
