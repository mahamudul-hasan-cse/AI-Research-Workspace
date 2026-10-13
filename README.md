# AI-Research-Workspace
AI-Research-Workspace

## AI assistant setup

The `/assistant` chat streams responses from Google Gemini through the
server-side `/api/chat` route.

1. Create a free API key in [Google AI Studio](https://aistudio.google.com/apikey).
2. Create `.env.local` in the project root (it is git-ignored) containing:

   ```
   GOOGLE_GENERATIVE_AI_API_KEY=your-key-here
   ```

3. Restart `npm run dev`.

The key is only read on the server. Do not prefix it with `NEXT_PUBLIC_`.
On Vercel, add the same variable under Project Settings → Environment Variables.

## AI Tool Contract

The assistant has one server-side tool, defined in
`src/lib/ai/tools/analyze-research-topic.ts` and registered in
`src/app/api/chat/route.ts`.

**Tool name:** `analyzeResearchTopic`

**Purpose:** analyze a research topic and return structured guidance for the
AI Research Workspace. The analysis is deterministic and offline: it is derived
from the wording of the topic and goal, and does not call any external API or
search the literature. The score measures how clearly the topic is framed, not
the quality of existing research.

**Input schema (Zod):**

| Field          | Type                         | Notes                                              |
| -------------- | ---------------------------- | -------------------------------------------------- |
| `topic`        | `string`, 2–200 chars        | The topic in the user's own words.                 |
| `researchGoal` | `string`, ≤300 chars, optional | Only if the user stated a goal; never invented.  |

**Return shape:**

```ts
{
  topic: string;
  researchGoal?: string;
  researchScore: number; // integer 0-100, research readiness
  complexity: "low" | "medium" | "high";
  keyQuestions: string[];
  recommendedNextSteps: string[];
  summary: string;
}
```

If the topic has too little content to analyze, the tool fails with a
human-readable message, shown in the chat as a "Research analysis failed" card.

**When the model should call it:** when the user asks for topic evaluation,
research-readiness analysis, research planning, or structured research guidance
for a topic. It should not be called for general questions, explanations,
summaries, or casual conversation. Gemini decides when to call it, guided by
the system prompt in `src/lib/ai/config.ts`.

**UI:** each tool call is rendered as a typed `tool-analyzeResearchTopic` part
(`src/components/assistant/research-tool-part.tsx`): "Preparing research
analysis" while the input streams, the parsed topic and goal while it runs, a
`ResearchAnalysisCard` with the result, or a designed error card on failure.
