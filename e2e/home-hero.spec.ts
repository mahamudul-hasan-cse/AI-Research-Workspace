import type { Page } from "@playwright/test";
import {
  expect, test, heroCanvas as canvas, expectHeroFallback, expectHeroUsable,
  expectNoHorizontalOverflow, waitForHero,
} from "./helpers/webgl";

async function canvasSize(page: Page) {
  return canvas(page).evaluate((el: HTMLCanvasElement) => ({ width: el.width, height: el.height }));
}

test.describe("Home shader hero", () => {
  test("renders usable content over the signal field or its fallback on desktop", async ({ page }, info) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    const supported = await waitForHero(page, info);
    await expectHeroUsable(page);
    console.info(`Home WebGL: ${supported ? "real shader" : "static fallback"}`);

    // Backing store is the CSS size times a DPR capped at 1.5.
    const box = (await canvas(page).boundingBox())!;
    if (supported) {
      const size = await canvasSize(page);
      expect(size.width).toBeLessThanOrEqual(Math.ceil(box.width * 1.5));
    }

    // Pointer movement over the hero must not break rendering.
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.4);
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5, { steps: 8 });
    await expect(canvas(page)).toHaveAttribute("data-state", supported ? "animating" : "unsupported");
    if (!supported) await expectHeroFallback(page);
  });

  test("fits a 375px phone and resizes the canvas or fallback with the viewport", async ({ page }, info) => {
    await page.setViewportSize({ width: 375, height: 740 });
    await page.goto("/");
    const supported = await waitForHero(page, info);
    await expectHeroUsable(page);
    const narrow = await canvasSize(page);
    const narrowBox = (await canvas(page).boundingBox())!;

    await page.setViewportSize({ width: 1024, height: 740 });
    await expect.poll(async () => (await canvas(page).boundingBox())!.width).toBeGreaterThan(narrowBox.width);
    if (supported) {
      await expect.poll(async () => (await canvasSize(page)).width).toBeGreaterThan(narrow.width);
    } else {
      await expectHeroFallback(page);
    }
    await expectHeroUsable(page);
  });

  test("pauses while hidden or keeps the static fallback usable", async ({ page }, info) => {
    await page.goto("/");
    const supported = await waitForHero(page, info);

    const setVisibility = (state: "hidden" | "visible") =>
      page.evaluate((value) => {
        Object.defineProperty(document, "visibilityState", { configurable: true, get: () => value });
        document.dispatchEvent(new Event("visibilitychange"));
      }, state);

    await setVisibility("hidden");
    await expect(canvas(page)).toHaveAttribute("data-state", supported ? "paused" : "unsupported");
    await setVisibility("visible");
    await expect(canvas(page)).toHaveAttribute("data-state", supported ? "animating" : "unsupported");
    if (!supported) await expectHeroFallback(page);
  });

  test("pauses offscreen or preserves the usable fallback after scrolling", async ({ page }, info) => {
    // Stacked cards on a phone make the page tall enough to scroll the hero away.
    await page.setViewportSize({ width: 375, height: 600 });
    await page.goto("/");
    const supported = await waitForHero(page, info);

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(canvas(page)).toHaveAttribute("data-state", supported ? "paused" : "unsupported");
    await expectNoHorizontalOverflow(page);
    if (!supported) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await expectHeroFallback(page);
    }
  });

  test("shows a static frame or gradient with reduced motion and stays usable", async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    await waitForHero(page, info, "static");
    await expectHeroUsable(page);
  });

  test("calls to action work with the keyboard in either rendering mode", async ({ page }, info) => {
    await page.goto("/");
    await waitForHero(page, info);
    await expectHeroUsable(page);
    const assistant = page.getByRole("link", { name: "Open Assistant" });
    await assistant.focus();
    await expect(assistant).toBeFocused();
    const outline = await assistant.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).not.toBe("none");

    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Explore Research" })).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/visualize$/);

    await page.goBack();
    await waitForHero(page, info);
    await assistant.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/assistant$/);
  });
});
