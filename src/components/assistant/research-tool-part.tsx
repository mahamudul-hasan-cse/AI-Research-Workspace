import type { ReactNode } from "react";
import type { AnalyzeResearchTopicPart } from "@/lib/ai/tools";
import { analyzeResearchTopicOutputSchema } from "@/lib/ai/tools/research-analysis-schema";
import { ResearchAnalysisCard } from "./research-analysis-card";

const TOOL_LABEL = "analyzeResearchTopic";

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="size-3.5 shrink-0 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin"
    />
  );
}

function ToolStatus({
  tone = "default",
  busy,
  title,
  children,
}: {
  tone?: "default" | "muted";
  busy: boolean;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div
      aria-busy={busy}
      className={`min-w-0 rounded-card border border-dashed border-border p-3 text-sm ${tone === "muted" ? "text-muted" : ""}`}
    >
      <p className="flex items-center gap-2 font-medium">
        {busy ? <Spinner /> : null}
        {title}
        <code className="rounded bg-surface-muted px-1.5 py-0.5 text-xs font-normal text-muted">
          {TOOL_LABEL}
        </code>
      </p>
      {children}
    </div>
  );
}

function ToolInputDetails({ topic, researchGoal }: { topic?: string; researchGoal?: string }) {
  return (
    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
      <dt className="text-muted">Topic</dt>
      <dd className="min-w-0 [overflow-wrap:anywhere]">{topic || "…"}</dd>
      <dt className="text-muted">Goal</dt>
      <dd className="min-w-0 [overflow-wrap:anywhere]">{researchGoal || "Not specified"}</dd>
    </dl>
  );
}

function ToolError({ message }: { message: string }) {
  return (
    <div className="min-w-0 rounded-card border border-danger/40 bg-danger-soft p-3 text-sm">
      <p className="font-semibold text-danger">Research analysis failed</p>
      <p className="mt-1 [overflow-wrap:anywhere]">{message}</p>
      <p className="mt-1 text-muted">Try rephrasing the topic with a few more details.</p>
    </div>
  );
}

function ToolNotice({ title, message }: { title: string; message: string }) {
  return (
    <div role="note" className="min-w-0 rounded-card border border-border bg-surface p-3 text-sm">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-muted [overflow-wrap:anywhere]">{message}</p>
    </div>
  );
}

/**
 * Renders each lifecycle state of an analyzeResearchTopic tool call.
 * `active` is false once the response has ended (e.g. after Stop), so pending
 * states are shown as cancelled instead of loading forever.
 */
function toolStatusAnnouncement(part: AnalyzeResearchTopicPart, active: boolean): string {
  switch (part.state) {
    case "input-streaming":
      return active ? "Preparing research analysis." : "Research analysis cancelled.";
    case "input-available":
      return active ? "Analyzing research topic." : "Research analysis cancelled.";
    case "output-available":
      return "Research analysis complete.";
    case "output-error":
      return "Research analysis failed.";
    case "approval-requested":
    case "approval-responded":
    case "output-denied":
      return "Research analysis not run.";
  }
}

export function ResearchToolPart({
  part,
  active,
}: {
  part: AnalyzeResearchTopicPart;
  active: boolean;
}) {
  const announcement = toolStatusAnnouncement(part, active);

  let content: ReactNode;
  switch (part.state) {
    case "input-streaming":
      content = active ? (
        <ToolStatus busy title="Preparing research analysis">
          {part.input?.topic ? <ToolInputDetails topic={part.input.topic} /> : null}
        </ToolStatus>
      ) : (
        <ToolStatus tone="muted" busy={false} title="Research analysis cancelled" />
      );
      break;
    case "input-available":
      content = (
        <ToolStatus
          tone={active ? "default" : "muted"}
          busy={active}
          title={active ? "Analyzing research topic" : "Research analysis cancelled"}
        >
          <ToolInputDetails topic={part.input.topic} researchGoal={part.input.researchGoal} />
        </ToolStatus>
      );
      break;
    case "output-available": {
      // The stream is not validated client-side, so check the shape before rendering it.
      const parsed = analyzeResearchTopicOutputSchema.safeParse(part.output);
      if (!parsed.success) {
        content = (
          <ToolNotice
            title="Analysis result unavailable"
            message="The research analysis returned data in an unexpected format, so it can't be displayed."
          />
        );
        break;
      }
      const analysis = parsed.data;
      if (
        analysis.keyQuestions.length === 0 &&
        analysis.recommendedNextSteps.length === 0 &&
        analysis.summary.trim() === ""
      ) {
        content = (
          <ToolNotice
            title="No analysis results"
            message={`The analysis of “${analysis.topic}” didn't produce any findings. Try a more specific topic or add your research goal.`}
          />
        );
        break;
      }
      content = <ResearchAnalysisCard analysis={analysis} />;
      break;
    }
    case "output-error":
      content = (
        <ToolError message={part.errorText || "The analysis could not be completed."} />
      );
      break;
    case "approval-requested":
    case "approval-responded":
    case "output-denied":
      content = (
        <ToolStatus tone="muted" busy={false} title="Research analysis not run" />
      );
      break;
  }

  return (
    <>
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </p>
      {content}
    </>
  );
}
