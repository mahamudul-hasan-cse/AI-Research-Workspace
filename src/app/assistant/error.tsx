"use client";

import { RouteError } from "@/components/route-error";

export default function AssistantError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <RouteError
      title="Assistant"
      description="The research assistant couldn't load. Your conversation in this tab may need to be restarted."
      error={error}
      retry={retry}
      homeHref="/"
      homeLabel="Go to home"
    />
  );
}
