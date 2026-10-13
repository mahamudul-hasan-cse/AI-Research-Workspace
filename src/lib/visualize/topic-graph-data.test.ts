import { describe, expect, it } from "vitest";
import { DEMO_TOPIC_GRAPH, getNodeById, NODE_KIND_LABELS } from "./topic-graph-data";

describe("DEMO_TOPIC_GRAPH", () => {
  it("includes one central topic and satellites for each research category", () => {
    const kinds = DEMO_TOPIC_GRAPH.nodes.map((node) => node.kind);
    expect(kinds.filter((kind) => kind === "topic")).toHaveLength(1);
    expect(kinds.filter((kind) => kind === "source").length).toBeGreaterThanOrEqual(2);
    expect(kinds.filter((kind) => kind === "question").length).toBeGreaterThanOrEqual(2);
    expect(kinds).toContain("note");
    expect(kinds.filter((kind) => kind === "finding").length).toBeGreaterThanOrEqual(2);
    expect(kinds.filter((kind) => kind === "related").length).toBeGreaterThanOrEqual(2);
  });

  it("keeps satellite nodes off the origin", () => {
    for (const node of DEMO_TOPIC_GRAPH.nodes) {
      if (node.kind === "topic") {
        expect(node.position).toEqual([0, 0, 0]);
      } else {
        const [x, , z] = node.position;
        expect(x * x + z * z).toBeGreaterThan(1);
      }
    }
  });

  it("resolves nodes by id", () => {
    const central = getNodeById(DEMO_TOPIC_GRAPH, "topic-central");
    expect(central?.title).toMatch(/Microplastics/);
    expect(NODE_KIND_LABELS[central!.kind]).toBe("Central topic");
  });
});
