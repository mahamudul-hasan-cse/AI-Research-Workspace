import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

// Run only against the local Playwright build, never against a paid model.
const baseURL = "http://localhost:3100";
const browser = await chromium.launch();
const page = await browser.newPage({ baseURL, viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
await page.route("**/api/chat", (route) =>
  route.request().headers()["x-chat-sabotage"] ? route.continue() : route.abort(),
);
await mkdir("docs/screenshots", { recursive: true });
const capture = (name) => page.screenshot({ path: `docs/screenshots/${name}.jpg`, type: "jpeg", quality: 78, animations: "disabled" });
try {
  await page.goto("/");
  await expect(page.locator("[data-signal-field-host] canvas")).toHaveAttribute("data-ready", "true");
  await capture("home-hero");
  await page.goto("/assistant?sabotage=mock,tool");
  const input = page.getByRole("textbox", { name: "Message the research assistant" });
  const phase = page.getByRole("region", { name: "Research assistant chat" }).getByRole("status").first();
  await input.fill("Explain freshwater research");
  await input.press("Enter");
  await expect(phase).toHaveText("Assistant is responding.");
  await expect(page.getByRole("region", { name: "Conversation" }).getByText(/This is a simulated/)).toBeVisible();
  await capture("streaming-assistant");
  await expect(phase).toHaveText("Assistant finished responding.");
  await input.fill("Analyze microplastics in freshwater fish");
  await input.press("Enter");
  const card = page.getByRole("article", { name: "Research analysis: microplastics in freshwater fish" });
  await expect(card).toBeVisible();
  await expect(phase).toHaveText("Assistant finished responding.");
  await page.setViewportSize({ width: 1280, height: 1100 });
  await card.screenshot({ path: "docs/screenshots/research-analysis.jpg", type: "jpeg", quality: 78 });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/visualize");
  await page.getByRole("button", { name: "Show 3D view" }).click();
  await expect(page.locator("canvas")).toBeVisible();
  // Wait for the scene's first painted frame, not merely the canvas mount.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await capture("visualizer");
  console.log("Captured four local demo screenshots; assistant responses are scripted.");
} finally {
  await browser.close();
}
