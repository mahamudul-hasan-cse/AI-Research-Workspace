import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ResearchAnalysis } from "@/lib/ai/tools/research-analysis-schema";
import { ResearchAnalysisCard } from "./research-analysis-card";

const analysis: ResearchAnalysis = {
  topic: "Microplastics in freshwater fish in South Asia",
  researchGoal: "Write a thesis study",
  researchScore: 82,
  complexity: "high",
  keyQuestions: [
    "Which fish species are most exposed?",
    "How are microplastics measured in tissue?",
  ],
  recommendedNextSteps: [
    "Narrow the study to one river basin.",
    "Collect recent field sampling studies.",
    "Draft a sampling protocol.",
  ],
  summary: "A well-scoped topic with clear environmental relevance.",
};

/** Items of the list that follows the section heading `name`. */
function listUnder(card: HTMLElement, name: string) {
  const heading = within(card).getByRole("heading", { name, level: 4 });
  const section = heading.parentElement as HTMLElement;
  return within(within(section).getByRole("list"))
    .getAllByRole("listitem")
    .map((item) => item.textContent);
}

describe("ResearchAnalysisCard", () => {
  it("renders the topic, goal, score, complexity and summary", () => {
    render(<ResearchAnalysisCard analysis={analysis} />);

    const card = screen.getByRole("article", {
      name: "Research analysis: Microplastics in freshwater fish in South Asia",
    });
    expect(
      within(card).getByRole("heading", { level: 3, name: analysis.topic }),
    ).toBeInTheDocument();
    expect(within(card).getByText("Goal: Write a thesis study")).toBeInTheDocument();

    const readiness = within(card).getByText("Research readiness").nextElementSibling;
    expect(readiness).toHaveTextContent("82 / 100 · Ready to plan");
    const complexity = within(card).getByText("Complexity").nextElementSibling;
    expect(complexity).toHaveTextContent("high");

    expect(within(card).getByText(analysis.summary)).toBeInTheDocument();
  });

  it("lists key questions and next steps in order", () => {
    render(<ResearchAnalysisCard analysis={analysis} />);
    const card = screen.getByRole("article");

    expect(listUnder(card, "Key questions")).toEqual(analysis.keyQuestions);
    expect(listUnder(card, "Recommended next steps")).toEqual(analysis.recommendedNextSteps);
    // Next steps are a sequence, so they use an ordered list.
    const steps = within(card).getByRole("heading", { name: "Recommended next steps" }).nextElementSibling;
    expect(steps?.tagName).toBe("OL");
  });

  it.each([
    { score: 70, label: "Ready to plan" },
    { score: 69, label: "Needs focus" },
    { score: 45, label: "Needs focus" },
    { score: 44, label: "Needs narrowing" },
  ])("labels a score of $score as “$label”", ({ score, label }) => {
    render(<ResearchAnalysisCard analysis={{ ...analysis, researchScore: score }} />);
    expect(screen.getByText("Research readiness").nextElementSibling).toHaveTextContent(
      `${score} / 100 · ${label}`,
    );
  });

  it("explains empty sections instead of rendering empty lists", () => {
    render(
      <ResearchAnalysisCard
        analysis={{
          ...analysis,
          researchGoal: undefined,
          keyQuestions: [],
          recommendedNextSteps: [],
          summary: "  ",
        }}
      />,
    );
    const card = screen.getByRole("article");

    expect(within(card).queryByText(/^Goal:/)).not.toBeInTheDocument();
    expect(within(card).getByText("No summary was returned for this topic.")).toBeInTheDocument();
    expect(within(card).getAllByText("None suggested for this topic.")).toHaveLength(2);
    expect(within(card).queryByRole("list")).not.toBeInTheDocument();
  });
});
