import { test, expect } from "@playwright/test";

test.describe("Rig Check", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("#rig-check", { state: "visible", timeout: 10000 });
  });

  test("copies the Rig Check one-liner", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Copy the Rig Check command" }).click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain("rocktune.pedroferrari.com/check.ps1");
  });

  test("lists the checks", async ({ page }) => {
    const items = page.locator("#rig-check .rig-check__item");
    expect(await items.count()).toBeGreaterThan(3);
  });

  test("is linked from the nav", async ({ page }) => {
    await expect(page.locator('.links--desktop a[href="#rig-check"]')).toBeVisible();
  });
});
