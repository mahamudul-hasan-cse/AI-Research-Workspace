import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { PlaceholderGrid } from "@/components/placeholder-card";

export const metadata: Metadata = { title: "Sources" };

export default function SourcesPage() {
  return (
    <PageShell
      title="Sources"
      description="Collect the papers, links, and documents behind your research."
    >
      <PlaceholderGrid
        items={[
          {
            title: "Source library",
            description: "All sources added to your workspaces.",
          },
          {
            title: "Add a source",
            description: "Import a link, document, or note.",
          },
          {
            title: "Citations",
            description: "Track where each finding came from.",
          },
        ]}
      />
    </PageShell>
  );
}
