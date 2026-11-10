const { test, expect } = require('@playwright/test');

test('mobile visitors can read the introduction and see both actions while JavaScript is still loading', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  let resume;
  const ready = new Promise(resolve => { resume = resolve; });
  await page.route('**/js/script.min.js*', async route => {
    await ready;
    await route.continue();
  });
  try {
    await page.goto('/', { waitUntil: 'commit' });
    const intro = page.locator('.hero-matrix-subtitle');
    await expect(intro).toBeInViewport();
    await expect(intro).toHaveCSS('opacity', '1');
    await expect(page.locator('.hero-buttons')).toHaveCSS('opacity', '1');
    await expect(page.locator('.hero-buttons a')).toHaveCount(2);
  } finally {
    resume();
    await page.waitForLoadState('domcontentloaded');
  }
});
