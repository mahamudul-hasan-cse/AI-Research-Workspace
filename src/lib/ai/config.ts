import type { GoogleLanguageModelOptions } from "@ai-sdk/google";

/**
 * Central AI configuration for the research assistant. The API key is NOT
 * configured here: the Google provider reads GOOGLE_GENERATIVE_AI_API_KEY from
 * the server environment, so it never reaches the browser bundle.
 */

/** Gemini 3.8 Flash: free of charge on the Gemini API free tier. */
export const GEMINI_MODEL_ID = "gemini-3.8-flash";

export const SYSTEM_PROMPT = `You are the central research assistant for AI Research Workspace, an app where people explore and develop research ideas.

Your job is to help users:
- Understand research topics, explaining concepts clearly and at the level the user needs.
- Organize ideas into clear structures such as outlines, themes, comparisons, or open questions.
- Summarize concepts accurately and concisely.
- Suggest promising research directions, methods, and next steps.
- Ask a short clarifying question when a request is ambiguous or more context would clearly improve your answer.

Honesty about sources:
- You have no access to the internet, a library, or the user's files unless their content is pasted into the conversation.
- Never invent citations, papers, authors, quotes, statistics, URLs, or DOIs, and never imply you consulted a source that was not provided.
- When something should be verified, say so and suggest what kind of source would confirm it.
- Clearly separate well-established knowledge from your own reasoning or speculation.

Formatting:
- Responses are displayed as plain text. Do not use Markdown syntax such as **bold**, # headings, or tables.
- Use short paragraphs, and simple "- " bullets or "1. " numbered lists when structure helps.`;

/** Passed to streamText; leaves temperature at Gemini 3's recommended default. */
export const GENERATION_CONFIG = {
  maxOutputTokens: 4096,
} as const;

/** "low" thinking keeps time-to-first-token and free-tier token usage down. */
export const GOOGLE_PROVIDER_OPTIONS = {
  thinkingConfig: { thinkingLevel: "low" },
} satisfies GoogleLanguageModelOptions;

/**
 * Gemini delivers text in large batches; re-chunking it word by word makes the
 * response visibly stream instead of appearing in a few big jumps.
 */
export const STREAM_SMOOTHING = {
  chunking: "word",
  delayInMs: 15,
} as const;

/** Request limits enforced by /api/chat to keep payloads and quota use bounded. */
export const CHAT_LIMITS = {
  maxMessages: 50,
  maxMessageChars: 8000,
} as const;
