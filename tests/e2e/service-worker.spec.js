// ============================================
// E2E Tests — Service Worker Behavior
// Verifies the SW doesn't interfere with POST
// requests and handles caching correctly.
// ============================================
const { test, expect } = require('@playwright/test');

test.describe('Service Worker — Fetch Handler', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test('registers service worker successfully', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForLoadState('load');

    // Wait for the async SW registration in script.js to complete
    await page.waitForTimeout(3000);

    // Check via Playwright's context-level service workers API
    const workers = context.serviceWorkers();
    expect(workers.length).toBeGreaterThan(0);
    expect(workers[0].url()).toContain('sw.js');
  });

  test('caches static assets on install', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.waitForFunction(async () => {
      const keys = await caches.keys();
      return keys.some(k => k.startsWith('codebridge-v'));
    }, { timeout: 15000 });
  });

  test('serves cached CSS from service worker', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.waitForFunction(async () => {
      const keys = await caches.keys();
      const cacheKey = keys.find(k => k.startsWith('codebridge-v'));
      if (!cacheKey) return false;
      const cache = await caches.open(cacheKey);
      const requests = await cache.keys();
      return requests.some(r => r.url.includes('style.min.css'));
    }, { timeout: 15000 });
  });

  test('does not intercept or cache POST requests', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(async () => {
      const keys = await caches.keys();
      return keys.some(k => k.startsWith('codebridge-v'));
    }, { timeout: 15000 });

    await page.evaluate(async () => {
      try {
        await fetch('/api/test-post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: true }),
        });
      } catch { /* 404 expected */ }
    });

    const hasCachedPosts = await page.evaluate(async () => {
      const keys = await caches.keys();
      for (const key of keys) {
        if (key.startsWith('codebridge-v')) {
          const cache = await caches.open(key);
          const requests = await cache.keys();
          return requests.some(r => r.method !== 'GET');
        }
      }
      return false;
    });

    expect(hasCachedPosts).toBe(false);
  });

  test('handles form submission POST without SW error', async ({ page }) => {
    // Collect console errors/warnings
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Mock Edge Function via addInitScript (runs before page scripts)
    await page.addInitScript(() => {
      window.__originalFetch = window.fetch.bind(window);
      window.fetch = async (url, opts) => {
        if (typeof url === 'string' && url.includes('submit-form')) {
          return new Response(JSON.stringify({ success: true }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return window.__originalFetch(url, opts);
      };
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Open and fill registration form
    const registerBtn = page.locator('.nav-cta.btn-register');
    await expect(registerBtn).toBeVisible({ timeout: 10000 });
    await registerBtn.scrollIntoViewIfNeeded();
    await registerBtn.click({ force: true });
    await expect(page.locator('#registrationModal')).toHaveClass(/active/, { timeout: 5000 });

    await fillAllSteps(page);
    await page.locator('#submitBtn').click();
    await page.waitForTimeout(2000);

    // Check for SW-related console errors
    const swErrors = consoleErrors.filter(e => /cache|service.?worker/i.test(e));
    expect(swErrors.length).toBe(0);

    // Verify success screen
    const successScreen = page.locator('#registrationSuccess');
    await expect(successScreen).toBeVisible({ timeout: 10000 });
  });
});

// ============================================
// Form helpers
// ============================================
async function fillAllSteps(page) {
  await page.locator('#nextBtn').click();
  await page.waitForSelector('.form-step[data-step="2"].active', { timeout: 5000 });

  await page.locator('#fullName').fill('Test User');
  await page.locator('#email').fill('test@example.com');
  await page.locator('#phone').fill('788123456');
  await page.locator('input[name="gender"][value="Male"]').check();
  await page.locator('#ageGroup').selectOption('19-25');
  await page.locator('#location').fill('Kigali');
  await page.locator('#nextBtn').click();
  await page.waitForSelector('.form-step[data-step="3"].active', { timeout: 5000 });

  await page.locator('input[name="status"][value="University student"]').check();
  await page.locator('#organization').fill('University of Rwanda');
  await page.locator('#level').selectOption('L3');
  await page.locator('#educationLevel').selectOption('Bachelor');
  await page.locator('#experienceLevel').selectOption('Beginner');
  await page.locator('#nextBtn').click();
  await page.waitForSelector('.form-step[data-step="4"].active', { timeout: 5000 });

  await page.locator('input[name="program"][value="Software Development"]').check();
  await page.locator('#duration').selectOption('8 Weeks');
  await page.locator('input[name="schedule"][value="Morning"]').check();
  await page.locator('input[name="skillLevel"][value="Beginner"]').check();
  await page.locator('input[name="tech"][value="HTML"]').check();
  await page.locator('input[name="tech"][value="CSS"]').check();
  await page.locator('#nextBtn').click();
  await page.waitForSelector('.form-step[data-step="5"].active', { timeout: 5000 });

  await page.locator('input[name="hasLaptop"][value="Yes"]').check();
  await page.locator('input[name="hasInternet"][value="Yes"]').check();
  await page.locator('#careerGoals').fill('I want to become a developer');
  await page.locator('#motivation').fill('Testing SW');
  await page.locator('input[name="goals"][value="Learn software development"]').check();
  await page.locator('input[name="goals"][value="Build real projects"]').check();
}
