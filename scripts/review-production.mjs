import { chromium, expect } from "@playwright/test";

const baseURL = process.argv[2] ?? "https://ai-research-workspace-three.vercel.app";
const browser = await chromium.launch();
const context = await browser.newContext({ baseURL, viewport: { width: 1280, height: 800 } });
const errors = [];
// Read-only production review: no chat request may reach the paid provider.
await context.route("**/api/chat", (route) => route.abort());
try {
  for (const [path, heading] of [
    ["/", "AI Research Workspace"], ["/assistant", "Assistant"],
    ["/visualize", "3D Research Topic Explorer"], ["/health", "Health"], ["/playground", "Playground"],
  ]) {
    const page = await context.newPage();
    page.on("pageerror", () => errors.push(`${path}: uncaught browser error`));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(`${path}: browser console error`);
    });
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: heading, exact: true })).toBeVisible();
    if (path === "/") {
      await expect(page.locator("[data-signal-field-host] canvas")).toHaveAttribute("data-ready", "true");
      await page.getByRole("link", { name: "Open Assistant" }).click();
      await expect(page).toHaveURL(/\/assistant$/);
    }
    if (path === "/assistant") {
      await expect(page.getByRole("textbox", { name: "Message the research assistant" })).toBeVisible();
      // The render-crash test hook must be inert in a normal deployed build.
      await page.goto("/assistant?sabotage=render");
      await expect(page.getByRole("textbox", { name: "Message the research assistant" })).toBeVisible();
    }
    if (path === "/visualize") {
      await page.getByRole("button", { name: /Foley et al/i }).click();
      await expect(page.getByRole("region", { name: /selected node/i })).toContainText("Foley et al");
      await page.getByRole("button", { name: "Show 3D view" }).click();
      await expect(page.locator("canvas")).toBeVisible();
    }
    if (path === "/health") await expect(page.getByText("All systems operational")).toBeVisible();
    if (path === "/playground") {
      await page.getByRole("button", { name: "Open modal" }).click();
      await expect(page.getByRole("dialog", { name: "Create workspace" })).toBeVisible();
      await page.keyboard.press("Escape");
    }
    console.log(`PASS ${baseURL}${path} (HTTP 200, expected content and interaction)`);
    await page.close();
  }
  const health = await context.request.get("/api/health");
  expect(health.status()).toBe(200);
  const payload = await health.json();
  expect(payload.status).toBe("ok");
  console.log(`PASS /api/health: status=${payload.status}, environment=${payload.environment}`);
  // Invalid input is rejected before any model call; 400 also distinguishes
  // configured chat from the route's missing-key 503. This does not verify the key.
  const invalidChat = await context.request.post("/api/chat", { data: { messages: [] } });
  expect(invalidChat.status()).toBe(400);
  console.log("PASS /api/chat: configuration present and invalid input rejected before model work.");
  expect(errors).toEqual([]);
  console.log("PASS: no uncaught browser or console errors on reviewed routes; no model requests made.");
} finally {
  await context.close();
  await browser.close();
}
