import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { PlaceholderGrid } from "@/components/placeholder-card";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <PageShell
      title="Settings"
      description="Configure how your workspace behaves."
    >
      <PlaceholderGrid
        items={[
          {
            title: "Profile",
            description: "Account details will live here once auth exists.",
          },
          {
            title: "Preferences",
            description: "Theme, defaults, and display options.",
          },
          {
            title: "Assistant",
            description: "Model and response preferences.",
          },
        ]}
      />
    </PageShell>
  );
}
