import { InvalidToolInputError, NoSuchToolError } from "ai";
import { ResearchToolError } from "./tools/analyze-research-topic";

function findResearchToolError(error: unknown): ResearchToolError | undefined {
  for (let current = error; current instanceof Error; current = current.cause) {
    if (current instanceof ResearchToolError) return current;
  }
  return undefined;
}

/** Maps any stream or tool error to a message that is safe to show in the chat. */
export function toClientErrorMessage(error: unknown) {
  const toolError = findResearchToolError(error);
  if (toolError) return toolError.message;
  const detail = error instanceof Error ? error.message : String(error);
  // The SDK reports a failed tool call twice: once as the error and once as its string form.
  if (InvalidToolInputError.isInstance(error) || detail.startsWith("AI_InvalidToolInputError")) {
    return "The assistant sent the research analysis tool an invalid topic or goal.";
  }
  if (NoSuchToolError.isInstance(error) || detail.startsWith("AI_NoSuchToolError")) {
    return "The assistant tried to use a tool that is not available.";
  }
  if (/quota|rate limit|resource.?exhausted|429/i.test(detail)) {
    return "The Gemini free-tier quota (per-minute or daily) was reached. Please try again later.";
  }
  if (/high demand|overloaded|unavailable|503/i.test(detail)) {
    return "Gemini is temporarily overloaded. Please try again in a minute.";
  }
  if (/api key|api_key|permission|unauthori[sz]ed|403/i.test(detail)) {
    return "Gemini rejected the API key. Check GOOGLE_GENERATIVE_AI_API_KEY on the server.";
  }
  return "The assistant could not complete the response. Please try again.";
}
