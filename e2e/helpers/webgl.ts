import { expect, test as base, type Page, type TestInfo } from "@playwright/test";

// Browser WebGL warnings are expected on unsupported machines; uncaught page
// exceptions are not. Check them for both the rendering and fallback paths.
export const test = base.extend<{ runtimeErrors: string[] }>({
  runtimeErrors: [async ({ page }, use) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await use(errors);
    expect(errors, "Graphics and fallback flows must not crash").toEqual([]);
  }, { auto: true }],
});

export { expect };
export const heroCanvas = (page: Page) => page.locator("[data-signal-field-host] canvas");

function recordCapability(supported: boolean, info: TestInfo, feature: string) {
  if (info.project.metadata.requireWebGL) {
    expect(supported, "This project must exercise real WebGL, not only fallbacks").toBe(true);
  }
  if (info.project.metadata.requireWebGLFallback) {
    expect(supported, "This project must exercise the browser's genuine WebGL fallback").toBe(false);
  }
  info.annotations.push({ type: "webgl", description: `${feature}: ${supported ? "real rendering" : "fallback"}` });
}

export async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )).toBe(0);
}

export async function expectHeroUsable(page: Page) {
  await expect(page.getByRole("heading", { level: 1, name: "AI Research Workspace" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Assistant" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Assistant" })).toHaveAttribute("href", "/assistant");
  await expect(page.getByRole("link", { name: "Explore Research" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Explore Research" })).toHaveAttribute("href", "/visualize");
  await expect(heroCanvas(page)).toHaveAttribute("aria-hidden", "true");
  await expectNoHorizontalOverflow(page);
}

export async function expectHeroFallback(page: Page) {
  await expectHeroUsable(page);
  await expect(heroCanvas(page)).toHaveAttribute("data-state", "unsupported");
  await expect(heroCanvas(page)).not.toHaveAttribute("data-ready", "true");
  await expect(heroCanvas(page)).toHaveCSS("opacity", "0");
  await expect(page.locator("[data-signal-field-host]")).toHaveCSS("background-image", /gradient/);
}

/** Wait for initialization instead of treating a missing state as no WebGL. */
export async function waitForHero(page: Page, info: TestInfo, motion = "animating") {
  await expect(heroCanvas(page)).toHaveAttribute("data-state", new RegExp(`^(${motion}|unsupported)$`));
  const supported = await heroCanvas(page).getAttribute("data-state") !== "unsupported";
  recordCapability(supported, info, "hero");
  if (supported) await expect(heroCanvas(page)).toHaveAttribute("data-ready", "true");
  else await expectHeroFallback(page);
  return supported;
}

/** The app's hydrated UI, rather than a separate context probe, is authoritative. */
export async function waitForVisualize(page: Page, info: TestInfo) {
  const show3d = page.getByRole("button", { name: "Show 3D view" });
  const map = page.getByRole("img", { name: /^Research map for / });
  await expect.poll(async () => (await show3d.isVisible()) || (await map.isVisible()), {
    message: "Visualize must resolve to either on-demand 3D or the static map",
  }).toBe(true);
  const supported = await show3d.isVisible();
  recordCapability(supported, info, "visualize");
  return supported;
}
