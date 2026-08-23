/**
 * The canonical address of the site.
 *
 * Auth links and Stripe redirects must point here rather than at whatever host
 * the reader happened to be on — someone signing in from a preview deployment
 * should still get an email that lands on the real site.
 *
 * www, not the apex: hausoforacle.com 308s to www, and a one-time token that
 * survives a redirect is a token that some mail scanners will mangle.
 */
const FALLBACK = 'https://www.hausoforacle.com';

export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) return FALLBACK;
  return configured.replace(/\/+$/, '');
}
