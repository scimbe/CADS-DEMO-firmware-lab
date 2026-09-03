import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it } from "node:test";
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
