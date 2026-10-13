/** Shown while the Three.js bundle loads — keeps layout stable and non-empty. */
export function TopicExplorerCanvasShell({ loading }: { loading?: boolean }) {
  return (
    <div
      role="status"
      aria-busy={loading ?? true}
      className="flex h-full min-h-[min(50vh,22rem)] w-full min-w-0 flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface-muted px-4 py-8 text-center"
    >
      <p className="text-sm font-medium">Loading 3D scene…</p>
      <p className="mt-2 max-w-sm text-xs text-muted">
        The interactive view loads separately so the rest of the app stays fast. You can
        still use the node list on the right while waiting.
      </p>
      <div aria-hidden="true" className="mt-6 grid w-full max-w-xs grid-cols-3 gap-2 opacity-60">
        <span className="col-start-2 h-3 rounded-full bg-border motion-safe:animate-pulse" />
        <span className="h-2 rounded-full bg-border motion-safe:animate-pulse" />
        <span className="col-start-3 h-2 rounded-full bg-border motion-safe:animate-pulse" />
        <span className="col-start-1 h-2 rounded-full bg-border motion-safe:animate-pulse" />
        <span className="col-start-2 h-4 rounded-full bg-accent/40 motion-safe:animate-pulse" />
        <span className="h-2 rounded-full bg-border motion-safe:animate-pulse" />
      </div>
    </div>
  );
}
