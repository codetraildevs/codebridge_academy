// ============================================
// E2E Tests — Registration Form (5-step modal)
// ============================================
const { test, expect } = require('@playwright/test');

test.describe('Registration Form — 5-Step Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    // Block reCAPTCHA CDN so grecaptcha stays undefined unless we mock it
    await page.route('**/recaptcha/**', route => route.abort('blockedbyclient'));
    // Save original fetch for mock restoration
    await page.addInitScript(() => {
      window.__originalFetch = window.fetch.bind(window);
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('opens registration modal when clicking Register Now', async ({ page }) => {
    await clickRegister(page);
    await expect(page.locator('#registrationModal')).toHaveClass(/active/);
    await expect(page.locator('.form-step[data-step="1"]')).toHaveClass(/active/);
    // Use dispatchEvent to close the modal (more reliable than force click)
    await page.locator('#closeModal').dispatchEvent('click');
    await page.waitForFunction(() => !document.querySelector('#registrationModal.active'),
      { timeout: 5000 }
    );
  });

  test('navigates through steps with Next/Prev buttons', async ({ page }) => {
    await clickRegister(page);
    await expect(page.locator('#prevBtn')).not.toBeVisible();
    await expect(page.locator('#nextBtn')).toBeVisible();

    await page.locator('#nextBtn').click();
    await page.waitForSelector('.form-step[data-step="2"].active', { timeout: 5000 });
    await expect(page.locator('#prevBtn')).toBeVisible();

    await page.locator('#prevBtn').click();
    await page.waitForSelector('.form-step[data-step="1"].active', { timeout: 5000 });
  });

  test('shows validation errors on required fields', async ({ page }) => {
    await clickRegister(page);
    await page.locator('#nextBtn').click();
    await page.waitForSelector('.form-step[data-step="2"].active', { timeout: 5000 });

    await page.locator('#nextBtn').click({ force: true });
    await page.waitForTimeout(500);

    await expect(page.locator('.form-step[data-step="2"]')).toHaveClass(/active/);
    const errorCount = await page.locator('#registrationForm .form-group.error').count();
    expect(errorCount).toBeGreaterThan(0);
  });

  test('fills all 5 steps successfully', async ({ page }) => {
    await clickRegister(page);
    await fillRegistrationFlow(page);
    await expect(page.locator('#submitBtn')).toBeVisible();
  });

  test('shows success screen after form submission (mocked)', async ({ page }) => {
    await mockFormSubmission(page);
    await clickRegister(page);
    await fillRegistrationFlow(page);
    await page.locator('#submitBtn').click();
    await page.waitForTimeout(2000);

    const successScreen = page.locator('#registrationSuccess');
    await expect(successScreen).toBeVisible({ timeout: 10000 });
  });

  test('shows network error on fetch failure', async ({ page }) => {
    await page.evaluate(() => {
      window.grecaptcha = { execute: async () => 'mock-token', ready: (cb) => cb() };
      window.fetch = async () => { throw new TypeError('Failed to fetch'); };
    });

    await clickRegister(page);
    await fillRegistrationFlow(page);
    await page.locator('#submitBtn').click();
    await page.waitForTimeout(1500);

    const errorEl = page.locator('#registrationForm .form-submit-error');
    await expect(errorEl).toBeVisible();
    await expect(errorEl).toContainText('Network error');
  });
});

// ============================================
// Helpers
// ============================================

async function clickRegister(page) {
  const btn = page.locator('.nav-cta.btn-register');
  await expect(btn).toBeVisible({ timeout: 10000 });
  await btn.scrollIntoViewIfNeeded();
  await btn.click({ force: true });
  await expect(page.locator('#registrationModal')).toHaveClass(/active/, { timeout: 5000 });
}

async function mockFormSubmission(page) {
  await page.evaluate(() => {
    window.grecaptcha = {
      execute: async () => 'mock-recaptcha-token',
      ready: (cb) => cb(),
    };
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
}

async function fillRegistrationFlow(page) {
  await page.locator('#nextBtn').click();
  await page.waitForSelector('.form-step[data-step="2"].active', { timeout: 5000 });

  await page.locator('#fullName').fill('Jean Damascene');
  await page.locator('#email').fill('jean@example.com');
  await page.locator('#phone').fill('788123456');
  await page.locator('input[name="gender"][value="Male"]').check();
  await page.locator('#ageGroup').selectOption('16-18');
  await page.locator('#location').fill('Gikondo');
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
  await page.locator('#careerGoals').fill('I want to become a full-stack developer and build impactful solutions');
  await page.locator('#motivation').fill('I want to become a professional developer');
}
