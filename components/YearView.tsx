'use client';

import Link from 'next/link';
import { useProfile } from './ProfileProvider';
import { useNow } from './useNow';
import { planetaryPeriods } from '@/lib/cardology';

export function YearView() {
  const { birthday, ready } = useProfile();
  const now = useNow();

  const periods = birthday && now ? planetaryPeriods(birthday, now) : [];

  return (
    <main className="view year">
      <Link href="/you" className="back">
        ← You
      </Link>

      <h1 className="page-title">Your year</h1>
      <p className="page-lede">
        Seven planetary periods of fifty-two days, counted from your birthday.
      </p>

      {ready && !birthday && (
        <>
          <p className="empty-note">
            The periods are counted from the day you were born, so we need that date first.
          </p>
          <Link href="/you" className="set-birthday">
            Set your birthday →
          </Link>
        </>
      )}

      <div className="periods">
        {periods.map((p) => (
          <div key={p.planet} className={`period${p.active ? ' period--active' : ''}`}>
            <div className="period__gutter">
              <div className="period__dot" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="period__head">
                <span className="period__planet">{p.planet}</span>
                {p.active && <span className="period__now">Now</span>}
              </div>
              <p className="period__range">{p.range}</p>
            </div>
            <span className="period__lock">Pro</span>
          </div>
        ))}
      </div>

      <Link href="/pro" className="locked">
        <span className="locked__label">Locked</span>
        <span className="locked__title" style={{ display: 'block' }}>
          Unlock the cards behind each period
        </span>
        <span className="locked__body" style={{ display: 'block' }}>
          Your Life Spread places a card in every period of every year. Pro reads them all.
        </span>
        <span className="locked__cta" style={{ display: 'block' }}>
          See Pro →
        </span>
      </Link>
    </main>
  );
}
