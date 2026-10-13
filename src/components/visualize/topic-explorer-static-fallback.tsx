import {
  getNodeById,
  NODE_KIND_LABELS,
  type ResearchTopicGraph,
} from "@/lib/visualize/topic-graph-data";

type TopicExplorerStaticFallbackProps = {
  graph: ResearchTopicGraph;
  selectedId: string;
};

/** Textual map when WebGL is unavailable — same data as the 3D scene. */
export function TopicExplorerStaticFallback({
  graph,
  selectedId,
}: TopicExplorerStaticFallbackProps) {
  const central = graph.nodes.find((node) => node.kind === "topic");
  const satellites = graph.nodes.filter((node) => node.kind !== "topic");
  const selected = getNodeById(graph, selectedId);

  return (
    <div
      role="img"
      aria-label={`Research map for ${graph.label}. Central topic with ${satellites.length} connected nodes.`}
      className="flex h-full min-h-[min(50vh,22rem)] min-w-0 flex-col justify-center rounded-card bg-surface-muted px-4 py-6"
    >
      <p className="text-center text-sm font-medium">Static research map</p>
      <p className="mt-1 text-center text-xs text-muted [overflow-wrap:anywhere]">
        {graph.label}
      </p>
      {central ? (
        <div className="mx-auto mt-6 max-w-md rounded-lg border-2 border-accent bg-accent-soft px-4 py-3 text-center text-sm font-semibold text-accent">
          {central.title}
        </div>
      ) : null}
      <ul className="mx-auto mt-4 grid max-w-md gap-2 sm:grid-cols-2">
        {satellites.map((node) => {
          const active = node.id === selectedId;
          return (
            <li
              key={node.id}
              className={`rounded-md border px-3 py-2 text-xs ${
                active ? "border-accent bg-surface font-medium" : "border-border bg-surface/80"
              }`}
            >
              <span className="font-semibold uppercase tracking-wide text-muted">
                {NODE_KIND_LABELS[node.kind]}
              </span>
              <span className="mt-0.5 block [overflow-wrap:anywhere]">{node.title}</span>
            </li>
          );
        })}
      </ul>
      {selected ? (
        <p className="mx-auto mt-4 max-w-md text-center text-xs text-muted">
          Currently selected: {NODE_KIND_LABELS[selected.kind]} — {selected.title}
        </p>
      ) : null}
    </div>
  );
}
