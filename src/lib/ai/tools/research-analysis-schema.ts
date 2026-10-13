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

/** Shared by the tool definition and the client, which re-validates output before rendering. */
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
