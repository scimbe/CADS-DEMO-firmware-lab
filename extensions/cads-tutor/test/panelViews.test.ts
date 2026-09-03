import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderPredict, renderRecall, renderReflection, renderStepHtml, type RecallView, type ReflectionView, type StepView, type TaskView } from "../src/webview";

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
    bodyHtml: "<p>body</p>",
    links: [],
    tasks: [],
    llmConfigured: true,
    bridgeAvailable: false,
    scaffold: "independent",
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
