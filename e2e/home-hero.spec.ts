import { expect, test, type Page } from "@playwright/test";

const canvas = (page: Page) => page.locator("[data-signal-field-host] canvas");

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
}

async function canvasSize(page: Page) {
  return canvas(page).evaluate((el: HTMLCanvasElement) => ({ width: el.width, height: el.height }));
}

test.describe("Home shader hero", () => {
  test("renders real content over an animating signal field on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1, name: "AI Research Workspace" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open Assistant" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Explore Research" })).toBeVisible();
    await expect(canvas(page)).toHaveAttribute("aria-hidden", "true");
    await expect(canvas(page)).toHaveAttribute("data-state", "animating");
    await expect(canvas(page)).toHaveAttribute("data-ready", "true");
    await expectNoHorizontalOverflow(page);

    // Backing store is the CSS size times a DPR capped at 1.5.
    const box = (await canvas(page).boundingBox())!;
    const size = await canvasSize(page);
    expect(size.width).toBeLessThanOrEqual(Math.ceil(box.width * 1.5));

    // Pointer movement over the hero must not break rendering.
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.4);
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5, { steps: 8 });
    await expect(canvas(page)).toHaveAttribute("data-state", "animating");
  });

  test("fits a 375px phone and resizes the canvas with the viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 740 });
    await page.goto("/");
    await expect(canvas(page)).toHaveAttribute("data-ready", "true");
    await expect(page.getByRole("link", { name: "Open Assistant" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Explore Research" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    const narrow = await canvasSize(page);

    await page.setViewportSize({ width: 1024, height: 740 });
    await expect.poll(async () => (await canvasSize(page)).width).toBeGreaterThan(narrow.width);
    await expectNoHorizontalOverflow(page);
  });

  test("pauses while the tab is hidden and resumes when it returns", async ({ page }) => {
    await page.goto("/");
    await expect(canvas(page)).toHaveAttribute("data-state", "animating");

    const setVisibility = (state: "hidden" | "visible") =>
      page.evaluate((value) => {
        Object.defineProperty(document, "visibilityState", { configurable: true, get: () => value });
        document.dispatchEvent(new Event("visibilitychange"));
      }, state);

    await setVisibility("hidden");
    await expect(canvas(page)).toHaveAttribute("data-state", "paused");
    await setVisibility("visible");
    await expect(canvas(page)).toHaveAttribute("data-state", "animating");
  });

  test("pauses when scrolled out of view", async ({ page }) => {
    // Stacked cards on a phone make the page tall enough to scroll the hero away.
    await page.setViewportSize({ width: 375, height: 600 });
    await page.goto("/");
    await expect(canvas(page)).toHaveAttribute("data-state", "animating");

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(canvas(page)).toHaveAttribute("data-state", "paused");
  });

  test("shows a static frame with reduced motion and stays usable", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    await expect(canvas(page)).toHaveAttribute("data-state", "static");
    await expect(canvas(page)).toHaveAttribute("data-ready", "true");
    await expect(page.getByRole("link", { name: "Open Assistant" })).toBeVisible();
  });

  test("calls to action are keyboard reachable with a visible focus ring", async ({ page }) => {
    await page.goto("/");
    const assistant = page.getByRole("link", { name: "Open Assistant" });
    await assistant.focus();
    await expect(assistant).toBeFocused();
    const outline = await assistant.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).not.toBe("none");

    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Explore Research" })).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/visualize$/);
  });
});
