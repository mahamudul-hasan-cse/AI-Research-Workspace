// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { CHAT_RATE_LIMIT, createChatRateLimiter } from "./chat-rate-limit";

afterEach(() => vi.unstubAllEnvs());

describe("chat burst limiter", () => {
  it("atomically admits ten requests per Vercel IP, then returns a bounded retry delay", () => {
    vi.stubEnv("VERCEL", "1");
    const admit = createChatRateLimiter();
    const headers = new Headers({ "x-vercel-forwarded-for": "192.0.2.1" });
    for (let i = 0; i < 10; i++) expect(admit(headers, 1000).allowed).toBe(true);
    expect(admit(headers, 1500)).toEqual({ allowed: false, retryAfter: 60 });
    expect(admit(headers, 61_000).allowed).toBe(true);
  });

  it("isolates real Vercel clients and ignores spoofable forwarded headers elsewhere", () => {
    vi.stubEnv("VERCEL", "0");
    const admit = createChatRateLimiter();
    for (let i = 0; i < CHAT_RATE_LIMIT.sharedRequests; i++) {
      expect(admit(new Headers({ "x-forwarded-for": `192.0.2.${i}`, "x-vercel-forwarded-for": `192.0.2.${i}` }), 0).allowed).toBe(true);
    }
    expect(admit(new Headers(), 1).allowed).toBe(false);
    vi.stubEnv("VERCEL", "1");
    expect(admit(new Headers({ "x-vercel-forwarded-for": "192.0.2.250" }), 1).allowed).toBe(true);
  });

  it("rejects new identities at capacity instead of resetting active clients", () => {
    vi.stubEnv("VERCEL", "1");
    const admit = createChatRateLimiter();
    for (let i = 0; i < CHAT_RATE_LIMIT.maxClients; i++) {
      expect(admit(new Headers({ "x-vercel-forwarded-for": `2001:db8::${i.toString(16)}` }), 0).allowed).toBe(true);
    }
    const headers = new Headers({ "x-vercel-forwarded-for": "192.0.2.1" });
    expect(admit(headers, 0).allowed).toBe(false);
    expect(admit(headers, 60_000).allowed).toBe(true);
  });
});
