import {
  consumeStream,
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  safeValidateUIMessages,
  smoothStream,
  streamText,
  toUIMessageStream,
} from "ai";
import {
  CHAT_LIMITS,
  AI_MODEL_ID,
  GENERATION_CONFIG,
  MAX_STEPS,
  OPENROUTER_PROVIDER_OPTIONS,
  openrouter,
  STREAM_SMOOTHING,
  SYSTEM_PROMPT,
} from "@/lib/ai/config";
import { toClientErrorMessage } from "@/lib/ai/errors";
import { researchTools, type ResearchUIMessage } from "@/lib/ai/tools";
import {
  ANALYZE_RESEARCH_TOPIC,
  analyzeResearchTopicOutputSchema,
} from "@/lib/ai/tools/research-analysis-schema";
import { sabotageResponse } from "@/lib/testing/chat-sabotage-server";

export const maxDuration = 60;

// Plain-text bodies: the chat client surfaces the response body as the error message.
function textError(message: string, status: number) {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * A tool result that fails its output schema would make the whole history
 * invalid and block every later turn, so it is kept as a tool error instead.
 */
function repairToolOutputs(messages: unknown): unknown {
  if (!Array.isArray(messages)) return messages;
  return messages.map((message: unknown) => {
    if (!isRecord(message) || !Array.isArray(message.parts)) return message;
    const parts = message.parts.map((part: unknown) =>
      isRecord(part) &&
      part.type === `tool-${ANALYZE_RESEARCH_TOPIC}` &&
      part.state === "output-available" &&
      !analyzeResearchTopicOutputSchema.safeParse(part.output).success
        ? {
            ...part,
            state: "output-error",
            output: undefined,
            errorText: "The research analysis returned malformed data.",
          }
        : part,
    );
    return { ...message, parts };
  });
}

const STOPPED_TOOL_NOTE =
  "[The user pressed Stop before the research analysis ran. Do not run it now unless the user asks again.]";

/**
 * A tool call cut off by Stop has no result and is dropped when converting, which
 * makes the user's request look unanswered; models then re-run it on the next
 * turn. A short note in its place records that the user cancelled it.
 */
function markStoppedToolCalls(message: ResearchUIMessage): ResearchUIMessage {
  if (message.role !== "assistant") return message;
  return {
    ...message,
    parts: message.parts.map((part) =>
      part.type === `tool-${ANALYZE_RESEARCH_TOPIC}` &&
      (part.state === "input-streaming" || part.state === "input-available")
        ? { type: "text", text: STOPPED_TOOL_NOTE }
        : part,
    ),
  };
}

function messageLength(message: ResearchUIMessage) {
  return message.parts.reduce(
    (total, part) => total + (part.type === "text" ? part.text.length : 0),
    0,
  );
}

export async function POST(req: Request) {
  if (!process.env.OPENROUTER_API_KEY) {
    return textError(
      "The assistant is not configured: OPENROUTER_API_KEY is missing on the server.",
      503,
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return textError("Request body must be valid JSON.", 400);
  }

  const validation = await safeValidateUIMessages<ResearchUIMessage>({
    messages: repairToolOutputs((body as { messages?: unknown } | null)?.messages),
    tools: researchTools,
  });
  if (!validation.success) {
    return textError("Request must include a valid messages array.", 400);
  }

  // System instructions come only from the server config, never from the client.
  const messages = validation.data.filter(
    (message) => message.role === "user" || message.role === "assistant",
  );

  if (messages.length === 0 || messages.at(-1)?.role !== "user") {
    return textError("The last message must be from the user.", 400);
  }
  if (messages.length > CHAT_LIMITS.maxMessages) {
    return textError(
      `Conversations are limited to ${CHAT_LIMITS.maxMessages} messages. Reload the page to start a new one.`,
      413,
    );
  }
  if (messages.some((message) => messageLength(message) > CHAT_LIMITS.maxMessageChars)) {
    return textError(
      `Messages are limited to ${CHAT_LIMITS.maxMessageChars} characters.`,
      413,
    );
  }

  // Test-only failure injection; always undefined in normal production builds.
  const sabotaged = sabotageResponse(req);
  if (sabotaged) return sabotaged;

  const result = streamText({
    model: openrouter(AI_MODEL_ID),
    instructions: SYSTEM_PROMPT,
    // Any remaining tool call without a result is dropped instead of failing the turn.
    messages: await convertToModelMessages(messages.map(markStoppedToolCalls), {
      tools: researchTools,
      ignoreIncompleteToolCalls: true,
    }),
    tools: researchTools,
    stopWhen: isStepCount(MAX_STEPS),
    ...GENERATION_CONFIG,
    providerOptions: { openrouter: OPENROUTER_PROVIDER_OPTIONS },
    experimental_transform: smoothStream(STREAM_SMOOTHING),
    // Aborts the OpenRouter request when the client stops or disconnects.
    abortSignal: req.signal,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream<typeof researchTools, ResearchUIMessage>({
      stream: result.stream,
      tools: researchTools,
      onError: (error) => {
        console.error("[api/chat] stream error:", error);
        return toClientErrorMessage(error);
      },
    }),
    // Drains the stream server-side so aborts are handled cleanly.
    consumeSseStream: consumeStream,
  });
}
