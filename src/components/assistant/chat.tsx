"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import type { AnalyzeResearchTopicPart, ResearchUIMessage } from "@/lib/ai/tools";
import { ResearchToolPart } from "./research-tool-part";

const transport = new DefaultChatTransport<ResearchUIMessage>({ api: "/api/chat" });

/** Distance (px) from the bottom within which the view stays pinned to new content. */
const PIN_THRESHOLD = 80;

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

export function Chat() {
  // An explicit id keeps useChat from calling Math.random() during prerender.
  const chatId = useId();
  const { messages, sendMessage, status, stop, error, clearError } =
    useChat<ResearchUIMessage>({
      id: chatId,
      transport,
    });
  const [input, setInput] = useState("");
  const [showJump, setShowJump] = useState(false);
  const [stopped, setStopped] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pinnedRef = useRef(true);
  const inputId = useId();
  const hintId = useId();

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
    const text = input.trim();
    if (!text || busy) return;
    if (error) clearError();
    setStopped(false);
    setInput("");
    jumpToLatest();
    void sendMessage({ text });
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

  let statusMessage = "";
  if (status === "submitted") statusMessage = "Assistant is thinking.";
  else if (analyzing) statusMessage = "Assistant is analyzing the research topic.";
  else if (status === "streaming") statusMessage = "Assistant is responding.";
  else if (status === "error") statusMessage = "The assistant response failed.";
  else if (stopped) statusMessage = "Response stopped.";
  else if (lastMessage?.role === "assistant") {
    statusMessage = "Assistant finished responding.";
  }

  return (
    <section
      aria-label="Research assistant chat"
      className="flex h-[calc(100dvh-15rem)] min-h-[26rem] flex-col overflow-hidden rounded-card border border-border bg-surface sm:h-[calc(100dvh-17rem)]"
    >
      <p role="status" className="sr-only">
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
            <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center text-center">
              <p className="text-base font-semibold">
                Start a research conversation
              </p>
              <p className="mt-2 text-sm text-muted">
                Ask about a topic, paste notes to summarize, or describe an idea
                you want to organize. The assistant only knows sources you
                share in the chat.
              </p>
            </div>
          ) : (
            <ol className="mx-auto flex max-w-3xl flex-col gap-4">
              {messages.map((message) => {
                const segments = toSegments(message);
                if (segments.length === 0) return null;
                return message.role === "user" ? (
                  <UserMessage key={message.id} segments={segments} />
                ) : (
                  <AssistantMessage
                    key={message.id}
                    segments={segments}
                    active={busy && message.id === lastMessage?.id}
                  />
                );
              })}
              {waitingForText ? (
                <li className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-sm border border-border bg-surface-muted px-4 py-3 text-sm text-muted">
                    <span className="sr-only">Assistant is thinking</span>
                    <span aria-hidden="true" className="flex items-center gap-2">
                      Thinking
                      <span className="flex gap-1">
                        <span className="size-1.5 rounded-full bg-current motion-safe:animate-pulse" />
                        <span className="size-1.5 rounded-full bg-current motion-safe:animate-pulse [animation-delay:150ms]" />
                        <span className="size-1.5 rounded-full bg-current motion-safe:animate-pulse [animation-delay:300ms]" />
                      </span>
                    </span>
                  </div>
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

      {error ? (
        <div
          role="alert"
          className="border-t border-border bg-danger-soft px-3 py-2 text-sm text-danger sm:px-6"
        >
          {error.message || "Something went wrong. Please try again."}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 border-t border-border bg-surface p-3 sm:p-4"
      >
        <label htmlFor={inputId} className="sr-only">
          Message the research assistant
        </label>
        <textarea
          ref={inputRef}
          id={inputId}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          aria-describedby={hintId}
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
            className="h-11 shrink-0 rounded-lg border border-border bg-surface px-4 text-sm font-semibold hover:bg-surface-muted"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            className="h-11 shrink-0 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        )}
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

function AssistantMessage({ segments, active }: { segments: Segment[]; active: boolean }) {
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
      </div>
    </li>
  );
}
