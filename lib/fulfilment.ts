import 'server-only';
import type Stripe from 'stripe';
import { waitUntil } from '@vercel/functions';
import { supabaseAdmin } from './supabase/admin';
import { enqueueReport, jobFor, processJob } from './report-jobs';

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
  console.log(`[fulfilment] paid — report=${reportId} session=${session.id} event=${eventId}`);

  await enqueueReport(session);

  // Stripe treats a slow endpoint as a failed one, and writing a reading takes
  // minutes, so the response goes back now and the work continues after it.
  // waitUntil keeps the function alive without holding up the reply; anything
  // it does not finish is left as a row for the retry sweep.
  const job = await jobFor(session.id);
  if (job && job.status !== 'ready') {
    waitUntil(processJob(job, session));
  }
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
  /** The narration's true running time, once it exists. */
  seconds: number | null;
}

/**
 * The finished files for an order.
 *
 * These are route URLs rather than signed storage links. A signed link expires,
 * and a page that renders one is wrong the moment it is bookmarked or emailed,
 * so the route re-checks the payment and mints a fresh link each time it is
 * followed.
 */
export async function orderAssets(session: Stripe.Checkout.Session): Promise<OrderAssets> {
  const job = await jobFor(session.id);
  if (!job || job.status !== 'ready') return { pdfUrl: null, audioUrl: null, seconds: null };

  const base = `/api/reports/media?session=${encodeURIComponent(session.id)}`;
  return {
    pdfUrl: job.pdf_path ? `${base}&kind=pdf` : null,
    audioUrl: job.audio_path ? `${base}&kind=audio` : null,
    seconds: job.audio_seconds,
  };
}

/**
 * How long a reading may take before the wait itself is the news.
 *
 * A reader cannot tell "working" from "wedged" by looking at a spinner, so
 * after this long the page stops reassuring them and says something is wrong.
 * Generous against the two minutes we advertise, because a slow model is not
 * a failure and crying wolf trains people to ignore the signal.
 */
const LATE_AFTER_MINUTES = 10;

export type OrderState =
  /** Money has not settled. Nothing is written until it does. */
  | 'unpaid'
  /** Paid, no files yet, still inside the window we promised. */
  | 'writing'
  /** Paid and overdue. Something needs a person to look at it. */
  | 'late'
  /** Files exist. */
  | 'ready'
  /** Tried and gave up. A person has to look at this one. */
  | 'failed';

export interface OrderStatus {
  state: OrderState;
  /** Whole minutes since checkout, for telling the reader what we know. */
  waitedMinutes: number;
}

/**
 * The true state of an order, derived rather than stored.
 *
 * Stripe already records when the session was created and whether it was paid,
 * and the assets either exist or do not, so there is no status column to fall
 * out of sync with reality. The one thing this cannot do is distinguish a job
 * that is running slowly from one that was never started, which is why 'late'
 * says only that it is overdue and never guesses at a cause.
 */
export async function orderStatus(session: Stripe.Checkout.Session): Promise<OrderStatus> {
  const createdMs = (session.created ?? 0) * 1000;
  const waitedMinutes = createdMs ? Math.floor((Date.now() - createdMs) / 60000) : 0;

  if (session.payment_status === 'unpaid') return { state: 'unpaid', waitedMinutes };

  const job = await jobFor(session.id);
  if (job?.status === 'ready') return { state: 'ready', waitedMinutes };
  if (job?.status === 'failed') return { state: 'failed', waitedMinutes };

  // Paid with no job row at all is itself a problem worth surfacing once the
  // window has passed: it means the webhook never arrived.
  return {
    state: waitedMinutes >= LATE_AFTER_MINUTES ? 'late' : 'writing',
    waitedMinutes,
  };
}
