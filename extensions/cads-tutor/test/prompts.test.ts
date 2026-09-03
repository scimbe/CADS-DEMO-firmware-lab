import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { languageDirective, withLanguage, withLanguageDirective } from "../src/prompts";

describe("language directive", () => {
  it("names German and forbids answering in the language of the sources", () => {
    const d = languageDirective("de");
    assert.match(d, /ausschließlich auf Deutsch/);
    assert.match(d, /Referenzauszüge/, "says the excerpts are English");
  });
  it("names English for the English UI", () => {
    assert.match(languageDirective("en"), /exclusively in English/);
    assert.doesNotMatch(languageDirective("en"), /Deutsch/);
  });
  it("protects identifiers, commands and error messages from translation in both languages", () => {
    // Translating a command or a compiler message would make it unrecognisable
    // and untypable, which is worse than answering in the wrong language.
    assert.match(languageDirective("de"), /Kommandos/);
    assert.match(languageDirective("de"), /Fehlermeldungen/);
    assert.match(languageDirective("en"), /commands/);
    assert.match(languageDirective("en"), /error messages/);
  });
});

describe("prompt decoration", () => {
  it("appends the directive to the end of the prompt, where it is not buried", () => {
    const out = withLanguage("Explain ownership.", "de");
    assert.ok(out.startsWith("Explain ownership."));
    assert.ok(out.indexOf("SPRACHE:") > out.indexOf("Explain ownership."));
  });
  it("keeps the original prompt intact", () => {
    assert.ok(withLanguage("line one\nline two", "en").startsWith("line one\nline two"));
  });
});

describe("LLM wrapper", () => {
  it("adds the directive to every prompt the client receives", async () => {
    const seen: string[] = [];
    const wrapped = withLanguageDirective({ complete: async (p) => (seen.push(p), "ok") }, () => "de");
    await wrapped.complete("Why does this fail?");
    assert.equal(seen.length, 1);
    assert.match(seen[0], /Why does this fail\?/);
    assert.match(seen[0], /ausschließlich auf Deutsch/);
  });
  it("reads the language per call, so switching takes effect on the next question", async () => {
    // The platform is cached per course; a language switch must not need a restart.
    let lang: "de" | "en" = "en";
    const seen: string[] = [];
    const wrapped = withLanguageDirective({ complete: async (p) => (seen.push(p), "ok") }, () => lang);
    await wrapped.complete("first");
    lang = "de";
    await wrapped.complete("second");
    assert.match(seen[0], /exclusively in English/);
    assert.match(seen[1], /ausschließlich auf Deutsch/);
  });
  it("returns the client's answer unchanged", async () => {
    const wrapped = withLanguageDirective({ complete: async () => "the answer" }, () => "de");
    assert.equal(await wrapped.complete("q"), "the answer");
  });
});
