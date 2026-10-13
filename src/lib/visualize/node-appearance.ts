import type { ResearchNodeKind } from "./topic-graph-data";

/** Visual radius in scene units (procedural spheres — no GLB assets). */
export function nodeRadius(kind: ResearchNodeKind) {
  return kind === "topic" ? 0.55 : 0.34;
}

/** Mesh tint; selection is also shown with scale and a ring, not color alone. */
export function nodeColor(kind: ResearchNodeKind): string {
  switch (kind) {
    case "topic":
      return "#2563eb";
    case "source":
      return "#059669";
    case "question":
      return "#d97706";
    case "note":
      return "#7c3aed";
    case "finding":
      return "#db2777";
    case "related":
      return "#0891b2";
  }
}
