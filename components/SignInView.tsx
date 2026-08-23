'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useSupabase } from './SupabaseProvider';

type Stage = 'asking' | 'sending' | 'sent' | 'verifying';

/**
 * Sign in by email — no password to choose, forget, or leak.
 *
 * Two ways in, because the link alone is not enough on a phone: tapping it in
 * Mail opens an in-app browser with its own cookie jar, so the session lands
 * somewhere the reader is not. The six-digit code signs them in *on the device
 * they are actually holding*, which is why the email carries both.
 */
export function SignInView({ next, origin }: { next: string; origin: string }) {
  const supabase = useSupabase();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
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

  const verify = async () => {
    const token = code.replace(/\D/g, '');
    if (!supabase || token.length < 6 || stage === 'verifying') return;
    setStage('verifying');
    setError(null);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: 'email',
    });

    if (verifyError) {
      setError(verifyError.message);
      setStage('sent');
      return;
    }

    // The browser client has written the session cookie; refresh so the server
    // renders as the signed-in reader rather than the anonymous one.
    router.refresh();
    router.push(next as never);
  };

  if (stage === 'sent' || stage === 'verifying') {
    return (
      <main className="view auth">
        <Link href="/you" className="back">
          ← You
        </Link>

        <h1 className="page-title">Check your email</h1>
        <p className="page-lede">
          Sent to {email.trim()}. Open the link, or type the six-digit code below — use the code if
          you are reading the email on another device.
        </p>

        <form
          className="auth__form"
          onSubmit={(e) => {
            e.preventDefault();
            verify();
          }}
        >
          <label className="field__label" htmlFor="auth-code">
            The code from the email
          </label>
          <input
            id="auth-code"
            className="control auth__code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={stage === 'verifying' || code.replace(/\D/g, '').length < 6}
          >
            <span>{stage === 'verifying' ? 'Signing you in' : 'Sign me in'}</span>
          </button>
        </form>

        {error ? (
          <p className="fineprint fineprint--error" role="alert">
            {error}
          </p>
        ) : (
          <p className="fineprint">The link and the code are both good for one hour.</p>
        )}

        <button
          type="button"
          className="set-birthday"
          onClick={() => {
            setStage('asking');
            setCode('');
            setError(null);
          }}
        >
          Use a different address →
        </button>
      </main>
    );
  }

  return (
    <main className="view auth">
      <Link href="/you" className="back">
        ← You
      </Link>

      <h1 className="page-title">Sign in</h1>
      <p className="page-lede">
        An account keeps your birthday and your saved cards with you between devices, and it is what
        a Pro subscription attaches to. A card a day stays free either way.
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
    </main>
  );
}
