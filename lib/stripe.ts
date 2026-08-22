import 'server-only';
import Stripe from 'stripe';

/**
 * Server-side Stripe client.
 *
 * The key is read from the environment at call time, never at module load, so
 * a missing key fails on the request that needed it rather than at build.
 * On Vercel, STRIPE_SECRET_KEY should be a sensitive environment variable.
 */
export class StripeNotConfigured extends Error {}

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (client) return client;

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new StripeNotConfigured('STRIPE_SECRET_KEY is not set');
  }

  client = new Stripe(secret, {
    apiVersion: '2026-07-29.dahlia',
    appInfo: { name: 'Haus of Oracle', url: 'https://hausoforacle.com' },
  });
  return client;
}

/**
 * Dashboard labels for the two checkout flows, so they can be compared
 * separately in Stripe. The random suffix is fixed on purpose — it identifies
 * this integration, not an individual session.
 */
export const INTEGRATION_ID = {
  report: 'hoo-report-kvqmzxtr',
  pro: 'hoo-pro-bdwhnfgs',
} as const;

export class ProPricesMissing extends Error {}

/**
 * Stripe lookup keys for the two Pro prices. Resolving by lookup key rather
 * than a pasted price id means the catalogue is set up once with
 * `npm run stripe:setup` and there is no id to copy into an environment
 * variable, and nothing to get wrong per deployment.
 */
export const PRO_LOOKUP_KEYS = {
  month: 'hoo_pro_monthly',
  year: 'hoo_pro_yearly',
} as const;

export type ProPlan = keyof typeof PRO_LOOKUP_KEYS;

const priceCache = new Map<string, string>();

export async function proPriceId(plan: ProPlan): Promise<string> {
  const lookupKey = PRO_LOOKUP_KEYS[plan];
  const cached = priceCache.get(lookupKey);
  if (cached) return cached;

  const { data } = await stripe().prices.list({
    lookup_keys: [lookupKey],
    active: true,
    limit: 1,
  });

  const price = data[0];
  if (!price) {
    throw new ProPricesMissing(
      `no active price with lookup_key "${lookupKey}" — run: npm run stripe:setup`,
    );
  }

  priceCache.set(lookupKey, price.id);
  return price.id;
}

/** "$19" -> 1900. Report prices live in lib/reports.ts as display strings. */
export function priceToMinorUnits(price: string): number {
  const amount = Number(price.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`unreadable price: ${price}`);
  }
  return Math.round(amount * 100);
}
