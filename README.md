# AI-Research-Workspace
AI-Research-Workspace

## AI assistant setup

The `/assistant` chat streams responses from
[OpenRouter](https://openrouter.ai) through the server-side `/api/chat` route,
using the `@openrouter/ai-sdk-provider` package with the Vercel AI SDK.

**Model:** `qwen/qwen3.8-flash` (Qwen3.8 Flash), a general chat and reasoning
model that supports streaming and tool calling. It is configured, with the
provider options, in `src/lib/ai/config.ts`. OpenRouter usage is billed per
token to your OpenRouter account.

1. Create an API key at [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys)
   and add credits to the account.
2. Create `.env.local` in the project root (it is git-ignored) containing:

   ```
   OPENROUTER_API_KEY=your-key-here
   ```

3. Restart `npm run dev`.

`OPENROUTER_API_KEY` is only read on the server. Do not prefix it with
`NEXT_PUBLIC_`. On Vercel, add the same variable under Project Settings →
Environment Variables.

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
summaries, or casual conversation. The model decides when to call it, guided by
the system prompt in `src/lib/ai/config.ts`.

**UI:** each tool call is rendered as a typed `tool-analyzeResearchTopic` part
(`src/components/assistant/research-tool-part.tsx`): "Preparing research
analysis" while the input streams, the parsed topic and goal while it runs, a
`ResearchAnalysisCard` with the result, or a designed error card on failure.

The tool's Zod schemas live in `src/lib/ai/tools/research-analysis-schema.ts`
so the client can re-validate results before rendering them.

## Send Button Motion

The assistant's Send button (`src/components/assistant/send-button.tsx`) moves
through idle, loading ("Replying"), success ("Sent", held 1.2 s) and error
("Failed", held 2.4 s), each with its own icon and label, so state never relies
on color alone. Labels cross-fade over 200 ms on `cubic-bezier(0.2, 0, 0, 1)`
(fast start, gentle settle), hover and press feedback take 150 ms and 75 ms,
and all labels share one grid cell so the button keeps a fixed width. Only
`opacity` and `transform` (`translate`/`scale`) are animated, including the
success/error fills, which are opacity overlays, so changes run on the
compositor without layout or repaint work. With `prefers-reduced-motion:
reduce`, all movement is removed (no slide, lift, press-scale or spinning
icon) and only the short opacity cross-fade remains.

## Error and Edge-State Handling

The `/assistant` chat (`src/components/assistant/chat.tsx`) handles these
states deliberately:

| State                        | Behavior                                                                                                   |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| First run                    | Designed empty state with three example prompts; picking one fills the input (it is not sent).             |
| Empty / whitespace input     | Nothing is sent; an inline "Type a message before sending." hint appears and clears when you type.         |
| Slow response                | A skeleton shaped like an assistant message appears at once; after 8 s it adds a "still working" note.     |
| Network failure before reply | "Message not delivered" card under your message, with Retry.                                              |
| Failure mid-stream           | The partial answer is kept and a "Response interrupted" card is attached inside that reply, with Retry.    |
| Rate limit / quota           | "Usage limit reached" with the mapped quota message; the input stays usable and drafts are kept.          |
| Tool failure                 | The structured "Research analysis failed" card; the conversation continues normally.                      |
| Empty tool result            | "No analysis results" notice, or per-section "None suggested" text when only some fields are empty.        |
| Malformed tool result        | "Analysis result unavailable" notice instead of raw data. The server turns it into a tool error in history so later turns still validate. |
| Render crash                 | `src/app/assistant/error.tsx` (and `src/app/error.tsx` for other routes) shows a recovery card with Try again and Go to home. |

`src/app/assistant/loading.tsx` shows a chat-shaped skeleton while the route
loads.

**Retry** calls the AI SDK's `regenerate()`, which re-runs only the failed
turn: it resends the last user message, or replaces a partial reply.
Earlier messages are untouched. The button is hidden while a request is in
flight and guarded against double clicks, so one click is one request.

**Testing failures (development/testing only).** `src/lib/testing/` contains
a failure-injection hook that is active only in `next dev` or in a build made
with `NEXT_PUBLIC_ENABLE_CHAT_SABOTAGE=1`. `next.config.ts` inlines the flag at
build time, so a normal production build drops the server-side scenarios and
the client hooks are inert; setting the variable at runtime has no effect.
Add `?sabotage=` to `/assistant` with
a comma-separated list; each chat request consumes the next mode:

| Mode             | Simulates                                       |
| ---------------- | ----------------------------------------------- |
| `network`        | `fetch` rejects before reaching the server      |
| `midstream`      | Partial text, then a stream error               |
| `rate-limit`     | The mapped provider rate-limit (429) error      |
| `malformed-tool` | A tool result that does not match its schema    |
| `empty-tool`     | A valid tool result with no findings            |
| `slow`           | ~9 s before the first token                     |
| `mock`           | A successful reply without calling the model    |
| `render`         | The chat component throws, to test `error.tsx`  |

For example, `/assistant?sabotage=midstream,mock` fails the first reply
midway and lets the retry succeed. Simulated modes never call OpenRouter, so they
cost nothing.

## 3D Research Topic Explorer

The `/visualize` route shows a **3D Research Topic Explorer**: a central thesis
topic with connected nodes for sources, questions, notes, findings, and related
themes. Click a sphere (or a list item) to select a node; the same title, type,
and details appear in a normal DOM panel beside the canvas. **Reset view**
returns the camera to its default angle. Data is deterministic and local
(`src/lib/visualize/topic-graph-data.ts`) — no extra API.

**Libraries:** [React Three Fiber](https://docs.pmnd.rs/react-three-fiber),
[Three.js](https://threejs.org/), and
[@react-three/drei](https://github.com/pmndrs/drei) (`OrbitControls`, `Line`).
Procedural spheres and lines only — no GLB assets.

**Bundle impact:** the 3D code is lazy-loaded with `next/dynamic` (`ssr: false`),
so other routes do not pay for Three.js up front. After `npm run build`, the
lazy Three.js chunk is about **951 KB minified** (about **280 KB gzip**), dominated by
`three` and `@react-three/drei`. The `/visualize` page shell loads separately;
exact hashes change each build — search `.next/static/chunks/` for the dynamic
import after building.

**Performance choices:** small low-segment sphere geometry, capped device pixel
ratio (`dpr` max 1.75), selection state kept in React (not per-frame), edges
precomputed with `useMemo`, and no external models.

**Fallbacks:** if WebGL is missing, a static map and the same node list are
shown. With `prefers-reduced-motion: reduce`, orbit damping is disabled and
rotate speed is lowered; status text explains the change.

**With more time:** instanced meshes for many nodes, keyboard focus rings tied
to 3D selection, gentle layout animation only when motion is allowed, and
optional import of a real workspace graph from saved research data.

## Testing

No test calls OpenRouter or any other AI service, and none needs an API key.

| Command                 | Runs                                                        |
| ----------------------- | ----------------------------------------------------------- |
| `npm test`              | Vitest component and integration tests (jsdom), once        |
| `npm run test:watch`    | Vitest in watch mode                                        |
| `npm run test:coverage` | Vitest with V8 coverage (text summary + `coverage/` HTML)   |
| `npm run test:e2e`      | Playwright end-to-end test in Chromium                      |
| `npm run typecheck`     | `tsc --noEmit`                                              |

**Component tests** (`src/**/*.test.tsx`, setup in `src/test/setup.ts`) use
React Testing Library and query by role, accessible name or visible text. They
cover the chat's pending, streaming, error and Retry states, the Send button
states, the research analysis card, and the validated "Create workspace" form
from the playground. Chat tests replace `fetch` with a hand-driven stream in
the AI SDK's UI message format (`src/test/chat-stream.ts`), so each
intermediate state is checked without timers; any fetch a test has not mocked
fails the test.

**End-to-end test** (`e2e/assistant.spec.ts`) builds the app with the test-only
sabotage hooks (`NEXT_PUBLIC_ENABLE_CHAT_SABOTAGE=1`) and a placeholder key,
starts it on port 3100, then asks a question on `/assistant`, watches the
scripted reply stream in, triggers a mid-stream failure and recovers with
Retry. It aborts any chat request without a scripted reply. Because it
rebuilds `.next` with the test hooks, run `npm run build` again before
`npm start` if you want a normal production build locally. First run:
`npx playwright install chromium`.

**CI** (`.github/workflows/ci.yml`) runs on every push and pull request:
`npm ci`, lint, typecheck, Vitest, production build, then Playwright (Chromium
and its system dependencies are installed, with the browser cached). The
Playwright report is uploaded when the job fails.
