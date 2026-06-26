// ============================================
// E2E Tests — Survey Form (7-step modal)
// ============================================
const { test, expect } = require('@playwright/test');

test.describe('Survey Form — 7-Step Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    // Block reCAPTCHA CDN so grecaptcha stays undefined unless we mock it
    await page.route('**/recaptcha/**', route => route.abort('blockedbyclient'));
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('opens survey modal when clicking survey button', async ({ page }) => {
    const surveyBtn = page.locator('#openSurveyBtn');
    await surveyBtn.scrollIntoViewIfNeeded();
    await surveyBtn.click({ force: true });
    await page.waitForTimeout(500);

    await expect(page.locator('#surveyModal')).toHaveClass(/active/);
    await expect(page.locator('.survey-step[data-step="1"]')).toHaveClass(/active/);

    await page.locator('#surveyCloseBtn').click({ force: true });
    await expect(page.locator('#surveyModal')).not.toHaveClass(/active/);
  });

  test('opens survey modal from floating button', async ({ page }) => {
    const floatBtn = page.locator('#surveyFloatBtn');
    await floatBtn.scrollIntoViewIfNeeded();
    await floatBtn.click({ force: true });
    await page.waitForTimeout(500);

    await expect(page.locator('#surveyModal')).toHaveClass(/active/);
  });

  test('navigates through all 7 steps', async ({ page }) => {
    await page.locator('#openSurveyBtn').scrollIntoViewIfNeeded();
    await page.locator('#openSurveyBtn').click({ force: true });
    await expect(page.locator('#surveyModal')).toHaveClass(/active/, { timeout: 5000 });

    await expect(page.locator('.survey-step[data-step="1"]')).toHaveClass(/active/);
    await expect(page.locator('#surveyPrevBtn')).not.toBeVisible();

    for (let step = 1; step <= 7; step++) {
      await fillSurveyStep(page, step);
      if (step < 7) {
        await page.locator('#surveyNextBtn').click();
        await expect(page.locator(`.survey-step[data-step="${step + 1}"]`)).toHaveClass(/active/, { timeout: 5000 });
      }
    }

    await expect(page.locator('#surveySubmitBtn')).toBeVisible();

    await page.locator('#surveyPrevBtn').click();
    await expect(page.locator('.survey-step[data-step="6"]')).toHaveClass(/active/, { timeout: 5000 });
  });

  test('shows validation errors on empty required fields', async ({ page }) => {
    await page.locator('#openSurveyBtn').scrollIntoViewIfNeeded();
    await page.locator('#openSurveyBtn').click({ force: true });
    await expect(page.locator('#surveyModal')).toHaveClass(/active/, { timeout: 5000 });

    // Try to go to step 2 without filling step 1
    await page.locator('#surveyNextBtn').click();
    await page.waitForTimeout(500);

    await expect(page.locator('.survey-step[data-step="1"]')).toHaveClass(/active/);
    const errorCount = await page.locator('#surveyForm .form-group.error').count();
    expect(errorCount).toBeGreaterThan(0);
  });

  test('shows success screen after full survey submission (mocked)', async ({ page }) => {
    // Mock reCAPTCHA and Edge Function
    await page.evaluate(() => {
      window.grecaptcha = {
        execute: async () => 'mock-recaptcha-token',
        ready: (cb) => cb(),
      };
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

    await page.locator('#openSurveyBtn').scrollIntoViewIfNeeded();
    await page.locator('#openSurveyBtn').click({ force: true });
    await expect(page.locator('#surveyModal')).toHaveClass(/active/, { timeout: 5000 });

    // Fill and navigate through all 7 steps
    for (let step = 1; step <= 7; step++) {
      await fillSurveyStep(page, step);
      if (step < 7) {
        await page.locator('#surveyNextBtn').click();
        await page.waitForSelector(`.survey-step[data-step="${step + 1}"].active`, { timeout: 5000 });
      }
    }

    await page.locator('#surveySubmitBtn').click();
    await page.waitForTimeout(2000);

    const successScreen = page.locator('#surveySuccess');
    await expect(successScreen).toBeVisible({ timeout: 10000 });
  });

  test('shows reCAPTCHA error when grecaptcha is missing', async ({ page }) => {
    await page.locator('#openSurveyBtn').scrollIntoViewIfNeeded();
    await page.locator('#openSurveyBtn').click({ force: true });
    await expect(page.locator('#surveyModal')).toHaveClass(/active/, { timeout: 5000 });

    for (let step = 1; step <= 7; step++) {
      await fillSurveyStep(page, step);
      if (step < 7) {
        await page.locator('#surveyNextBtn').click();
        await page.waitForSelector(`.survey-step[data-step="${step + 1}"].active`, { timeout: 5000 });
      }
    }

    await page.locator('#surveySubmitBtn').click();
    await page.waitForTimeout(1500);

    const errorEl = page.locator('#surveyForm .form-submit-error');
    await expect(errorEl).toBeVisible();
    await expect(errorEl).toContainText('reCAPTCHA');
  });
});

// ============================================
// Helpers
// ============================================
async function fillSurveyStep(page, step) {
  switch (step) {
    case 1:
      await page.locator('#surveyFullName').fill('Jean Damascene');
      await page.locator('#surveyEmail').fill('jean@example.com');
      await page.locator('#surveyInstitution').fill('University of Rwanda');
      await page.locator('#surveyDistrict').fill('Kicukiro');
      await page.locator('input[name="surveyInstType"][value="University"]').check();
      await page.locator('input[name="surveyOccupation"][value="Student"]').check();
      break;
    case 2:
      await page.locator('input[name="s2q1"][value="Both"]').check();
      await page.locator('input[name="s2q2"][value="Manual marking"]').check();
      await page.locator('input[name="s2q2"][value="Delayed results"]').check();
      await page.locator('input[name="s2q3"][value="2"]').check();
      await page.locator('input[name="s2q4"][value="Sometimes"]').check();
      break;
    case 3:
      await page.locator('input[name="s3q1"][value="No"]').check();
      await page.locator('input[name="s3q2"][value="5"]').check();
      await page.locator('input[name="s3q3"][value="Technical Skills"]').check();
      await page.locator('input[name="s3q3"][value="Problem Solving"]').check();
      break;
    case 4:
      await page.locator('input[name="s4q1"][value="Yes"]').check();
      await page.locator('input[name="s4q2"][value="Online Practical Exams"]').check();
      await page.locator('input[name="s4q2"][value="AI Assessment"]').check();
      await page.locator('input[name="s4q3"][value="5"]').check();
      break;
    case 5:
      await page.locator('input[name="s5q1"][value="Practical Test"]').check();
      await page.locator('input[name="s5q2"][value="Yes"]').check();
      break;
    case 6:
      await page.locator('input[name="s6q1"][value="Very Interested"]').check();
      await page.locator('input[name="s6q2"][value="Cloud-Based Assessments"]').check();
      await page.locator('input[name="s6q2"][value="Real-Time Analytics"]').check();
      break;
    case 7:
      await page.locator('#s7q1').fill('Competency-based assessment is very important for ensuring quality education in Rwanda.');
      break;
  }
}
