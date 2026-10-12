import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { PlaceholderGrid } from "@/components/placeholder-card";

export const metadata: Metadata = { title: "Workspaces" };

export default function WorkspacesPage() {
  return (
    <PageShell
      title="Workspaces"
      description="Group related research into focused workspaces."
    >
      <PlaceholderGrid
        items={[
          {
            title: "Workspace list",
            description: "Your research workspaces will be listed here.",
          },
          {
            title: "Create workspace",
            description: "Start a new workspace for a research question.",
          },
          {
            title: "Recent activity",
            description: "Latest changes across your workspaces.",
          },
        ]}
      />
    </PageShell>
  );
}
