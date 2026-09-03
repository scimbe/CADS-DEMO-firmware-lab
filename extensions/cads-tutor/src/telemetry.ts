/**
 * Telemetry client (SPEC A5).
 *
 * Every event is appended to `~/.cads-tutor/events.jsonl` (append-only, one JSON
 * object per line), in addition to the SQLite learning-event store. When
 * `CADS_TUTOR_TELEMETRY_URL` is set the events are also batched to
 * `POST <url>/ingest` with `X-CaDS-Student` and `X-CaDS-Token`.
 *
 * Three rules the spec is explicit about, and which shape this module:
 *
 * 1. A portal outage must never disturb the student. Nothing here is awaited on
 *    a user path: `record()` appends and returns, sending happens on a timer,
 *    and every failure is logged and retried, never surfaced.
 * 2. The queue survives a restart, so it lives on disk, not in memory.
 * 3. Question text is scrubbed of e-mail addresses and credential-bearing URLs
 *    before it leaves the machine.
 */
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as http from "node:http";
import * as https from "node:https";
import * as path from "node:path";
import { URL } from "node:url";

export const TELEMETRY_SCHEMA_VERSION = 1;
/** A5: "max. 100 Events / 10 s". */
export const MAX_BATCH = 100;
export const FLUSH_INTERVAL_MS = 10_000;
const MAX_QUEUE_EVENTS = 5_000;
const BACKOFF_START_MS = 5_000;
const BACKOFF_MAX_MS = 5 * 60_000;
const REQUEST_TIMEOUT_MS = 10_000;

export type TelemetryEventType =
  | "step.open"
  | "step.done"
  | "check.run"
  | "check.pass"
  | "check.fail"
  | "hint.shown"
  | "question.asked"
  | "question.answered"
  | "predict.made"
  | "predict.compared"
  | "recall.answered"
  | "reflection.written"
  | "edit.metrics"
  | "session.start"
  | "session.end";

export interface TelemetryEvent {
  v: number;
  ts: string;
  student: string;
  course?: string;
  module?: string;
  step?: string;
  type: TelemetryEventType;
  data?: Record<string, unknown>;
}

/** What a caller supplies; `v`, `ts` and `student` are filled in here. */
export interface TelemetryInput {
  type: TelemetryEventType;
  course?: string;
  module?: string;
  step?: string;
  data?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Pseudonymisation and scrubbing
// ---------------------------------------------------------------------------

/** A5 / MULTIUSER: the student id is the first 12 hex chars of sha256(lower(email)). */
export function slugForEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase(), "utf8").digest("hex").slice(0, 12);
}

/**
 * Resolves the pseudonymous id, preferring what the broker set for this
 * container. The local session id is a random UUID and therefore already
 * pseudonymous, so it is a safe last resort - it just cannot be correlated
 * across containers.
 */
export function resolveStudentId(env: NodeJS.ProcessEnv, fallback: string): string {
  const given = env.CADS_TUTOR_STUDENT?.trim();
  if (given) return given;
  const email = env.CADS_TUTOR_EMAIL?.trim();
  if (email) return slugForEmail(email);
  return fallback;
}

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
/** A URL carrying userinfo (`scheme://user:pass@host`). */
const URL_USERINFO_RE = /\b[a-z][a-z0-9+.-]*:\/\/[^\s/@]*:[^\s/@]*@[^\s]*/gi;
/** A URL whose query carries a secret. */
const URL_SECRET_RE = /\b[a-z][a-z0-9+.-]*:\/\/[^\s]*[?&](?:token|api[_-]?key|access[_-]?token|password|passwd|pwd|secret|sig|signature)=[^\s&#]*[^\s]*/gi;

/**
 * A5: strips e-mail addresses and credential-bearing URLs from free text before
 * it is sent. Order matters - URLs are scrubbed first, because a userinfo part
 * can look like an e-mail address and would otherwise be only half-redacted.
 */
export function scrubText(text: string): string {
  return text
    .replace(URL_USERINFO_RE, "[redacted-url]")
    .replace(URL_SECRET_RE, "[redacted-url]")
    .replace(EMAIL_RE, "[redacted-email]");
}

/** Fields whose free text is student-authored and therefore scrubbed. */
const SCRUBBED_FIELDS = ["question", "answer", "prediction", "reflection", "outputExcerpt", "feedback"];

export function scrubEventData(data: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!data) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = typeof v === "string" && SCRUBBED_FIELDS.includes(k) ? scrubText(v) : v;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Edit metrics (A5: typed vs pasted characters per step)
// ---------------------------------------------------------------------------

/** A5: "Einfügungen > 200 Zeichen zählen als Paste". */
export const PASTE_THRESHOLD_CHARS = 200;

export interface EditMetrics {
  typedChars: number;
  pastedChars: number;
  pasteEvents: number;
}

export function emptyEditMetrics(): EditMetrics {
  return { typedChars: 0, pastedChars: 0, pasteEvents: 0 };
}

/**
 * Classifies one document change. A single change longer than the threshold is a
 * paste; everything else counts as typing. Deletions carry no characters and are
 * ignored rather than counted as negative typing.
 */
export function accumulateEdit(metrics: EditMetrics, insertedLength: number): EditMetrics {
  if (insertedLength <= 0) return metrics;
  if (insertedLength > PASTE_THRESHOLD_CHARS) {
    metrics.pastedChars += insertedLength;
    metrics.pasteEvents += 1;
  } else {
    metrics.typedChars += insertedLength;
  }
  return metrics;
}

export function hasEdits(m: EditMetrics): boolean {
  return m.typedChars > 0 || m.pastedChars > 0;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export interface TelemetryOptions {
  /** Usually ~/.cads-tutor. */
  dir: string;
  student: string;
  url?: string;
  token?: string;
  log?: (message: string) => void;
  /** Test seam; defaults to the real timers. */
  now?: () => number;
}

export class TelemetryClient {
  private readonly eventsFile: string;
  private readonly queueFile: string;
  private queue: TelemetryEvent[] = [];
  private timer: NodeJS.Timeout | undefined;
  /** Serialises sends; see flush(). */
  private chain: Promise<void> = Promise.resolve();
  private backoffMs = 0;
  private nextAttemptAt = 0;
  private disposed = false;

  constructor(private readonly opts: TelemetryOptions) {
    this.eventsFile = path.join(opts.dir, "events.jsonl");
    this.queueFile = path.join(opts.dir, "telemetry-queue.jsonl");
    try {
      fs.mkdirSync(opts.dir, { recursive: true });
    } catch (err) {
      this.log(`cannot create ${opts.dir}: ${describe(err)}`);
    }
    if (this.enabled) {
      this.loadQueue();
      this.timer = setInterval(() => void this.flush(), FLUSH_INTERVAL_MS);
      this.timer.unref?.();
    }
  }

  get enabled(): boolean {
    return !!this.opts.url;
  }

  /** Events still waiting to be delivered (tests and diagnostics). */
  get pending(): number {
    return this.queue.length;
  }

  private log(message: string): void {
    this.opts.log?.(`telemetry: ${message}`);
  }

  /**
   * Appends one event locally and, when a portal is configured, queues it.
   * Never throws and never blocks: a broken disk or a dead portal must not stop
   * a student from working.
   */
  record(input: TelemetryInput): TelemetryEvent | undefined {
    if (this.disposed) return undefined;
    const event: TelemetryEvent = {
      v: TELEMETRY_SCHEMA_VERSION,
      ts: new Date(this.opts.now?.() ?? Date.now()).toISOString(),
      student: this.opts.student,
      ...(input.course !== undefined ? { course: input.course } : {}),
      ...(input.module !== undefined ? { module: input.module } : {}),
      ...(input.step !== undefined ? { step: input.step } : {}),
      type: input.type,
      ...(input.data !== undefined ? { data: scrubEventData(input.data) } : {}),
    };
    this.appendLine(this.eventsFile, event);
    if (!this.enabled) return event;
    this.queue.push(event);
    if (this.queue.length > MAX_QUEUE_EVENTS) {
      // Drop the oldest: a student who worked offline for a week should still
      // deliver today's events rather than fill the disk with last week's.
      const dropped = this.queue.length - MAX_QUEUE_EVENTS;
      this.queue.splice(0, dropped);
      this.log(`queue full, dropped ${dropped} oldest event(s)`);
    }
    this.persistQueue();
    if (this.queue.length >= MAX_BATCH) void this.flush();
    return event;
  }

  private appendLine(file: string, event: TelemetryEvent): void {
    try {
      fs.appendFileSync(file, `${JSON.stringify(event)}\n`, "utf8");
    } catch (err) {
      this.log(`cannot append to ${path.basename(file)}: ${describe(err)}`);
    }
  }

  private loadQueue(): void {
    try {
      if (!fs.existsSync(this.queueFile)) return;
      const lines = fs.readFileSync(this.queueFile, "utf8").split("\n");
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          this.queue.push(JSON.parse(line) as TelemetryEvent);
        } catch {
          // A half-written last line after a hard kill; skip it rather than
          // discarding the whole queue.
        }
      }
      if (this.queue.length > 0) this.log(`resuming with ${this.queue.length} queued event(s)`);
    } catch (err) {
      this.log(`cannot read the queue: ${describe(err)}`);
    }
  }

  private persistQueue(): void {
    try {
      const body = this.queue.map((e) => JSON.stringify(e)).join("\n");
      fs.writeFileSync(this.queueFile, body ? `${body}\n` : "", "utf8");
    } catch (err) {
      this.log(`cannot persist the queue: ${describe(err)}`);
    }
  }

  /**
   * Sends up to MAX_BATCH events. Callers on a user path must not await it.
   *
   * Sends are serialised through a promise chain rather than skipped while one
   * is in flight. A guard that returned early would make `await flush()` a lie:
   * dispose() would return without having delivered anything whenever the
   * interval timer happened to be mid-send.
   */
  flush(): Promise<void> {
    if (!this.enabled || this.disposed) return Promise.resolve();
    this.chain = this.chain.then(() => this.flushOnce()).catch(() => undefined);
    return this.chain;
  }

  private async flushOnce(): Promise<void> {
    if (this.queue.length === 0 || this.disposed) return;
    const now = this.opts.now?.() ?? Date.now();
    if (now < this.nextAttemptAt) return;
    const batch = this.queue.slice(0, MAX_BATCH);
    try {
      await this.post(batch);
      this.queue.splice(0, batch.length);
      this.persistQueue();
      this.backoffMs = 0;
      this.nextAttemptAt = 0;
    } catch (err) {
      this.backoffMs = this.backoffMs === 0 ? BACKOFF_START_MS : Math.min(this.backoffMs * 2, BACKOFF_MAX_MS);
      this.nextAttemptAt = (this.opts.now?.() ?? Date.now()) + this.backoffMs;
      this.log(`send failed (${describe(err)}); retrying in ${Math.round(this.backoffMs / 1000)} s, ${this.queue.length} event(s) queued`);
    }
  }

  private post(batch: TelemetryEvent[]): Promise<void> {
    const target = new URL("ingest", this.opts.url!.endsWith("/") ? this.opts.url! : `${this.opts.url!}/`);
    const payload = Buffer.from(JSON.stringify({ events: batch }), "utf8");
    const transport = target.protocol === "https:" ? https : http;
    return new Promise<void>((resolve, reject) => {
      const req = transport.request(
        target,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "content-length": String(payload.length),
            "x-cads-student": this.opts.student,
            ...(this.opts.token ? { "x-cads-token": this.opts.token } : {}),
          },
          timeout: REQUEST_TIMEOUT_MS,
        },
        (res) => {
          res.resume(); // drain, so the socket can be reused
          const code = res.statusCode ?? 0;
          // 4xx other than 408/429 will not succeed on a retry either, but the
          // events are kept anyway: silently dropping a student's record because
          // a token was briefly wrong would be worse than a growing queue.
          if (code >= 200 && code < 300) resolve();
          else reject(new Error(`HTTP ${code}`));
        },
      );
      req.on("timeout", () => req.destroy(new Error(`timeout after ${REQUEST_TIMEOUT_MS} ms`)));
      req.on("error", reject);
      req.end(payload);
    });
  }

  /** Best-effort final flush; the queue file keeps whatever does not make it. */
  async dispose(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    // Ignore the backoff on the way out: this is the last chance to deliver.
    this.nextAttemptAt = 0;
    await this.flush().catch(() => undefined);
    this.disposed = true;
  }
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// ---------------------------------------------------------------------------
// Question classification (A5, field finding)
// ---------------------------------------------------------------------------

/**
 * A5 field finding: the previous tutor logged rubric and objective strings and
 * bare code pastes as if they were student questions, which made the "most
 * asked questions" view useless. Two rules follow from that, and only one of
 * them lives here:
 *
 *  - `question.asked` is emitted from the Ask field alone. That is enforced at
 *    the single call site, not by a heuristic.
 *  - A submission that is only pasted code is still a real submission, but it is
 *    not a question, so it is marked `kind: "code"` and the portal can exclude
 *    it from question clustering.
 */
export type QuestionKind = "question" | "code";

const CODE_LINE_RE = /(?:[;{}]\s*$)|(?:^\s*(?:fn|function|const|let|var|impl|pub|class|def|import|use|return|if|for|while|match|#\[|\/\/|\/\*|\*|})\b)/;
const PROSE_LINE_RE = /^(?=.*[A-Za-zÀ-ÿ])(?:[^;{}]*)$/;

export function classifyQuestionText(text: string): QuestionKind {
  const trimmed = text.trim();
  if (!trimmed) return "question";
  // An explicit question always counts as one, even when code is pasted with it.
  if (trimmed.includes("?")) return "question";

  const lines = trimmed.split("\n").filter((l) => l.trim());
  let code = 0;
  let prose = 0;
  for (const line of lines) {
    if (CODE_LINE_RE.test(line)) code += 1;
    else if (PROSE_LINE_RE.test(line) && line.trim().split(/\s+/).length >= 4) prose += 1;
  }
  return code > 0 && code >= prose ? "code" : "question";
}

/** A short, single-line excerpt of a check's output for the event log. */
export function excerptOutput(output: string | undefined, max = 200): string | undefined {
  if (!output) return undefined;
  const one = output.replace(/\s+/g, " ").trim();
  if (!one) return undefined;
  return one.length > max ? `${one.slice(0, max)}…` : one;
}
