// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { checkChatRateLimit } from "@/lib/ai/chat-rate-limit";
import { sabotageResponse } from "@/lib/testing/chat-sabotage-server";
import { streamText } from "ai";

vi.mock("@/lib/ai/chat-rate-limit", () => ({ checkChatRateLimit: vi.fn() }));
vi.mock("@/lib/testing/chat-sabotage-server", () => ({ sabotageResponse: vi.fn() }));
vi.mock("ai", async (importOriginal) => ({
  ...await importOriginal<typeof import("ai")>(),
  streamText: vi.fn(() => { throw new Error("A route test must not call a model."); }),
}));

afterEach(() => vi.unstubAllEnvs());

const user = { id: "u1", role: "user", parts: [{ type: "text", text: "Analyze microplastics in fish" }] };
const request = (messages: unknown = [user]) => new Request("http://localhost/api/chat", {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages }),
});

beforeEach(() => {
  vi.stubEnv("OPENROUTER_API_KEY", "test-placeholder");
  vi.mocked(checkChatRateLimit).mockReturnValue({ allowed: true, retryAfter: 0 });
  vi.mocked(sabotageResponse).mockImplementation(() => new Response("scripted response"));
});

describe("chat route admission before model work", () => {
  it("reports missing configuration without starting a stream", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    expect((await POST(request())).status).toBe(503);
    expect(streamText).not.toHaveBeenCalled();
  });

  it("returns 429 and Retry-After before reading an abusive request", async () => {
    vi.mocked(checkChatRateLimit).mockReturnValue({ allowed: false, retryAfter: 27 });
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("27");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(streamText).not.toHaveBeenCalled();
  });

  it("rejects SDK-invalid tool states even when the outer envelope is valid", async () => {
    const response = await POST(request([
      { id: "a1", role: "assistant", parts: [{ type: "tool-analyzeResearchTopic", toolCallId: "t1", state: "invented" }] },
      user,
    ]));
    expect(response.status).toBe(400);
    expect(streamText).not.toHaveBeenCalled();
  });

  it.each(["input-streaming", "input-available", "output-available"])(
    "preserves continuation after a stopped or malformed tool result (%s)", async (state) => {
      const response = await POST(request([
        { id: "a1", role: "assistant", parts: [{
          type: "tool-analyzeResearchTopic", toolCallId: "t1", state,
          input: { topic: "microplastics" },
          ...(state === "output-available" ? { output: { researchScore: "invalid" } } : {}),
        }] },
        user,
      ]));
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("scripted response");
      expect(streamText).not.toHaveBeenCalled();
    },
  );
});
