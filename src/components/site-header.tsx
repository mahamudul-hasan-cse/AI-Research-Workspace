import Link from "next/link";
import { MainNav } from "@/components/main-nav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur">
      <div className="relative mx-auto flex h-header max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span
            aria-hidden="true"
            className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-sm text-accent-foreground"
          >
            AR
          </span>
          <span className="text-base sm:text-lg">AI Research Workspace</span>
        </Link>
        <MainNav />
      </div>
    </header>
  );
}
