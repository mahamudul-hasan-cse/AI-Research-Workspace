import { PageShell } from "@/components/page-shell";

export default function AssistantLoading() {
  return (
    <PageShell
      title="Assistant"
      description="Explore topics, organize ideas, and plan research directions with the AI research assistant."
    >
      <div
        aria-busy="true"
        aria-label="Loading the research assistant"
        className="flex h-[calc(100dvh-15rem)] min-h-[20rem] flex-col overflow-hidden rounded-card border border-border bg-surface sm:h-[calc(100dvh-17rem)]"
      >
        <div aria-hidden="true" className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
          <span className="size-11 rounded-full bg-surface-muted motion-safe:animate-pulse" />
          <span className="h-3 w-48 max-w-full rounded-full bg-surface-muted motion-safe:animate-pulse" />
          <span className="h-2.5 w-64 max-w-full rounded-full bg-surface-muted motion-safe:animate-pulse" />
        </div>
        <div aria-hidden="true" className="flex gap-2 border-t border-border p-3 sm:p-4">
          <span className="h-11 flex-1 rounded-lg bg-surface-muted motion-safe:animate-pulse" />
          <span className="h-11 w-16 rounded-lg bg-surface-muted motion-safe:animate-pulse" />
        </div>
      </div>
    </PageShell>
  );
}
