import type {
  ResearchAnalysis,
  ResearchComplexity,
} from "@/lib/ai/tools/analyze-research-topic";

const COMPLEXITY_STYLES: Record<ResearchComplexity, string> = {
  low: "bg-success-soft text-success",
  medium: "bg-accent-soft text-accent",
  high: "bg-danger-soft text-danger",
};

function scoreLabel(score: number) {
  if (score >= 70) return "Ready to plan";
  if (score >= 45) return "Needs focus";
  return "Needs narrowing";
}

export function ResearchAnalysisCard({ analysis }: { analysis: ResearchAnalysis }) {
  const { topic, researchGoal, researchScore, complexity, summary } = analysis;

  return (
    <article
      aria-label={`Research analysis: ${topic}`}
      className="min-w-0 rounded-card border border-border bg-surface p-4"
    >
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">
        Research analysis
      </p>
      <h3 className="mt-1 text-base font-semibold [overflow-wrap:anywhere]">
        {topic}
      </h3>
      {researchGoal ? (
        <p className="mt-1 text-sm text-muted [overflow-wrap:anywhere]">
          Goal: {researchGoal}
        </p>
      ) : null}

      <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-3">
          <dt className="text-xs font-medium text-muted">Research readiness</dt>
          <dd className="mt-1">
            <span className="text-2xl font-bold">{researchScore}</span>
            <span className="text-sm text-muted"> / 100 · {scoreLabel(researchScore)}</span>
            <span aria-hidden="true" className="mt-2 block h-1.5 overflow-hidden rounded-full bg-surface-muted">
              <span
                className="block h-full rounded-full bg-accent"
                style={{ width: `${researchScore}%` }}
              />
            </span>
          </dd>
        </div>
        <div className="rounded-lg border border-border p-3">
          <dt className="text-xs font-medium text-muted">Complexity</dt>
          <dd className="mt-2">
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-sm font-semibold capitalize ${COMPLEXITY_STYLES[complexity]}`}
            >
              {complexity}
            </span>
          </dd>
        </div>
      </dl>

      <p className="mt-4 text-sm leading-relaxed [overflow-wrap:anywhere]">{summary}</p>

      <AnalysisList title="Key questions" items={analysis.keyQuestions} ordered={false} />
      <AnalysisList title="Recommended next steps" items={analysis.recommendedNextSteps} ordered />
    </article>
  );
}

function AnalysisList({
  title,
  items,
  ordered,
}: {
  title: string;
  items: string[];
  ordered: boolean;
}) {
  const List = ordered ? "ol" : "ul";
  return (
    <section className="mt-4">
      <h4 className="text-sm font-semibold">{title}</h4>
      <List
        className={`mt-2 space-y-1.5 pl-5 text-sm leading-relaxed [overflow-wrap:anywhere] ${ordered ? "list-decimal" : "list-disc"}`}
      >
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </List>
    </section>
  );
}
