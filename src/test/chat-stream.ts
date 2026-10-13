import type { UIMessageChunk } from "ai";
import { vi, type Mock } from "vitest";

/**
 * A /api/chat response the test drives by hand: nothing reaches the client
 * until the test pushes a chunk, so every intermediate UI state is observable.
 * Chunks use the AI SDK UI message stream protocol (SSE), like the real route.
 */
export function createChatStream() {
  const encoder = new TextEncoder();
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });
  const write = (line: string) => controller.enqueue(encoder.encode(`data: ${line}\n\n`));

  return {
    response: new Response(body, {
      status: 200,
      headers: {
        "content-type": "text/event-stream",
        "x-vercel-ai-ui-message-stream": "v1",
      },
    }),
    send(chunk: UIMessageChunk) {
      write(JSON.stringify(chunk));
    },
    /** Starts an assistant message with one text part, ready for `delta()`. */
    begin(textId = "t1") {
      write(JSON.stringify({ type: "start" } satisfies UIMessageChunk));
      write(JSON.stringify({ type: "start-step" } satisfies UIMessageChunk));
      write(JSON.stringify({ type: "text-start", id: textId } satisfies UIMessageChunk));
    },
    delta(text: string, textId = "t1") {
      write(JSON.stringify({ type: "text-delta", id: textId, delta: text } satisfies UIMessageChunk));
    },
    /** Ends the text part and the message, then closes the stream. */
    finish(textId = "t1") {
      write(JSON.stringify({ type: "text-end", id: textId } satisfies UIMessageChunk));
      write(JSON.stringify({ type: "finish-step" } satisfies UIMessageChunk));
      write(JSON.stringify({ type: "finish" } satisfies UIMessageChunk));
      write("[DONE]");
      controller.close();
    },
    /** Sends a stream error the way /api/chat reports a mid-response failure. */
    fail(errorText: string) {
      write(JSON.stringify({ type: "error", errorText } satisfies UIMessageChunk));
      controller.close();
    },
  };
}

export type ChatStream = ReturnType<typeof createChatStream>;

/** Replaces global fetch with a mock that answers each chat request with the next response. */
export function mockChatResponses(...responses: (Response | ChatStream)[]): Mock<typeof fetch> {
  const queue = [...responses];
  const fetchMock = vi.fn<typeof fetch>(async () => {
    const next = queue.shift();
    if (!next) throw new Error("Unexpected extra chat request in test");
    return next instanceof Response ? next : next.response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

type SentMessage = { role: string; parts: { type: string; text?: string }[] };

/** The messages array a mocked chat request sent to /api/chat. */
export function sentMessages(fetchMock: Mock<typeof fetch>, call: number): SentMessage[] {
  const init = fetchMock.mock.calls[call]?.[1];
  const body = JSON.parse(String(init?.body)) as { messages: SentMessage[] };
  return body.messages;
}
