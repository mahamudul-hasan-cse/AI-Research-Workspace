export type HealthPayload = {
  status: "ok";
  service: string;
  timestamp: string;
  uptimeSeconds: number;
  nodeVersion: string;
  environment: string;
};

/**
 * Base URL the server uses to call its own route handlers. Resolved from
 * configuration rather than the incoming Host header so a spoofed header
 * cannot redirect server-side requests.
 */
export function getAppUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
