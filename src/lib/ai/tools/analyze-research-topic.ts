import { tool } from "ai";
import { z } from "zod";

export const ANALYZE_RESEARCH_TOPIC = "analyzeResearchTopic";

export const analyzeResearchTopicInputSchema = z.object({
  topic: z
    .string()
    .trim()
    .min(2)
    .max(200)
    .describe(
      "The research topic to analyze, as a short phrase in the user's own words, e.g. 'microplastics in freshwater fish'.",
    ),
  researchGoal: z
    .string()
    .trim()
    .max(300)
    .optional()
    .describe(
      "What the user wants to achieve with this research, if they said so, e.g. 'write a literature review'. Omit if unknown; do not invent one.",
    ),
});

export const analyzeResearchTopicOutputSchema = z.object({
  topic: z.string(),
  researchGoal: z.string().optional(),
  researchScore: z.number().int().min(0).max(100),
  complexity: z.enum(["low", "medium", "high"]),
  keyQuestions: z.array(z.string()),
  recommendedNextSteps: z.array(z.string()),
  summary: z.string(),
});

export type AnalyzeResearchTopicInput = z.infer<typeof analyzeResearchTopicInputSchema>;
export type ResearchAnalysis = z.infer<typeof analyzeResearchTopicOutputSchema>;
export type ResearchComplexity = ResearchAnalysis["complexity"];

/** A failure whose message is safe to show to the user. */
export class ResearchToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResearchToolError";
  }
}

const COMPLEX_TERMS =
  /\b(quantum|neural|genom\w*|climate|causal\w*|policy|polic(?:ies)|ethic\w*|socio\w*|econom\w*|interdisciplinary|longitudinal|multimodal|cognitive|molecular|machine learning|artificial intelligence|ai|ecosystem\w*|pandemic\w*)\b/gi;
const SCOPE_SIGNALS =
  /\b(in|among|for|within|across|during|between)\b|\b(18|19|20)\d{2}\b|\b(children|adults|students|patients|women|men|urban|rural|countries|region|population)\b/i;
const METHOD_SIGNALS =
  /\b(compare|comparison|measure|evaluate|assess|review|survey|predict|model|experiment|analy[sz]e|test|interview|case study|meta-analysis)\b/i;
const COMPARISON_SIGNALS = /\b(vs\.?|versus|compared (?:to|with)|and)\b/i;

function scoreComplexity(text: string): ResearchComplexity {
  const termHits = new Set(text.toLowerCase().match(COMPLEX_TERMS) ?? []).size;
  const words = text.split(/\s+/).length;
  const points =
    termHits + (COMPARISON_SIGNALS.test(text) ? 1 : 0) + (words > 8 ? 1 : 0);
  if (points >= 3) return "high";
  if (points >= 1) return "medium";
  return "low";
}

function scoreReadiness(
  topic: string,
  goal: string | undefined,
  complexity: ResearchComplexity,
) {
  const words = topic.split(/\s+/).length;
  let score = 35;
  if (words >= 3 && words <= 12) score += 15;
  else if (words < 3) score -= 10;
  if (SCOPE_SIGNALS.test(topic)) score += 15;
  if (goal) score += 15;
  if (goal && METHOD_SIGNALS.test(goal)) score += 10;
  if (METHOD_SIGNALS.test(topic)) score += 5;
  if (complexity === "high" && !goal) score -= 10;
  return Math.max(0, Math.min(100, score));
}

/**
 * Deterministic, offline analysis: derives guidance from the wording of the
 * topic and goal. It does not search the literature or call another API.
 */
export function analyzeResearchTopic({
  topic,
  researchGoal,
}: AnalyzeResearchTopicInput): ResearchAnalysis {
  const cleanTopic = topic.trim().replace(/\s+/g, " ");
  const goal = researchGoal?.trim() || undefined;

  if ((cleanTopic.match(/\p{L}/gu) ?? []).length < 3) {
    throw new ResearchToolError(
      "The topic needs at least a few words describing what you want to research.",
    );
  }

  const complexity = scoreComplexity(cleanTopic);
  const researchScore = scoreReadiness(cleanTopic, goal, complexity);
  const hasScope = SCOPE_SIGNALS.test(cleanTopic);

  const keyQuestions = [
    goal
      ? `Which specific question about ${cleanTopic} best serves your goal to ${goal.replace(/^to\s+/i, "")}?`
      : `What specific question about ${cleanTopic} do you want to answer?`,
    `What is already well established about ${cleanTopic}, and where are the open gaps?`,
    hasScope
      ? "Is the chosen population, setting, or time frame narrow enough to study well?"
      : "Which population, setting, or time frame should the research focus on?",
    "What evidence or data would convincingly answer your question?",
  ];
  if (complexity === "high") {
    keyQuestions.push("Which sub-problem should be tackled first to keep the scope manageable?");
  }

  const recommendedNextSteps = [
    goal
      ? "Turn your goal into one or two precise research questions."
      : "Decide what you want to produce, such as a literature review, study plan, or report.",
    hasScope
      ? "Write a one-paragraph scope statement that names what is in and out of scope."
      : "Narrow the topic by adding a population, setting, or time frame.",
    "Collect 5–10 key sources and note their main findings and methods.",
    complexity === "low"
      ? "Look for a less-studied angle so the work adds something new."
      : "Map the main sub-topics and how they relate before going deeper.",
    "Choose a method that fits the question, such as a review, survey, experiment, or case study.",
  ];

  const readiness =
    researchScore >= 70
      ? "well defined and close to ready for planning"
      : researchScore >= 45
        ? "promising but needs a sharper focus"
        : "still broad and needs narrowing";
  const summary =
    `"${cleanTopic}" is a ${complexity}-complexity topic that is ${readiness}` +
    (goal ? `, with a stated goal to ${goal.replace(/^to\s+/i, "")}.` : ", and no research goal has been stated yet.") +
    " This score reflects how clearly the topic is framed, not the quality of existing literature.";

  return {
    topic: cleanTopic,
    ...(goal ? { researchGoal: goal } : {}),
    researchScore,
    complexity,
    keyQuestions,
    recommendedNextSteps,
    summary,
  };
}

export const analyzeResearchTopicTool = tool({
  description:
    "Analyze a research topic and return structured guidance: a research-readiness score (0-100), complexity, key questions, recommended next steps, and a summary. Use it when the user asks to evaluate a topic, check research readiness, plan research, or get structured research guidance. Do not use it for general questions or simple explanations.",
  inputSchema: analyzeResearchTopicInputSchema,
  outputSchema: analyzeResearchTopicOutputSchema,
  execute: async (input) => analyzeResearchTopic(input),
});
