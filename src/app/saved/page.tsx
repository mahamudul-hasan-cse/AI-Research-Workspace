import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { PlaceholderGrid } from "@/components/placeholder-card";

export const metadata: Metadata = { title: "Saved" };

export default function SavedPage() {
  return (
    <PageShell
      title="Saved"
      description="Findings, answers, and notes you chose to keep."
    >
      <PlaceholderGrid
        items={[
          {
            title: "Saved answers",
            description: "Assistant responses you bookmarked.",
          },
          {
            title: "Notes",
            description: "Your own notes and highlights.",
          },
          {
            title: "Collections",
            description: "Organize saved items into groups.",
          },
        ]}
      />
    </PageShell>
  );
}
