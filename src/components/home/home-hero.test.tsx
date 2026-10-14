import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HomeHero } from "./home-hero";

beforeEach(() => {
  // jsdom has neither WebGL nor matchMedia; the hero must still be fully usable.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});

describe("HomeHero", () => {
  it("puts the title, description and calls to action in the DOM", () => {
    render(<HomeHero />);

    const hero = screen.getByRole("region", { name: "AI Research Workspace" });
    expect(within(hero).getByRole("heading", { level: 1 })).toHaveTextContent(
      "AI Research Workspace",
    );
    expect(within(hero).getByText(/ask an AI research assistant/)).toBeInTheDocument();
    expect(within(hero).getByRole("link", { name: "Open Assistant" })).toHaveAttribute(
      "href",
      "/assistant",
    );
    expect(within(hero).getByRole("link", { name: "Explore Research" })).toHaveAttribute(
      "href",
      "/visualize",
    );
  });

  it("keeps the shader decorative and falls back when WebGL is missing", () => {
    const { container } = render(<HomeHero />);
    const canvas = container.querySelector("canvas");

    expect(canvas).toHaveAttribute("aria-hidden", "true");
    expect(canvas).toHaveAttribute("data-state", "unsupported");
    // The palette gradient behind the canvas stays visible as the fallback.
    expect(screen.getByRole("region", { name: "AI Research Workspace" }).style.backgroundImage).toContain(
      "linear-gradient",
    );
  });

  it("reaches both calls to action with the keyboard in reading order", async () => {
    const user = userEvent.setup();
    render(<HomeHero />);

    await user.tab();
    expect(screen.getByRole("link", { name: "Open Assistant" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("link", { name: "Explore Research" })).toHaveFocus();
  });
});
