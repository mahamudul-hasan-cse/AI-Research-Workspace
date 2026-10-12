import { connection } from "next/server";
import { getAppUrl, type HealthPayload } from "@/lib/health";

type HealthResult =
  | { ok: true; data: HealthPayload; latencyMs: number; url: string }
  | { ok: false; error: string; url: string };

async function checkHealth(): Promise<HealthResult> {
  await connection();
  const url = `${getAppUrl()}/api/health`;
  const started = performance.now();

  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}`, url };
    }
    const data = (await res.json()) as HealthPayload;
    return {
      ok: true,
      data,
      latencyMs: Math.round(performance.now() - started),
      url,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
      url,
    };
  }
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:justify-between">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-mono text-sm break-all">{value}</dd>
    </div>
  );
}

export async function HealthStatus() {
  const result = await checkHealth();

  if (!result.ok) {
    return (
      <div className="rounded-card border border-danger bg-danger-soft p-5">
        <p className="font-semibold text-danger">Health check failed</p>
        <dl className="mt-3 divide-y divide-border">
          <Row label="Endpoint" value={result.url} />
          <Row label="Error" value={result.error} />
        </dl>
      </div>
    );
  }

  const { data } = result;
  return (
    <div className="rounded-card border border-success bg-success-soft p-5">
      <p className="flex items-center gap-2 font-semibold text-success">
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-success" />
        All systems operational
      </p>
      <dl className="mt-3 divide-y divide-border">
        <Row label="Status" value={data.status} />
        <Row label="Service" value={data.service} />
        <Row label="Server time" value={data.timestamp} />
        <Row label="Uptime" value={`${data.uptimeSeconds}s`} />
        <Row label="Node.js" value={data.nodeVersion} />
        <Row label="Environment" value={data.environment} />
        <Row label="Round-trip latency" value={`${result.latencyMs} ms`} />
        <Row label="Endpoint" value={result.url} />
      </dl>
    </div>
  );
}

export function HealthStatusSkeleton() {
  return (
    <div className="animate-pulse rounded-card border border-border bg-surface p-5">
      <div className="h-5 w-48 rounded bg-surface-muted" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-4 rounded bg-surface-muted" />
        ))}
      </div>
    </div>
  );
}
