import { render, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FormEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { SendButton, type SendButtonState } from "./send-button";

function renderInForm(state: SendButtonState, canSend: boolean) {
  const onSubmit = vi.fn((event: FormEvent) => event.preventDefault());
  const { container } = render(
    <form onSubmit={onSubmit}>
      <SendButton state={state} canSend={canSend} />
    </form>,
  );
  return { onSubmit, button: within(container).getByRole("button") };
}

describe("SendButton", () => {
  it.each([
    { state: "idle", name: "Send" },
    { state: "loading", name: "Replying" },
    { state: "success", name: "Sent" },
    { state: "error", name: "Failed" },
  ] as const)("exposes only the $state label ($name) as its accessible name", ({ state, name }) => {
    const { button } = renderInForm(state, true);
    expect(button).toHaveAccessibleName(name);
    expect(button).toHaveAttribute("type", "submit");
  });

  it("is actionable when idle with text, and unavailable without text", () => {
    const { button } = renderInForm("idle", true);
    expect(button).toHaveAttribute("aria-disabled", "false");

    const { button: empty } = renderInForm("idle", false);
    expect(empty).toHaveAttribute("aria-disabled", "true");
  });

  it("is unavailable while loading, even when there is text", () => {
    const { button } = renderInForm("loading", true);
    expect(button).toHaveAttribute("aria-disabled", "true");
  });

  it.each(["success", "error"] as const)(
    "stays actionable during the %s flash so a new message can go out",
    (state) => {
      const { button } = renderInForm(state, true);
      expect(button).toHaveAttribute("aria-disabled", "false");
    },
  );

  it("can be reached with Tab and submits its form with Enter or Space", async () => {
    const user = userEvent.setup();
    const { button, onSubmit } = renderInForm("idle", true);

    await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it("stays focusable while unavailable so keyboard users keep their place", async () => {
    const user = userEvent.setup();
    const { button } = renderInForm("loading", true);

    await user.tab();
    expect(button).toHaveFocus();
    expect(button).toHaveAccessibleName("Replying");
  });
});
