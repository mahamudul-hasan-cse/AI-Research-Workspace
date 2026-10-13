import { useEffect, useState } from "react";
import { MessageSquareText } from "lucide-react";

const EXAMPLE_PROMPTS = [
  "What is the difference between qualitative and quantitative research?",
  "Evaluate my topic: microplastics in freshwater fish in South Asia, for a thesis study.",
  "Help me organize ideas for a literature review on remote work and productivity.",
];

export function ChatEmptyState({ onPickPrompt }: { onPickPrompt: (prompt: string) => void }) {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center py-2 text-center">
      <span
        aria-hidden="true"
        className="flex size-11 items-center justify-center rounded-full bg-accent-soft text-accent"
      >
        <MessageSquareText className="size-5" />
      </span>
      <h2 className="mt-3 text-base font-semibold">Start a research conversation</h2>
      <p className="mt-1.5 text-sm text-muted">
        Ask about a topic, paste notes to summarize, or ask the assistant to
        evaluate how research-ready a topic is. It only knows sources you share
        in the chat.
      </p>
      <p className="mt-4 text-xs font-semibold tracking-wide text-muted uppercase">
        Try an example
      </p>
      <ul className="mt-2 flex w-full flex-col gap-2">
        {EXAMPLE_PROMPTS.map((prompt) => (
          <li key={prompt}>
            <button
              type="button"
              onClick={() => onPickPrompt(prompt)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-left text-sm hover:bg-surface-muted"
            >
              {prompt}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Shows a hint once a response has taken unusually long; resets on remount. */
function SlowResponseNotice() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(timer);
  }, []);
  if (!slow) return null;
  return (
    <p className="text-xs text-muted">
      Still working. Responses can take longer when Gemini is busy.
    </p>
  );
}

/**
 * Placeholder with the same shell as an assistant message, shown until the
 * first text or tool call arrives so the reply streams in without a jump.
 */
export function ResponseSkeleton() {
  return (
    <li className="flex justify-start">
      <div className="flex w-72 max-w-full min-w-0 flex-col gap-3 rounded-2xl rounded-bl-sm border border-border bg-surface-muted px-4 py-3">
        <p className="-mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
          Assistant
        </p>
        <div aria-hidden="true" className="flex flex-col gap-2 py-1">
          <span className="h-2.5 w-11/12 rounded-full bg-border motion-safe:animate-pulse" />
          <span className="h-2.5 w-2/3 rounded-full bg-border motion-safe:animate-pulse" />
        </div>
        <p className="text-xs text-muted">
          <span className="sr-only">Assistant is thinking</span>
          <span aria-hidden="true">Thinking…</span>
        </p>
        <SlowResponseNotice />
      </div>
    </li>
  );
}
