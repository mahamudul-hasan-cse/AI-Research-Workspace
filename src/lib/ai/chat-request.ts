import { z } from "zod";
import { CHAT_LIMITS } from "./chat-limits";

export class ChatRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ChatRequestError";
  }
}

const partSchema = z.looseObject({
  type: z.enum(["text", "reasoning", "step-start", "tool-analyzeResearchTopic"]),
});

// Preflight before the SDK's full, tool-aware validation. File/URL parts are
// intentionally unsupported: this chat has no uploads or external source fetches.
const envelopeSchema = z.object({
  messages: z.array(z.object({
    id: z.string().min(1).max(128),
    role: z.enum(["user", "assistant"]),
    parts: z.array(partSchema).min(1).max(CHAT_LIMITS.maxParts),
  })).min(1).max(CHAT_LIMITS.maxMessages),
});

/** Bounds bytes as they arrive, including chunked bodies without Content-Length. */
export async function readChatRequest(req: Request) {
  if (req.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new ChatRequestError("Content-Type must be application/json.", 415);
  }
  const declaredSize = req.headers.get("content-length");
  if (declaredSize && (!/^\d+$/.test(declaredSize) || Number(declaredSize) > CHAT_LIMITS.maxBodyBytes)) {
    throw new ChatRequestError("Request body is limited to 256 KiB.", 413);
  }
  if (!req.body) throw new ChatRequestError("Request body must be valid JSON.", 400);

  const reader = req.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0;
  let json = "";
  let body: unknown;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > CHAT_LIMITS.maxBodyBytes) {
        void reader.cancel().catch(() => {});
        throw new ChatRequestError("Request body is limited to 256 KiB.", 413);
      }
      json += decoder.decode(value, { stream: true });
    }
    body = JSON.parse(json + decoder.decode());
  } catch (error) {
    if (error instanceof ChatRequestError) throw error;
    throw new ChatRequestError("Request body must be valid UTF-8 JSON.", 400);
  } finally {
    reader.releaseLock();
  }

  if (typeof body === "object" && body !== null && "messages" in body &&
      Array.isArray(body.messages) && body.messages.length > CHAT_LIMITS.maxMessages) {
    throw new ChatRequestError("Conversations are limited to 50 messages. Reload to start a new one.", 413);
  }
  const parsed = envelopeSchema.safeParse(body);
  if (!parsed.success) {
    throw new ChatRequestError("Request must include valid user/assistant messages and supported parts.", 400);
  }
  const messages = parsed.data.messages;
  if (messages.at(-1)?.role !== "user") {
    throw new ChatRequestError("The last message must be from the user.", 400);
  }
  for (const message of messages) {
    if (message.role === "user" && message.parts.some((part) => part.type !== "text")) {
      throw new ChatRequestError("User messages must contain text only.", 400);
    }
    const textParts = message.parts.filter((part) => part.type === "text" || part.type === "reasoning");
    if (textParts.some((part) => typeof part.text !== "string")) {
      throw new ChatRequestError("Text parts must contain a text string.", 400);
    }
    const text = textParts.map((part) => part.text as string).join("");
    if (text.length > CHAT_LIMITS.maxMessageChars) {
      throw new ChatRequestError("Messages are limited to 8000 characters.", 413);
    }
    if (message.role === "user" && !text.trim()) {
      throw new ChatRequestError("User messages must not be empty.", 400);
    }
  }
  return messages;
}
