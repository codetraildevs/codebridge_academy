// ============================================
// Supabase Edge Function: submit-form
// Verifies reCAPTCHA v3 token server-side,
// then inserts the form data into Supabase.
// ============================================
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

interface FormPayload {
  form_type: "registration" | "survey";
  data: Record<string, unknown>;
  recaptcha_token: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RECAPTCHA_SECRET_KEY = Deno.env.get("RECAPTCHA_SECRET_KEY")!;

async function verifyRecaptcha(token: string): Promise<{ success: boolean; score: number }> {
  const formData = new URLSearchParams();
  formData.append("secret", RECAPTCHA_SECRET_KEY);
  formData.append("response", token);

  const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    body: formData,
  });
  const result = await response.json();
  return { success: result.success, score: result.score || 0 };
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req: Request) => {
  try {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: CORS_HEADERS,
      });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          ...CORS_HEADERS,
        },
      });
    }

    const payload: FormPayload = await req.json();

    // Validate required fields
    if (!payload.form_type || !payload.data || !payload.recaptcha_token) {
      return new Response(JSON.stringify({ error: "Missing required fields: form_type, data, recaptcha_token" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...CORS_HEADERS,
        },
      });
    }

    if (payload.form_type !== "registration" && payload.form_type !== "survey") {
      return new Response(JSON.stringify({ error: "form_type must be 'registration' or 'survey'" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...CORS_HEADERS,
        },
      });
    }

    // Verify reCAPTCHA token
    const verification = await verifyRecaptcha(payload.recaptcha_token);
    if (!verification.success || verification.score < 0.5) {
      console.warn(`reCAPTCHA failed: success=${verification.success}, score=${verification.score}`);
      return new Response(JSON.stringify({ error: "reCAPTCHA verification failed. Please try again." }), {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          ...CORS_HEADERS,
        },
      });
    }

    // Initialize Supabase admin client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Insert into the appropriate table
    const tableName = payload.form_type === "registration" ? "registrations" : "survey_responses";

    const { error } = await supabase
      .from(tableName)
      .insert([payload.data]);

    if (error) {
      console.error("Supabase insert error:", error);
      return new Response(JSON.stringify({ error: "Database insert failed" }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...CORS_HEADERS,
        },
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Form submitted successfully" }), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        ...CORS_HEADERS,
      },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...CORS_HEADERS,
      },
    });
  }
});
