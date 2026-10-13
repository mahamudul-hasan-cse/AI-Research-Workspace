import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DEMO_TOPIC_GRAPH } from "@/lib/visualize/topic-graph-data";
import { TopicExplorerPanel } from "./topic-explorer-panel";

describe("TopicExplorerPanel", () => {
  it("shows selected node title and details in the DOM", () => {
    render(
      <TopicExplorerPanel
        selectedId="question-1"
        onSelect={() => {}}
      />,
    );

    expect(screen.getByRole("region", { name: /selected node/i })).toHaveTextContent(
      "Which species are most exposed near urban outfalls?",
    );
    expect(screen.getByText(/Compare omnivorous vs filter-feeding fish/)).toBeInTheDocument();
  });

  it("updates selection when a list button is pressed", async () => {
    const user = userEvent.setup();
    let selected = "topic-central";
    const { rerender } = render(
      <TopicExplorerPanel
        selectedId={selected}
        onSelect={(id) => {
          selected = id;
        }}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /WHO drinking-water microplastics review/i }),
    );
    rerender(
      <TopicExplorerPanel
        selectedId={selected}
        onSelect={(id) => {
          selected = id;
        }}
      />,
    );

    const region = screen.getByRole("region", { name: /selected node/i });
    expect(within(region).getByRole("heading", { level: 2 })).toHaveTextContent(
      "WHO drinking-water microplastics review",
    );
    expect(
      screen.getByRole("button", { name: /WHO drinking-water microplastics review/i }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("announces reduced motion and WebGL fallback status", () => {
    render(
      <TopicExplorerPanel
        selectedId="topic-central"
        onSelect={() => {}}
        reducedMotion
        webglUnavailable
      />,
    );
    expect(screen.getByText(/Reduced motion is on/i)).toBeInTheDocument();
    expect(screen.getByText(/WebGL is not available/i)).toBeInTheDocument();
  });

  it("lists every graph node as a selectable control", () => {
    render(
      <TopicExplorerPanel selectedId="topic-central" onSelect={() => {}} />,
    );
    expect(screen.getAllByRole("button")).toHaveLength(DEMO_TOPIC_GRAPH.nodes.length);
  });
});
