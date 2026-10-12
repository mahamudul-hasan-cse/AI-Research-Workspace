import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { PlaceholderGrid } from "@/components/placeholder-card";

export const metadata: Metadata = { title: "Assistant" };

export default function AssistantPage() {
  return (
    <PageShell
      title="Assistant"
      description="Ask questions and get help working through your research."
    >
      <PlaceholderGrid
        items={[
          {
            title: "Conversation",
            description: "The assistant chat will appear here.",
          },
          {
            title: "Context",
            description: "Choose which sources the assistant can use.",
          },
          {
            title: "Suggested prompts",
            description: "Starting points for common research tasks.",
          },
        ]}
      />
    </PageShell>
  );
}
