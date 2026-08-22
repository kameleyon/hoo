import { NextResponse } from 'next/server';
import { INTEGRATION_ID, StripeNotConfigured, priceToMinorUnits, stripe } from '@/lib/stripe';
import { parseDayKey } from '@/lib/cardology';
import { reportById } from '@/lib/reports';

/** Stripe caps metadata values at 500 characters. */
const METADATA_MAX = 500;

/** A problem with what the browser sent, as opposed to a problem with Stripe. */
class InvalidRequest extends Error {}

function siteUrl(request: Request): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
}

/**
 * Turns the builder's answers into Stripe metadata, rejecting anything the
 * report did not ask for. The amount is taken from lib/reports.ts on the
 * server — never from the request body.
 */
function reportMetadata(
  reportId: string,
  values: Record<string, unknown>,
): Record<string, string> {
  const report = reportById(reportId);
  if (!report) throw new InvalidRequest('unknown report');

  const metadata: Record<string, string> = { reportId };

  for (const field of report.fields) {
    const raw = values[field.key];
    if (typeof raw !== 'string') throw new InvalidRequest(`missing field: ${field.key}`);

    if (field.kind === 'date') {
      if (!parseDayKey(raw)) throw new InvalidRequest(`not a date: ${field.key}`);
      metadata[`f_${field.key}`] = raw;
      continue;
    }

    if (raw.length > METADATA_MAX) throw new InvalidRequest(`too long: ${field.key}`);
    metadata[`f_${field.key}`] = raw;
  }

  return metadata;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const payload = body as { kind?: string; reportId?: string; values?: Record<string, unknown>; plan?: string };
  const origin = siteUrl(request);

  try {
    if (payload.kind === 'report') {
      const report = reportById(String(payload.reportId));
      if (!report) return NextResponse.json({ error: 'unknown report' }, { status: 400 });

      const metadata = reportMetadata(report.id, payload.values ?? {});

      const session = await stripe().checkout.sessions.create({
        mode: 'payment',
        integration_identifier: INTEGRATION_ID.report,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'usd',
              unit_amount: priceToMinorUnits(report.price),
              product_data: {
                name: report.title,
                description: report.line,
              },
            },
          },
        ],
        metadata,
        // Carried onto the PaymentIntent so the reading survives a refund view.
        payment_intent_data: { metadata },
        success_url: `${origin}/orders/{CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/reports/${report.id}`,
      });

      return NextResponse.json({ url: session.url });
    }

    if (payload.kind === 'pro') {
      const price =
        payload.plan === 'month'
          ? process.env.STRIPE_PRICE_PRO_MONTHLY
          : process.env.STRIPE_PRICE_PRO_YEARLY;

      if (!price) {
        return NextResponse.json(
          { error: 'Pro prices are not configured on this deployment.' },
          { status: 503 },
        );
      }

      const session = await stripe().checkout.sessions.create({
        mode: 'subscription',
        integration_identifier: INTEGRATION_ID.pro,
        line_items: [{ price, quantity: 1 }],
        subscription_data: { trial_period_days: 7 },
        success_url: `${origin}/you`,
        cancel_url: `${origin}/pro`,
      });

      return NextResponse.json({ url: session.url });
    }

    return NextResponse.json({ error: 'unknown kind' }, { status: 400 });
  } catch (error) {
    if (error instanceof InvalidRequest) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof StripeNotConfigured) {
      console.error(error.message);
      return NextResponse.json(
        { error: 'payments are not configured on this deployment' },
        { status: 503 },
      );
    }
    // Never let a Stripe error message reach the browser — it can name the key.
    console.error('checkout failed', error);
    return NextResponse.json({ error: 'could not start checkout' }, { status: 500 });
  }
}
