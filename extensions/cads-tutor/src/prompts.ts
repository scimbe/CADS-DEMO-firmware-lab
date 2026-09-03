/**
 * Language control for everything that reaches the language model.
 *
 * The reference material (the firmware docs, the Rust book, the MDN guide) is
 * English. Without an explicit instruction the model answers in the language of
 * the retrieved excerpts, so a student working in a German UI got English
 * answers, hints, rubric feedback and reflection notes.
 *
 * The instruction is appended to the finished prompt rather than mixed into the
 * question, because the question is also the BM25 query: adding German words to
 * it would degrade retrieval against an English corpus while doing nothing for
 * the answer's language.
 */
import type { Lang } from "./types";

/**
 * The line every prompt carries. It names the language, and it tells the model
 * what NOT to translate: identifiers, paths, commands and compiler messages are
 * what the student types and sees, so translating them would be actively
 * harmful.
 */
export function languageDirective(lang: Lang): string {
  return lang === "de"
    ? [
        "SPRACHE: Antworte ausschließlich auf Deutsch, in allen Teilen der Antwort.",
        "Die Referenzauszüge und die Quelldokumente sind auf Englisch. Gib ihren Inhalt auf Deutsch wieder, statt englische Sätze zu übernehmen.",
        "Nicht übersetzt werden: Bezeichner, Dateinamen, Pfade, Kommandos, Fehlermeldungen und Code – diese bleiben wörtlich, damit der Studierende sie wiedererkennt und eintippen kann.",
        "Duze den Studierenden.",
      ].join("\n")
    : [
        "LANGUAGE: Answer exclusively in English, in every part of the answer.",
        "Do not translate identifiers, file names, paths, commands, error messages or code — the student has to recognise and type them.",
      ].join("\n");
}

/** Appends the language directive to a finished prompt, last so it is not buried. */
export function withLanguage(prompt: string, lang: Lang): string {
  return `${prompt.trimEnd()}\n\n${languageDirective(lang)}\n`;
}

/**
 * Wraps an LLM client so every prompt that leaves the extension carries the
 * directive, whichever code path built it — our own grading and hint prompts,
 * and the ones `TutorSession` builds internally, which we cannot otherwise
 * reach. The language is read per call, so switching the UI language takes
 * effect on the next question rather than on the next restart.
 */
export function withLanguageDirective(
  client: { complete(prompt: string): Promise<string> },
  lang: () => Lang,
): { complete(prompt: string): Promise<string> } {
  return {
    complete: (prompt: string) => client.complete(withLanguage(prompt, lang())),
  };
}
