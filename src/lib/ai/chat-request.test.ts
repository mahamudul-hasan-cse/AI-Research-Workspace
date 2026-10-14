// @vitest-environment node
import { describe, expect, it } from "vitest";
import { CHAT_LIMITS } from "./chat-limits";
import { readChatRequest } from "./chat-request";

const message = { id: "u1", role: "user", parts: [{ type: "text", text: "Research freshwater fish" }] };
const request = (body: unknown, headers: HeadersInit = {}) => new Request("http://localhost/api/chat", {
  method: "POST",
  headers: { "content-type": "application/json", ...headers },
  body: JSON.stringify(body),
});

describe("chat input boundaries", () => {
  it("accepts the real transport envelope and strips transport-only properties", async () => {
    expect(await readChatRequest(request({ id: "chat", trigger: "submit-message", messages: [message] }))).toEqual([message]);
  });

  it.each([
    { messages: [{ ...message, role: "system" }] },
    { messages: [{ ...message, role: "developer" }] },
    { messages: [{ ...message, role: "assistant" }] },
    { messages: [{ ...message, parts: [{ type: "text", text: "  " }] }] },
    { messages: [{ ...message, parts: [{ type: "text", text: 42 }] }] },
    { messages: [{ ...message, parts: [{ type: "file", url: "https://example.com/private" }] }] },
    { messages: [{ ...message, parts: [{ type: "tool-analyzeResearchTopic", state: "input-available" }] }] },
    { messages: [{ ...message, parts: Array.from({ length: 33 }, () => message.parts[0]) }] },
    { messages: [] }, null,
  ])("rejects invalid roles, empty text, unsupported parts and bad envelopes: %j", async (body) => {
    await expect(readChatRequest(request(body))).rejects.toMatchObject({ status: 400 });
  });

  it("counts all text parts together rather than allowing split-message bypasses", async () => {
    const parts = [0, 1].map(() => ({ type: "text", text: "x".repeat(4001) }));
    await expect(readChatRequest(request({ messages: [{ ...message, parts }] }))).rejects.toMatchObject({ status: 413 });
    await expect(readChatRequest(request({ messages: Array.from({ length: 51 }, () => message) }))).rejects.toMatchObject({ status: 413 });
  });

  it("rejects a declared oversize body before reading it", async () => {
    await expect(readChatRequest(request({ messages: [message] }, {
      "content-length": String(CHAT_LIMITS.maxBodyBytes + 1),
    }))).rejects.toMatchObject({ status: 413 });
  });

  it("bounds actual UTF-8 bytes without trusting Content-Length", async () => {
    const cases: HeadersInit[] = [{}, { "content-length": "1" }];
    for (const headers of cases) {
      await expect(readChatRequest(request({ extra: "é".repeat(CHAT_LIMITS.maxBodyBytes), messages: [message] }, headers)))
        .rejects.toMatchObject({ status: 413 });
    }
  });

  it("rejects malformed JSON and non-JSON content types", async () => {
    await expect(readChatRequest(new Request("http://localhost", {
      method: "POST", headers: { "content-type": "application/json" }, body: "{",
    }))).rejects.toMatchObject({ status: 400 });
    await expect(readChatRequest(request({ messages: [message] }, { "content-type": "text/plain" })))
      .rejects.toMatchObject({ status: 415 });
  });
});
