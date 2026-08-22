import 'server-only';
import type Stripe from 'stripe';

/**
 * What happens after the money moves.
 *
 * Order *state* needs no database: a Checkout Session is a durable record, and
 * /orders/[id] reads the reader's answers back out of its metadata. What is
 * missing is the product itself — writing the reading, rendering the PDF,
 * narrating it — and somewhere to keep the resulting files. Until that is
 * chosen, the handlers below record loudly and do nothing else.
 *
 * They must stay safe to run twice: Stripe delivers at least once, and
 * redelivers every event the endpoint answers with a non-2xx. `eventId` is
 * passed in so the first thing a real implementation should do is check
 * whether that event has already been processed.
 */

export type Entitlement = 'active' | 'inactive' | 'past_due';

function customerId(
  object: Stripe.Checkout.Session | Stripe.Subscription | Stripe.Invoice,
): string | null {
  const customer = object.customer;
  if (!customer) return null;
  return typeof customer === 'string' ? customer : customer.id;
}

/** The reader has paid for a written reading. */
export async function fulfilReport(
  session: Stripe.Checkout.Session,
  eventId: string,
): Promise<void> {
  const reportId = session.metadata?.reportId ?? 'unknown';

  // TODO(fulfilment): generate the reading, render the PDF, narrate it, store
  // both, and record the URLs against session.id so orderAssets() can find
  // them. Needs a blob store and a job runner — see README.
  console.warn(
    `[fulfilment] paid but not generated — report=${reportId} session=${session.id} event=${eventId}`,
  );
}

export async function markPaymentFailed(session: Stripe.Checkout.Session): Promise<void> {
  console.warn(`[fulfilment] payment failed — session=${session.id}`);
}

/** Pro access changed: a new subscription, a renewal, a cancellation, dunning. */
export async function setProEntitlement(
  object: Stripe.Checkout.Session | Stripe.Subscription | Stripe.Invoice,
  entitlement: Entitlement,
): Promise<void> {
  const customer = customerId(object);

  // TODO(entitlement): persist { customer -> entitlement } and read it back
  // wherever the app gates Pro. Needs an account model; the app is anonymous
  // today, so there is nothing to attach a subscription to.
  console.warn(`[entitlement] ${entitlement} — customer=${customer ?? 'none'}`);
}

export interface OrderAssets {
  pdfUrl: string | null;
  audioUrl: string | null;
}

/**
 * The finished files for an order. Returns nothing until fulfilment above is
 * implemented, and the delivered view reads that as "written, not ready" —
 * rather than offering a download that would 404.
 */
export function orderAssets(_session: Stripe.Checkout.Session): OrderAssets {
  return { pdfUrl: null, audioUrl: null };
}
