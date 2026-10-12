"use client";

import { useId, useState, type ReactNode } from "react";

type DisclosureProps = {
  label: string;
  children: ReactNode;
  defaultOpen?: boolean;
};

export function Disclosure({ label, children, defaultOpen = false }: DisclosureProps) {
  const [open, setOpen] = useState<boolean>(defaultOpen);
  const contentId = useId();

  return (
    <div className="rounded-md border border-border">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 rounded-md px-4 py-3 text-left text-sm font-medium hover:bg-surface-muted"
      >
        {label}
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 7.5l5 5 5-5" />
        </svg>
      </button>
      <div
        id={contentId}
        hidden={!open}
        className="border-t border-border px-4 py-3 text-sm"
      >
        {children}
      </div>
    </div>
  );
}
