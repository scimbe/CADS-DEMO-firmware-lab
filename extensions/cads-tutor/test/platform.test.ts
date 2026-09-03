import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it } from "node:test";
import { stepTerms } from "../src/askRouting";
import { masteryFor, openEventStore } from "../src/events";
import { loadCoursePack } from "../src/loader";
import { readLlmConfig, TutorPlatform } from "../src/platform";

const EXAMPLE = path.resolve(__dirname, "..", "..", "courses", "_example");
const PACKS = path.resolve(__dirname, "..", "..", "node_modules", "@cads", "tutor-platform", "content-packs");
const course = loadCoursePack(EXAMPLE, "test").course!;

function tmp(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cads-plat-"));
}

describe("LLM config", () => {
  it("needs base URL, key and model; key only from env", () => {
    assert.equal(readLlmConfig({}), null);
    assert.equal(readLlmConfig({ TUTOR_LLM_API_KEY: "k" }, { baseUrl: "https://x", model: "m" })!.model, "m");
    assert.equal(readLlmConfig({ TUTOR_LLM_BASE_URL: "https://x/", TUTOR_LLM_MODEL: "m" }, {}), null);
    assert.equal(readLlmConfig({ TUTOR_LLM_BASE_URL: "https://x/v1/", TUTOR_LLM_API_KEY: "k", TUTOR_LLM_MODEL: "m" })!.baseUrl, "https://x/v1");
  });
});

describe("TutorPlatform", () => {
  it("grounds on the firmware pack + course sources without an LLM and reports unconfigured", async () => {
    const p = new TutorPlatform({ course, packsDir: PACKS, studentId: "s1", memoryDir: tmp(), llm: null });
    assert.equal(p.hasLlm, false);
    assert.equal(p.track, "firmware");
    assert.ok(p.curriculum?.get("firmware-how-to-build"));
    assert.ok(p.curriculum?.get("example.orientation"), "course curriculum.json merged");
    const out = await p.ask("how do I build the firmware with cmake presets?", "de");
    assert.equal(out.kind, "unconfigured");
    if (out.kind === "unconfigured") {
      assert.match(out.message, /nicht konfiguriert/);
      assert.ok(out.citations.length > 0, "citations from grounding even without LLM");
      assert.ok(out.citations[0].url.startsWith("https://"));
    }
    const g = await p.gradeAnswer("q", "rubric", "answer");
    assert.equal(g.kind, "manual");
    assert.equal(await p.checkIn("firmware-how-to-build", "int main(){}"), null);
    assert.equal(p.knownObjective(["nope", "firmware-how-to-build"]), "firmware-how-to-build");
  });

  it("with a fake LLM: Socratic ask (tier by attempt), rubric verdict parsing", async () => {
    const prompts: string[] = [];
    const llm = {
      async complete(prompt: string) {
        prompts.push(prompt);
        if (prompt.includes("VERDICT")) return "Good, but which register range?\nVERDICT: fail";
        return "What does the preset select for you?";
      },
    };
    const p = new TutorPlatform({ course, packsDir: PACKS, studentId: "s1", memoryDir: tmp(), llm: null, llmClient: llm });
    assert.equal(p.hasLlm, true);
    const a = await p.ask("how do I build the firmware with cmake presets?", "en", { bloomLevel: "apply", attemptNumber: 2 });
    assert.equal(a.kind, "answer");
    if (a.kind === "answer") {
      assert.equal(a.hintTier, 2);
      assert.equal(a.bloomLevel, "apply");
      assert.ok(a.citations.length > 0);
    }
    assert.match(prompts[0], /narrower, more specific guiding question/);
    const refused = await p.ask("what is the capital of france", "en");
    assert.equal(refused.kind, "refused");
    const v = await p.gradeAnswer("why no mass erase?", "mentions option bytes", "because it is dangerous", "analyze");
    assert.equal(v.kind, "fail");
    assert.equal(v.feedback, "Good, but which register range?");
    const hint = await p.genericHint("build", "exit 2", "remember", 1, "en", ["firmware-how-to-build"]);
    assert.equal(hint, "What does the preset select for you?");
  });
});

describe("event store", () => {
  it("records and computes mastery (sqlite or JSON fallback)", () => {
    const dir = tmp();
    const opened = openEventStore(dir);
    assert.ok(["sqlite", "json"].includes(opened.backend));
    assert.equal(masteryFor(opened.store, "s", "o").mastery, 0);
    opened.store.record({ entityId: "s", sessionId: "x", track: "firmware", objectiveId: "o", bloomLevel: "apply", exchangeType: null, source: "tool_check", hintTierReached: 0, outcome: "independent_success" });
    const m = masteryFor(opened.store, "s", "o");
    assert.equal(m.events, 1);
    assert.equal(m.mastery, 1);
    opened.store.close();
    assert.ok(fs.existsSync(opened.file));
  });
});

describe("language reaches the model", () => {
  // The live fault: the UI was German and the tutor answered in English, because
  // `lang` was accepted by ask() and then dropped before the prompt was built.
  function withLang(lang: "de" | "en", prompts: string[]) {
    return new TutorPlatform({
      course,
      packsDir: PACKS,
      studentId: "s1",
      memoryDir: tmp(),
      llm: null,
      llmClient: { complete: async (p: string) => (prompts.push(p), "ok\nVERDICT: pass") },
      lang: () => lang,
    });
  }

  it("puts the German instruction into the prompt when the UI is German", async () => {
    // The corpus is English, so the query that grounds is English; the ANSWER is
    // what has to be German. That split is the whole point of the directive.
    const prompts: string[] = [];
    await withLang("de", prompts).ask("how do I build the firmware with cmake presets?", "de");
    assert.equal(prompts.length, 1);
    assert.match(prompts[0], /ausschließlich auf Deutsch/);
  });
  it("puts the English instruction into an English prompt", async () => {
    const prompts: string[] = [];
    await withLang("en", prompts).ask("how do I build the firmware with cmake presets?", "en");
    assert.match(prompts[0], /exclusively in English/);
    assert.doesNotMatch(prompts[0], /ausschließlich auf Deutsch/);
  });
  it("instructs the rubric grader too, so feedback is not English in a German UI", async () => {
    const prompts: string[] = [];
    const v = await withLang("de", prompts).gradeAnswer("Warum?", "nennt RCC_AHB1ENR", "weil die Clock aktiviert werden muss");
    assert.equal(v.kind, "pass");
    assert.match(prompts[0], /ausschließlich auf Deutsch/);
    assert.match(prompts[0], /Rubric/, "still the grading prompt");
  });
  it("instructs the generic hint as well", async () => {
    const prompts: string[] = [];
    const hint = await withLang("de", prompts).genericHint("Build", "exit code 2", "apply", 1, "de", ["firmware-how-to-build"]);
    assert.ok(hint !== undefined, "a hint was produced");
    assert.match(prompts[0], /ausschließlich auf Deutsch/);
  });
  it("tells the model the source excerpts are English but the answer is not", async () => {
    const prompts: string[] = [];
    await withLang("de", prompts).ask("how do I build the firmware with cmake presets?", "de");
    assert.match(prompts[0], /Referenzauszüge.*Englisch/s);
  });
  it("leaves the grounding query free of the instruction", async () => {
    // The question is also the BM25 query against an English corpus; German
    // instruction words in it would degrade retrieval for no benefit.
    const prompts: string[] = [];
    const p = withLang("de", prompts);
    const out = await p.ask("how do I build the firmware with cmake presets?", "de");
    assert.equal(out.kind, "answer", "still grounded, so retrieval was not disturbed");
  });
});

describe("a question asked in German still reaches the sources", () => {
  // The corpus is English. Before this, BM25 scored a German question near zero
  // on every chunk, so the tutor refused it before any model was asked.
  function platform(prompts: string[]) {
    return new TutorPlatform({
      course,
      packsDir: PACKS,
      studentId: "s1",
      memoryDir: tmp(),
      llm: null,
      llmClient: { complete: async (p: string) => (prompts.push(p), "Antwort") },
      lang: () => "de",
    });
  }
  const buildStep = { objectives: ["firmware-how-to-build"], creates: [], sources: [], links: [], title: "Build the firmware with cmake presets" };

  it("was refused without the step's vocabulary", async () => {
    const p = platform([]);
    const out = await p.ask("Wie baue ich die Firmware?", "de");
    assert.equal(out.kind, "refused", "this is the fault being fixed, kept as the baseline");
  });

  it("grounds and answers once the step's vocabulary is supplied", async () => {
    const prompts: string[] = [];
    const out = await platform(prompts).ask("Wie baue ich die Firmware?", "de", { stepTerms: stepTerms(buildStep as never) });
    assert.equal(out.kind, "answer", `still refused: ${JSON.stringify(out)}`);
    if (out.kind === "answer") assert.ok(out.citations.length > 0, "the answer is still evidenced by real sources");
  });

  it("answers in German, and the prompt says so", async () => {
    const prompts: string[] = [];
    await platform(prompts).ask("Wie baue ich die Firmware?", "de", { stepTerms: stepTerms(buildStep as never) });
    assert.equal(prompts.length, 1);
    assert.match(prompts[0], /ausschließlich auf Deutsch/);
  });

  it("asks about what the student asked, not about the added search terms", async () => {
    const prompts: string[] = [];
    await platform(prompts).ask("Wie baue ich die Firmware?", "de", { stepTerms: stepTerms(buildStep as never) });
    assert.match(prompts[0], /Wie baue ich die Firmware\?/);
  });

  it("keeps refusing when nothing in the corpus matches, whatever the context", async () => {
    // The rule that an answer comes only from evidenced sources must survive.
    const out = await platform([]).ask("Was ist die Hauptstadt von Frankreich?", "de", {
      stepTerms: stepTerms(buildStep as never),
    });
    assert.equal(out.kind, "refused", `answered an off-topic question: ${JSON.stringify(out)}`);
  });

  it("does not disturb an English question that already grounded", async () => {
    const prompts: string[] = [];
    const out = await platform(prompts).ask("how do I build the firmware with cmake presets?", "de", { stepTerms: stepTerms(buildStep as never) });
    assert.equal(out.kind, "answer");
    assert.equal(prompts.length, 1, "no second retrieval attempt was needed");
  });
});
