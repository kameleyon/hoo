/**
 * Creates the Haus of Oracle Pro product and its two recurring prices.
 *
 *   node --env-file=.env.local scripts/setup-stripe-prices.mjs
 *
 * Run once per Stripe account (once in test mode, once in live). Safe to
 * re-run: prices are found by lookup key and left alone if they already exist
 * at the right amount. If an amount has changed, the old price is archived and
 * the lookup key is transferred to a new one, because Stripe prices are
 * immutable — existing subscribers keep the price they signed up on.
 *
 * The app resolves these by lookup key at runtime (lib/stripe.ts), so there is
 * no id to copy into an environment variable.
 */
import Stripe from 'stripe';

const PRODUCT_NAME = 'Haus of Oracle Pro';
const PRODUCT_LOOKUP = 'hoo_pro';

const PRICES = [
  { lookup_key: 'hoo_pro_monthly', unit_amount: 699, interval: 'month', label: 'Monthly' },
  { lookup_key: 'hoo_pro_yearly', unit_amount: 4900, interval: 'year', label: 'Yearly' },
];

const secret = process.env.STRIPE_SECRET_KEY;
if (!secret) {
  console.error('STRIPE_SECRET_KEY is not set. Try: node --env-file=.env.local scripts/setup-stripe-prices.mjs');
  process.exit(1);
}

const stripe = new Stripe(secret, { apiVersion: '2026-07-29.dahlia' });
const mode = secret.includes('_live_') ? 'LIVE' : 'test';
console.log(`Stripe mode: ${mode}\n`);

// --- product --------------------------------------------------------------
const existingProducts = await stripe.products.search({
  query: `metadata['lookup']:'${PRODUCT_LOOKUP}'`,
  limit: 1,
});

let product = existingProducts.data[0];
if (product) {
  console.log(`product   reused   ${product.id}  ${product.name}`);
} else {
  product = await stripe.products.create({
    name: PRODUCT_NAME,
    description: 'Every planetary period, all fifty-two card studies, saved charts, and the full learning path.',
    metadata: { lookup: PRODUCT_LOOKUP },
  });
  console.log(`product   created  ${product.id}  ${product.name}`);
}

// --- prices ---------------------------------------------------------------
for (const spec of PRICES) {
  const { data } = await stripe.prices.list({
    lookup_keys: [spec.lookup_key],
    active: true,
    limit: 1,
  });
  const current = data[0];

  if (
    current &&
    current.unit_amount === spec.unit_amount &&
    current.recurring?.interval === spec.interval &&
    current.product === product.id
  ) {
    console.log(`price     reused   ${current.id}  ${spec.lookup_key}`);
    continue;
  }

  if (current) {
    await stripe.prices.update(current.id, { active: false });
    console.log(`price     archived ${current.id}  ${spec.lookup_key} (amount or interval changed)`);
  }

  const price = await stripe.prices.create({
    product: product.id,
    currency: 'usd',
    unit_amount: spec.unit_amount,
    recurring: { interval: spec.interval },
    lookup_key: spec.lookup_key,
    transfer_lookup_key: Boolean(current),
    nickname: `${PRODUCT_NAME} — ${spec.label}`,
  });
  console.log(`price     created  ${price.id}  ${spec.lookup_key}`);
}

console.log('\nDone. The app finds these by lookup key — nothing to paste anywhere.');
