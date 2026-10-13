import { connection } from "next/server";
import { buildHealthPayload } from "@/lib/health";

export async function GET() {
  await connection();

  return Response.json(buildHealthPayload(), {
    headers: { "Cache-Control": "no-store" },
  });
}
