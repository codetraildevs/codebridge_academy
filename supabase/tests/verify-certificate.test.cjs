const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash, createHmac } = require('node:crypto');
const { createServer } = require('node:http');
const { spawn } = require('node:child_process');
const { once } = require('node:events');

test('verify-certificate worker', { timeout: 60000 }, async (t) => {
  const token = 'CBV-23456789ABCDEFGHJKLM';
  const number = 'CBA-2026-001';
  const calls = [];
  let allowed = true;
  let databaseOffline = false;
  let records = [{ certificate_number: number, holder_name: 'Test Holder', status: 'active' }];

  // Only PostgREST is simulated. Run the actual Deno entry point and Supabase client.
  const db = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let body = '';
    for await (const chunk of req) body += chunk;
    calls.push({ url, body: body && JSON.parse(body) });
    res.setHeader('content-type', 'application/json');
    if (databaseOffline) {
      res.writeHead(503).end('{"message":"offline"}');
    } else if (url.pathname === '/rest/v1/rpc/check_verification_rate_limit') {
      res.end(JSON.stringify(allowed));
    } else if (url.pathname === '/rest/v1/certificates') {
      res.end(JSON.stringify(records));
    } else {
      res.writeHead(500).end('{}');
    }
  });
  db.listen(0, '127.0.0.1');
  await once(db, 'listening');
  t.after(() => db.close());

  const worker = spawn(process.env.DENO_BIN || 'deno', [
    'run', '--no-config', '--frozen', '--lock=supabase/functions/verify-certificate/deno.lock',
    '--node-modules-dir=none', '--allow-env', '--allow-net',
    'supabase/functions/verify-certificate/index.ts',
  ], {
    env: {
      ...process.env,
      SUPABASE_URL: 'http://127.0.0.1:' + db.address().port,
      SUPABASE_SERVICE_ROLE_KEY: 'local-test-only',
      VERIFICATION_IP_SALT: 'test-salt',
      REQUIRE_TOKEN: 'false',
      RATE_LIMIT_MAX: '30',
      RATE_LIMIT_WINDOW_SECS: '60',
      ALLOWED_ORIGINS: 'https://codebridgecademy.com',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => worker.kill());
  await new Promise((resolve, reject) => {
    worker.once('error', reject);
    let logs = '';
    worker.once('exit', (code) => reject(new Error('Worker exited ' + code + '\n' + logs)));
    const onLog = (chunk) => {
      logs += chunk;
      if (logs.includes('Listening on')) resolve();
    };
    worker.stderr.on('data', onLog);
    worker.stdout.on('data', onLog);
  });

  const endpoint = 'http://127.0.0.1:8000/';
  const origin = 'https://codebridgecademy.com';
  const post = (body) => fetch(endpoint, {
    method: 'POST', headers: { origin, 'x-forwarded-for': '192.0.2.42' }, body,
  });

  await t.test('invalid input returns HTTP 400 before a database request', async () => {
    for (const value of [null, [], {}, { id: '!' }, { token: 'CBV-short' }, { id: 'CBV-short' }]) {
      const res = await post(JSON.stringify(value));
      assert.equal(res.status, 400);
      assert.equal((await res.json()).error, 'invalid_input');
      assert.equal(res.headers.get('access-control-allow-origin'), origin);
    }
    const malformed = await post('{');
    assert.equal(malformed.status, 400);
    assert.equal((await malformed.json()).error, 'invalid_json');
    assert.equal(calls.length, 0);
  });

  await t.test('preflight, foreign origins and unsupported methods', async () => {
    assert.equal((await fetch(endpoint, { method: 'OPTIONS', headers: { origin } })).status, 204);
    const denied = await fetch(endpoint, { method: 'POST', headers: { origin: 'https://example.org' } });
    assert.equal(denied.status, 403);
    assert.equal(denied.headers.get('access-control-allow-origin'), null);
    assert.equal((await fetch(endpoint)).status, 405);
    assert.equal(calls.length, 0);
  });

  await t.test('printed numbers and secure tokens in either QR format', async () => {
    for (const payload of [{ id: number.toLowerCase() }, { token }, { id: token }]) {
      calls.length = 0;
      const res = await post(JSON.stringify(payload));
      assert.equal(res.status, 200);
      const result = await res.json();
      const isToken = payload.token === token || payload.id === token;
      assert.equal(result.method, isToken ? 'token' : 'number');
      assert.equal(result.certificate.holder_name, 'Test Holder');
      assert.deepEqual(calls[0].body, {
        p_client_hash: createHmac('sha256', 'test-salt').update('192.0.2.42').digest('hex'),
        p_limit: 30, p_window_secs: 60,
      });
      assert.equal(calls.length, 2);
      assert.equal(calls[1].url.searchParams.get(isToken ? 'token_hash' : 'certificate_number'),
        'eq.' + (isToken ? createHash('sha256').update(token).digest('hex') : number));
    }
  });

  await t.test('revoked, expired and missing certificates', async () => {
    for (const status of ['revoked', 'expired']) {
      records[0].status = status;
      const res = await post(JSON.stringify({ id: number }));
      assert.equal(res.status, 200);
      const result = await res.json();
      assert.equal(result.valid, false);
      assert.equal(result.reason, status);
      assert.equal(result.certificate.holder_name, undefined);
    }
    records = [];
    const res = await post(JSON.stringify({ id: number }));
    assert.equal(res.status, 404);
    assert.equal((await res.json()).error, 'certificate_not_found');
  });

  await t.test('rate limiting returns 429 and prevents the lookup', async () => {
    calls.length = 0;
    allowed = false;
    const res = await post(JSON.stringify({ id: number }));
    assert.equal(res.status, 429);
    assert.equal(res.headers.get('retry-after'), '60');
    assert.equal(calls.length, 1);
  });

  await t.test('a database outage fails closed with HTTP 503', async () => {
    databaseOffline = true;
    calls.length = 0;
    const res = await post(JSON.stringify({ id: number }));
    assert.equal(res.status, 503);
    assert.equal((await res.json()).error, 'verification_unavailable');
    assert.equal(calls.length, 1);
  });
});
