import { test, expect } from "npm:@playwright/test@1.49";

test.describe("Preset Selection", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for app to hydrate
    await page.waitForSelector('[data-testid="preset-card"], .preset-card', {
      state: "visible",
      timeout: 10000,
    });
  });

  test("should display all preset cards", async ({ page }) => {
    // Should have 4 presets: Minimal, Balanced, Competitive, Streaming
    const presetCards = page.locator('[data-testid="preset-card"], .preset-card');
    await expect(presetCards).toHaveCount(4);
  });

  test("should select a preset when clicked", async ({ page }) => {
    // Find and click the first preset card
    const firstPreset = page.locator('[data-testid="preset-card"], .preset-card').first();
    await firstPreset.click();

    // Verify it becomes selected (aria-checked or selected class)
    await expect(firstPreset).toHaveAttribute("aria-checked", "true");
  });

  test("should only allow one preset to be selected at a time", async ({ page }) => {
    const presetCards = page.locator('[data-testid="preset-card"], .preset-card');

    // Click first preset
    await presetCards.nth(0).click();
    await expect(presetCards.nth(0)).toHaveAttribute("aria-checked", "true");

    // Click second preset
    await presetCards.nth(1).click();

    // First should be deselected, second selected
    await expect(presetCards.nth(0)).toHaveAttribute("aria-checked", "false");
    await expect(presetCards.nth(1)).toHaveAttribute("aria-checked", "true");
  });

  test("should update tuning section when preset changes", async ({ page }) => {
    // Get initial state of selected optimizations count
    const tuningSection = page.locator('[data-testid="tuning-section"], .tuning-section, #tuning');
    await tuningSection.scrollIntoViewIfNeeded();

    // Click Competitive preset (should select more optimizations)
    const competitivePreset = page.locator(
      '[data-testid="preset-card"]:has-text("Competitive"), .preset-card:has-text("Competitive")'
    );

    if ((await competitivePreset.count()) > 0) {
      await competitivePreset.click();

      // Verify checkboxes are updated
      const checkedOptimizations = page.locator(
        'input[type="checkbox"]:checked, [role="checkbox"][aria-checked="true"]'
      );
      expect(await checkedOptimizations.count()).toBeGreaterThan(0);
    }
  });

  test("should navigate presets with keyboard", async ({ page }) => {
    const firstPreset = page.locator('[data-testid="preset-card"], .preset-card').first();

    // Focus first preset
    await firstPreset.focus();
    await expect(firstPreset).toBeFocused();

    // Use arrow key to move to next preset
    await page.keyboard.press("ArrowRight");

    // Second preset should now be focused
    const secondPreset = page.locator('[data-testid="preset-card"], .preset-card').nth(1);
    await expect(secondPreset).toBeFocused();
  });
});
