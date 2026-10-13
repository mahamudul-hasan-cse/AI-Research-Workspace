import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessageStreamWriter,
} from "ai";
import { toClientErrorMessage } from "@/lib/ai/errors";
import type { ResearchUIMessage } from "@/lib/ai/tools";
import {
  CHAT_SABOTAGE_ENABLED,
  parseSabotageMode,
  SABOTAGE_HEADER,
  type SabotageMode,
} from "./chat-sabotage";

/**
 * TEST-ONLY synthetic responses for /api/chat. Returns undefined (so the real
 * model path runs) unless sabotage is enabled and the request asks for it.
 */
export function sabotageResponse(req: Request): Response | undefined {
  if (!CHAT_SABOTAGE_ENABLED) return undefined;
  const mode = parseSabotageMode(req.headers.get(SABOTAGE_HEADER));
  if (!mode || mode === "network" || mode === "render") return undefined;
  return createUIMessageStreamResponse({
    stream: createUIMessageStream<ResearchUIMessage>({
      execute: ({ writer }) => runScenario(mode, writer, req.signal),
    }),
  });
}

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    });
  });

async function streamText(
  writer: UIMessageStreamWriter<ResearchUIMessage>,
  id: string,
  text: string,
  signal: AbortSignal,
) {
  writer.write({ type: "text-start", id });
  for (const word of text.split(/(?<= )/)) {
    if (signal.aborted) return;
    writer.write({ type: "text-delta", id, delta: word });
    await wait(60, signal);
  }
  writer.write({ type: "text-end", id });
}

async function runScenario(
  mode: Exclude<SabotageMode, "network" | "render">,
  writer: UIMessageStreamWriter<ResearchUIMessage>,
  signal: AbortSignal,
) {
  writer.write({ type: "start-step" });
  switch (mode) {
    case "midstream":
      await streamText(writer, "t1", "This is a partial answer that will be interrupted before it finishes. ", signal);
      writer.write({ type: "error", errorText: toClientErrorMessage(new Error("simulated mid-stream failure")) });
      return;
    case "rate-limit":
      writer.write({
        type: "error",
        errorText: toClientErrorMessage(new Error("429 RESOURCE_EXHAUSTED: quota exceeded (simulated)")),
      });
      return;
    case "malformed-tool":
    case "empty-tool": {
      const toolCallId = `sabotage-${Date.now()}`;
      const input = { topic: "simulated research topic" };
      writer.write({ type: "tool-input-start", toolCallId, toolName: "analyzeResearchTopic" });
      writer.write({ type: "tool-input-available", toolCallId, toolName: "analyzeResearchTopic", input });
      await wait(400, signal);
      writer.write({
        type: "tool-output-available",
        toolCallId,
        output:
          mode === "empty-tool"
            ? { topic: input.topic, researchScore: 0, complexity: "low", keyQuestions: [], recommendedNextSteps: [], summary: "" }
            : { topic: input.topic, researchScore: "very high", complexity: "unknown" },
      });
      writer.write({ type: "finish-step" });
      writer.write({ type: "start-step" });
      await streamText(writer, "t2", "The analysis did not return usable results for this topic. ", signal);
      break;
    }
    case "slow":
      await wait(9000, signal);
      await streamText(writer, "t1", "This simulated reply arrived after a long delay. ", signal);
      break;
    case "mock":
      await streamText(writer, "t1", "This is a simulated reply from test mode, so no model request was made. ", signal);
      break;
  }
  writer.write({ type: "finish-step" });
}
