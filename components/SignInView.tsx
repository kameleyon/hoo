'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSupabase } from './SupabaseProvider';

type Stage = 'asking' | 'sending' | 'sent';

/**
 * Sign in by email link — no password to choose, forget, or leak.
 *
 * The reader only needs an account for Pro; everything else in the app works
 * signed out, which is why this page explains itself rather than acting as a
 * gate in front of the deck.
 */
export function SignInView({ next, origin }: { next: string; origin: string }) {
  const supabase = useSupabase();
  const [email, setEmail] = useState('');
  const [stage, setStage] = useState<Stage>('asking');
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (stage === 'sending' || !email.trim() || !supabase) return;
    setStage('sending');
    setError(null);

    const { error: sendError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        // The canonical site, not this tab's host — a preview deployment should
        // still send a link that lands on the real thing.
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (sendError) {
      setError(sendError.message);
      setStage('asking');
      return;
    }
    setStage('sent');
  };

  return (
    <main className="view auth">
      <Link href="/you" className="back">
        ← You
      </Link>

      {stage === 'sent' ? (
        <>
          <h1 className="page-title">Check your email</h1>
          <p className="page-lede">
            A link is on its way to {email.trim()}. Open it on this device and you will be signed
            in — there is no password to remember.
          </p>
          <button
            type="button"
            className="set-birthday"
            onClick={() => {
              setStage('asking');
              setError(null);
            }}
          >
            Use a different address →
          </button>
        </>
      ) : (
        <>
          <h1 className="page-title">Sign in</h1>
          <p className="page-lede">
            An account keeps your birthday and your saved cards with you between devices, and it is
            what a Pro subscription attaches to. A card a day stays free either way.
          </p>

          <form
            className="auth__form"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <label className="field__label" htmlFor="auth-email">
              Your email
            </label>
            <input
              id="auth-email"
              type="email"
              className="control"
              placeholder="you@example.com"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <button type="submit" className="btn-primary" disabled={stage === 'sending'}>
              <span>{stage === 'sending' ? 'Sending the link' : 'Email me a link'}</span>
            </button>
          </form>

          {error ? (
            <p className="fineprint fineprint--error" role="alert">
              {error}
            </p>
          ) : (
            <p className="fineprint">We only use it to sign you in. No list, no marketing.</p>
          )}
        </>
      )}
    </main>
  );
}
