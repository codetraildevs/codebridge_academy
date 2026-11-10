-- ============================================
-- Certificate verification: registry, secure tokens, rate limiting
-- ============================================
-- Run this in the Supabase SQL editor (or `supabase db push`).
-- The public website never reads this table directly: all lookups go
-- through the verify-certificate edge function using the service role.
--
-- Legacy certificate numbers (CBA-2026-001, ...) stay valid. New
-- certificates also get a random token (CBV-XXXXXXXXXXXXXXXXXXXX) that
-- is printed on the certificate / encoded in its QR code. Only the
-- SHA-256 hash of the token is stored here.

create extension if not exists pgcrypto with schema extensions;

-- ---------- Registry ----------
create table if not exists public.certificates (
  id                 uuid primary key default gen_random_uuid(),
  certificate_number text        not null unique,
  holder_name        text        not null,
  program            text        not null,
  modules            text[]      not null default '{}',
  start_date         date,
  end_date           date,
  issued_on          date,
  status             text        not null default 'active'
                     check (status in ('active', 'revoked', 'expired')),
  token_hash         text        unique,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on column public.certificates.token_hash is
  'SHA-256 hex of the printed verification token. The plaintext token is never stored.';

-- Certificate numbers are case-insensitive and whitespace-insensitive:
-- normalise on write so lookups can use the plain unique index.
create or replace function public.normalize_certificate_number()
returns trigger
language plpgsql
as $$
begin
  new.certificate_number := upper(btrim(new.certificate_number));
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists certificates_normalize on public.certificates;
create trigger certificates_normalize
  before insert or update on public.certificates
  for each row execute function public.normalize_certificate_number();

-- ---------- Rate limiting ----------
-- One row per verification attempt, keyed by a salted hash of the client
-- IP (raw IPs are never stored). The edge function calls the RPC below.
create table if not exists public.verification_rate_limits (
  id           uuid primary key default gen_random_uuid(),
  client_hash  text        not null,
  attempted_at timestamptz not null default now()
);

create index if not exists verification_rate_limits_lookup_idx
  on public.verification_rate_limits (client_hash, attempted_at desc);

create or replace function public.check_verification_rate_limit(
  p_client_hash  text,
  p_limit        int default 20,
  p_window_secs  int default 60
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 20), 1), 1000);
  v_window int := least(greatest(coalesce(p_window_secs, 60), 1), 86400);
  v_count int;
begin
  if p_client_hash is null or length(p_client_hash) < 8 then
    return false;
  end if;

  -- Serialise concurrent attempts from the same client so the count is exact.
  perform pg_advisory_xact_lock(hashtext(p_client_hash));

  -- Keep the table small; attempts older than one hour are useless.
  delete from public.verification_rate_limits
   where attempted_at < now() - interval '1 hour';

  select count(*) into v_count
    from public.verification_rate_limits
   where client_hash = p_client_hash
     and attempted_at > now() - make_interval(secs => v_window);

  if v_count >= v_limit then
    return false;
  end if;

  insert into public.verification_rate_limits (client_hash) values (p_client_hash);
  return true;
end;
$$;

-- ---------- Token minting ----------
-- Returns the plaintext token ONCE. Print it on the certificate (or encode
-- it in the QR code); the database keeps only its hash. Call it from the
-- SQL editor or a service-role script:
--
--   select public.mint_certificate_token('CBA-2026-004');
--
-- Re-minting replaces the old token, so previously printed tokens stop
-- working. Set the certificate's status to 'revoked' instead if the
-- certificate itself must stop verifying.
create or replace function public.mint_certificate_token(p_certificate_number text)
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  v_token text := 'CBV-';
  v_found int;
  i int;
begin
  for i in 1..20 loop
    v_token := v_token || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
  end loop;

  update public.certificates
     set token_hash = encode(digest(v_token, 'sha256'), 'hex')
   where certificate_number = upper(btrim(p_certificate_number));

  get diagnostics v_found = row_count;
  if v_found = 0 then
    raise exception 'Certificate % not found', p_certificate_number
      using errcode = 'no_data_found';
  end if;

  return v_token;
end;
$$;

-- ---------- Lock the table down ----------
alter table public.certificates enable row level security;
alter table public.verification_rate_limits enable row level security;

-- No policies on purpose: anon/authenticated get nothing at all.
revoke all on table public.certificates from anon, authenticated;
revoke all on table public.verification_rate_limits from anon, authenticated;

grant all on table public.certificates to service_role;
grant all on table public.verification_rate_limits to service_role;

revoke all on function public.check_verification_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.check_verification_rate_limit(text, int, int) to service_role;

revoke all on function public.mint_certificate_token(text) from public, anon, authenticated;
grant execute on function public.mint_certificate_token(text) to service_role;
