export type HealthPayload = {
  status: "ok";
  service: string;
  timestamp: string;
  uptimeSeconds: number;
  nodeVersion: string;
  environment: string;
};

/** Shared by the /api/health route handler so the payload has one definition. */
export function buildHealthPayload(): HealthPayload {
  return {
    status: "ok",
    service: "ai-research-workspace",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV ?? "unknown",
  };
}

type Env = Record<string, string | undefined>;

/**
 * Base URL the server uses to call its own route handlers. Resolved from
 * configuration rather than the incoming Host header so a spoofed header
 * cannot redirect server-side requests.
 *
 * On Vercel, the per-deployment VERCEL_URL sits behind Deployment Protection
 * (it redirects to a Vercel login page), so production prefers the project's
 * public production domain.
 */
export function getAppUrl(env: Env = process.env) {
  if (env.APP_URL) return env.APP_URL.replace(/\/$/, "");
  if (env.VERCEL_ENV === "production" && env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  return `http://localhost:${env.PORT ?? 3000}`;
}

/**
 * Lets the self-request through Vercel Deployment Protection on preview
 * deployments when "Protection Bypass for Automation" is enabled.
 */
export function getSelfFetchHeaders(env: Env = process.env): HeadersInit {
  const secret = env.VERCEL_AUTOMATION_BYPASS_SECRET;
  return secret ? { "x-vercel-protection-bypass": secret } : {};
}

/** Validates a /api/health response and explains anything that is not the expected JSON. */
export async function readHealthResponse(res: Response): Promise<HealthPayload> {
  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get("location") ?? "unknown location";
    const host = URL.canParse(location) ? new URL(location).host : location;
    throw new Error(
      `Redirected (HTTP ${res.status}) to ${host} instead of returning health data. ` +
        "The deployment URL is likely behind Vercel Deployment Protection; set APP_URL to the public domain.",
    );
  }
  if (!res.ok) {
    throw new Error(`Health endpoint returned HTTP ${res.status}.`);
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      `Expected JSON from the health endpoint but received ${contentType || "no content type"}.`,
    );
  }
  const data: unknown = await res.json();
  if (
    typeof data !== "object" ||
    data === null ||
    (data as { status?: unknown }).status !== "ok"
  ) {
    throw new Error("Health endpoint returned JSON without status \"ok\".");
  }
  return data as HealthPayload;
}
