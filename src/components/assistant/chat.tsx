"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Square } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { AnalyzeResearchTopicPart, ResearchUIMessage } from "@/lib/ai/tools";
import {
  CHAT_SABOTAGE_ENABLED,
  isSabotagePending,
  sabotageFetch,
  throwRenderSabotage,
} from "@/lib/testing/chat-sabotage";
import { ChatFailureNotice, describeChatFailure } from "./chat-failure";
import { ChatEmptyState, ResponseSkeleton } from "./chat-states";
import { ResearchToolPart } from "./research-tool-part";
import { SendButton, type SendButtonState } from "./send-button";

const transport = new DefaultChatTransport<ResearchUIMessage>({
  api: "/api/chat",
  ...(CHAT_SABOTAGE_ENABLED ? { fetch: sabotageFetch } : {}),
});

/** Distance (px) from the bottom within which the view stays pinned to new content. */
const PIN_THRESHOLD = 80;

/** How long the Send button holds its success / error state before returning to idle. */
const SEND_SUCCESS_MS = 1200;
const SEND_ERROR_MS = 2400;

type Segment =
  | { kind: "text"; key: string; text: string }
  | { kind: "tool"; key: string; part: AnalyzeResearchTopicPart };

/** Groups a message's parts into renderable text runs and tool calls, in order. */
function toSegments(message: ResearchUIMessage): Segment[] {
  const segments: Segment[] = [];
  message.parts.forEach((part, index) => {
    if (part.type === "text") {
      if (part.text === "") return;
      const last = segments.at(-1);
      if (last?.kind === "text") last.text += part.text;
      else segments.push({ kind: "text", key: `text-${index}`, text: part.text });
    } else if (part.type === "tool-analyzeResearchTopic") {
      segments.push({ kind: "tool", key: part.toolCallId, part });
    }
  });
  return segments;
}

function isToolPending(segment: Segment | undefined) {
  return (
    segment?.kind === "tool" &&
    (segment.part.state === "input-streaming" || segment.part.state === "input-available")
  );
}

function isNearBottom(element: HTMLElement) {
  return (
    element.scrollHeight - element.scrollTop - element.clientHeight <=
    PIN_THRESHOLD
  );
}

const subscribeNever = () => () => {};

export function Chat() {
  // SSR looks interactive before React attaches handlers. Keep the composer
  // disabled until hydration so fast typing cannot be lost (notably in WebKit).
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false);
  // Test-only: lets /assistant?sabotage=render exercise the route error boundary.
  const renderSabotage = useSyncExternalStore(
    subscribeNever,
    () => isSabotagePending("render"),
    () => false,
  );
  if (renderSabotage) throwRenderSabotage();

  // An explicit id keeps useChat from calling Math.random() during prerender.
  const chatId = useId();
  const { messages, sendMessage, regenerate, status, stop, error, clearError } =
    useChat<ResearchUIMessage>({
      id: chatId,
      transport,
    });
  const [input, setInput] = useState("");
  const [emptyHint, setEmptyHint] = useState(false);
  const [showJump, setShowJump] = useState(false);
  const [stopped, setStopped] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pinnedRef = useRef(true);
  const retryingRef = useRef(false);
  const sendingRef = useRef(false);
  const inputId = useId();
  const hintId = useId();
  const feedbackId = useId();

  const busy = status === "submitted" || status === "streaming";
  const lastMessage = messages.at(-1);
  const lastSegments =
    lastMessage?.role === "assistant" ? toSegments(lastMessage) : [];
  const lastSegment = lastSegments.at(-1);
  const analyzing = busy && isToolPending(lastSegment);
  // Shown until text or a tool call appears, and between a tool result and the follow-up text.
  const waitingForText =
    busy && (lastSegment === undefined || (lastSegment.kind === "tool" && !analyzing));
  const canSend = !busy && input.trim().length > 0;

  // Brief success/error feedback on the Send button when a request ends; a
  // response the user stopped ends quietly. Derived during render from the
  // status change, then cleared by the timer below.
  const [sendFlash, setSendFlash] = useState<"success" | "error" | null>(null);
  const [prevStatus, setPrevStatus] = useState(status);
  if (status !== prevStatus) {
    setPrevStatus(status);
    const wasBusy = prevStatus === "submitted" || prevStatus === "streaming";
    if (status === "error") setSendFlash("error");
    else if (status === "ready" && wasBusy) setSendFlash(stopped ? null : "success");
    else setSendFlash(null);
  }
  const sendState: SendButtonState = busy ? "loading" : (sendFlash ?? "idle");

  useEffect(() => {
    if (!sendFlash) return;
    const timer = setTimeout(
      () => setSendFlash(null),
      sendFlash === "success" ? SEND_SUCCESS_MS : SEND_ERROR_MS,
    );
    return () => clearTimeout(timer);
  }, [sendFlash]);

  const failure =
    status === "error" && error
      ? describeChatFailure(error, lastSegments.some((segment) => segment.kind === "text"))
      : undefined;
  // A failed turn with partial content keeps it, with the failure attached below.
  const failureInline = failure !== undefined && lastSegments.length > 0;

  useEffect(() => {
    const element = scrollRef.current;
    if (element && pinnedRef.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages, status]);

  function handleScroll() {
    const element = scrollRef.current;
    if (!element) return;
    const pinned = isNearBottom(element);
    pinnedRef.current = pinned;
    setShowJump(!pinned);
  }

  function jumpToLatest() {
    const element = scrollRef.current;
    if (!element) return;
    pinnedRef.current = true;
    element.scrollTop = element.scrollHeight;
    setShowJump(false);
  }

  function submit() {
    // Checked first so repeated clicks during a send are ignored silently.
    if (busy || sendingRef.current) return;
    const text = input.trim();
    if (!text) {
      setEmptyHint(true);
      inputRef.current?.focus();
      return;
    }
    if (error) clearError();
    setStopped(false);
    setInput("");
    jumpToLatest();
    // Covers the moment between this click and useChat reporting "submitted".
    sendingRef.current = true;
    void sendMessage({ text }).finally(() => {
      sendingRef.current = false;
    });
  }

  /** Re-runs only the failed turn: resends the last user message, or replaces a partial reply. */
  async function retry() {
    if (busy || retryingRef.current) return;
    retryingRef.current = true;
    setStopped(false);
    jumpToLatest();
    try {
      await regenerate();
    } finally {
      retryingRef.current = false;
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      submit();
    }
  }

  function handleStop() {
    void stop();
    setStopped(true);
    inputRef.current?.focus();
  }

  function pickPrompt(prompt: string) {
    setInput(prompt);
    setEmptyHint(false);
    inputRef.current?.focus();
  }

  const failureNotice = failure ? (
    <ChatFailureNotice
      failure={failure}
      onRetry={() => void retry()}
      retryDisabled={busy}
    />
  ) : null;

  let statusMessage = "";
  if (status === "submitted") statusMessage = "Assistant is thinking.";
  else if (analyzing) statusMessage = "Assistant is analyzing the research topic.";
  else if (status === "streaming") statusMessage = "Assistant is responding.";
  else if (failure) statusMessage = failure.title;
  else if (stopped) statusMessage = "Response stopped.";
  else if (lastMessage?.role === "assistant") {
    statusMessage = "Assistant finished responding.";
  }

  return (
    <section
      aria-label="Research assistant chat"
      className="flex h-[calc(100dvh-15rem)] min-h-[20rem] flex-col overflow-hidden rounded-card border border-border bg-surface sm:h-[calc(100dvh-17rem)]"
    >
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {statusMessage}
      </p>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          tabIndex={0}
          role="region"
          aria-label="Conversation"
          className="h-full overflow-x-hidden overflow-y-auto px-3 py-4 sm:px-6"
        >
          {messages.length === 0 ? (
            <ChatEmptyState onPickPrompt={pickPrompt} />
          ) : (
            <ol className="mx-auto flex max-w-3xl flex-col gap-4">
              {messages.map((message) => {
                const segments = toSegments(message);
                if (segments.length === 0) return null;
                const isLast = message.id === lastMessage?.id;
                return message.role === "user" ? (
                  <UserMessage key={message.id} segments={segments} />
                ) : (
                  <AssistantMessage
                    key={message.id}
                    segments={segments}
                    active={busy && isLast}
                    footer={isLast && failureInline ? failureNotice : null}
                  />
                );
              })}
              {waitingForText ? <ResponseSkeleton /> : null}
              {failure && !failureInline ? (
                <li className="flex justify-start">
                  <div className="w-full max-w-md">{failureNotice}</div>
                </li>
              ) : null}
            </ol>
          )}
        </div>

        {showJump && messages.length > 0 ? (
          <button
            type="button"
            onClick={jumpToLatest}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-medium shadow-md hover:bg-surface-muted"
          >
            Jump to latest
          </button>
        ) : null}
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-border bg-surface p-3 sm:p-4"
      >
        <p
          id={feedbackId}
          aria-live="polite"
          className={emptyHint ? "mb-2 text-xs font-medium text-danger" : "sr-only"}
        >
          {emptyHint ? "Type a message before sending." : ""}
        </p>
        <div className="flex items-end gap-2">
          <label htmlFor={inputId} className="sr-only">
            Message the research assistant
          </label>
          <textarea
            ref={inputRef}
            disabled={!hydrated}
            id={inputId}
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              if (emptyHint) setEmptyHint(false);
            }}
            onKeyDown={handleKeyDown}
            rows={2}
            aria-describedby={`${hintId} ${feedbackId}`}
            aria-invalid={emptyHint || undefined}
            placeholder="Ask about a research topic…"
            className="max-h-40 min-h-11 min-w-0 flex-1 resize-y rounded-lg border border-border bg-background px-3 py-2 text-base sm:text-sm"
          />
          <p id={hintId} className="sr-only">
            Press Enter to send and Shift plus Enter for a new line.
          </p>
          {busy ? (
            <button
              type="button"
              onClick={handleStop}
              className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-semibold duration-150 animate-in fade-in-0 hover:bg-surface-muted motion-safe:zoom-in-90 sm:px-4"
            >
              <Square aria-hidden="true" className="size-3.5 fill-current" />
              <span>Stop</span>
            </button>
          ) : null}
          <SendButton state={sendState} canSend={canSend} />
        </div>
      </form>
    </section>
  );
}

function MessageText({ text }: { text: string }) {
  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere] sm:text-[0.9375rem]">
      {text}
    </p>
  );
}

function UserMessage({ segments }: { segments: Segment[] }) {
  return (
    <li className="flex justify-end">
      <div className="max-w-[85%] min-w-0 rounded-2xl rounded-br-sm bg-accent px-4 py-2.5 text-accent-foreground">
        <p className="sr-only">You said:</p>
        {segments.map((segment) =>
          segment.kind === "text" ? <MessageText key={segment.key} text={segment.text} /> : null,
        )}
      </div>
    </li>
  );
}

function AssistantMessage({
  segments,
  active,
  footer,
}: {
  segments: Segment[];
  active: boolean;
  footer: ReactNode;
}) {
  return (
    <li className="flex justify-start">
      <div className="flex max-w-full min-w-0 flex-col gap-3 rounded-2xl rounded-bl-sm border border-border bg-surface-muted px-4 py-3 sm:max-w-[90%]">
        <p className="-mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
          Assistant
        </p>
        {segments.map((segment) =>
          segment.kind === "text" ? (
            <MessageText key={segment.key} text={segment.text} />
          ) : (
            <ResearchToolPart key={segment.key} part={segment.part} active={active} />
          ),
        )}
        {footer}
      </div>
    </li>
  );
}
