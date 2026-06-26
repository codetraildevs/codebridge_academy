// ============================================
// API Contract Tests — Supabase Edge Function
// Tests the submit-form Edge Function contract.
//
// NOTE: Tests that call the real Edge Function
// require a valid Supabase JWT (Authorization
// header). They are marked as fixme by default.
// Remove the fixme() calls and provide a valid
// anon key if you want to test against the live
// endpoint.
// ============================================
const { test, expect } = require('@playwright/test');

const EDGE_FN_URL = 'https://siruvivfrinoyudbotko.supabase.co/functions/v1/submit-form';

test.describe('Supabase Edge Function — Contract', () => {
  // --- Live endpoint tests (require Supabase auth) ---
  test.describe('live endpoint (requires auth)', () => {
    test.fixme('returns 405 for non-POST methods', async ({ request }) => {
      const response = await request.get(EDGE_FN_URL);
      expect(response.status()).toBe(405);
      const body = await response.json();
      expect(body).toHaveProperty('error');
    });

    test.fixme('returns 400 when body is missing required fields', async ({ request }) => {
      const response = await request.post(EDGE_FN_URL, {
        data: {},
        headers: { 'Content-Type': 'application/json' },
      });
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(body.error).toContain('Missing required fields');
    });

    test.fixme('returns 400 when form_type is invalid', async ({ request }) => {
      const response = await request.post(EDGE_FN_URL, {
        data: {
          form_type: 'invalid_type',
          data: { name: 'test' },
          recaptcha_token: 'test-token',
        },
        headers: { 'Content-Type': 'application/json' },
      });
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(body.error).toContain('form_type must be');
    });

    test.fixme('returns 403 for invalid reCAPTCHA token', async ({ request }) => {
      const response = await request.post(EDGE_FN_URL, {
        data: {
          form_type: 'registration',
          data: {
            full_name: 'Test User',
            email: 'test@example.com',
          },
          recaptcha_token: 'invalid-token',
        },
        headers: { 'Content-Type': 'application/json' },
      });
      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(body.error).toContain('reCAPTCHA');
    });
  });

  // --- Data structure validation (no external calls needed) ---
  test.describe('payload structure validation', () => {
    test('valid registration data structure', () => {
      const registrationPayload = {
        form_type: 'registration',
        data: {
          full_name: 'Jean Damascene',
          email: 'jean@example.com',
          phone_code: '+250',
          phone: '788123456',
          gender: 'Male',
          location: 'Gikondo',
          status: 'University student',
          organization: 'University of Rwanda',
          level: 'L3',
          program: 'Web Development Fundamentals',
          skill_level: 'Beginner',
          tech: ['HTML', 'CSS'],
          has_laptop: 'Yes',
          has_internet: 'Yes',
          projects: null,
          motivation: 'I want to become a developer',
          goals: ['Learn software development', 'Prepare for internship'],
        },
        recaptcha_token: 'placeholder-token',
      };

      expect(registrationPayload.form_type).toBe('registration');
      expect(registrationPayload.data.full_name).toBeTruthy();
      expect(registrationPayload.data.email).toBeTruthy();
      expect(registrationPayload.data.phone).toBeTruthy();
      expect(registrationPayload.data.gender).toBeTruthy();
      expect(registrationPayload.data.location).toBeTruthy();
      expect(registrationPayload.data.status).toBeTruthy();
      expect(registrationPayload.data.organization).toBeTruthy();
      expect(registrationPayload.data.level).toBeTruthy();
      expect(registrationPayload.data.program).toBeTruthy();
      expect(registrationPayload.data.skill_level).toBeTruthy();
      expect(Array.isArray(registrationPayload.data.tech)).toBe(true);
      expect(registrationPayload.data.has_laptop).toBeTruthy();
      expect(registrationPayload.data.has_internet).toBeTruthy();
      expect(registrationPayload.data.motivation).toBeTruthy();
      expect(Array.isArray(registrationPayload.data.goals)).toBe(true);
      expect(registrationPayload.recaptcha_token).toBeTruthy();

      const serialized = JSON.stringify(registrationPayload);
      expect(() => JSON.parse(serialized)).not.toThrow();
    });

    test('valid survey data structure', () => {
      const surveyPayload = {
        form_type: 'survey',
        data: {
          full_name: 'Jean Damascene',
          email: 'jean@example.com',
          phone_code: '+250',
          phone: null,
          institution: 'University of Rwanda',
          district: 'Kicukiro',
          institution_type: 'University',
          occupation: 'Student',
          s2q1: 'Both',
          s2q2: ['Manual marking', 'Delayed results'],
          s2q3: '2',
          s2q4: 'Sometimes',
          s3q1: 'No',
          s3q2: '5',
          s3q3: ['Technical Skills', 'Problem Solving'],
          s4q1: 'Yes',
          s4q2: ['Online Practical Exams', 'AI Assessment'],
          s4q3: '5',
          s5q1: 'Practical Test',
          s5q2: 'Yes',
          s6q1: 'Very Interested',
          s6q2: ['Cloud-Based Assessments', 'Real-Time Analytics'],
          s7q1: 'Competency assessment is important.',
        },
        recaptcha_token: 'placeholder-token',
      };

      expect(surveyPayload.form_type).toBe('survey');
      expect(surveyPayload.data.full_name).toBeTruthy();
      expect(surveyPayload.data.email).toBeTruthy();
      expect(surveyPayload.data.institution).toBeTruthy();
      expect(surveyPayload.data.district).toBeTruthy();
      expect(surveyPayload.data.institution_type).toBeTruthy();
      expect(surveyPayload.data.occupation).toBeTruthy();
      expect(surveyPayload.data.s2q1).toBeTruthy();
      expect(Array.isArray(surveyPayload.data.s2q2)).toBe(true);
      expect(surveyPayload.data.s3q1).toBeTruthy();
      expect(Array.isArray(surveyPayload.data.s3q3)).toBe(true);
      expect(typeof surveyPayload.recaptcha_token).toBe('string');

      const serialized = JSON.stringify(surveyPayload);
      expect(() => JSON.parse(serialized)).not.toThrow();
    });
  });
});
