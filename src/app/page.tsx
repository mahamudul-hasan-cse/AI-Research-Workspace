import Link from "next/link";
import { HomeHero } from "@/components/home/home-hero";
import { navItems } from "@/lib/navigation";

const descriptions: Record<string, string> = {
  "/workspaces": "Group research into focused projects.",
  "/assistant": "Ask questions about your research.",
  "/visualize": "Explore a thesis topic and its connected research nodes in 3D.",
  "/sources": "Collect papers, links, and documents.",
  "/saved": "Keep the findings worth revisiting.",
  "/history": "Review past sessions and activity.",
  "/settings": "Configure your workspace preferences.",
  "/health": "Check that the app and its data layer respond.",
  "/playground": "Try accessible UI components built from scratch.",
};

export default function HomePage() {
  const sections = navItems.filter((item) => item.href !== "/");

  return (
    <>
      <HomeHero />
      <section
        aria-labelledby="workspace-sections-title"
        className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16"
      >
        <h2 id="workspace-sections-title" className="text-xl font-bold tracking-tight sm:text-2xl">
          Explore the workspace
        </h2>
        <p className="mt-2 text-sm text-muted sm:text-base">
          Organize research projects, gather sources, and work with an AI assistant.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-card border border-border bg-surface p-5 transition-colors hover:border-accent"
            >
              <h3 className="font-semibold group-hover:text-accent">{item.label}</h3>
              <p className="mt-1 text-sm text-muted">{descriptions[item.href]}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
