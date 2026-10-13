/**
 * TEST-ONLY failure injection for the /assistant chat.
 *
 * Enabled only in `next dev` or in a build made with
 * NEXT_PUBLIC_ENABLE_CHAT_SABOTAGE=1. In a normal production build the flag is
 * inlined as `false`, so every hook below is inert and the server ignores the
 * sabotage header.
 *
 * Usage: open /assistant?sabotage=midstream,mock — each chat request consumes
 * the next mode in the list; once the list is used up, requests are real.
 */
export const CHAT_SABOTAGE_ENABLED =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_ENABLE_CHAT_SABOTAGE === "1";

export const SABOTAGE_HEADER = "x-chat-sabotage";

export const SABOTAGE_MODES = [
  "network", // client: fetch rejects before any response
  "midstream", // server: partial text, then a stream error
  "rate-limit", // server: the mapped quota/429 error
  "malformed-tool", // server: a tool result that does not match its schema
  "empty-tool", // server: a valid tool result with no items
  "slow", // server: long delay before the first token, then a mock reply
  "mock", // server: a successful mock reply (no Gemini call)
  "render", // client: the chat component throws while rendering
] as const;

export type SabotageMode = (typeof SABOTAGE_MODES)[number];

export function parseSabotageMode(value: string | null | undefined): SabotageMode | undefined {
  return SABOTAGE_MODES.find((mode) => mode === value);
}

let queue: SabotageMode[] | undefined;

function sabotageQueue(): SabotageMode[] {
  if (queue === undefined) {
    const raw = CHAT_SABOTAGE_ENABLED && typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("sabotage") ?? ""
      : "";
    queue = raw
      .split(",")
      .map((value) => parseSabotageMode(value.trim()))
      .filter((mode): mode is SabotageMode => mode !== undefined);
  }
  return queue;
}

/** True if the next queued mode is `mode` (does not consume it). */
export function isSabotagePending(mode: SabotageMode) {
  return CHAT_SABOTAGE_ENABLED && sabotageQueue()[0] === mode;
}

/** Removes and returns the next queued mode, if any. */
export function takeSabotage(): SabotageMode | undefined {
  return CHAT_SABOTAGE_ENABLED ? sabotageQueue().shift() : undefined;
}

let renderFailureClearing = false;

/**
 * Throws for the current render pass, including React's immediate re-render
 * attempt, then clears the "render" mode so the boundary's retry succeeds.
 */
export function throwRenderSabotage(): never {
  if (!renderFailureClearing) {
    renderFailureClearing = true;
    setTimeout(() => {
      takeSabotage();
      renderFailureClearing = false;
    }, 0);
  }
  throw new Error("Simulated render failure (test only).");
}

/** fetch wrapper for the chat transport that applies the next queued mode. */
export const sabotageFetch: typeof fetch = async (input, init) => {
  const mode = takeSabotage();
  if (mode === "network") {
    throw new TypeError("Failed to fetch");
  }
  if (!mode) return fetch(input, init);
  const headers = new Headers(init?.headers);
  headers.set(SABOTAGE_HEADER, mode);
  return fetch(input, { ...init, headers });
};
