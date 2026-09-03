import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as http from "node:http";
import * as os from "node:os";
import * as path from "node:path";
import { after, describe, it } from "node:test";
import {
  accumulateEdit,
  classifyQuestionText,
  emptyEditMetrics,
  excerptOutput,
  MAX_BATCH,
  PASTE_THRESHOLD_CHARS,
  resolveStudentId,
  scrubEventData,
  scrubText,
  slugForEmail,
  TelemetryClient,
  type TelemetryEvent,
} from "../src/telemetry";

function tmpdir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cads-telemetry-"));
}

function readJsonl(file: string): TelemetryEvent[] {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as TelemetryEvent);
}

/** A stand-in portal that records what it received and can be told to fail. */
interface FakePortal {
  url: string;
  batches: { events: TelemetryEvent[] }[];
  headers: http.IncomingHttpHeaders[];
  paths: string[];
  status: number;
  close(): Promise<void>;
}

async function startPortal(status = 200): Promise<FakePortal> {
  const state = { status };
  const batches: { events: TelemetryEvent[] }[] = [];
  const headers: http.IncomingHttpHeaders[] = [];
  const paths: string[] = [];
  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      paths.push(req.url ?? "");
      headers.push(req.headers);
      if (state.status < 400) {
        try {
          batches.push(JSON.parse(Buffer.concat(chunks).toString("utf8")));
        } catch {
          /* recorded as a bad body by the assertions below */
        }
      }
      res.writeHead(state.status, { "content-type": "application/json" });
      res.end("{}");
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;
  return {
    url: `http://127.0.0.1:${port}`,
    batches,
    headers,
    paths,
    get status() {
      return state.status;
    },
    set status(v: number) {
      state.status = v;
    },
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

describe("pseudonymisation", () => {
  it("derives the student id the way the broker does", () => {
    // MULTIUSER: slug = first 12 hex chars of sha256(lowercase(email)).
    const slug = slugForEmail("Student@example.org");
    assert.match(slug, /^[0-9a-f]{12}$/);
    assert.equal(slug, slugForEmail("student@example.org"), "must be case-insensitive");
    assert.equal(slug, slugForEmail("  student@example.org  "), "must ignore surrounding space");
    assert.notEqual(slug, slugForEmail("other@example.org"));
  });
  it("prefers the id the broker injected", () => {
    assert.equal(resolveStudentId({ CADS_TUTOR_STUDENT: "abc123abc123" }, "fallback"), "abc123abc123");
  });
  it("derives the id from an e-mail when no id was injected", () => {
    assert.equal(resolveStudentId({ CADS_TUTOR_EMAIL: "student@example.org" }, "fallback"), slugForEmail("student@example.org"));
  });
  it("falls back to the local session id rather than sending nothing", () => {
    assert.equal(resolveStudentId({}, "local-uuid"), "local-uuid");
  });
});

describe("scrubbing before send", () => {
  it("removes e-mail addresses", () => {
    assert.equal(scrubText("write to anna.meier@example.org please"), "write to [redacted-email] please");
  });
  it("removes URLs carrying credentials", () => {
    assert.equal(scrubText("clone https://user:sekret@git.example.org/repo.git now"), "clone [redacted-url] now");
  });
  it("removes URLs whose query carries a token or key", () => {
    for (const url of [
      "https://api.example.org/x?token=abc123",
      "https://api.example.org/x?api_key=abc123",
      "https://api.example.org/x?a=1&access_token=xyz",
      "https://api.example.org/x?password=hunter2",
    ]) {
      assert.equal(scrubText(`see ${url}`), "see [redacted-url]", url);
    }
  });
  it("leaves an ordinary URL and ordinary prose intact", () => {
    const text = "I read https://doc.rust-lang.org/book/ch04-01.html and still do not get ownership";
    assert.equal(scrubText(text), text);
  });
  it("does not half-redact a URL whose userinfo looks like an address", () => {
    const out = scrubText("https://a@b.com:pw@host.example/x");
    assert.doesNotMatch(out, /host\.example/);
    assert.doesNotMatch(out, /@b\.com/);
  });
  it("scrubs only the student-authored fields, leaving counters alone", () => {
    const data = scrubEventData({ question: "mail me at a@b.org", checkType: "testSuite", attempt: 2, typedChars: 12 })!;
    assert.equal(data.question, "mail me at [redacted-email]");
    assert.equal(data.checkType, "testSuite");
    assert.equal(data.attempt, 2);
    assert.equal(data.typedChars, 12);
  });
});

describe("edit metrics", () => {
  it("counts a short insertion as typing", () => {
    const m = accumulateEdit(emptyEditMetrics(), 12);
    assert.deepEqual(m, { typedChars: 12, pastedChars: 0, pasteEvents: 0 });
  });
  it("counts an insertion above the threshold as a paste", () => {
    const m = accumulateEdit(emptyEditMetrics(), PASTE_THRESHOLD_CHARS + 1);
    assert.equal(m.pastedChars, PASTE_THRESHOLD_CHARS + 1);
    assert.equal(m.pasteEvents, 1);
    assert.equal(m.typedChars, 0);
  });
  it("treats exactly the threshold as typing, not as a paste", () => {
    // A5 says "> 200 Zeichen", so 200 itself is still typing.
    assert.equal(accumulateEdit(emptyEditMetrics(), PASTE_THRESHOLD_CHARS).pasteEvents, 0);
  });
  it("ignores deletions instead of counting negative typing", () => {
    assert.deepEqual(accumulateEdit(emptyEditMetrics(), 0), emptyEditMetrics());
  });
  it("accumulates a mixed editing session", () => {
    const m = emptyEditMetrics();
    accumulateEdit(m, 10);
    accumulateEdit(m, 5);
    accumulateEdit(m, 500);
    assert.deepEqual(m, { typedChars: 15, pastedChars: 500, pasteEvents: 1 });
  });
});

describe("local event log", () => {
  it("appends every event as one JSON line, with or without a portal", () => {
    const dir = tmpdir();
    const c = new TelemetryClient({ dir, student: "stud01" });
    c.record({ type: "step.open", course: "rust-foundations", module: "m1", step: "m1-02-move" });
    c.record({ type: "check.pass", course: "rust-foundations", step: "m1-02-move", data: { taskId: "tests" } });
    const events = readJsonl(path.join(dir, "events.jsonl"));
    assert.equal(events.length, 2);
    assert.equal(events[0].v, 1);
    assert.equal(events[0].student, "stud01");
    assert.equal(events[0].type, "step.open");
    assert.equal(events[0].module, "m1");
    assert.match(events[0].ts, /^\d{4}-\d\d-\d\dT.*Z$/);
    assert.equal(events[1].data?.taskId, "tests");
  });
  it("scrubs the stored copy too, not only what is sent", () => {
    const dir = tmpdir();
    new TelemetryClient({ dir, student: "s" }).record({ type: "question.asked", data: { question: "reach me at a@b.org" } });
    assert.equal(readJsonl(path.join(dir, "events.jsonl"))[0].data?.question, "reach me at [redacted-email]");
  });
  it("queues nothing when no portal is configured", () => {
    const c = new TelemetryClient({ dir: tmpdir(), student: "s" });
    c.record({ type: "session.start" });
    assert.equal(c.enabled, false);
    assert.equal(c.pending, 0);
  });
});

describe("sending to the portal", () => {
  const portals: FakePortal[] = [];
  after(async () => {
    for (const p of portals) await p.close();
  });

  it("posts to /ingest with the student and token headers", async () => {
    const portal = await startPortal();
    portals.push(portal);
    const c = new TelemetryClient({ dir: tmpdir(), student: "stud01", url: portal.url, token: "tok-42" });
    c.record({ type: "session.start" });
    await c.flush();
    assert.equal(portal.paths[0], "/ingest");
    assert.equal(portal.headers[0]["x-cads-student"], "stud01");
    assert.equal(portal.headers[0]["x-cads-token"], "tok-42");
    assert.equal(portal.batches[0].events.length, 1);
    assert.equal(c.pending, 0);
  });
  it("appends /ingest correctly whether or not the URL ends in a slash", async () => {
    const portal = await startPortal();
    portals.push(portal);
    for (const url of [portal.url, `${portal.url}/`]) {
      const c = new TelemetryClient({ dir: tmpdir(), student: "s", url });
      c.record({ type: "session.start" });
      await c.flush();
    }
    assert.deepEqual(portal.paths, ["/ingest", "/ingest"]);
  });
  it("sends at most 100 events per batch", async () => {
    const portal = await startPortal();
    portals.push(portal);
    const c = new TelemetryClient({ dir: tmpdir(), student: "s", url: portal.url });
    for (let i = 0; i < MAX_BATCH + 20; i++) c.record({ type: "check.run", data: { i } });
    await c.flush();
    assert.ok(portal.batches.length >= 2, `expected more than one batch, got ${portal.batches.length}`);
    for (const b of portal.batches) assert.ok(b.events.length <= MAX_BATCH, `batch of ${b.events.length} exceeds the cap`);
    assert.equal(portal.batches[0].events.length, MAX_BATCH, "a full batch is sent as soon as the cap is reached");
    const delivered = portal.batches.reduce((n, b) => n + b.events.length, 0);
    assert.equal(delivered, MAX_BATCH + 20, "every event is delivered, none dropped");
    assert.equal(c.pending, 0);
  });
  it("keeps events queued when the portal fails, and delivers them once it recovers", async () => {
    const portal = await startPortal(500);
    portals.push(portal);
    const c = new TelemetryClient({ dir: tmpdir(), student: "s", url: portal.url, now: () => 0 });
    c.record({ type: "check.fail" });
    await c.flush();
    assert.equal(c.pending, 1, "a failed send must not lose the event");
    portal.status = 200;
    // now() is pinned at 0, so the backoff window would still block; dispose()
    // deliberately ignores it, which is what a closing session must do.
    await c.dispose();
    assert.equal(c.pending, 0);
    assert.equal(portal.batches.at(-1)!.events[0].type, "check.fail");
  });
  it("backs off instead of hammering a portal that is down", async () => {
    const portal = await startPortal(500);
    portals.push(portal);
    let clock = 0;
    const c = new TelemetryClient({ dir: tmpdir(), student: "s", url: portal.url, now: () => clock });
    c.record({ type: "check.fail" });
    await c.flush();
    const afterFirst = portal.paths.length;
    await c.flush();
    await c.flush();
    assert.equal(portal.paths.length, afterFirst, "further attempts inside the backoff window must not reach the portal");
    clock += 60_000;
    await c.flush();
    assert.ok(portal.paths.length > afterFirst, "after the backoff window it tries again");
  });
  it("never throws out of record() when the portal is unreachable", async () => {
    const c = new TelemetryClient({ dir: tmpdir(), student: "s", url: "http://127.0.0.1:1" });
    assert.doesNotThrow(() => c.record({ type: "session.start" }));
    await c.flush();
    assert.equal(c.pending, 1);
    await c.dispose();
  });
  it("resumes a queue left behind by a previous session", async () => {
    const portal = await startPortal();
    portals.push(portal);
    const dir = tmpdir();
    const first = new TelemetryClient({ dir, student: "s", url: "http://127.0.0.1:1" });
    first.record({ type: "step.done", step: "m1-01" });
    await first.flush();
    assert.equal(first.pending, 1);

    const second = new TelemetryClient({ dir, student: "s", url: portal.url });
    assert.equal(second.pending, 1, "the queue must survive a restart");
    await second.flush();
    assert.equal(portal.batches.at(-1)!.events[0].step, "m1-01");
  });
  it("survives a half-written queue line instead of discarding the queue", async () => {
    const dir = tmpdir();
    const first = new TelemetryClient({ dir, student: "s", url: "http://127.0.0.1:1" });
    first.record({ type: "step.done", step: "good" });
    await first.flush();
    fs.appendFileSync(path.join(dir, "telemetry-queue.jsonl"), '{"v":1,"ts":"2026-0');
    const second = new TelemetryClient({ dir, student: "s", url: "http://127.0.0.1:1" });
    assert.equal(second.pending, 1);
  });
  it("still writes the local log when sending is impossible", async () => {
    const dir = tmpdir();
    const c = new TelemetryClient({ dir, student: "s", url: "http://127.0.0.1:1" });
    c.record({ type: "reflection.written", data: { reflection: "I learned about ownership" } });
    await c.flush();
    assert.equal(readJsonl(path.join(dir, "events.jsonl")).length, 1);
    await c.dispose();
  });
});

describe("question classification", () => {
  it("treats anything with a question mark as a question", () => {
    assert.equal(classifyQuestionText("why does the borrow checker reject this?"), "question");
    assert.equal(classifyQuestionText("let x = y;\nwhy does this move?"), "question", "code plus a question is still a question");
  });
  it("marks a bare code paste as code", () => {
    // The field finding: bare pastes used to pollute the "most asked questions" view.
    const rust = "fn main() {\n    let s = String::from(\"a\");\n    let t = s;\n    println!(\"{}\", s);\n}";
    assert.equal(classifyQuestionText(rust), "code");
    assert.equal(classifyQuestionText("const add = (a, b) => a + b;"), "code");
  });
  it("treats a plain prose statement as a question even without a question mark", () => {
    assert.equal(classifyQuestionText("I do not understand why the value cannot be used again"), "question");
  });
  it("does not classify empty input as code", () => {
    assert.equal(classifyQuestionText("   "), "question");
  });
});

describe("output excerpts", () => {
  it("collapses whitespace to a single line", () => {
    assert.equal(excerptOutput("error:\n   two   lines\n"), "error: two lines");
  });
  it("truncates long output with an ellipsis", () => {
    const e = excerptOutput("x".repeat(500))!;
    assert.equal(e.length, 201);
    assert.ok(e.endsWith("…"));
  });
  it("returns nothing for empty or missing output", () => {
    assert.equal(excerptOutput(undefined), undefined);
    assert.equal(excerptOutput("   \n  "), undefined);
  });
});
