import { expect, test } from "@playwright/test";

test.describe("Accessibility smoke", () => {
  test("skip link is present and keyboard focusable", async ({ page }) => {
    await page.goto("/");
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await skip.focus();
    await expect(skip).toBeFocused();
    await expect(page.locator("#main-content")).toHaveAttribute("id", "main-content");
  });

  test("assistant composer controls are keyboard reachable", async ({ page }) => {
    await page.goto("/assistant");
    await page.getByRole("textbox", { name: "Message the research assistant" }).focus();
    await expect(page.getByRole("textbox", { name: "Message the research assistant" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Send" })).toBeFocused();
  });
});
