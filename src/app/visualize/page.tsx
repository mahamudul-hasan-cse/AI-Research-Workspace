import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { TopicExplorer } from "@/components/visualize/topic-explorer";

export const metadata: Metadata = {
  title: "Visualize",
  description:
    "Explore a research topic and its connected sources, questions, notes, and findings in 3D.",
};

export default function VisualizePage() {
  return (
    <PageShell
      title="3D Research Topic Explorer"
      description="See how a thesis topic connects to sources, open questions, notes, findings, and related themes. The 3D view is supplemental — full details for the selected node always appear in the panel beside the canvas."
    >
      <TopicExplorer />
    </PageShell>
  );
}
