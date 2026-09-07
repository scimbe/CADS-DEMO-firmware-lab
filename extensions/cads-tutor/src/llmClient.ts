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
export interface RetryingLlmClientOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  /** OpenAI `user` field for the shim's per-student fairness - the existing pseudonymous studentId, nothing else. */
  studentId: string;
}

/**
 * Thrown when the model could not be reached because it is overloaded (429 that
 * survived one retry, or our own timeout while a request sat queued) - distinct from
 * every other completion failure so a caller can fall back to a self-check instead of
 * showing a raw error (R11a.8: that fallback is never itself graded evidence).
 */
export class LlmRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmRateLimitError";
  }
}

const RETRY_DELAY_MS = 2000;
/** Below the shim's own ~75s cutoff, so this client is the one that speaks first. */
const REQUEST_TIMEOUT_MS = 60_000;

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
      const res = await this.post(prompt);
      if (res.status === 429) {
        if (attempt === 0) {
          await delay(RETRY_DELAY_MS);
          continue;
        }
        throw new LlmRateLimitError(`LLM rate-limited after retry: ${res.status} ${res.statusText}`);
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
