import {
  DEFAULT_SELECTED_NODE_ID,
  DEMO_TOPIC_GRAPH,
  getNodeById,
  NODE_KIND_LABELS,
  type ResearchGraphNode,
  type ResearchTopicGraph,
} from "@/lib/visualize/topic-graph-data";

type TopicExplorerPanelProps = {
  graph?: ResearchTopicGraph;
  selectedId: string;
  onSelect: (id: string) => void;
  /** When true, notes that continuous 3D motion is reduced. */
  reducedMotion?: boolean;
  /** When true, the 3D view is unavailable and this panel is the primary view. */
  webglUnavailable?: boolean;
};

function NodePickerButton({
  node,
  selected,
  onSelect,
}: {
  node: ResearchGraphNode;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const kindLabel = NODE_KIND_LABELS[node.kind];
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        aria-pressed={selected}
        className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
          selected
            ? "border-accent bg-accent-soft font-medium text-accent"
            : "border-border bg-surface hover:bg-surface-muted"
        }`}
      >
        <span className="block text-xs font-semibold tracking-wide text-muted uppercase">
          {kindLabel}
        </span>
        <span className="mt-0.5 block [overflow-wrap:anywhere]">{node.title}</span>
      </button>
    </li>
  );
}

export function TopicExplorerPanel({
  graph = DEMO_TOPIC_GRAPH,
  selectedId,
  onSelect,
  reducedMotion = false,
  webglUnavailable = false,
}: TopicExplorerPanelProps) {
  const selected = getNodeById(graph, selectedId) ?? getNodeById(graph, DEFAULT_SELECTED_NODE_ID)!;

  return (
    <aside
      aria-label="Research node details"
      className="flex min-h-0 min-w-0 flex-col gap-4 rounded-card border border-border bg-surface p-4"
    >
      {webglUnavailable ? (
        <p role="status" className="text-sm text-muted">
          WebGL is not available in this browser. Use the list below to explore the same
          research map in text form.
        </p>
      ) : null}
      {reducedMotion ? (
        <p role="status" className="text-sm text-muted">
          Reduced motion is on: 3D damping is off and camera moves are minimized.
        </p>
      ) : null}

      <div
        role="region"
        aria-labelledby="selected-node-heading"
        aria-live="polite"
        className="min-w-0 rounded-lg border border-border bg-surface-muted p-3"
      >
        <p id="selected-node-heading" className="text-xs font-semibold tracking-wide text-muted uppercase">
          Selected node
        </p>
        <p className="mt-1 text-xs font-medium text-muted">{NODE_KIND_LABELS[selected.kind]}</p>
        <h2 className="mt-1 text-base font-semibold [overflow-wrap:anywhere]">{selected.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted [overflow-wrap:anywhere]">
          {selected.details}
        </p>
      </div>

      <div className="min-h-0 flex-1">
        <h3 className="text-sm font-semibold">All nodes</h3>
        <p className="mt-1 text-xs text-muted">
          Select a node here or in the 3D view. Selection is shared between the canvas and this list.
        </p>
        <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto overscroll-contain sm:max-h-80">
          {graph.nodes.map((node) => (
            <NodePickerButton
              key={node.id}
              node={node}
              selected={node.id === selectedId}
              onSelect={onSelect}
            />
          ))}
        </ul>
      </div>
    </aside>
  );
}
