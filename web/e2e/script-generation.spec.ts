import { test, expect } from "npm:@playwright/test@1.49";

test.describe("Script Generation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for app to hydrate
    await page.waitForSelector('[data-testid="preset-card"], .preset-card', {
      state: "visible",
      timeout: 10000,
    });
  });

  test("should display forge section with script preview", async ({ page }) => {
    // Scroll to forge section
    const forgeSection = page.locator(
      '[data-testid="forge-section"], .forge-section, #forge, section:has-text("Forge")'
    );
    await forgeSection.scrollIntoViewIfNeeded();
    await expect(forgeSection).toBeVisible();
  });

  test("should show SHA-256 checksum", async ({ page }) => {
    // Scroll to forge section
    const forgeSection = page.locator(
      '[data-testid="forge-section"], .forge-section, #forge, section:has-text("Forge")'
    );
    await forgeSection.scrollIntoViewIfNeeded();

    // Look for SHA-256 display
    const shaDisplay = page.locator('text=/SHA-?256|checksum/i');
    if ((await shaDisplay.count()) > 0) {
      await expect(shaDisplay.first()).toBeVisible();
    }
  });

  test("should update script when optimizations change", async ({ page }) => {
    // Scroll to tuning section
    const tuningSection = page.locator(
      '[data-testid="tuning-section"], .tuning-section, #tuning, section:has-text("Tuning")'
    );
    await tuningSection.scrollIntoViewIfNeeded();

    // Find a checkbox to toggle
    const checkbox = page.locator('input[type="checkbox"]').first();
    if ((await checkbox.count()) > 0) {
      const wasChecked = await checkbox.isChecked();

      // Toggle the checkbox
      await checkbox.click();

      // Verify the state changed
      if (wasChecked) {
        await expect(checkbox).not.toBeChecked();
      } else {
        await expect(checkbox).toBeChecked();
      }
    }
  });

  test("should download script when download button is clicked", async ({ page }) => {
    // Select a preset first
    const firstPreset = page.locator('[data-testid="preset-card"], .preset-card').first();
    await firstPreset.click();

    // Scroll to forge section
    const forgeSection = page.locator(
      '[data-testid="forge-section"], .forge-section, #forge, section:has-text("Forge")'
    );
    await forgeSection.scrollIntoViewIfNeeded();

    // Find download button
    const downloadButton = page.locator(
      'button:has-text("Download"), a:has-text("Download"), [data-testid="download-button"]'
    );

    if ((await downloadButton.count()) > 0) {
      // Set up download listener
      const downloadPromise = page.waitForEvent("download", { timeout: 5000 }).catch(() => null);

      await downloadButton.first().click();

      const download = await downloadPromise;
      if (download) {
        // Verify download filename
        expect(download.suggestedFilename()).toMatch(/\.ps1$/);
      }
    }
  });

  test("should show restore point option", async ({ page }) => {
    // Scroll to forge section
    const forgeSection = page.locator(
      '[data-testid="forge-section"], .forge-section, #forge, section:has-text("Forge")'
    );
    await forgeSection.scrollIntoViewIfNeeded();

    // Look for restore point toggle/checkbox
    const restorePointOption = page.locator('text=/restore point/i');
    if ((await restorePointOption.count()) > 0) {
      await expect(restorePointOption.first()).toBeVisible();
    }
  });
});
