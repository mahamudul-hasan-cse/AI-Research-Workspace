import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { PlaceholderGrid } from "@/components/placeholder-card";

export const metadata: Metadata = { title: "History" };

export default function HistoryPage() {
  return (
    <PageShell
      title="History"
      description="Review past research sessions and activity."
    >
      <PlaceholderGrid
        items={[
          {
            title: "Session timeline",
            description: "A chronological view of your research sessions.",
          },
          {
            title: "Search history",
            description: "Find a previous question or result.",
          },
          {
            title: "Activity summary",
            description: "Highlights from recent work.",
          },
        ]}
      />
    </PageShell>
  );
}
