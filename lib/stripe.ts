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

/** "$19" -> 1900. Report prices live in lib/reports.ts as display strings. */
export function priceToMinorUnits(price: string): number {
  const amount = Number(price.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`unreadable price: ${price}`);
  }
  return Math.round(amount * 100);
}
