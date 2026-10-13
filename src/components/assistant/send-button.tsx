import type { ReactNode } from "react";
import { Check, CircleAlert, LoaderCircle, SendHorizontal } from "lucide-react";

/**
 * Lifecycle of the composer's Send button. Hover, focus and press are CSS
 * interaction states layered on top; "success" and "error" are brief flashes
 * that the chat clears back to "idle" on a timer.
 */
export type SendButtonState = "idle" | "loading" | "success" | "error";

const STATES: { state: SendButtonState; label: string; icon: ReactNode }[] = [
  { state: "idle", label: "Send", icon: <SendHorizontal aria-hidden="true" className="size-4" /> },
  {
    state: "loading",
    label: "Replying",
    icon: <LoaderCircle aria-hidden="true" className="size-4 motion-safe:animate-spin" />,
  },
  { state: "success", label: "Sent", icon: <Check aria-hidden="true" className="size-4" /> },
  { state: "error", label: "Failed", icon: <CircleAlert aria-hidden="true" className="size-4" /> },
];

// Shared by every layer so state changes cross-fade on one curve (a fast-out "emphasized" ease).
const EASE = "ease-[cubic-bezier(0.2,0,0,1)]";

export function SendButton({ state, canSend }: { state: SendButtonState; canSend: boolean }) {
  // Loading never accepts a click; success/error stay usable so a new message can go out at once.
  const actionable = state !== "loading" && canSend;
  const dimmed = state === "idle" && !canSend;

  return (
    <button
      type="submit"
      aria-disabled={!actionable}
      data-state={state}
      className={[
        "group relative isolate inline-grid h-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground select-none",
        `transition-[opacity,scale,translate] duration-150 ${EASE} motion-reduce:transition-opacity`,
        dimmed ? "cursor-not-allowed opacity-50" : "opacity-100",
        state === "loading" ? "cursor-progress" : "",
        actionable ? "motion-safe:hover:-translate-y-px motion-safe:active:translate-y-0 motion-safe:active:scale-[0.96] motion-safe:active:duration-75" : "",
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-0 -z-10 bg-success-strong transition-opacity duration-200 ${EASE} ${state === "success" ? "opacity-100" : "opacity-0"}`}
      />
      <span
        aria-hidden="true"
        className={`absolute inset-0 -z-10 bg-danger-strong transition-opacity duration-200 ${EASE} ${state === "error" ? "opacity-100" : "opacity-0"}`}
      />
      <span
        aria-hidden="true"
        className={`absolute inset-0 -z-10 bg-current opacity-0 transition-opacity duration-150 ${actionable ? "group-hover:opacity-10 group-active:opacity-20" : ""}`}
      />
      {STATES.map((layer) => {
        const current = layer.state === state;
        return (
          <span
            key={layer.state}
            aria-hidden={!current}
            className={`inline-flex items-center gap-1.5 transition-[opacity,translate] duration-200 [grid-area:1/1] ${EASE} ${
              current ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0 motion-reduce:translate-y-0"
            }`}
          >
            {layer.icon}
            {layer.label}
          </span>
        );
      })}
    </button>
  );
}
