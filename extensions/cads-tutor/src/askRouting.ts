/**
 * What to do with a question before it reaches retrieval.
 *
 * Two faults from the field, with the same root: the retrieval query is the
 * student's sentence, and BM25 scores it against an English corpus.
 *
 *  - A question typed in German scores near zero on every chunk, so the tutor
 *    refuses it before any model is asked. Lowering the threshold would not fix
 *    that: the score is low because the words do not occur, not because the bar
 *    is high, and admitting low-scoring chunks would break the rule that an
 *    answer comes only from evidenced sources.
 *  - "How do I start?" has no indexable term in any language, so the one
 *    question a lost beginner actually asks is the one that gets refused - while
 *    the last hint tells them to go and ask it.
 *
 * So: procedural questions are answered deterministically from session state,
 * with no model and no retrieval; content questions keep their own wording for
 * the answer but get a retrieval query enriched with the step's own English
 * vocabulary and a small glossary of the domain terms that appear in questions.
 *
 * Pure module, no VS Code and no network, so all of it is unit-testable.
 */
import type { Lang, StepFrontMatter } from "./types";

// ---------------------------------------------------------------------------
// Procedural questions
// ---------------------------------------------------------------------------

/**
 * Questions about operating the course rather than about its subject. Matched
 * by pattern in both languages; the list is deliberately about being lost,
 * because that is the state in which a student stops and asks.
 */
const PROCEDURAL_PATTERNS: RegExp[] = [
  // German
  /\bwie\s+(?:soll\s+ich\s+)?(?:jetzt\s+)?(?:hier\s+)?anfangen\b/i,
  /\bwie\s+fange?\s+ich\b/i,
  /\bwas\s+soll\s+ich\s+(?:jetzt\s+)?(?:hier\s+)?(?:tun|machen)\b/i,
  /\bwas\s+(?:muss|mache)\s+ich\s+(?:jetzt\s+)?(?:als\s+n[äa]chstes|zuerst)\b/i,
  /\bwas\s+(?:sehe|seh)\s+ich\s+(?:da|hier)\b/i,
  /\bich\s+(?:bin|f[üu]hle\s+mich)\s+verloren\b/i,
  /\bich\s+wei[ßs]\s+nicht,?\s+(?:was|wie|wo)\b/i,
  /\bwo\s+(?:finde|ist|sind)\s+(?:ich\s+)?(?:das|der|die|den)?\s*\b(?:terminal|men[üu]|explorer|aufgabe|schaltfl[äa]che|knopf)\b/i,
  /\bwie\s+geht\s+(?:es\s+)?weiter\b/i,
  // English
  /\bhow\s+do\s+i\s+(?:start|begin|get\s+started)\b/i,
  /\bwhat\s+(?:do|should)\s+i\s+do\b/i,
  /\bwhat\s+(?:am\s+i\s+looking\s+at|is\s+this)\b/i,
  /\bwhere\s+(?:do\s+i\s+start|is\s+the\s+(?:terminal|menu|explorer|button|task))\b/i,
  /\bi(?:'m|\s+am)\s+lost\b/i,
  /\bwhat(?:'s|\s+is)\s+next\b/i,
  /\bnothing\s+happens\b/i,
];

export function isProceduralQuestion(question: string): boolean {
  const q = question.trim();
  if (!q) return false;
  return PROCEDURAL_PATTERNS.some((re) => re.test(q));
}

export interface ProceduralContext {
  stepTitle: string;
  /** Title of the first task that has not passed, if any. */
  openTaskTitle?: string;
  /** The button that performs it, already localized. */
  openTaskAction?: string;
  /** Where the step sits, e.g. "Schritt 3 von 41". */
  position: string;
  /** Whether the course offers board actions at all. */
  board: boolean;
  lang: Lang;
}

/**
 * The answer to "what now", built from what the session already knows. No model
 * and no retrieval, so it works in the students' actual configuration, where no
 * language model is configured.
 */
export function proceduralAnswer(ctx: ProceduralContext): string {
  const de = ctx.lang === "de";
  const lines: string[] = [];
  lines.push(de ? `Du bist bei: ${ctx.stepTitle} (${ctx.position}).` : `You are on: ${ctx.stepTitle} (${ctx.position}).`);
  if (ctx.openTaskTitle) {
    lines.push(
      de
        ? `Die nächste offene Aufgabe ist „${ctx.openTaskTitle}“.`
        : `The next open task is "${ctx.openTaskTitle}".`,
    );
    lines.push(
      ctx.openTaskAction
        ? de
          ? `Drücke bei dieser Aufgabe „${ctx.openTaskAction}“ und danach „Prüfen“.`
          : `Press "${ctx.openTaskAction}" on that task, then "Check".`
        : de
          ? 'Bearbeite sie und drücke danach „Prüfen“.'
          : 'Work on it, then press "Check".',
    );
  } else {
    lines.push(
      de
        ? "In diesem Schritt ist alles erledigt – unten steht, wie es weitergeht."
        : "Everything in this step is done; the next step is named at the bottom.",
    );
  }
  lines.push(
    de
      ? "Wo was ist: links der Explorer mit den Projektdateien, unten das Terminal mit der Ausgabe, hier der Schritt mit seinen Aufgaben."
      : "Where things are: the Explorer with the project files on the left, the terminal with the output at the bottom, this step and its tasks here.",
  );
  if (ctx.board) {
    lines.push(
      de
        ? "Für Board-Aufgaben: zuerst „Board verbinden“, danach funktionieren Flashen und Konsole."
        : 'For board tasks: "Connect board" first, then flashing and the console work.',
    );
  }
  lines.push(
    de
      ? "Wenn du einen Handgriff selbst gehen willst: F1 öffnet die Befehlspalette (im Browser zuverlässiger als Strg+Umschalt+P)."
      : "To do a step by hand: F1 opens the command palette (more reliable in the browser than Ctrl+Shift+P).",
  );
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Retrieval query for content questions
// ---------------------------------------------------------------------------

/**
 * The handful of domain words that actually appear in German questions about
 * these courses, mapped to the English the corpus uses. Deliberately small and
 * hand-checked: a large machine glossary would inject noise, and every entry
 * here is a term that occurs in the indexed material.
 */
const GLOSSARY_DE_EN: Record<string, string> = {
  speicher: "memory",
  arbeitsspeicher: "memory ram",
  fehler: "error",
  fehlermeldung: "error message",
  datei: "file",
  dateien: "files",
  ordner: "directory folder",
  verzeichnis: "directory",
  bauen: "build",
  build: "build",
  kompilieren: "compile build",
  übersetzen: "compile",
  testen: "test",
  test: "test",
  tests: "tests",
  flashen: "flash",
  blinken: "blink",
  taster: "button",
  knopf: "button",
  bildschirm: "display screen",
  anzeige: "display",
  register: "register",
  zeiger: "pointer",
  besitz: "ownership",
  besitzer: "owner",
  ausleihen: "borrow",
  entleihen: "borrow",
  referenz: "reference",
  referenzen: "references",
  eigentum: "ownership",
  verschieben: "move",
  kopieren: "copy",
  gültigkeit: "lifetime scope",
  lebensdauer: "lifetime",
  schleife: "loop",
  bedingung: "condition",
  funktion: "function",
  rückgabe: "return",
  variable: "variable",
  konstante: "constant",
  typ: "type",
  typen: "types",
  zeichenkette: "string",
  feld: "array",
  liste: "list array",
  objekt: "object",
  klasse: "class",
  vererbung: "inheritance",
  ausnahme: "exception error",
  aufgabe: "task",
  faden: "thread task",
  unterbrechung: "interrupt",
  takt: "clock",
  spannung: "voltage",
  netzwerk: "network",
  verbindung: "connection",
  konsole: "console serial",
  seriell: "serial",
  debugger: "debugger",
  haltepunkt: "breakpoint",
  schritt: "step",
  sitzung: "session",
};

const STOPWORDS = new Set([
  "der", "die", "das", "den", "dem", "des", "ein", "eine", "einen", "einem", "eines", "und", "oder",
  "ich", "du", "wir", "ist", "sind", "war", "wie", "was", "warum", "wo", "wann", "wer", "nicht",
  "mit", "von", "zu", "zum", "zur", "für", "auf", "in", "im", "an", "am", "bei", "aus", "kann",
  "muss", "soll", "hier", "dann", "noch", "aber", "auch", "mir", "mich",
  "the", "a", "an", "and", "or", "is", "are", "was", "how", "what", "why", "where", "when", "who",
  "not", "with", "of", "to", "for", "on", "in", "at", "from", "can", "should", "must", "this",
  "that", "it", "i", "do", "does", "my",
]);

/** Words a course pack contributes: objectives, created symbols, file names. */
export function stepTerms(meta: Pick<StepFrontMatter, "objectives" | "creates" | "links" | "sources" | "title">): string[] {
  const out: string[] = [];
  const push = (s: string | undefined) => {
    if (!s) return;
    // Objective ids and paths are dotted/slashed/underscored: split them into
    // words the index actually contains.
    for (const part of s.split(/[^A-Za-z0-9]+/)) {
      if (part.length >= 3 && !STOPWORDS.has(part.toLowerCase())) out.push(part.toLowerCase());
    }
  };
  push(meta.title);
  for (const o of meta.objectives) push(o);
  for (const c of meta.creates) push(c);
  for (const s of meta.sources) push(s);
  for (const l of meta.links) {
    if ("file" in l) push(l.file);
    else if ("doc" in l) push(l.doc);
  }
  return [...new Set(out)];
}

/** German words in the question mapped to the English the corpus uses. */
export function glossaryTerms(question: string): string[] {
  const out: string[] = [];
  for (const word of question.toLowerCase().split(/[^a-zà-ÿ0-9_]+/)) {
    const hit = GLOSSARY_DE_EN[word];
    if (hit) out.push(...hit.split(" "));
  }
  return [...new Set(out)];
}

export interface RetrievalQuery {
  /** What to send to BM25. */
  query: string;
  /** Terms added on top of the student's words, for the log. */
  added: string[];
}

/**
 * The query used for RETRIEVAL only; the answer is still generated from the
 * student's own wording, so nothing is translated on the way back.
 *
 * The student's words come first and are kept, so an English question is barely
 * affected. The step's vocabulary is what disambiguates: a student asking about
 * "the current step" is asking about its subject, and those terms are English
 * and present in the index.
 */
export function retrievalQuery(question: string, terms: readonly string[], limit = 12): RetrievalQuery {
  const asked = new Set(question.toLowerCase().split(/[^a-zà-ÿ0-9_]+/).filter(Boolean));
  const added = [...new Set([...glossaryTerms(question), ...terms])].filter((t) => !asked.has(t)).slice(0, limit);
  return { query: added.length > 0 ? `${question} ${added.join(" ")}` : question, added };
}

/**
 * Does the retrieved material actually speak to what the STUDENT asked?
 *
 * The context terms are strong enough to ground on their own: with a build step
 * open, "what is the capital of France" retrieved the build documentation and
 * scored well above the threshold, because the step's vocabulary did all the
 * matching. That would answer a question nobody asked and break the rule that a
 * refusal stands when nothing matches.
 *
 * So the enriched query may only widen a search the question already belongs
 * to: at least one content word of the question, or of its glossary mapping,
 * has to occur in the retrieved text.
 */
export function questionIsSupported(question: string, retrievedText: string): boolean {
  const haystack = retrievedText.toLowerCase();
  const own = question
    .toLowerCase()
    .split(/[^a-zà-ÿ0-9_]+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
  const candidates = [...new Set([...own, ...glossaryTerms(question)])];
  return candidates.some((w) => haystack.includes(w));
}
