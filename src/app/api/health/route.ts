import { connection } from "next/server";
import type { HealthPayload } from "@/lib/health";

export async function GET() {
  await connection();

  const payload: HealthPayload = {
    status: "ok",
    service: "ai-research-workspace",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV ?? "unknown",
  };

  return Response.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
