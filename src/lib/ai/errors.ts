import { APICallError, InvalidToolInputError, NoSuchToolError, RetryError } from "ai";
import { ResearchToolError } from "./tools/analyze-research-topic";

/** Walks `cause` chains and retry wrappers to find the first error matching `predicate`. */
function findError<T>(error: unknown, predicate: (value: unknown) => value is T): T | undefined {
  const seen = new Set<unknown>();
  const queue: unknown[] = [error];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined || seen.has(current)) continue;
    seen.add(current);
    if (predicate(current)) return current;
    if (RetryError.isInstance(current)) queue.push(current.lastError);
    if (current instanceof Error) queue.push(current.cause);
  }
  return undefined;
}

const MESSAGES = {
  rateLimit: "The AI provider's rate limit was reached. Please wait a moment and try again.",
  credits: "The OpenRouter credit balance or spending quota was reached, so the assistant can't respond right now.",
  auth: "OpenRouter rejected the API key. Check OPENROUTER_API_KEY on the server.",
  moderation: "The AI provider declined this request. Try rephrasing your message.",
  model: "The configured AI model is unavailable or doesn't support this request. Please try again later.",
  upstream: "The AI provider is temporarily unavailable. Please try again in a minute.",
  generic: "The assistant could not complete the response. Please try again.",
} as const;

function fromStatus(status: number, detail: string): string | undefined {
  if (status === 429) return MESSAGES.rateLimit;
  if (status === 402) return MESSAGES.credits;
  if (status === 401) return MESSAGES.auth;
  if (status === 403) return /moderat|flagged/i.test(detail) ? MESSAGES.moderation : MESSAGES.auth;
  if (status === 400 || status === 404) {
    return /model|endpoint|provider|tool/i.test(detail) ? MESSAGES.model : undefined;
  }
  if (status === 408 || status >= 500) return MESSAGES.upstream;
  return undefined;
}

/** Maps any stream or tool error to a message that is safe to show in the chat. */
export function toClientErrorMessage(error: unknown) {
  const toolError = findError(error, (value): value is ResearchToolError => value instanceof ResearchToolError);
  if (toolError) return toolError.message;
  const detail = error instanceof Error ? error.message : String(error);
  // The SDK reports a failed tool call twice: once as the error and once as its string form.
  if (InvalidToolInputError.isInstance(error) || detail.startsWith("AI_InvalidToolInputError")) {
    return "The assistant sent the research analysis tool an invalid topic or goal.";
  }
  if (NoSuchToolError.isInstance(error) || detail.startsWith("AI_NoSuchToolError")) {
    return "The assistant tried to use a tool that is not available.";
  }

  const apiError = findError(error, APICallError.isInstance);
  if (apiError?.statusCode !== undefined) {
    const mapped = fromStatus(apiError.statusCode, `${apiError.message} ${apiError.responseBody ?? ""}`);
    if (mapped) return mapped;
  }

  // Errors without an HTTP status (e.g. reported inside the stream) fall back to their text.
  if (/insufficient credits|402/i.test(detail)) return MESSAGES.credits;
  if (/quota|rate.?limit|resource.?exhausted|too many requests|429/i.test(detail)) return MESSAGES.rateLimit;
  if (/no auth|api key|api_key|unauthori[sz]ed|user not found|401/i.test(detail)) return MESSAGES.auth;
  if (/moderat|flagged/i.test(detail)) return MESSAGES.moderation;
  if (/not a valid model|no endpoints|model.*(not found|unavailable)/i.test(detail)) return MESSAGES.model;
  if (/overloaded|unavailable|upstream|timeout|timed out|502|503|504/i.test(detail)) return MESSAGES.upstream;
  return MESSAGES.generic;
}
