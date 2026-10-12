import type { Metadata } from "next";
import Link from "next/link";
import { Disclosure } from "@/components/disclosure";
import { PageShell } from "@/components/page-shell";
import { ModalDemo } from "@/components/playground/modal-demo";
import { Tabs, type TabItem } from "@/components/tabs";

export const metadata: Metadata = { title: "Playground" };

const researchTabs: TabItem[] = [
  {
    id: "overview",
    label: "Overview",
    content: (
      <p className="text-muted">
        A summary of the research question, goals, and current status will
        appear here.
      </p>
    ),
  },
  {
    id: "sources",
    label: "Sources",
    content: (
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>Attention Is All You Need (2017)</li>
        <li>WAI-ARIA Authoring Practices Guide</li>
        <li>Internal interview notes</li>
      </ul>
    ),
  },
  {
    id: "notes",
    label: "Notes",
    content: (
      <p className="text-muted">
        Your working notes and highlights for this workspace will live here.
      </p>
    ),
  },
];

export default function PlaygroundPage() {
  return (
    <PageShell
      title="Playground"
      description="Accessible UI components built from scratch, following the WAI-ARIA Authoring Practices."
    >
      <div className="max-w-2xl space-y-6">
        <section
          aria-labelledby="modal-section-heading"
          className="rounded-card border border-border bg-surface p-5 sm:p-6"
        >
          <h2 id="modal-section-heading" className="text-lg font-semibold">
            Accessible Modal Dialog
          </h2>
          <p className="mt-1 mb-4 text-sm text-muted">
            Opens with Enter or Space, keeps Tab and Shift+Tab inside the
            dialog, closes on Escape, and returns focus to the button that
            opened it.
          </p>
          <ModalDemo />
        </section>

        <section
          aria-labelledby="tabs-section-heading"
          className="rounded-card border border-border bg-surface p-5 sm:p-6"
        >
          <h2 id="tabs-section-heading" className="text-lg font-semibold">
            Accessible Tabs
          </h2>
          <p className="mt-1 mb-4 text-sm text-muted">
            Arrow keys move between tabs and activate them, Home and End jump to
            the first and last tab, and Tab moves into the active panel.
          </p>
          <Tabs label="Research workspace" items={researchTabs} />
        </section>

        <section
          aria-labelledby="disclosure-section-heading"
          className="rounded-card border border-border bg-surface p-5 sm:p-6"
        >
          <h2 id="disclosure-section-heading" className="text-lg font-semibold">
            Accessible Disclosure
          </h2>
          <p className="mt-1 mb-4 text-sm text-muted">
            A native button toggles the content with Enter or Space. Collapsed
            content is hidden from the keyboard and screen readers.
          </p>
          <Disclosure label="Research tips">
            <ul className="list-disc space-y-1 pl-5 text-muted">
              <li>Start with a single, specific research question.</li>
              <li>Record where every finding came from as you go.</li>
              <li>Save useful answers so you can compare them later.</li>
            </ul>
            <div className="mt-3 flex flex-wrap gap-4">
              <Link href="/sources" className="font-medium text-accent hover:underline">
                Manage sources
              </Link>
              <Link href="/saved" className="font-medium text-accent hover:underline">
                View saved items
              </Link>
            </div>
          </Disclosure>
        </section>
      </div>
    </PageShell>
  );
}
