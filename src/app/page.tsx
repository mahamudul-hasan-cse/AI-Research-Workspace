import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { navItems } from "@/lib/navigation";

const descriptions: Record<string, string> = {
  "/workspaces": "Group research into focused projects.",
  "/assistant": "Ask questions about your research.",
  "/sources": "Collect papers, links, and documents.",
  "/saved": "Keep the findings worth revisiting.",
  "/history": "Review past sessions and activity.",
  "/settings": "Configure your workspace preferences.",
  "/health": "Check that the app and its data layer respond.",
};

export default function HomePage() {
  const sections = navItems.filter((item) => item.href !== "/");

  return (
    <PageShell
      title="AI Research Workspace"
      description="Organize research projects, gather sources, and work with an AI assistant — all in one place. This is the initial skeleton; features will land in upcoming milestones."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-card border border-border bg-surface p-5 transition-colors hover:border-accent"
          >
            <h2 className="font-semibold group-hover:text-accent">
              {item.label}
            </h2>
            <p className="mt-1 text-sm text-muted">{descriptions[item.href]}</p>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
