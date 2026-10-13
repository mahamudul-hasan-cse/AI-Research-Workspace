export type ChatFailureKind = "network" | "rate-limit" | "interrupted" | "request";

export type ChatFailure = {
  kind: ChatFailureKind;
  title: string;
  message: string;
};

const NETWORK_ERROR = /failed to fetch|networkerror|load failed|network error|network request failed|terminated|err_internet|err_network/i;
const RATE_LIMIT = /quota|rate limit|429|too many requests/i;

/**
 * Turns a chat error into user-facing copy. Server errors are already
 * sanitized by /api/chat; browser network errors are replaced with our own text.
 */
export function describeChatFailure(error: Error, hasPartialResponse: boolean): ChatFailure {
  const detail = error.message ?? "";
  if (RATE_LIMIT.test(detail)) {
    return {
      kind: "rate-limit",
      title: "Usage limit reached",
      message: `${detail} You can keep writing; your conversation is saved in this tab.`,
    };
  }
  if (error instanceof TypeError || NETWORK_ERROR.test(detail)) {
    return {
      kind: "network",
      title: hasPartialResponse ? "Connection lost during the response" : "Message not delivered",
      message: hasPartialResponse
        ? "The connection dropped before the response finished. The partial answer is kept above."
        : "The assistant couldn't be reached. Check your internet connection and try again.",
    };
  }
  if (hasPartialResponse) {
    return {
      kind: "interrupted",
      title: "Response interrupted",
      message: `${detail || "The response stopped before it finished."} The partial answer is kept above.`,
    };
  }
  return {
    kind: "request",
    title: "The assistant couldn't respond",
    message: detail || "Something went wrong. Please try again.",
  };
}

export function ChatFailureNotice({
  failure,
  onRetry,
  retryDisabled,
}: {
  failure: ChatFailure;
  onRetry: () => void;
  retryDisabled: boolean;
}) {
  return (
    <div
      role="alert"
      data-failure-kind={failure.kind}
      className="min-w-0 rounded-card border border-danger/40 bg-danger-soft p-3 text-sm"
    >
      <p className="font-semibold text-danger">{failure.title}</p>
      <p className="mt-1 [overflow-wrap:anywhere]">{failure.message}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={retryDisabled}
        className="mt-3 h-9 rounded-lg border border-border bg-surface px-3 text-sm font-semibold hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        {failure.kind === "rate-limit" ? "Try again" : "Retry"}
      </button>
    </div>
  );
}
