import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SignInView } from '@/components/SignInView';
import { currentUser } from '@/lib/supabase/server';

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

  // Already signed in — no reason to show the form.
  if (await currentUser()) redirect('/you');

  // Only ever redirect within this app: an open redirect here would let a
  // phishing link borrow our domain to bounce people somewhere else.
  const destination = next && next.startsWith('/') && !next.startsWith('//') ? next : '/you';

  return <SignInView next={destination} />;
}
