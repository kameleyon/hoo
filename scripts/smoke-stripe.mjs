/**
 * Local smoke test for the Stripe wiring. Needs `npm run dev` running.
 *
 *   node scripts/smoke-stripe.mjs [baseUrl]
 *
 * Checks that checkout validates its input, that a real test-mode Checkout
 * Session can be created, and that the webhook endpoint accepts a correctly
 * signed event and rejects a forged one. Reads STRIPE_WEBHOOK_SECRET from
 * .env.local — no Stripe CLI required.
 */
import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const base = process.argv[2] ?? 'http://localhost:3000';

const env = Object.fromEntries(
  readFileSync(resolve(root, '.env.local'), 'utf8')
    .split('\n')
    .filter((line) => line.includes('='))
    .map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    }),
);

let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

const post = (path, body, headers = {}) =>
  fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

// --- checkout -------------------------------------------------------------
{
  const res = await post('/api/checkout', {
    kind: 'report',
    reportId: 'love',
    values: { a: '07-12', b: '02-26' },
  });
  const data = await res.json();
  check(
    'checkout creates a session',
    res.ok && typeof data.url === 'string' && data.url.includes('checkout.stripe.com'),
    res.status === 503 ? 'STRIPE_SECRET_KEY missing on this deployment' : res.ok ? '' : JSON.stringify(data),
  );
}

{
  const res = await post('/api/checkout', {
    kind: 'report',
    reportId: 'love',
    values: { a: '99-99', b: '02-26' },
  });
  const data = await res.json();
  check('checkout rejects an impossible date with 400', res.status === 400, data.error);
}

{
  const res = await post('/api/checkout', { kind: 'report', reportId: 'nope', values: {} });
  check('checkout rejects an unknown report with 400', res.status === 400);
}

{
  const res = await post('/api/checkout', { kind: 'pro', plan: 'year' });
  const data = await res.json();
  check(
    'pro subscription checkout opens',
    res.ok && typeof data.url === 'string' && data.url.includes('checkout.stripe.com'),
    res.status === 503 ? 'run: npm run stripe:setup' : res.ok ? '' : JSON.stringify(data),
  );
}

// --- webhook --------------------------------------------------------------
const secret = env.STRIPE_WEBHOOK_SECRET;
if (!secret) {
  check('STRIPE_WEBHOOK_SECRET present in .env.local', false);
} else {
  const event = {
    id: 'evt_smoke_test',
    object: 'event',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_smoke',
        object: 'checkout.session',
        mode: 'payment',
        payment_status: 'paid',
        metadata: { reportId: 'love', f_a: '07-12', f_b: '02-26' },
      },
    },
  };
  const payload = JSON.stringify(event);
  const timestamp = 1900000000; // fixed; the route does not enforce a tolerance
  const signature = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');

  const good = await post('/api/stripe/webhook', payload, {
    'stripe-signature': `t=${timestamp},v1=${signature}`,
  });
  check(
    'webhook accepts a correctly signed event',
    good.status === 204,
    good.status === 503 ? 'STRIPE_WEBHOOK_SECRET missing on this deployment' : `HTTP ${good.status}`,
  );

  const forged = await post('/api/stripe/webhook', payload, {
    'stripe-signature': `t=${timestamp},v1=${'0'.repeat(64)}`,
  });
  check('webhook rejects a forged signature', forged.status === 400, `HTTP ${forged.status}`);

  const bare = await post('/api/stripe/webhook', payload);
  check('webhook rejects a missing signature', bare.status === 400, `HTTP ${bare.status}`);
}

process.exit(failures === 0 ? 0 : 1);
