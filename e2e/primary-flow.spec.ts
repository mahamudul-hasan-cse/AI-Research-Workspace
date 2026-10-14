import { expect, test } from "@playwright/test";

test("navigates, stops a reply, sends again and renders a structured tool result", async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  await page.route("**/api/chat", (route) =>
    route.request().headers()["x-chat-sabotage"] ? route.continue() : route.abort(),
  );

  await page.goto("/");
  await page.getByRole("link", { name: "Open Assistant" }).click();
  await expect(page).toHaveURL(/\/assistant$/);
  await page.goto("/assistant?sabotage=slow,tool");
  const input = page.getByRole("textbox", { name: "Message the research assistant" });
  const phase = page.getByRole("region", { name: "Research assistant chat" }).getByRole("status").first();
  await input.fill("Explain freshwater research");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(phase).toHaveText("Assistant is thinking.");
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(phase).toHaveText("Response stopped.");
  await expect(input).toBeFocused();

  await input.fill("Analyze microplastics in freshwater fish");
  await input.press("Enter");
  const card = page.getByRole("article", { name: "Research analysis: microplastics in freshwater fish" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Research readiness");
  await expect(card).toContainText("Recommended next steps");
  await expect(phase).toHaveText("Assistant finished responding.");

  await page.goto("/visualize");
  await page.getByRole("button", { name: /Foley et al/i }).click();
  await expect(page.getByRole("region", { name: /selected node/i })).toContainText("Foley et al");
  await page.goto("/playground");
  // WebKit does not necessarily focus mouse-clicked buttons. Open with the
  // keyboard so focus restoration has an explicit, portable starting point.
  const modalTrigger = page.getByRole("button", { name: "Open modal" });
  await modalTrigger.focus();
  await modalTrigger.press("Enter");
  await expect(page.getByRole("dialog", { name: "Create workspace" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(modalTrigger).toBeFocused();
  expect(runtimeErrors).toEqual([]);
});
