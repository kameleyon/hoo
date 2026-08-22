import type { Metadata } from 'next';
import Link from 'next/link';
import type Stripe from 'stripe';
import { DeliveredView } from '@/components/DeliveredView';
import { stripe } from '@/lib/stripe';

export const metadata: Metadata = {
  title: 'Your reading',
  robots: { index: false },
};

export const dynamic = 'force-dynamic';

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let session: Stripe.Checkout.Session | null = null;
  if (id.startsWith('cs_')) {
    try {
      session = await stripe().checkout.sessions.retrieve(id);
    } catch (error) {
      console.error(`could not read checkout session ${id}`, error);
    }
  }

  if (!session) {
    return (
      <main className="view">
        <Link href="/reports" className="back">
          ← On demand
        </Link>
        <h1 className="page-title">No such order</h1>
        <p className="page-lede">
          This link has expired, or the order was never completed. Nothing was charged.
        </p>
      </main>
    );
  }

  return <DeliveredView session={session} />;
}
