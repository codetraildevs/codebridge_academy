// ============================================
// E2E Tests — Survey Form (7-step modal)
// ============================================
const { test, expect } = require('@playwright/test');

// Helper: open survey modal via dispatchEvent (more reliable than Playwright click
// due to content-visibility:auto on the section affecting hit-testing)
async function openSurveyModal(page) {
  await page.evaluate(() => {
    const btn = document.getElementById('openSurveyBtn');
    if (btn) {
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }
  });
  await page.waitForSelector('#surveyModal.active', { timeout: 5000 });
}

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
      await page.locator('input[name="s6q1"][value="5"]').check();
      await page.locator('input[name="s6q2"][value="Yes"]').check();
      await page.locator('input[name="s6q3"][value="Software Development"]').check();
      await page.locator('input[name="s6q3"][value="Computer Networking"]').check();
      break;
    case 7:
      await page.locator('#surveyFeedback1').fill('Competency-based assessment is very important for ensuring quality education in Rwanda.');
      break;
  }
}

test.describe('Survey Form — 7-Step Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('opens survey modal when clicking survey button', async ({ page }) => {
    await openSurveyModal(page);

    await expect(page.locator('#surveyModal')).toHaveClass(/active/);
    await expect(page.locator('.survey-step[data-step="1"]')).toHaveClass(/active/);

    await page.locator('#surveyCloseBtn').click({ force: true });
    await page.waitForTimeout(300);
    await expect(page.locator('#surveyModal')).not.toHaveClass(/active/);
  });

  test('opens survey modal from floating button', async ({ page }) => {
    const floatBtn = page.locator('#surveyFloatBtn');
    await floatBtn.click({ force: true });
    await page.waitForTimeout(500);

    await expect(page.locator('#surveyModal')).toHaveClass(/active/);
  });

  test('navigates through all 7 steps', async ({ page }) => {
    await openSurveyModal(page);

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
    await openSurveyModal(page);

    // Try to go to step 2 without filling step 1
    await page.locator('#surveyNextBtn').click();
    await page.waitForTimeout(500);

    await expect(page.locator('.survey-step[data-step="1"]')).toHaveClass(/active/);
    const errorCount = await page.locator('#surveyForm .form-group.error').count();
    expect(errorCount).toBeGreaterThan(0);
  });

  test('shows success screen after full survey submission (mocked)', async ({ page }) => {
    // Mock Edge Function
    await page.evaluate(() => {
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

    await openSurveyModal(page);

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


});
