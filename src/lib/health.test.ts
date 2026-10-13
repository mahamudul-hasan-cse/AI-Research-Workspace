import { describe, expect, it } from "vitest";
import {
  buildHealthPayload,
  getAppUrl,
  getSelfFetchHeaders,
  readHealthResponse,
} from "./health";

describe("getAppUrl", () => {
  it("prefers an explicit APP_URL without a trailing slash", () => {
    expect(getAppUrl({ APP_URL: "https://example.com/", VERCEL_URL: "x.vercel.app" })).toBe(
      "https://example.com",
    );
  });

  it("uses the public production domain on Vercel production, not the protected deployment URL", () => {
    expect(
      getAppUrl({
        VERCEL_ENV: "production",
        VERCEL_PROJECT_PRODUCTION_URL: "my-app.vercel.app",
        VERCEL_URL: "my-app-abc123.vercel.app",
      }),
    ).toBe("https://my-app.vercel.app");
  });

  it("falls back to the deployment URL on previews", () => {
    expect(
      getAppUrl({
        VERCEL_ENV: "preview",
        VERCEL_PROJECT_PRODUCTION_URL: "my-app.vercel.app",
        VERCEL_URL: "my-app-abc123.vercel.app",
      }),
    ).toBe("https://my-app-abc123.vercel.app");
  });

  it("defaults to localhost on the configured port", () => {
    expect(getAppUrl({})).toBe("http://localhost:3000");
    expect(getAppUrl({ PORT: "3100" })).toBe("http://localhost:3100");
  });
});

describe("getSelfFetchHeaders", () => {
  it("adds the protection bypass header only when the secret is configured", () => {
    expect(getSelfFetchHeaders({})).toEqual({});
    expect(getSelfFetchHeaders({ VERCEL_AUTOMATION_BYPASS_SECRET: "s3cret" })).toEqual({
      "x-vercel-protection-bypass": "s3cret",
    });
  });
});

describe("readHealthResponse", () => {
  it("returns the payload for a JSON health response", async () => {
    const payload = buildHealthPayload();
    await expect(readHealthResponse(Response.json(payload))).resolves.toEqual(payload);
  });

  it("explains a redirect to the Vercel login page", async () => {
    const res = new Response(null, {
      status: 302,
      headers: { location: "https://vercel.com/sso-api?url=x" },
    });
    await expect(readHealthResponse(res)).rejects.toThrow(
      /Redirected \(HTTP 302\) to vercel\.com.*Deployment Protection/,
    );
  });

  it("reports an HTML page instead of failing on JSON parsing", async () => {
    const res = new Response("<!DOCTYPE html><html></html>", {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
    await expect(readHealthResponse(res)).rejects.toThrow(
      "Expected JSON from the health endpoint but received text/html; charset=utf-8.",
    );
  });

  it("reports a non-OK status", async () => {
    await expect(readHealthResponse(new Response("nope", { status: 503 }))).rejects.toThrow(
      "Health endpoint returned HTTP 503.",
    );
  });

  it("rejects JSON that is not a healthy payload", async () => {
    await expect(readHealthResponse(Response.json({ status: "down" }))).rejects.toThrow(
      /without status "ok"/,
    );
  });
});
