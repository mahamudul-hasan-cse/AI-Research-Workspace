import {
  createOpenRouter,
  type OpenRouterProviderOptions,
} from "@openrouter/ai-sdk-provider";

/**
 * Central AI configuration for the research assistant. The API key is NOT
 * configured here: the OpenRouter provider reads OPENROUTER_API_KEY from the
 * server environment, so it never reaches the browser bundle. Import this
 * module only from server code.
 */

export const openrouter = createOpenRouter({
  compatibility: "strict",
  appName: "AI Research Workspace",
});

/** Qwen3.8 Flash on OpenRouter: a general chat/reasoning model with streaming and tool calling. */
export const AI_MODEL_ID = "qwen/qwen3.8-flash";

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

Tools:
- You have one tool, analyzeResearchTopic. Call it when the user asks you to evaluate a topic, judge how research-ready a topic is, plan research on a topic, or give structured research guidance for a topic.
- Pass the topic in the user's own words, and pass researchGoal only if the user stated a goal. Do not invent a goal.
- Do not call the tool for general questions, explanations, summaries, or casual conversation; answer those directly.
- The tool's result is shown to the user as a card. Afterwards, add a short reply (2-4 sentences) highlighting the most useful insight or a suggested next step. Do not repeat the card's lists.
- The score measures how clearly the topic is framed; do not present it as an assessment of the existing literature.
- If the tool fails, explain the problem briefly and ask the user for what is missing.

Formatting:
- Responses are displayed as plain text. Do not use Markdown syntax such as **bold**, # headings, or tables.
- Use short paragraphs, and simple "- " bullets or "1. " numbered lists when structure helps.`;

/** Passed to streamText; leaves temperature at the model's default. */
export const GENERATION_CONFIG = {
  maxOutputTokens: 4096,
} as const;

/**
 * Low reasoning effort keeps time-to-first-token and token cost down; the
 * reasoning text itself is not shown in the chat, so it is excluded.
 */
export const OPENROUTER_PROVIDER_OPTIONS = {
  reasoning: { effort: "low", exclude: true },
} satisfies OpenRouterProviderOptions;

/**
 * Providers can deliver text in large batches; re-chunking it word by word
 * makes the response visibly stream instead of appearing in a few big jumps.
 */
export const STREAM_SMOOTHING = {
  chunking: "word",
  delayInMs: 15,
} as const;

/** Model steps per request: a tool call plus the follow-up reply, with one spare. */
export const MAX_STEPS = 3;

/** Request limits enforced by /api/chat to keep payloads and quota use bounded. */
export { CHAT_LIMITS } from "./chat-limits";
