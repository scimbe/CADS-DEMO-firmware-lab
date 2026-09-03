import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { glossaryTerms, isProceduralQuestion, proceduralAnswer, questionIsSupported, retrievalQuery, stepTerms } from "../src/askRouting";
import type { StepFrontMatter } from "../src/types";

describe("procedural questions are recognised", () => {
  // B7: these are the questions a lost beginner actually asks, and they have no
  // indexable term, so retrieval refused every one of them.
  const procedural = [
    "Wie soll ich jetzt anfangen?",
    "Wie fange ich an?",
    "Was soll ich hier tun?",
    "Was mache ich als nächstes?",
    "Was sehe ich da?",
    "Ich bin verloren",
    "Ich weiß nicht, was ich machen soll",
    "Wo ist das Terminal?",
    "Wie geht es weiter?",
    "How do I start?",
    "what should I do",
    "What am I looking at?",
    "I'm lost",
    "where do I start",
    "nothing happens",
  ];
  for (const q of procedural) {
    it(`recognises: ${q}`, () => assert.equal(isProceduralQuestion(q), true));
  }

  const content = [
    "Warum wird der Wert nach der Zuweisung verschoben?",
    "Why does the borrow checker reject this?",
    "Wie flashe ich die Firmware auf das Board?",
    "What does RCC_AHB1ENR do?",
    "Was bedeutet error[E0382]?",
  ];
  for (const q of content) {
    it(`leaves a content question to retrieval: ${q}`, () => assert.equal(isProceduralQuestion(q), false));
  }

  it("does not treat an empty question as procedural", () => {
    assert.equal(isProceduralQuestion("   "), false);
  });
});

describe("the procedural answer", () => {
  const base = { stepTitle: "Board verbinden", position: "Schritt 2 von 41", board: true, lang: "de" as const };

  it("says where the student is, what is open, and which button to press", () => {
    const text = proceduralAnswer({ ...base, openTaskTitle: "Board angeschlossen", openTaskAction: "Board verbinden" });
    assert.match(text, /Du bist bei: Board verbinden \(Schritt 2 von 41\)/);
    assert.match(text, /Die nächste offene Aufgabe ist „Board angeschlossen“/);
    assert.match(text, /Drücke bei dieser Aufgabe „Board verbinden“/);
  });
  it("names where the panels are, because that is what being lost is about", () => {
    const text = proceduralAnswer({ ...base, openTaskTitle: "x" });
    assert.match(text, /Explorer/);
    assert.match(text, /Terminal/);
  });
  it("mentions F1 rather than the shortcut that does not work in a browser", () => {
    assert.match(proceduralAnswer({ ...base, openTaskTitle: "x" }), /F1/);
  });
  it("omits the board guidance for a course without hardware", () => {
    // Rust and JavaScript students must never be told about flashing. The step
    // title is whatever the pack wrote, so assert on the guidance sentence.
    const withBoard = proceduralAnswer({ ...base, board: true, openTaskTitle: "x" });
    const without = proceduralAnswer({ ...base, board: false, openTaskTitle: "x" });
    assert.match(withBoard, /Für Board-Aufgaben/);
    assert.doesNotMatch(without, /Für Board-Aufgaben/);
    assert.doesNotMatch(without, /Flashen/);
  });
  it("says so when every task in the step is done", () => {
    assert.match(proceduralAnswer({ ...base, openTaskTitle: undefined }), /alles erledigt/);
  });
  it("answers in English for an English UI", () => {
    const text = proceduralAnswer({ ...base, lang: "en", openTaskTitle: "Board connected", openTaskAction: "Connect board" });
    assert.match(text, /You are on: Board verbinden/);
    assert.match(text, /The next open task is "Board connected"/);
    assert.doesNotMatch(text, /Aufgabe/);
  });
});

describe("German terms mapped to the corpus language", () => {
  it("maps domain words a student would type", () => {
    assert.deepEqual(glossaryTerms("Wie viel Speicher braucht das?"), ["memory"]);
    assert.ok(glossaryTerms("Was bedeutet dieser Fehler beim Bauen?").includes("error"));
    assert.ok(glossaryTerms("Was bedeutet dieser Fehler beim Bauen?").includes("build"));
  });
  it("maps the ownership vocabulary the Rust course needs", () => {
    const t = glossaryTerms("Warum wird der Besitz beim Verschieben übertragen und nicht geliehen?");
    assert.ok(t.includes("ownership"), t.join(","));
    assert.ok(t.includes("move"));
  });
  it("adds nothing for an English question", () => {
    assert.deepEqual(glossaryTerms("why does the borrow checker complain"), []);
  });
});

describe("the retrieval query", () => {
  const meta = {
    title: "Scope, owner, move",
    objectives: ["rust.ownership.move"],
    creates: [],
    sources: ["src/m1/scope.rs"],
    links: [{ doc: "docs/ownership.md" } as never],
  } as unknown as Pick<StepFrontMatter, "objectives" | "creates" | "links" | "sources" | "title">;

  it("takes the step's own English vocabulary from its front matter", () => {
    const terms = stepTerms(meta);
    // "m1" is dropped on purpose: two-character fragments are noise as search terms.
    for (const expected of ["scope", "owner", "move", "rust", "ownership", "src"]) {
      assert.ok(terms.includes(expected), `${expected} missing from ${terms.join(",")}`);
    }
  });
  it("drops stopwords and very short fragments", () => {
    const terms = stepTerms({ ...meta, title: "The a of it" });
    assert.ok(!terms.includes("the"));
    assert.ok(!terms.includes("a"));
    assert.ok(!terms.includes("m1"), "two-character fragments are noise as search terms");
  });
  it("keeps the student's wording first and only appends terms", () => {
    const q = "Warum wird der Wert verschoben?";
    const { query, added } = retrievalQuery(q, stepTerms(meta));
    assert.ok(query.startsWith(q), "the student's words come first and are kept");
    assert.ok(added.includes("move"), "the glossary contributed the corpus word");
    assert.ok(added.includes("ownership"), "the step contributed its objective's words");
  });
  it("does not repeat a term the student already used", () => {
    const { added } = retrievalQuery("what about move and scope", stepTerms(meta));
    assert.ok(!added.includes("move"));
    assert.ok(!added.includes("scope"));
  });
  it("caps how many terms it adds, so the question is not drowned", () => {
    const many = Array.from({ length: 50 }, (_, i) => `term${i}`);
    assert.equal(retrievalQuery("frage", many).added.length, 12);
  });
  it("leaves the query untouched when there is nothing to add", () => {
    const { query, added } = retrievalQuery("why does this fail", []);
    assert.equal(query, "why does this fail");
    assert.deepEqual(added, []);
  });
});

describe("the refusal survives", () => {
  // The context terms are strong enough to ground on their own, so without this
  // guard a build step open in the panel made the tutor answer "what is the
  // capital of France" out of the build documentation.
  const buildDocs = "Get a toolchain on PATH. scripts/build.sh and the CMake presets look for arm-none-eabi-gcc.";

  it("accepts a question whose own words appear in the sources", () => {
    assert.equal(questionIsSupported("Wie baue ich die Firmware mit CMake?", buildDocs), true);
  });
  it("accepts a German question through its glossary mapping", () => {
    assert.equal(questionIsSupported("Wie funktioniert das Kompilieren?", "the build step compiles the sources"), true);
  });
  it("rejects a question the sources do not speak to at all", () => {
    assert.equal(questionIsSupported("Was ist die Hauptstadt von Frankreich?", buildDocs), false);
  });
  it("does not let stopwords or short words carry the match", () => {
    // "ist", "das", "von" would otherwise match almost any text.
    assert.equal(questionIsSupported("Ist das von hier?", buildDocs), false);
  });
});
