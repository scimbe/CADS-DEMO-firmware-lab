/**
 * Resilient OpenAI-chat-compatible client, used in place of @cads/tutor-platform's
 * own LlmClient (contract: `complete(prompt) => string`, deliberately no retries,
 * no `user` field, text-only return - see its own doc comment).
 *
 * Two real-lab constraints forced this wrapper rather than an option to the packed
 * client: the model behind our proxy is a single serialized worker (~8s/answer), so
 * a burst of requests (e.g. a whole class checking the same step at once) queues
 * behind it and the shim answers 429 once its queue is full; and the shim's
 * per-student fairness only works when the OpenAI `user` field carries a pseudonymous
 * id, which the packed client has no option to set at all.
 */
/**
 * Reported once per HTTP attempt, as soon as headers arrive - well before the
 * body is read, let alone the retry loop has decided pass/fail - so a caller can
 * show that a request is in flight before this method's promise ever settles.
 * queuePosition/queueLength come from the shim's own headers when it sends them;
 * both stay undefined otherwise, and the caller must work fully without them.
 */
export interface LlmProgressInfo {
  attempt: 1 | 2;
  queuePosition?: number;
  queueLength?: number;
}

export interface RetryingLlmClientOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  /** OpenAI `user` field for the shim's per-student fairness - the existing pseudonymous studentId, nothing else. */
  studentId: string;
  onProgress?: (info: LlmProgressInfo) => void;
  /** So a transport-level failure (below) stays distinguishable from the shim being busy in the next investigation. */
  onLog?: (msg: string) => void;
}

export interface LlmRateLimitInfo {
  queuePosition?: number;
  queueLength?: number;
  /** Seconds, from the shim's own Retry-After - an estimate of the remaining wait, not a promise. */
  retryAfterSeconds?: number;
}

/**
 * Thrown when the model could not be reached because it is overloaded (429 that
 * either could not be retried or survived the one retry that made sense, or our
 * own timeout while a request sat queued) - distinct from every other completion
 * failure so a caller can fall back to a self-check instead of showing a raw
 * error (R11a.8: that fallback is never itself graded evidence). Carries whatever
 * the shim told us about the queue, so that fallback can be specific instead of
 * just saying "overloaded" - all fields are optional because an older shim, or a
 * client-side timeout, may not have any of them.
 */
export class LlmRateLimitError extends Error {
  readonly info: LlmRateLimitInfo;
  constructor(message: string, info: LlmRateLimitInfo = {}) {
    super(message);
    this.name = "LlmRateLimitError";
    this.info = info;
  }
}

/**
 * The line between "retry" and "don't": the shim's 429 body names which of two
 * different situations this is. `per_user` is a per-student limit (a stray
 * double-click, one request already in flight) that clears in seconds - retrying
 * once is right, and Retry-After is a fixed 2s. `queue_full` means the queue
 * itself is too long to answer within the shim's own budget; that does NOT clear
 * by waiting, and retrying only adds another request to the queue that is the
 * problem - for every OTHER student waiting behind it, not just this one.
 * `reason` is authoritative wherever it is present. The Retry-After threshold
 * below is only a fallback for an older shim that does not send it yet, and
 * stays cautious on purpose: a wrong guess there costs other students their
 * place, not just this one a few seconds.
 */
const RETRY_AFTER_MAX_SECONDS = 5;
/** Retry-After the shim sends for `per_user`, used if the header is somehow missing on that reason. */
const PER_USER_RETRY_SECONDS = 2;

interface RateLimitBody {
  reason?: "per_user" | "queue_full";
}
/** Below the shim's own ~75s cutoff, so this client is the one that speaks first. */
const REQUEST_TIMEOUT_MS = 60_000;
/**
 * A transport-level failure (DNS, TLS, a reset or refused socket - e.g. undici's
 * UND_ERR_SOCKET) never reaches the shim at all, so from the student's side it
 * is indistinguishable from "the model is busy right now": one short retry,
 * then the same fallback a rate limit gets. Short on purpose - this is not the
 * shim's own queue delay, it is us finding out whether the last attempt was a
 * blip before spending the retry budget the 429 path also uses.
 */
const CONNECTION_RETRY_DELAY_MS = 500;

interface ChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
}

export class RetryingLlmClient {
  constructor(private readonly options: RetryingLlmClientOptions) {
    if (!options.baseUrl.startsWith("https://")) {
      throw new Error(`RetryingLlmClient baseUrl must be https:// (got "${options.baseUrl}") - see the http->https 401 lesson in firmware-lab`);
    }
  }

  async complete(prompt: string): Promise<string> {
    for (let attempt = 0; ; attempt++) {
      let res: Response;
      try {
        res = await this.post(prompt);
      } catch (err) {
        // post() already turns our own timeout into an LlmRateLimitError - that
        // shape is right as is, no extra retry here. Anything else never got a
        // response at all (a socket the shim never saw), which is where this
        // used to rethrow raw and skip the entire graceful path: no retry, no
        // queue message, no 20s escape hatch, no self-check fallback - a raw
        // failure in a lecture hall the moment a connection is refused instead
        // of "the model is busy, try again".
        if (err instanceof LlmRateLimitError) throw err;
        const cause = err instanceof Error && "cause" in err ? (err as { cause?: { code?: string } }).cause?.code : undefined;
        this.options.onLog?.(`LLM connection failed at the socket level (${cause ?? "no cause code"}), attempt ${attempt + 1}`);
        if (attempt === 0) {
          await delay(CONNECTION_RETRY_DELAY_MS);
          continue;
        }
        throw new LlmRateLimitError(
          `LLM connection failed at the socket level${cause ? ` (${cause})` : ""} after one retry - the model is likely unreachable or overloaded, not this student's fault`,
        );
      }
      const queue = readQueueHeaders(res);
      this.options.onProgress?.({ attempt: attempt === 0 ? 1 : 2, ...queue });
      if (res.status === 429) {
        const retryAfter = parseRetryAfterSeconds(res.headers.get("retry-after"));
        const reason = await readRateLimitReason(res);
        // reason decides; the Retry-After threshold only stands in when an older
        // shim sends no reason at all.
        const shouldRetry = reason ? reason === "per_user" : retryAfter !== undefined && retryAfter > 0 && retryAfter <= RETRY_AFTER_MAX_SECONDS;
        if (attempt === 0 && shouldRetry) {
          await delay((retryAfter ?? PER_USER_RETRY_SECONDS) * 1000);
          continue;
        }
        throw new LlmRateLimitError(
          `LLM rate-limited (${reason ?? "unknown reason"}): ${res.status} ${res.statusText}` +
            (queue.queuePosition !== undefined && queue.queueLength !== undefined ? ` (queue position ${queue.queuePosition} of ${queue.queueLength})` : ""),
          { ...queue, retryAfterSeconds: retryAfter },
        );
      }
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`LLM request failed: ${res.status} ${res.statusText} - ${body}`);
      }
      const data = (await res.json()) as ChatCompletionResponse;
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("LLM response had no message content");
      return content;
    }
  }

  private async post(prompt: string): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(`${this.options.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.options.apiKey}`,
        },
        body: JSON.stringify({
          model: this.options.model,
          messages: [{ role: "user", content: prompt }],
          user: this.options.studentId,
        }),
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new LlmRateLimitError(`LLM request timed out after ${REQUEST_TIMEOUT_MS / 1000}s - the model is likely serialized behind other requests`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 1-indexed, "1 = you're next" - present on every response, including 429s and timeouts, once the shim sends them. */
function readQueueHeaders(res: Response): { queuePosition?: number; queueLength?: number } {
  const position = res.headers.get("x-queue-position");
  const length = res.headers.get("x-queue-length");
  return {
    queuePosition: position !== null ? Number(position) : undefined,
    queueLength: length !== null ? Number(length) : undefined,
  };
}

/**
 * Delay-seconds only. Retry-After may also be an HTTP-date per spec, but an
 * unparseable value falls back to "no retry" here anyway - the cautious default,
 * per the comment on RETRY_AFTER_MAX_SECONDS above.
 */
function parseRetryAfterSeconds(header: string | null): number | undefined {
  if (header === null) return undefined;
  const seconds = Number(header);
  return Number.isFinite(seconds) ? seconds : undefined;
}

/** Reads the 429 body's `reason` field; anything unparseable or unexpected is treated as absent, not as a crash. */
async function readRateLimitReason(res: Response): Promise<"per_user" | "queue_full" | undefined> {
  try {
    const data = (await res.clone().json()) as RateLimitBody;
    return data.reason === "per_user" || data.reason === "queue_full" ? data.reason : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Races `work` against `giveUp` (resolved externally - the panel's "don't wait,
 * check it yourself" button) and returns `fallback()` if giveUp wins. `work` keeps
 * running in the background either way: the shim still has to finish accounting
 * for a request it queued, and the student was never offered control over
 * cancelling it, only over waiting for it. Its eventual result, and any
 * rejection, are both discarded rather than left unhandled.
 */
export async function raceWithGiveUp<T>(work: Promise<T>, giveUp: Promise<void>, fallback: () => T): Promise<T> {
  const outcome = await Promise.race([
    work.then((value) => ({ kind: "done" as const, value })),
    giveUp.then(() => ({ kind: "gaveUp" as const })),
  ]);
  if (outcome.kind === "gaveUp") {
    work.catch(() => undefined);
    return fallback();
  }
  return outcome.value;
}
