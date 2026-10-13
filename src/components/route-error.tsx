"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { PageShell } from "@/components/page-shell";

export function RouteError({
  title,
  description,
  error,
  retry,
  homeHref,
  homeLabel,
}: {
  title: string;
  description: string;
  error: Error & { digest?: string };
  retry: () => void;
  homeHref: string;
  homeLabel: string;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <PageShell title={title} description={description}>
      <div
        role="alert"
        className="max-w-xl rounded-card border border-danger/40 bg-danger-soft p-5"
      >
        <h2 ref={headingRef} tabIndex={-1} className="text-base font-semibold text-danger outline-none">
          Something went wrong on this page
        </h2>
        <p className="mt-2 text-sm">
          This part of the app hit an unexpected error. Your other pages are
          unaffected. Try again, or start over with a fresh page.
        </p>
        {error.digest ? (
          <p className="mt-2 text-xs text-muted">Reference: {error.digest}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => retry()}
            className="h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground hover:opacity-90"
          >
            Try again
          </button>
          <Link
            href={homeHref}
            className="inline-flex h-10 items-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold hover:bg-surface-muted"
          >
            {homeLabel}
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
