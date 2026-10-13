"use client";

import { RouteError } from "@/components/route-error";

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <RouteError
      title="Unexpected error"
      description="This page couldn't be displayed."
      error={error}
      retry={retry}
      homeHref="/"
      homeLabel="Go to home"
    />
  );
}
