'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FULL_STUDY, PLANS, PRO_ROWS } from '@/lib/reports';

export function ProView() {
  const router = useRouter();
  const [plan, setPlan] = useState('year');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startTrial = async () => {
    if (starting) return;
    setStarting(true);
    setError(null);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind: 'pro', plan }),
      });
      const data: { url?: string; error?: string } = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error ?? 'checkout unavailable');
      window.location.assign(data.url);
    } catch {
      setError('We could not open checkout. Nothing has been charged — please try again.');
      setStarting(false);
    }
  };

  const plans = (
    <div className="pro__plans" role="group" aria-label="Choose a plan">
      {PLANS.map((p) => (
        <button
          key={p.key}
          type="button"
          className="plan"
          aria-pressed={plan === p.key}
          onClick={() => setPlan(p.key)}
        >
          <span>
            <span className="plan__title" style={{ display: 'block' }}>
              {p.title}
            </span>
            <span className="plan__sub" style={{ display: 'block' }}>
              {p.sub}
            </span>
          </span>
          <span className="plan__price">{p.price}</span>
        </button>
      ))}
    </div>
  );

  return (
    <main className="view view--pro">
      {/* The paywall takes over the whole screen on the phone, so its close
          control has to sit on the dark; at width the page is light and the
          control belongs above it with the other back links. */}
      <button type="button" className="back pro__back--desktop" onClick={() => router.back()}>
        ← Close
      </button>

      <div className="pro">
        <div className="pro__main">
          <button type="button" className="pro__back pro__back--mobile" onClick={() => router.back()}>
            ← Close
          </button>
          <Image src="/oracle-mark.png" alt="" width={52} height={52} className="pro__mark" />
          <h1 className="pro__title">Read the whole deck</h1>
          <p className="pro__lede">
            A card a day is free, and always will be. Pro is for the rest of the system.
          </p>

          <div className="pro__rows">
            {PRO_ROWS.map((r) => (
              <div key={r.title} className="pro__row">
                <span className="pro__row-sym" aria-hidden="true">
                  {r.sym}
                </span>
                <span style={{ flex: 1 }}>
                  <span className="pro__row-title" style={{ display: 'block' }}>
                    {r.title}
                  </span>
                  <span className="pro__row-sub" style={{ display: 'block' }}>
                    {r.sub}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="pro__panel">
          <p className="label" style={{ color: 'var(--on-dark-label)' }}>
            Choose a plan
          </p>
          {plans}

          <button type="button" className="btn-invert" onClick={startTrial} disabled={starting}>
            {starting ? 'Opening checkout' : 'Start 7 days free'}
          </button>
          {error ? (
            <p className="pro__fine pro__fine--error" role="alert">
              {error}
            </p>
          ) : (
            <p className="pro__fine">Cancel any time. Restore purchase.</p>
          )}

          <div className="pro__oneoff">
            <p className="label" style={{ color: 'var(--on-dark-label)' }}>
              Or pay once
            </p>
            <Link href={`/reports/${FULL_STUDY.id}`} className="pro__oneoff-row">
              <span className="pro__oneoff-title">{FULL_STUDY.title}</span>
              <span className="pro__oneoff-price">{FULL_STUDY.price}</span>
            </Link>
            <p className="pro__oneoff-sub">
              96-page PDF and a ninety-minute narration, yours to keep.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
