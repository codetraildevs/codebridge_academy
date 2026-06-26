// ============================================
// Diagnostic Test — Verify Playwright + Server
// ============================================
const { test, expect } = require('@playwright/test');

test.describe('Diagnostic', () => {
  test('can connect and find right buttons', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('http://localhost:8081/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const title = await page.title();
    console.log('Title:', title);

    // Count all .btn-register elements and their visibility
    const allBtns = await page.locator('.btn-register').evaluateAll(els =>
      els.map(el => ({
        class: el.className,
        tag: el.tagName,
        text: el.textContent?.trim(),
        visible: el.offsetParent !== null,
        display: window.getComputedStyle(el).display,
        rect: el.getBoundingClientRect(),
      }))
    );
    console.log('All .btn-register:', JSON.stringify(allBtns, null, 2));

    // Check nav-cta specifically
    const ctaBtn = page.locator('.nav-cta.btn-register');
    const ctaCount = await ctaBtn.count();
    console.log('nav-cta.btn-register count:', ctaCount);

    if (ctaCount > 0) {
      const ctaVisible = await ctaBtn.isVisible();
      console.log('nav-cta.btn-register visible:', ctaVisible);

      // Try clicking it
      await ctaBtn.click({ force: true });
      await page.waitForTimeout(800);

      // Check modal
      const modalActive = await page.locator('#registrationModal').evaluate(el =>
        el.classList.contains('active')
      );
      console.log('Modal active after click:', modalActive);

      if (!modalActive) {
        // Try clicking all visible register buttons
        const visBtns = page.locator('.btn-register').first();
        const visCount = await visBtns.count();
        console.log('First .btn-register count:', visCount);
      }
    }
  });
});
