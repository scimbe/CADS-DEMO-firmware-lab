/**
 * Wiring to @cads/tutor-platform: grounding (BM25 over the course's content pack plus the pack's
 * own sources/), the LLM client (env/setting based, https only), TutorSession.ask()/checkIn(),
 * rubric grading for `question` checks and the generic Socratic fallback hint.
 *
 * Pure Node (no vscode import). The extension passes the packs directory (dist/content-packs,
 * copied from tutor-platform at build time) and the event store.
 */
import {
  Bm25Retriever,
  CurriculumGraph,
  GroundingEngine,
  LlmClient,
  TutorSession,
  buildTutorPrompt,
  chunkMarkdown,
  createIsSatisfied,
  loadCurriculumObjectives,
  type BloomLevel,
  type Chunk,
  type CurriculumObjective,
  type RetrievedChunk,
  type Source,
  type TutorTurnResult,
} from "@cads/tutor-platform";
import * as fs from "node:fs";
import * as path from "node:path";
import type { QuestionVerdict } from "./checks/runner";
import type { EventStoreLike } from "./events";
import { questionIsSupported, retrievalQuery } from "./askRouting";
import { withLanguageDirective } from "./prompts";
import type { Course, Lang } from "./types";

export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

/** API key only from the environment (never from settings/files); base URL and model may come from settings. */
export function readLlmConfig(env: NodeJS.ProcessEnv = process.env, settings: { baseUrl?: string; model?: string } = {}): LlmConfig | null {
  const baseUrl = (env.TUTOR_LLM_BASE_URL || settings.baseUrl || "").trim();
  const apiKey = (env.TUTOR_LLM_API_KEY || "").trim();
  const model = (env.TUTOR_LLM_MODEL || settings.model || "").trim();
  if (!baseUrl || !apiKey || !model) return null;
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey, model };
}

export interface Citation {
  title: string;
  section: string;
  url: string;
  score: number;
  /** Short excerpt (first ~240 chars) so the panel can quote the grounding. */
  excerpt: string;
}

export type AskOutcome =
  | { kind: "unconfigured"; message: string; citations: Citation[] }
  | { kind: "refused"; reason: string }
  | { kind: "llm-error"; message: string; citations: Citation[] }
  | { kind: "answer"; text: string; citations: Citation[]; bloomLevel: BloomLevel; hintTier: number; nextObjective?: string };

interface JsonlRecorder {
  recordInteraction(studentId: string, text: string, metadata?: Record<string, unknown>): Promise<void>;
}

/** Dialog memory as JSONL – TutorMemory's semantic recall (student-memory, ~1 GB of ONNX/LanceDB) is not used by the tutor. */
function jsonlRecorder(file: string): JsonlRecorder {
  return {
    async recordInteraction(studentId, text, metadata) {
      await fs.promises.mkdir(path.dirname(file), { recursive: true });
      await fs.promises.appendFile(file, JSON.stringify({ at: new Date().toISOString(), studentId, text, metadata }) + "\n", "utf8");
    },
  };
}

export interface PlatformOptions {
  course: Course;
  /** Directory containing `curriculum.json` and `<pack>/{index,sources,manifest}.json`. */
  packsDir: string;
  studentId: string;
  eventStore?: EventStoreLike;
  /** Where dialog memory (JSONL) is written. */
  memoryDir: string;
  /** Absolute project root (workspace/<project.root>); step `sources:` and objective sourceDocIds are indexed from here. */
  projectRoot?: string;
  llm: LlmConfig | null;
  log?: (msg: string) => void;
  /** Injectable LLM (tests). */
  llmClient?: { complete(prompt: string): Promise<string> };
  /** Current UI language; every prompt is told to answer in it. Read per call. */
  lang?: () => Lang;
}

const DEFAULT_THRESHOLD = 5.0;
const MAX_QUESTION_CHARS = 800;

export class TutorPlatform {
  readonly engine: GroundingEngine;
  readonly curriculum?: CurriculumGraph;
  readonly track: string;
  readonly hasLlm: boolean;
  readonly packName?: string;
  private readonly session?: TutorSession;
  private readonly llm?: { complete(prompt: string): Promise<string> };
  private readonly log: (msg: string) => void;
  /** Current UI/step language, read per call so a language switch takes effect at once. */
  private readonly lang: () => Lang;

  constructor(private readonly opts: PlatformOptions) {
    this.log = opts.log ?? (() => undefined);
    this.lang = opts.lang ?? (() => "en");
    const course = opts.course;
    this.packName = course.manifest.grounding?.pack;
    this.track = this.packName ?? course.manifest.id;

    const sources: Source[] = [];
    const chunks: Chunk[] = [];
    let threshold = course.manifest.grounding?.threshold;
    /** Project docs already covered by the content pack – not indexed a second time. */
    const packDocs = new Set<string>();

    if (this.packName) {
      const packDir = path.join(opts.packsDir, this.packName);
      try {
        sources.push(...(JSON.parse(fs.readFileSync(path.join(packDir, "sources.json"), "utf8")) as Source[]));
        chunks.push(...(JSON.parse(fs.readFileSync(path.join(packDir, "index.json"), "utf8")) as Chunk[]));
        const manifest = JSON.parse(fs.readFileSync(path.join(packDir, "manifest.json"), "utf8")) as { relevanceThreshold?: number; chapters?: { file?: string }[] };
        if (threshold === undefined && typeof manifest.relevanceThreshold === "number") threshold = manifest.relevanceThreshold;
        for (const ch of manifest.chapters ?? []) if (ch.file) packDocs.add(`docs/${ch.file}`);
      } catch (err) {
        this.log(`content pack "${this.packName}" not loadable from ${packDir}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Course-local sources/**.md are chunked and indexed alongside the pack.
    const sourcesDir = path.join(course.dir, "sources");
    if (fs.existsSync(sourcesDir)) {
      const sourceId = `course:${course.manifest.id}`;
      sources.push({ id: sourceId, title: typeof course.manifest.title === "string" ? course.manifest.title : course.manifest.title.en ?? course.manifest.title.de ?? course.manifest.id, license: "course pack", url: sourcesDir });
      for (const file of walkMarkdown(sourcesDir)) {
        const rel = path.relative(sourcesDir, file).replace(/\\/g, "/");
        try {
          chunks.push(...chunkMarkdown(sourceId, `${sourceId}/${rel}`, fs.readFileSync(file, "utf8")));
        } catch (err) {
          this.log(`cannot chunk ${file}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    // Project files named by the steps (`sources:`) and by the pack's objectives (sourceDocIds like
    // "cads-zero/docs/reference/hal.md") are indexed from the project root. The first chunk of a
    // file gets the id "<project.root>/<rel>" so an objective's sourceDocIds resolve for check-ins.
    if (opts.projectRoot) {
      const rootName = course.manifest.project?.root ?? path.basename(opts.projectRoot);
      const files = new Set<string>();
      for (const step of course.steps.values()) for (const f of step.variants.en?.meta.sources ?? []) files.add(f);
      for (const o of course.curriculum) {
        const docIds = (o as { sourceDocIds?: unknown }).sourceDocIds;
        for (const id of Array.isArray(docIds) ? (docIds as unknown[]) : []) {
          if (typeof id === "string" && id.startsWith(`${rootName}/`)) files.add(id.slice(rootName.length + 1));
        }
      }
      const sourceId = `project:${course.manifest.id}`;
      let indexed = 0;
      for (const rel of [...files].sort()) {
        const abs = path.resolve(opts.projectRoot, rel);
        if (packDocs.has(rel) || !abs.startsWith(opts.projectRoot) || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) continue;
        try {
          const text = fs.readFileSync(abs, "utf8");
          const baseId = `${rootName}/${rel}`;
          const url = `file:${rel}`;
          const pieces = /\.md$/i.test(rel) ? chunkMarkdown(sourceId, url, text).map((c) => ({ section: c.section, text: c.text })) : chunkPlainText(rel, text);
          pieces.forEach((c, i) => chunks.push({ id: i === 0 ? baseId : `${baseId}#${i}`, sourceId, section: c.section, url, text: c.text }));
          indexed++;
        } catch (err) {
          this.log(`cannot index ${rel}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      if (indexed > 0) {
        const repo = course.manifest.project?.repo;
        sources.push({ id: sourceId, title: `${rootName} (project files)`, license: "project", url: repo ?? opts.projectRoot });
        this.log(`indexed ${indexed} project file(s) from ${opts.projectRoot}`);
      }
    }

    this.engine = new GroundingEngine(new Bm25Retriever(), { relevanceThreshold: threshold ?? DEFAULT_THRESHOLD, topK: 5 });
    this.engine.loadSources(sources);
    this.engine.indexChunks(chunks);
    this.log(`grounding: ${chunks.length} chunks from ${sources.length} source(s), threshold ${threshold ?? DEFAULT_THRESHOLD}`);

    // Curriculum: platform objectives + the pack's own curriculum.json entries (ids may be new).
    try {
      const objectives: CurriculumObjective[] = [];
      const platformCurriculum = path.join(opts.packsDir, "curriculum.json");
      if (fs.existsSync(platformCurriculum)) objectives.push(...loadCurriculumObjectives(platformCurriculum));
      for (const o of course.curriculum) objectives.push(normalizeObjective(o, this.track));
      this.curriculum = new CurriculumGraph(objectives);
    } catch (err) {
      this.log(`curriculum unavailable: ${err instanceof Error ? err.message : String(err)}`);
    }

    let base: { complete(prompt: string): Promise<string> } | undefined;
    if (opts.llmClient) {
      base = opts.llmClient;
    } else if (opts.llm) {
      try {
        base = new LlmClient(opts.llm);
      } catch (err) {
        this.log(`LLM disabled: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    // Every prompt leaving the extension carries the language directive, including
    // the ones TutorSession builds internally and that we cannot otherwise reach.
    // Wrapping the client rather than the question keeps the BM25 query clean.
    this.llm = base ? withLanguageDirective(base, () => this.lang()) : undefined;
    this.hasLlm = !!this.llm;
    if (this.llm) {
      this.session = new TutorSession(this.engine, this.llm, jsonlRecorder(path.join(opts.memoryDir, "dialog.jsonl")), {
        curriculum: this.curriculum,
        learningEvents: opts.eventStore as never,
        track: this.track,
      });
    }
  }

  unconfiguredMessage(lang: Lang): string {
    return lang === "de"
      ? "Der Tutor-Dialog ist nicht konfiguriert (TUTOR_LLM_BASE_URL / TUTOR_LLM_API_KEY / TUTOR_LLM_MODEL fehlen)."
      : "The tutor dialog is not configured (TUTOR_LLM_BASE_URL / TUTOR_LLM_API_KEY / TUTOR_LLM_MODEL are not set).";
  }

  /** Grounded citations for a free-text query (used even without LLM to point at reading material). */
  citationsFor(query: string): Citation[] {
    const answer = this.engine.ask(query);
    return this.toCitations(answer.citations);
  }

  async ask(
    question: string,
    lang: Lang,
    options: { bloomLevel?: BloomLevel; attemptNumber?: number; stepTerms?: readonly string[] } = {},
  ): Promise<AskOutcome> {
    const trimmed = question.trim().slice(0, MAX_QUESTION_CHARS);
    if (!this.session) {
      return { kind: "unconfigured", message: this.unconfiguredMessage(lang), citations: this.citationsFor(trimmed) };
    }
    let result: TutorTurnResult;
    try {
      result = await this.session.ask(this.opts.studentId, trimmed, options);
    } catch (err) {
      return { kind: "llm-error", message: err instanceof Error ? err.message : String(err), citations: [] };
    }
    if (result.kind !== "refused") return this.toOutcome(result);

    // The question did not ground. Before refusing, retry RETRIEVAL with the
    // step's own English vocabulary added: a German question scores near zero
    // against an English corpus however low the threshold, and refusing a
    // student who asked in their own language is the worst outcome here. The
    // answer is still generated from the student's own wording, and if the
    // enriched query does not ground either, the refusal stands.
    const enriched = await this.askWithContext(trimmed, options);
    return enriched ?? this.toOutcome(result);
  }

  /**
   * Second attempt at a question that did not ground: same corpus, same
   * threshold, wider query. Returns undefined when it still does not ground, so
   * the caller keeps the original refusal.
   */
  private async askWithContext(
    question: string,
    options: { bloomLevel?: BloomLevel; attemptNumber?: number; stepTerms?: readonly string[] },
  ): Promise<AskOutcome | undefined> {
    if (!this.llm) return undefined;
    const { query, added } = retrievalQuery(question, options.stepTerms ?? []);
    if (added.length === 0) return undefined;
    const answer = this.engine.ask(query);
    if (!answer.grounded) {
      this.log(`ask: not grounded even with context terms (${added.join(" ")})`);
      return undefined;
    }
    // The context terms can ground on their own, which would answer a question
    // the student did not ask. The retrieved material must speak to their words.
    const retrieved = answer.citations.map((c) => `${c.chunk.section} ${c.chunk.text}`).join("\n");
    if (!questionIsSupported(question, retrieved)) {
      this.log(`ask: context terms grounded, but nothing in the sources speaks to the question – keeping the refusal`);
      return undefined;
    }
    this.log(`ask: grounded on the second attempt with context terms (${added.join(" ")})`);
    // buildTutorPrompt gets the STUDENT'S question, not the enriched query, so
    // the answer addresses what was asked.
    const built = buildTutorPrompt(this.engine, question, answer, {
      bloomLevel: options.bloomLevel,
      attemptNumber: options.attemptNumber,
    });
    try {
      const text = await this.llm.complete(built.prompt);
      return {
        kind: "answer",
        text,
        citations: this.toCitations(answer.citations),
        bloomLevel: built.bloomLevel,
        hintTier: built.hintTier,
      };
    } catch (err) {
      return { kind: "llm-error", message: err instanceof Error ? err.message : String(err), citations: this.toCitations(answer.citations) };
    }
  }

  /** Proactive check-in on an objective; `null` when there is no LLM or the objective is unknown. */
  async checkIn(objectiveId: string, code: string): Promise<AskOutcome | null> {
    if (!this.session || !this.curriculum?.get(objectiveId)) return null;
    try {
      return this.toOutcome(await this.session.checkIn(this.opts.studentId, objectiveId, code));
    } catch (err) {
      this.log(`checkIn failed: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  /** First objective of a step that the curriculum knows (check-ins need a real objective). */
  knownObjective(objectiveIds: string[]): string | undefined {
    return objectiveIds.find((id) => this.curriculum?.get(id));
  }

  /** Rubric-based grading of a `question` task. */
  async gradeAnswer(prompt: string, rubric: string, answer: string, bloom?: string): Promise<QuestionVerdict> {
    if (!this.llm) {
      // Localized: this text is shown to the student in the panel.
      return {
        kind: "manual",
        feedback:
          this.lang() === "de"
            ? "Kein Sprachmodell konfiguriert – vergleiche deine Antwort selbst mit der Musterlösung."
            : "No language model configured – compare your answer with the reference yourself.",
      };
    }
    const grounded = this.engine.ask(`${prompt} ${rubric}`);
    const excerpts = grounded.grounded ? this.engine.citationContext(grounded) : "(no indexed reference excerpts matched – judge by the rubric alone)";
    const promptText = [
      "You are CaDS Tutor grading ONE short student answer against a rubric. Be fair and concise.",
      `Bloom level: ${bloom ?? "understand"}.`,
      "Use the reference excerpts only to check facts; do not invent facts.",
      "",
      `Question: ${prompt}`,
      `Rubric (what a passing answer must contain): ${rubric}`,
      "",
      "Reference excerpts:",
      excerpts,
      "",
      `Student answer: ${answer}`,
      "",
      "Give 1-3 sentences of feedback for the student (Socratic: if something is missing, ask a guiding question rather than stating it).",
      'Then end with EXACTLY one final line of the form "VERDICT: pass" or "VERDICT: fail".',
    ].join("\n");
    try {
      const raw = await this.llm.complete(promptText);
      const lines = raw.trim().split("\n");
      const last = lines[lines.length - 1]?.trim() ?? "";
      const m = /^VERDICT:\s*(pass|fail)\s*$/i.exec(last);
      const feedback = (m ? lines.slice(0, -1) : lines).join("\n").trim();
      if (!m) return { kind: "error", feedback: `grader gave no verdict: ${feedback.slice(0, 200)}` };
      return { kind: m[1].toLowerCase() === "pass" ? "pass" : "fail", feedback };
    } catch (err) {
      return { kind: "error", feedback: `grading failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  /**
   * Generic Socratic hint for a failed task via buildTutorPrompt (Bloom level + attempt tier).
   * Grounds on the failure text first; if that is not grounded, on the step's objectives'
   * reference chunks, so the hint still cites real material. `undefined` without LLM/grounding.
   */
  async genericHint(taskTitle: string, failureMessage: string, bloom: BloomLevel, attemptNumber: number, lang: Lang, objectiveIds: string[] = []): Promise<string | undefined> {
    if (!this.llm) return undefined;
    const query = lang === "de" ? `Meine Aufgabe "${taskTitle}" schlägt fehl: ${failureMessage}. Was übersehe ich?` : `My task "${taskTitle}" fails: ${failureMessage}. What am I missing?`;
    let answer = this.engine.ask(`${taskTitle} ${failureMessage}`);
    if (!answer.grounded) {
      const docIds = objectiveIds.flatMap((id) => this.curriculum?.get(id)?.sourceDocIds ?? []);
      answer = this.engine.groundOnKnownChunks(docIds.slice(0, 5));
    }
    if (!answer.grounded) return undefined;
    const level: BloomLevel = bloom === "remember" || bloom === "understand" ? "apply" : bloom;
    const { prompt } = buildTutorPrompt(this.engine, query, answer, { bloomLevel: level, attemptNumber });
    try {
      return await this.llm.complete(prompt);
    } catch (err) {
      this.log(`generic hint failed: ${err instanceof Error ? err.message : String(err)}`);
      return undefined;
    }
  }

  masteryIsSatisfied(): ((objectiveId: string) => boolean) | undefined {
    if (!this.opts.eventStore) return undefined;
    return createIsSatisfied(this.opts.eventStore as never, this.opts.studentId);
  }

  private toOutcome(result: TutorTurnResult): AskOutcome {
    switch (result.kind) {
      case "refused":
        return { kind: "refused", reason: result.reason };
      case "llm-error":
        return { kind: "llm-error", message: result.message, citations: this.toCitations(result.citations) };
      case "answer":
        return { kind: "answer", text: result.text, citations: this.toCitations(result.citations), bloomLevel: result.bloomLevel, hintTier: result.hintTier, nextObjective: result.nextSuggestion?.statement };
    }
  }

  private toCitations(citations: RetrievedChunk[]): Citation[] {
    return citations.map((c) => {
      const source = this.engine.sourceFor(c.chunk);
      return {
        title: source?.title ?? c.chunk.sourceId,
        section: c.chunk.section,
        url: c.chunk.url || source?.url || "",
        score: Math.round(c.score * 100) / 100,
        excerpt: c.chunk.text.replace(/\s+/g, " ").slice(0, 240),
      };
    });
  }
}

function normalizeObjective(raw: unknown, track: string): CurriculumObjective {
  const o = raw as Partial<CurriculumObjective>;
  if (!o || typeof o.id !== "string") throw new Error("curriculum.json entry without id");
  return {
    id: o.id,
    track: o.track ?? track,
    unitId: o.unitId ?? o.id,
    bloomLevel: o.bloomLevel ?? "understand",
    statement: o.statement ?? o.id,
    sourceDocIds: Array.isArray(o.sourceDocIds) ? o.sourceDocIds : [],
    prerequisiteObjectiveIds: Array.isArray(o.prerequisiteObjectiveIds) ? o.prerequisiteObjectiveIds : [],
  };
}

/** Splits source/config files into ~1200-char chunks on line boundaries; section = file name + line range. */
function chunkPlainText(rel: string, text: string, maxChars = 1200): { section: string; text: string }[] {
  const lines = text.split("\n");
  const out: { section: string; text: string }[] = [];
  let buf: string[] = [];
  let size = 0;
  let start = 1;
  const flush = (end: number) => {
    if (buf.length === 0) return;
    out.push({ section: `${rel}:${start}-${end}`, text: buf.join("\n") });
    buf = [];
    size = 0;
    start = end + 1;
  };
  lines.forEach((line, i) => {
    if (size + line.length > maxChars && buf.length > 0) flush(i);
    buf.push(line);
    size += line.length + 1;
  });
  flush(lines.length);
  return out;
}

function walkMarkdown(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkMarkdown(p));
    else if (e.isFile() && /\.md$/i.test(e.name)) out.push(p);
  }
  return out.sort();
}
