import type { Metadata } from "next";
import { Suspense } from "react";
import { HealthStatus, HealthStatusSkeleton } from "@/components/health-status";
import { PageShell } from "@/components/page-shell";
import { RefreshButton } from "@/components/refresh-button";

export const metadata: Metadata = { title: "Health" };

export default function HealthPage() {
  return (
    <PageShell
      title="Health"
      description="The server fetches the local /api/health route handler on every request to prove data fetching works end to end."
    >
      <div className="max-w-2xl space-y-4">
        <Suspense fallback={<HealthStatusSkeleton />}>
          <HealthStatus />
        </Suspense>
        <div className="flex flex-wrap items-center gap-3">
          <RefreshButton />
          <a
            href="/api/health"
            className="text-sm font-medium text-accent hover:underline"
          >
            View raw JSON
          </a>
        </div>
      </div>
    </PageShell>
  );
}
