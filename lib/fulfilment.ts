import 'server-only';
import type Stripe from 'stripe';
import { supabaseAdmin } from './supabase/admin';

/**
 * What happens after the money moves.
 *
 * Order *state* needs no database: a Checkout Session is a durable record, and
 * /orders/[id] reads the reader's answers back out of its metadata. Pro is
 * different — it is a relationship over time, so it lives in
 * public.subscriptions, which only this file writes, using the secret key.
 *
 * Handlers must stay safe to run twice: Stripe delivers at least once and
 * redelivers every event the endpoint answers with a non-2xx.
 */

/** Stripe has more subscription states than the app cares about. */
const STATUS: Record<string, string> = {
  active: 'active',
  trialing: 'trialing',
  past_due: 'past_due',
  canceled: 'canceled',
  unpaid: 'past_due',
  incomplete: 'inactive',
  incomplete_expired: 'inactive',
  paused: 'inactive',
};

export function mapStatus(stripeStatus: string): string {
  return STATUS[stripeStatus] ?? 'inactive';
}

function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id;
}

/**
 * Which reader does this belong to?
 *
 * Stripe events arrive in no guaranteed order, so every route to the answer is
 * tried: the id we attached when checkout started, then the customer we have
 * already seen. Returning null is not an error — someone can subscribe from a
 * flow we did not originate.
 */
async function resolveUserId(
  explicit: string | null | undefined,
  stripeCustomerId: string | null,
): Promise<string | null> {
  if (explicit) return explicit;
  if (!stripeCustomerId) return null;

  const { data } = await supabaseAdmin()
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle();

  return data?.user_id ?? null;
}

/** The reader has paid for a written reading. */
export async function fulfilReport(
  session: Stripe.Checkout.Session,
  eventId: string,
): Promise<void> {
  const reportId = session.metadata?.reportId ?? 'unknown';

  // TODO(fulfilment): write the reading, render the PDF, narrate it, store both
  // against session.id so orderAssets() can find them. Needs a blob store and a
  // job runner — see README. Blob existence is the idempotency check.
  console.warn(
    `[fulfilment] paid but not generated — report=${reportId} session=${session.id} event=${eventId}`,
  );
}

export async function markPaymentFailed(session: Stripe.Checkout.Session): Promise<void> {
  console.warn(`[fulfilment] payment failed — session=${session.id}`);
}

/**
 * Pro access changed: a new subscription, a renewal, a cancellation, dunning.
 * Upserts on user_id, so redelivery of the same event is harmless.
 */
export async function setProEntitlement(input: {
  userId?: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId?: string | null;
  status: string;
  currentPeriodEnd?: number | null;
}): Promise<void> {
  const userId = await resolveUserId(input.userId, input.stripeCustomerId);

  if (!userId) {
    console.warn(
      `[entitlement] no reader for customer=${input.stripeCustomerId ?? 'none'} — nothing written`,
    );
    return;
  }

  const { error } = await supabaseAdmin()
    .from('subscriptions')
    .upsert(
      {
        user_id: userId,
        stripe_customer_id: input.stripeCustomerId,
        stripe_subscription_id: input.stripeSubscriptionId ?? null,
        status: input.status,
        current_period_end: input.currentPeriodEnd
          ? new Date(input.currentPeriodEnd * 1000).toISOString()
          : null,
      },
      { onConflict: 'user_id' },
    );

  if (error) throw new Error(`could not write entitlement: ${error.message}`);
  console.log(`[entitlement] ${input.status} — user=${userId}`);
}

export async function entitlementFromSubscription(
  subscription: Stripe.Subscription,
): Promise<void> {
  await setProEntitlement({
    userId: subscription.metadata?.user_id ?? null,
    stripeCustomerId: idOf(subscription.customer),
    stripeSubscriptionId: subscription.id,
    status: mapStatus(subscription.status),
    currentPeriodEnd: (subscription as unknown as { current_period_end?: number })
      .current_period_end,
  });
}

export async function entitlementFromSession(session: Stripe.Checkout.Session): Promise<void> {
  await setProEntitlement({
    userId: session.client_reference_id ?? session.metadata?.user_id ?? null,
    stripeCustomerId: idOf(session.customer),
    stripeSubscriptionId: idOf(session.subscription),
    // The subscription events carry the authoritative status; this only ensures
    // the reader and the Stripe customer are linked as early as possible.
    status: 'trialing',
  });
}

export async function entitlementFromInvoice(
  invoice: Stripe.Invoice,
  status: string,
): Promise<void> {
  await setProEntitlement({
    stripeCustomerId: idOf(invoice.customer),
    status,
  });
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
