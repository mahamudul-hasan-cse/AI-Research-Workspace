import type { InferUITools, UIDataTypes, UIMessage } from "ai";
import {
  ANALYZE_RESEARCH_TOPIC,
  analyzeResearchTopicTool,
} from "./analyze-research-topic";

export const researchTools = {
  [ANALYZE_RESEARCH_TOPIC]: analyzeResearchTopicTool,
};

export type ResearchUITools = InferUITools<typeof researchTools>;

/** Chat message type shared by /api/chat and the chat UI, with typed tool parts. */
export type ResearchUIMessage = UIMessage<unknown, UIDataTypes, ResearchUITools>;

export type AnalyzeResearchTopicPart = Extract<
  ResearchUIMessage["parts"][number],
  { type: `tool-${typeof ANALYZE_RESEARCH_TOPIC}` }
>;
