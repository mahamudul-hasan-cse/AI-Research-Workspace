import type { Metadata } from "next";
import { Chat } from "@/components/assistant/chat";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Assistant" };

export default function AssistantPage() {
  return (
    <PageShell
      title="Assistant"
      description="Explore topics, organize ideas, and plan research directions with the AI research assistant."
    >
      <Chat />
    </PageShell>
  );
}
