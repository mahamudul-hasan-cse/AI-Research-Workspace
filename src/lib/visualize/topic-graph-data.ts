/** Categories of nodes orbiting the central research topic. */
export type ResearchNodeKind =
  | "topic"
  | "source"
  | "question"
  | "note"
  | "finding"
  | "related";

export type ResearchGraphNode = {
  id: string;
  kind: ResearchNodeKind;
  title: string;
  details: string;
  position: [number, number, number];
};

export type ResearchTopicGraph = {
  /** Short label for the graph (used in headings and fallbacks). */
  label: string;
  nodes: ResearchGraphNode[];
};

export const NODE_KIND_LABELS: Record<ResearchNodeKind, string> = {
  topic: "Central topic",
  source: "Source",
  question: "Question",
  note: "Note",
  finding: "Finding",
  related: "Related topic",
};

const ORBIT_RADIUS = 3.2;

function satellitePosition(index: number, count: number): [number, number, number] {
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
  const y = ((index % 3) - 1) * 0.35;
  return [Math.cos(angle) * ORBIT_RADIUS, y, Math.sin(angle) * ORBIT_RADIUS];
}

/** Deterministic demo graph for the capstone — no API or backend. */
export const DEMO_TOPIC_GRAPH: ResearchTopicGraph = {
  label: "Microplastics in freshwater fish (South Asia thesis)",
  nodes: [
    {
      id: "topic-central",
      kind: "topic",
      title: "Microplastics in freshwater fish (South Asia)",
      details:
        "Thesis focus: exposure routes, species sensitivity, and sampling gaps across river basins in Bangladesh and Nepal.",
      position: [0, 0, 0],
    },
    ...(
      [
        {
          id: "source-1",
          kind: "source" as const,
          title: "Foley et al. — global plastic inputs to oceans",
          details: "Baseline for how much plastic enters waterways; use for scale, not local counts.",
        },
        {
          id: "source-2",
          kind: "source" as const,
          title: "WHO drinking-water microplastics review",
          details: "Health framing; compare freshwater fish exposure to drinking-water guidelines.",
        },
        {
          id: "question-1",
          kind: "question" as const,
          title: "Which species are most exposed near urban outfalls?",
          details: "Compare omnivorous vs filter-feeding fish in the same reach.",
        },
        {
          id: "question-2",
          kind: "question" as const,
          title: "What particle sizes appear in gut tissue vs gills?",
          details: "Informs lab methods (FTIR vs visual counts) and sampling prep.",
        },
        {
          id: "note-1",
          kind: "note" as const,
          title: "Field season constraints",
          details: "Monsoon access limits northern sites; prioritize two basins with existing water-quality data.",
        },
        {
          id: "finding-1",
          kind: "finding" as const,
          title: "Literature gap on South Asian rivers",
          details: "Most fish studies are marine or European; few paired sediment + tissue samples in this region.",
        },
        {
          id: "finding-2",
          kind: "finding" as const,
          title: "Methods cluster around FTIR",
          details: "Polymer ID is common; standardize reporting units (particles per gram).",
        },
        {
          id: "related-1",
          kind: "related" as const,
          title: "Sediment-bound microplastics",
          details: "Benthic pathways may dominate for bottom feeders — link to sediment sampling design.",
        },
        {
          id: "related-2",
          kind: "related" as const,
          title: "Food-web transfer to humans",
          details: "Optional chapter: consumption patterns and cooking effects on particle counts.",
        },
      ] as const
    ).map((node, index, array) => ({
      ...node,
      position: satellitePosition(index, array.length),
    })),
  ],
};

export function getNodeById(graph: ResearchTopicGraph, id: string): ResearchGraphNode | undefined {
  return graph.nodes.find((node) => node.id === id);
}

export const DEFAULT_SELECTED_NODE_ID = DEMO_TOPIC_GRAPH.nodes[0].id;
