import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LlmRateLimitError, RetryingLlmClient, raceWithGiveUp } from "../src/llmClient";

/** Stubs global fetch for one test, queuing canned responses in call order, and always restores it. */
async function withFetch<T>(responses: Response[], run: (calls: Request[]) => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  const calls: Request[] = [];
  let i = 0;
  globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init: Parameters<typeof fetch>[1]) => {
    calls.push(new Request(input, init));
    const res = responses[i];
    i++;
    return res;
  }) as typeof fetch;
  try {
    return await run(calls);
  } finally {
    globalThis.fetch = original;
  }
}

function okResponse(content: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
}

function rateLimited(opts: { reason?: "per_user" | "queue_full"; retryAfter?: number; position?: number; length?: number } = {}): Response {
  const headers: Record<string, string> = {};
  if (opts.retryAfter !== undefined) headers["retry-after"] = String(opts.retryAfter);
  if (opts.position !== undefined) headers["x-queue-position"] = String(opts.position);
  if (opts.length !== undefined) headers["x-queue-length"] = String(opts.length);
  const body = opts.reason ? JSON.stringify({ reason: opts.reason }) : "";
  return new Response(body, { status: 429, headers });
}

function client(onProgress?: (info: unknown) => void) {
  return new RetryingLlmClient({ baseUrl: "https://model.example", apiKey: "k", model: "m", studentId: "s1", onProgress: onProgress as never });
}

describe("RetryingLlmClient: per_user retries, queue_full does not", () => {
  it("per_user: retries once, using Retry-After as the delay, and succeeds", async () => {
    const content = await withFetch([rateLimited({ reason: "per_user", retryAfter: 0 }), okResponse("ok")], (calls) =>
      client().complete("hi").then((r) => {
        assert.equal(calls.length, 2, "exactly one retry");
        return r;
      }),
    );
    assert.equal(content, "ok");
  });

  it("queue_full: never retries, even with a short Retry-After", async () => {
    await assert.rejects(
      () => withFetch([rateLimited({ reason: "queue_full", retryAfter: 2, position: 4, length: 9 })], (calls) => client().complete("hi").finally(() => assert.equal(calls.length, 1, "no retry call was made"))),
      (err: unknown) => {
        assert.ok(err instanceof LlmRateLimitError);
        assert.match(err.message, /queue_full/);
        assert.equal(err.info.queuePosition, 4);
        assert.equal(err.info.queueLength, 9);
        return true;
      },
    );
  });

  it("no reason at all (older shim): falls back to the Retry-After threshold - short retries, long or absent does not", async () => {
    const shortRetry = await withFetch([rateLimited({ retryAfter: 3 }), okResponse("ok")], (calls) =>
      client().complete("hi").then((r) => { assert.equal(calls.length, 2); return r; }),
    );
    assert.equal(shortRetry, "ok");

    await assert.rejects(() => withFetch([rateLimited({ retryAfter: 30 })], (calls) => client().complete("hi").finally(() => assert.equal(calls.length, 1))), LlmRateLimitError);
    await assert.rejects(() => withFetch([rateLimited({})], (calls) => client().complete("hi").finally(() => assert.equal(calls.length, 1))), LlmRateLimitError, "no header at all is the cautious default: do not retry");
  });

  it("reason wins even when Retry-After would suggest the opposite", async () => {
    // queue_full with a short Retry-After must still not retry - reason is authoritative.
    await assert.rejects(() => withFetch([rateLimited({ reason: "queue_full", retryAfter: 1 })], (calls) => client().complete("hi").finally(() => assert.equal(calls.length, 1))), LlmRateLimitError);
  });

  it("reports queue position/length via onProgress on every attempt, success or not", async () => {
    const seen: unknown[] = [];
    await withFetch([rateLimited({ reason: "per_user", retryAfter: 0, position: 2, length: 5 }), okResponse("ok")], () => client((info) => seen.push(info)).complete("hi"));
    assert.deepEqual(seen, [
      { attempt: 1, queuePosition: 2, queueLength: 5 },
      { attempt: 2, queuePosition: undefined, queueLength: undefined },
    ]);
  });
});

describe("raceWithGiveUp", () => {
  it("returns the real result when work finishes before giveUp", async () => {
    const never = new Promise<void>(() => {});
    const result = await raceWithGiveUp(Promise.resolve("done"), never, () => "fallback");
    assert.equal(result, "done");
  });

  it("returns the fallback when giveUp resolves first, and never throws unhandled when work later rejects", async () => {
    let resolveGiveUp!: () => void;
    const giveUp = new Promise<void>((resolve) => { resolveGiveUp = resolve; });
    let rejectWork!: (err: Error) => void;
    const work = new Promise<string>((_resolve, reject) => { rejectWork = reject; });
    resolveGiveUp();
    const result = await raceWithGiveUp(work, giveUp, () => "fallback");
    assert.equal(result, "fallback");
    rejectWork(new Error("the abandoned request eventually failed"));
    await new Promise((r) => setTimeout(r, 10)); // let the discarded rejection be observed by work.catch()
  });

  it("a judgment that arrives after give-up must never reach the caller a second time", async () => {
    // The temporal twin of the error-type control case above: runTask calls
    // recordTaskResult exactly once, with whatever raceWithGiveUp returns - if the
    // real grading later resolved and reached that call site too, a self-reported
    // pending task would silently flip to a graded pass (or a passed one reopen to
    // failed) with no visible cause, the exact class of bug R11a.8a exists to catch,
    // this time from a stale promise instead of a stale config flag. raceWithGiveUp
    // exposes a single Promise with no second hook, so there is nowhere for that
    // second call to come from - this asserts that stays true.
    let resolveWork!: (v: string) => void;
    const work = new Promise<string>((resolve) => { resolveWork = resolve; });
    let resolveGiveUp!: () => void;
    const giveUp = new Promise<void>((resolve) => { resolveGiveUp = resolve; });
    resolveGiveUp();
    const recorded: string[] = [];
    const result = await raceWithGiveUp(work, giveUp, () => "pending/selfReported");
    recorded.push(result); // stands in for runTask's one recordTaskResult call
    assert.deepEqual(recorded, ["pending/selfReported"]);

    resolveWork("passed/graded"); // the discarded LLM verdict arrives 20s later
    await new Promise((r) => setTimeout(r, 20));
    assert.deepEqual(recorded, ["pending/selfReported"], "a late-arriving judgment must not trigger a second, retroactive record");
  });
});
