// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => vi.unstubAllEnvs());

describe("production test-hook guard", () => {
  it("inlines test hooks off in an ordinary Vercel build", async () => {
    vi.resetModules();
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("NEXT_PUBLIC_ENABLE_CHAT_SABOTAGE", "0");
    const { default: config } = await import("../../next.config");
    expect(config.env?.NEXT_PUBLIC_ENABLE_CHAT_SABOTAGE).toBe("0");
  });

  it("refuses to load a Vercel config with test hooks enabled", async () => {
    vi.resetModules();
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("NEXT_PUBLIC_ENABLE_CHAT_SABOTAGE", "1");
    await expect(import("../../next.config")).rejects.toThrow("must not be enabled on Vercel");
  });

  it("still permits an explicitly enabled local browser-test build", async () => {
    vi.resetModules();
    vi.stubEnv("VERCEL", "0");
    vi.stubEnv("NEXT_PUBLIC_ENABLE_CHAT_SABOTAGE", "1");
    const { default: config } = await import("../../next.config");
    expect(config.env?.NEXT_PUBLIC_ENABLE_CHAT_SABOTAGE).toBe("1");
  });
});
