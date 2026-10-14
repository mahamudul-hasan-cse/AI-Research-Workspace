import { expect, test, expectNoHorizontalOverflow, waitForVisualize } from "./helpers/webgl";

test.describe("Visualize", () => {
  test("selects nodes in 3D or the static fallback and fits at 375px", async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/visualize");

    await expect(page.getByRole("heading", { level: 1, name: /3D Research Topic Explorer/i })).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Research node details" })).toBeVisible();

    const supported = await waitForVisualize(page, info);
    console.info(`Visualize WebGL: ${supported ? "real 3D" : "static map and DOM list"}`);
    await expectNoHorizontalOverflow(page);

    await page.getByRole("button", { name: /Foley et al/i }).click();
    await expect(page.getByRole("region", { name: /selected node/i })).toContainText("Foley et al");

    if (supported) {
      await page.getByRole("button", { name: "Show 3D view" }).click();
      // Three.js sets this marker after successfully creating its real renderer.
      const scene = page.getByRole("region", { name: "3D Research Topic Explorer", exact: true }).locator("canvas");
      await expect(scene).toBeVisible();
      await expect(scene).toHaveAttribute("data-engine", /^three\.js /);
      await expect(page.getByRole("button", { name: "Reset view" })).toBeEnabled();
      await page.getByRole("button", { name: "Reset view" }).click();
    } else {
      const map = page.getByRole("img", { name: /^Research map for / });
      await expect(map).toBeVisible();
      await expect(map.getByText("Static research map", { exact: true })).toBeVisible();
      await expect(map.getByText(/Currently selected:/)).toContainText("Foley et al");
      await expect(page.getByText(/WebGL is not available in this browser/)).toBeVisible();
      await expect(page.getByRole("button", { name: "Show 3D view" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Reset view" })).toBeDisabled();
      await expect(page.locator("canvas")).toHaveCount(0);
    }

    await page.getByRole("button", { name: /Field season constraints/i }).click();
    await expect(page.getByRole("region", { name: /selected node/i })).toContainText(
      "Field season constraints",
    );
    await expect(page.getByRole("button", { name: /Field season constraints/i })).toHaveAttribute("aria-pressed", "true");
    if (!supported) {
      const map = page.getByRole("img", { name: /^Research map for / });
      await expect(map.getByText(/Currently selected:/)).toContainText("Field season constraints");
    }
    await expectNoHorizontalOverflow(page);
  });
});
