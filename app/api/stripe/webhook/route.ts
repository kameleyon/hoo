import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { markPaymentFailed, fulfilReport, setProEntitlement } from '@/lib/fulfilment';

/**
 * Stripe's event endpoint.
 *
 * Fulfilment lives here rather than on the success page: a reader can pay and
 * then lose their connection before the redirect lands, and delayed payment
 * methods settle hours later with no browser involved at all.
 *
 * The raw request body is required for signature verification, so nothing may
 * parse it first.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return new Response('not configured', { status: 500 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) return new Response('missing signature', { status: 400 });

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(payload, signature, secret);
  } catch (error) {
    // A bad signature is never worth retrying — answer 400 so Stripe stops.
    console.error('webhook signature verification failed', error);
    return new Response('invalid signature', { status: 400 });
  }

  try {
    await handle(event);
  } catch (error) {
    // 500 asks Stripe to retry with backoff. Handlers must be safe to re-run:
    // Stripe delivers at least once, and redelivers after any non-2xx.
    console.error(`handler failed for ${event.type} (${event.id})`, error);
    return new Response('handler failed', { status: 500 });
  }

  return new Response(null, { status: 204 });
}

async function handle(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    /**
     * The session finished. With a card this already means paid; with a
     * delayed method (bank debits, vouchers) it arrives while still unpaid and
     * the money may never turn up — so fulfil only once it is not `unpaid`.
     */
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object;
      if (session.payment_status === 'unpaid') return;

      if (session.mode === 'subscription') {
        await setProEntitlement(session, 'active');
        return;
      }
      await fulfilReport(session, event.id);
      return;
    }

    case 'checkout.session.async_payment_failed': {
      await markPaymentFailed(event.data.object);
      return;
    }

    /** Renewals, cancellations, plan changes and dunning all land here. */
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      await setProEntitlement(
        subscription,
        subscription.status === 'active' || subscription.status === 'trialing'
          ? 'active'
          : 'inactive',
      );
      return;
    }

    case 'invoice.paid':
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      await setProEntitlement(invoice, event.type === 'invoice.paid' ? 'active' : 'past_due');
      return;
    }

    default:
      // Anything else the endpoint is subscribed to is acknowledged and ignored.
      return;
  }
}
