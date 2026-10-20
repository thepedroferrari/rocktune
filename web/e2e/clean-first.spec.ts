import { test, expect } from "npm:@playwright/test@1.49";

test.describe("Clean Windows first", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("#clean-first", { state: "visible", timeout: 10000 });
  });

  test("links both cleanup tools in a new tab", async ({ page }) => {
    const section = page.locator("#clean-first");
    for (const url of [
      "https://github.com/ChrisTitusTech/winutil",
      "https://github.com/Raphire/Win11Debloat",
    ]) {
      const link = section.locator(`a[href="${url}"]`);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", /noopener/);
    }
  });

  test("copies the WinUtil command", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Copy the WinUtil command" }).click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain("christitus.com/win");
  });

  test("lists the compatibility checks", async ({ page }) => {
    const items = page.locator("#clean-first .compat__item");
    expect(await items.count()).toBeGreaterThan(3);
  });

  test("has no horizontal scroll on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator("#clean-first").scrollIntoViewIfNeeded();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
