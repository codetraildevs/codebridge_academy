# Certificate verification (Supabase)

The public verifier (`verify.html`) now checks certificates against a Supabase
table through an edge function instead of exposing the whole student file.

- **New certificates** carry a random token (`CBV-` + 20 characters, ~100 bits)
  printed on the certificate and encoded in its QR code:
  `https://codebridgecademy.com/verify.html?token=CBV-...`
- **Legacy certificates** keep their number-based QR codes working:
  `https://codebridgecademy.com/verify.html?id=CBA-2026-001`
- Every lookup is rate-limited per client IP inside Postgres before the
  certificate is fetched. Only the hash of the token is stored, and the table
  is not readable by `anon` or `authenticated` at all.
- If the edge function is unreachable, `verify.js` falls back to the bundled
  `data/students.json` for legacy numbers only, so printed QR codes never break
  during the migration. Remove that fallback once the backend is live (see the
  last section).

## 1. Create the schema

Run, in order:

1. `supabase/migrations/20261107090000_certificate_verification.sql` — creates
   the tables, token minting function, rate-limit function, trigger, and RLS.
2. `docs/certificate-seed.sql` — inserts the 31 existing certificate records
   (generated from `data/students.json`).

Both are idempotent and can be pasted into the Supabase SQL editor, or applied
with `supabase db push` / `psql`.

### `public.certificates`

| Column | Type | Required | Example | Notes |
|---|---|---|---|---|
| `id` | `uuid` | auto | `6f1c…` | Primary key, generated. |
| `certificate_number` | `text` | yes | `CBA-2026-004` | Unique. Trimmed and upper-cased by a trigger. |
| `holder_name` | `text` | yes | `GATETE ELIOT DOUE` | Shown on the verification result. |
| `program` | `text` | yes | `Software Development Internship` | Shown on the result. |
| `modules` | `text[]` | no | `{'PHP PROGRAMMING','DATABASE DEVELOPMENT'}` | Rendered as the “Modules Completed” list. |
| `start_date` | `date` | no | `2026-04-08` | ISO date. |
| `end_date` | `date` | no | `2026-05-08` | ISO date. |
| `issued_on` | `date` | no | `2026-05-08` | Left `NULL` for legacy rows (never recorded). |
| `status` | `text` | yes | `active` | `active`, `revoked`, or `expired`. |
| `token_hash` | `text` | no | `9f2c…` (64 hex) | Set only by `mint_certificate_token()`. Never insert manually. |
| `notes` | `text` | no | `Batch A` | Internal only; never returned to the public. |
| `created_at` / `updated_at` | `timestamptz` | auto | | Maintained automatically. |

## 2. Add or edit certificate data

`docs/certificate-data-template.csv` is a worksheet with all 31 existing records
(`modules` separated by ` | `). Use it as the source of truth for the data you
enter; dates are ISO (`YYYY-MM-DD`).

Add a new certificate with SQL — copying this row and editing it is the safest
way to keep `modules` as a proper array:

```sql
insert into public.certificates
  (certificate_number, holder_name, program, modules, start_date, end_date, issued_on, status)
values
  ('CBA-2026-032', 'FULL NAME HERE', 'Software Development Internship',
   array['BACKEND APPLICATION DEVELOPMENT', 'DATABASE DEVELOPMENT']::text[],
   '2026-08-03', '2026-09-02', '2026-09-02', 'active');
```

To correct a record:

```sql
update public.certificates
   set holder_name = 'CORRECTED NAME', updated_at = now()
 where certificate_number = 'CBA-2026-032';
```

To invalidate a certificate, never delete the row — revoke it:

```sql
update public.certificates set status = 'revoked'
 where certificate_number = 'CBA-2026-032';
```

## 3. Mint a verification token

```sql
select public.mint_certificate_token('CBA-2026-032');
-- CBV-7K4M9Q2XW8HN5RTY3PDB
```

The return value is shown **once** and is not stored — only its SHA-256 hash is
kept in `token_hash`. Print it beside the certificate ID, and make the QR code
point at:

```
https://codebridgecademy.com/verify.html?token=CBV-7K4M9Q2XW8HN5RTY3PDB
```

Re-running the function for the same certificate replaces the token, so any
previously printed token stops working. Use `status = 'revoked'` if the
certificate itself must stop verifying.

## 4. Deploy the edge function

```bash
supabase functions deploy verify-certificate
```

Keep JWT verification on (the default): the website authenticates with the
public anon key, and the function itself uses the service-role key to read the
locked-down table.

Optional secrets:

| Secret | Default | Purpose |
|---|---|---|
| `VERIFICATION_IP_SALT` | service-role key | Salt for hashing client IPs before rate limiting. Set a dedicated random value in production. |
| `RATE_LIMIT_MAX` | `30` | Attempts allowed per IP per window. |
| `RATE_LIMIT_WINDOW_SECS` | `60` | Rate-limit window length. |
| `REQUIRE_TOKEN` | `false` | When `true`, a bare certificate number confirms validity but withholds the holder’s details — only tokens reveal them. |
| `ALLOWED_ORIGINS` | the academy domains + localhost | Comma-separated CORS allowlist. |

```bash
supabase secrets set VERIFICATION_IP_SALT="$(openssl rand -hex 32)"
```

## 5. Test

Replace `$ANON` with the public anon key and `$BASE` with your project URL:

```bash
# Legacy number (full details by default)
curl -s "$BASE/functions/v1/verify-certificate" \
  -H "Authorization: Bearer $ANON" -H "Content-Type: application/json" \
  -d '{"id":"CBA-2026-001"}'

# Secure token
curl -s "$BASE/functions/v1/verify-certificate" \
  -H "Authorization: Bearer $ANON" -H "Content-Type: application/json" \
  -d '{"token":"CBV-7K4M9Q2XW8HN5RTY3PDB"}'

# Unknown number → 404 certificate_not_found
# More than RATE_LIMIT_MAX requests in a minute → 429 rate_limited
```

Locally, `npx http-server . -p 8080 -c-1` and open
`http://localhost:8080/verify.html?id=CBA-2026-001`. With the function not
deployed, the page falls back to the bundled records.

## Security properties and limits

- `certificates` and `verification_rate_limits` have RLS enabled with **no
  policies**, and all privileges are revoked from `anon`/`authenticated`.
  The browser cannot query them even with the anon key.
- Tokens are 100-bit random values from an unambiguous alphabet, stored only as
  SHA-256 hashes. Guessing a token is not practical.
- Certificate numbers remain enumerable, which is why number lookups are
  rate-limited and why `REQUIRE_TOKEN=true` is available once every valid
  certificate has a printed token.
- Rate-limit state is per salted IP hash with a one-hour retention; raw IPs are
  never stored.
- Responses use `Cache-Control: no-store` and an origin allowlist, so another
  site cannot make a visitor’s browser read the result.
- `data/students.json` stays in the bundle as the legacy fallback. After the
  function is deployed and confirmed working, delete that file and the
  `verifyLegacy()` path in `js/verify.js` to remove the last public copy of the
  records.
