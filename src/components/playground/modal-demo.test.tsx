import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ModalDemo, validateWorkspaceName } from "./modal-demo";

async function openForm() {
  const user = userEvent.setup();
  render(<ModalDemo />);
  await user.click(screen.getByRole("button", { name: "Open modal" }));
  const dialog = screen.getByRole("dialog", { name: "Create workspace" });
  const nameInput = within(dialog).getByRole("textbox", { name: "Workspace name" });
  const save = within(dialog).getByRole("button", { name: "Save" });
  return { user, dialog, nameInput, save };
}

describe("Create workspace form", () => {
  it("blocks an empty name with an accessible error and keeps the dialog open", async () => {
    const { user, dialog, nameInput, save } = await openForm();

    await user.click(save);

    expect(within(dialog).getByRole("alert")).toHaveTextContent("Enter a workspace name.");
    expect(nameInput).toHaveAttribute("aria-invalid", "true");
    expect(nameInput).toHaveAccessibleDescription("Enter a workspace name.");
    expect(nameInput).toHaveFocus();
    expect(screen.getByRole("dialog", { name: "Create workspace" })).toBeInTheDocument();
    expect(screen.getByText("Nothing saved yet.")).toBeInTheDocument();
  });

  it("rejects a name that is too short, then clears the error once it is fixed", async () => {
    const { user, dialog, nameInput } = await openForm();

    await user.type(nameInput, "ab{Enter}");
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Use at least 3 characters.");

    await user.type(nameInput, "c");
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
    expect(nameInput).not.toHaveAttribute("aria-invalid");
  });

  it("saves a valid name, closes the dialog and announces the result", async () => {
    const { user, nameInput, save } = await openForm();

    await user.type(nameInput, "  Thesis notes  ");
    await user.click(screen.getByRole("checkbox", { name: "Pin to sidebar" }));
    await user.click(save);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Saved: Thesis notes (pinned)")).toBeInTheDocument();
    // Focus returns to the button that opened the dialog.
    expect(screen.getByRole("button", { name: "Open modal" })).toHaveFocus();
  });
});

describe("validateWorkspaceName", () => {
  it.each([
    { value: "", error: "Enter a workspace name." },
    { value: "   ", error: "Enter a workspace name." },
    { value: " ab ", error: "Use at least 3 characters." },
    { value: "x".repeat(61), error: "Use 60 characters or fewer." },
    { value: "abc", error: null },
    { value: "x".repeat(60), error: null },
  ])("returns $error for “$value”", ({ value, error }) => {
    expect(validateWorkspaceName(value)).toBe(error);
  });
});
