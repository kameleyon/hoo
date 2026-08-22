import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SignInView } from '@/components/SignInView';
import Link from 'next/link';
import { currentUser } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false },
};

export const dynamic = 'force-dynamic';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  // Accounts are optional infrastructure. Say so plainly rather than showing a
  // form that cannot work.
  if (!isSupabaseConfigured()) {
    return (
      <main className="view auth">
        <Link href="/you" className="back">
          ← You
        </Link>
        <h1 className="page-title">Accounts are not switched on yet</h1>
        <p className="page-lede">
          Everything else works without one: the card of the day, the whole deck, all fifty-two
          studies, the reference tables and the readings you can order. Your birthday and saved
          cards are kept on this device in the meantime.
        </p>
        <Link href="/deck" className="set-birthday">
          Open the deck →
        </Link>
      </main>
    );
  }

  // Already signed in — no reason to show the form.
  if (await currentUser()) redirect('/you');

  // Only ever redirect within this app: an open redirect here would let a
  // phishing link borrow our domain to bounce people somewhere else.
  const destination = next && next.startsWith('/') && !next.startsWith('//') ? next : '/you';

  return <SignInView next={destination} />;
}
