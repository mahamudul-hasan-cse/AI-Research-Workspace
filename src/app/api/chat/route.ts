import { google } from "@ai-sdk/google";
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
  GEMINI_MODEL_ID,
  GENERATION_CONFIG,
  GOOGLE_PROVIDER_OPTIONS,
  MAX_STEPS,
  STREAM_SMOOTHING,
  SYSTEM_PROMPT,
} from "@/lib/ai/config";
import { toClientErrorMessage } from "@/lib/ai/errors";
import { researchTools, type ResearchUIMessage } from "@/lib/ai/tools";

export const maxDuration = 60;

// Plain-text bodies: the chat client surfaces the response body as the error message.
function textError(message: string, status: number) {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

function messageLength(message: ResearchUIMessage) {
  return message.parts.reduce(
    (total, part) => total + (part.type === "text" ? part.text.length : 0),
    0,
  );
}

export async function POST(req: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return textError(
      "The assistant is not configured: GOOGLE_GENERATIVE_AI_API_KEY is missing on the server.",
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
    messages: (body as { messages?: unknown } | null)?.messages,
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

  const result = streamText({
    model: google(GEMINI_MODEL_ID),
    instructions: SYSTEM_PROMPT,
    // Tool calls cut off by Stop have no result; drop them instead of failing the turn.
    messages: await convertToModelMessages(messages, {
      tools: researchTools,
      ignoreIncompleteToolCalls: true,
    }),
    tools: researchTools,
    stopWhen: isStepCount(MAX_STEPS),
    ...GENERATION_CONFIG,
    providerOptions: { google: GOOGLE_PROVIDER_OPTIONS },
    experimental_transform: smoothStream(STREAM_SMOOTHING),
    // Aborts the Gemini request when the client stops or disconnects.
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
