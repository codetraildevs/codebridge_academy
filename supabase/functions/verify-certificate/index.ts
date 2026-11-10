// ============================================
// Supabase Edge Function: verify-certificate
// Verifies a certificate number (legacy) or a secure token (new).
// The certificates table is never exposed directly; this function uses
// the service role and rate-limits every attempt per client.
// ============================================
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Never echo an arbitrary Origin back: only these may read the response.
const DEFAULT_ORIGINS = [
  "https://codebridgecademy.com",
  "https://www.codebridgecademy.com",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:8090",
  "http://127.0.0.1:8090",
];
const ALLOWED_ORIGINS = new Set(
  (Deno.env.get("ALLOWED_ORIGINS") ?? DEFAULT_ORIGINS.join(","))
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
);

const RATE_LIMIT_MAX = Number(Deno.env.get("RATE_LIMIT_MAX") ?? 30);
const RATE_LIMIT_WINDOW_SECS = Number(Deno.env.get("RATE_LIMIT_WINDOW_SECS") ?? 60);
const REQUIRE_TOKEN = (Deno.env.get("REQUIRE_TOKEN") ?? "false").toLowerCase() === "true";

// 20 characters from a 32-symbol alphabet (~100 bits), no 0/O/1/I confusion.
const TOKEN_RE = /^CBV-[2-9A-HJ-NP-Z]{20}$/;
const NUMBER_RE = /^[A-Z0-9][A-Z0-9 .\-_/]{2,63}$/;

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function json(
  body: unknown,
  status: number,
  origin: string | null,
  extra: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...corsHeaders(origin),
      ...extra,
    },
  });
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

async function hmacHex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Salt is mandatory in practice; fall back to the service-role key so a
// forgotten env var still never stores a raw or trivially reversible IP.
const IP_SALT = Deno.env.get("VERIFICATION_IP_SALT") ?? SUPABASE_SERVICE_ROLE_KEY;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return json({ error: "origin_not_allowed" }, 403, origin);
    }
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405, origin, { Allow: "POST, OPTIONS" });
  }

  // Reject foreign browser origins outright; the endpoint is public, but
  // only the academy site is meant to call it from a browser.
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return json({ error: "origin_not_allowed" }, 403, origin);
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400, origin);
  }

  const fields = payload && typeof payload === "object" ? payload : {};
  const rawId = "id" in fields && typeof fields.id === "string" ? fields.id : "";
  const hasToken = "token" in fields;
  const rawToken = hasToken && typeof fields.token === "string" ? fields.token : "";
  const input = (hasToken ? rawToken : rawId).trim().toUpperCase();
  const isToken = TOKEN_RE.test(input);

  if (!isToken && (hasToken || input.startsWith("CBV-") || !NUMBER_RE.test(input))) {
    return json(
      { error: "invalid_input", message: "Provide a certificate number or verification token." },
      400,
      origin,
    );
  }

  // ---------- Rate limit ----------
  let supabase;
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const ipHash = await hmacHex(IP_SALT, clientIp(req));
    const { data: allowed, error: rlError } = await supabase.rpc(
      "check_verification_rate_limit",
      {
        p_client_hash: ipHash,
        p_limit: RATE_LIMIT_MAX,
        p_window_secs: RATE_LIMIT_WINDOW_SECS,
      },
    );
    if (rlError) throw rlError;
    if (allowed !== true) {
      return json(
        {
          error: "rate_limited",
          message: "Too many verification attempts. Please wait a minute and try again.",
        },
        429,
        origin,
        { "Retry-After": String(RATE_LIMIT_WINDOW_SECS) },
      );
    }
  } catch (err) {
    console.error("Rate limit check failed:", err);
    return json({ error: "verification_unavailable" }, 503, origin);
  }

  // ---------- Lookup ----------
  const columns =
    "certificate_number, holder_name, program, modules, start_date, end_date, issued_on, status";

  const query = isToken
    ? supabase.from("certificates").select(columns).eq("token_hash", await sha256Hex(input))
    : supabase.from("certificates").select(columns).eq("certificate_number", input);

  const { data: certificate, error } = await query.maybeSingle();

  if (error) {
    console.error("Certificate lookup failed:", error);
    return json({ error: "verification_unavailable" }, 503, origin);
  }

  if (!certificate) {
    return json(
      {
        valid: false,
        error: "certificate_not_found",
        message: "No certificate matches that number or verification token.",
      },
      404,
      origin,
    );
  }

  const method = isToken ? "token" : "number";

  if (certificate.status !== "active") {
    return json(
      {
        valid: false,
        method,
        reason: certificate.status,
        certificate: { certificate_number: certificate.certificate_number },
      },
      200,
      origin,
    );
  }

  // Optional hardening: with REQUIRE_TOKEN=true, a bare certificate number
  // confirms validity but withholds personal details. Legacy printed QR
  // codes keep working; only the amount of information returned changes.
  if (REQUIRE_TOKEN && method === "number") {
    return json(
      {
        valid: true,
        method,
        requires_token: true,
        certificate: {
          certificate_number: certificate.certificate_number,
          status: certificate.status,
        },
      },
      200,
      origin,
    );
  }

  return json(
    {
      valid: true,
      method,
      certificate: {
        certificate_number: certificate.certificate_number,
        holder_name: certificate.holder_name,
        program: certificate.program,
        modules: certificate.modules ?? [],
        start_date: certificate.start_date,
        end_date: certificate.end_date,
        issued_on: certificate.issued_on,
        status: certificate.status,
      },
    },
    200,
    origin,
  );
});
