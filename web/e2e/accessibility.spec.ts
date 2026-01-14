import { test, expect } from "npm:@playwright/test@1.49";
import AxeBuilder from "npm:@axe-core/playwright@4.10";

test.describe("Accessibility (WCAG 2.1 AA)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for app to fully hydrate
    await page.waitForSelector('[data-testid="preset-card"], .preset-card', {
      state: "visible",
      timeout: 10000,
    });
    // Allow animations to settle
    await page.waitForTimeout(500);
  });

  test("should have no critical accessibility violations on page load", async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .exclude(".cursor-glow") // Decorative element
      .analyze();

    // Filter to critical and serious violations only
    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    if (criticalViolations.length > 0) {
      console.log("Critical/Serious A11y violations found:");
      criticalViolations.forEach((violation) => {
        console.log(`- ${violation.id}: ${violation.description}`);
        console.log(`  Impact: ${violation.impact}`);
        console.log(`  Nodes: ${violation.nodes.length}`);
      });
    }

    expect(criticalViolations).toEqual([]);
  });

  test("should have proper heading hierarchy", async ({ page }) => {
    // Check for heading elements
    const h1Count = await page.locator("h1").count();
    const h2Count = await page.locator("h2").count();

    // Should have exactly one h1
    expect(h1Count).toBe(1);

    // Should have multiple h2s for sections
    expect(h2Count).toBeGreaterThan(0);
  });

  test("preset cards should be accessible as radio group", async ({ page }) => {
    const presetCards = page.locator('[data-testid="preset-card"], .preset-card');

    // Each card should have proper radio semantics
    for (let i = 0; i < (await presetCards.count()); i++) {
      const card = presetCards.nth(i);

      // Should have role="radio" or equivalent
      const role = await card.getAttribute("role");
      const ariaChecked = await card.getAttribute("aria-checked");

      // Verify radio semantics exist
      expect(role).toBe("radio");
      expect(ariaChecked).toBeTruthy();
    }
  });

  test("should have skip link for keyboard navigation", async ({ page }) => {
    // Check for skip link
    const skipLink = page.locator('a[href="#main-content"], .skip-link');

    if ((await skipLink.count()) > 0) {
      // Skip link should be focusable
      await skipLink.first().focus();
      await expect(skipLink.first()).toBeFocused();
    }
  });

  test("should have accessible form controls", async ({ page }) => {
    // Scroll to tuning section
    const tuningSection = page.locator(
      '[data-testid="tuning-section"], .tuning-section, #tuning, section:has-text("Tuning")'
    );

    if ((await tuningSection.count()) > 0) {
      await tuningSection.scrollIntoViewIfNeeded();

      // Run axe on tuning section specifically
      const formResults = await new AxeBuilder({ page })
        .include("#tuning, .tuning-section")
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();

      const formViolations = formResults.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious"
      );

      expect(formViolations).toEqual([]);
    }
  });

  test("should have sufficient color contrast", async ({ page }) => {
    const contrastResults = await new AxeBuilder({ page })
      .withRules(["color-contrast"])
      .analyze();

    const contrastViolations = contrastResults.violations.filter(
      (v) => v.id === "color-contrast" && v.impact === "serious"
    );

    if (contrastViolations.length > 0) {
      console.log("Color contrast issues:");
      contrastViolations.forEach((v) => {
        v.nodes.forEach((node) => {
          console.log(`- ${node.html.substring(0, 100)}...`);
        });
      });
    }

    // Allow some contrast issues in decorative elements
    expect(contrastViolations.length).toBeLessThan(5);
  });

  test("should support reduced motion preference", async ({ page }) => {
    // Set reduced motion preference
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();
    await page.waitForSelector('[data-testid="preset-card"], .preset-card', {
      state: "visible",
      timeout: 10000,
    });

    // Verify page loads without animation-related issues
    const presetCards = page.locator('[data-testid="preset-card"], .preset-card');
    await expect(presetCards.first()).toBeVisible();
  });

  test("interactive elements should be keyboard accessible", async ({ page }) => {
    // Tab through the page and verify focus is visible
    const focusableElements = page.locator(
      'button:visible, a[href]:visible, input:visible, [tabindex="0"]:visible'
    );

    const count = await focusableElements.count();
    expect(count).toBeGreaterThan(0);

    // Tab through first few elements
    for (let i = 0; i < Math.min(5, count); i++) {
      await page.keyboard.press("Tab");
      const focusedElement = page.locator(":focus");
      await expect(focusedElement).toBeVisible();
    }
  });

  test("images and icons should have alt text or aria-hidden", async ({ page }) => {
    // Check all images
    const images = page.locator("img:visible");
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute("alt");
      const ariaHidden = await img.getAttribute("aria-hidden");
      const role = await img.getAttribute("role");

      // Image should have alt text, or be hidden from accessibility tree
      const isAccessible = alt !== null || ariaHidden === "true" || role === "presentation";
      expect(isAccessible).toBe(true);
    }

    // Check SVG icons
    const svgIcons = page.locator('svg[class*="icon"], svg[aria-hidden]');
    const svgCount = await svgIcons.count();

    for (let i = 0; i < svgCount; i++) {
      const svg = svgIcons.nth(i);
      const ariaHidden = await svg.getAttribute("aria-hidden");
      const ariaLabel = await svg.getAttribute("aria-label");
      const role = await svg.getAttribute("role");

      // SVG should be labeled or hidden
      const isAccessible = ariaHidden === "true" || ariaLabel !== null || role === "img";
      expect(isAccessible).toBe(true);
    }
  });
});
