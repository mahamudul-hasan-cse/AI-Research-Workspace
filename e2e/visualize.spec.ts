import { expect, test } from "@playwright/test";

test.describe("Visualize", () => {
  test("selects nodes, resets view, and fits at 375px without horizontal overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/visualize");

    await expect(page.getByRole("heading", { level: 1, name: /3D Research Topic Explorer/i })).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Research node details" })).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);

    await page.getByRole("button", { name: /Foley et al/i }).click();
    await expect(page.getByRole("region", { name: /selected node/i })).toContainText("Foley et al");

    await page.getByRole("button", { name: "Show 3D view" }).click();
    await page.getByRole("button", { name: "Reset view" }).click();

    await page.getByRole("button", { name: /Field season constraints/i }).click();
    await expect(page.getByRole("region", { name: /selected node/i })).toContainText(
      "Field season constraints",
    );
  });
});
