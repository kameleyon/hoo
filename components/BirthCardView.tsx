'use client';

import Link from 'next/link';
import { useAccount } from './AccountProvider';
import { cardForKey, cardSubtitle, formatDayKey } from '@/lib/cardology';

export function BirthCardView() {
  const { birthday, ready } = useAccount();

  if (!ready) return <main className="view" aria-busy="true" />;

  if (!birthday) {
    return (
      <main className="view">
        <Link href="/you" className="back">
          ← You
        </Link>
        <h1 className="page-title">Your card</h1>
        <p className="page-lede">
          Every date returns one card, and the year never changes it. Tell us the day you were born
          and it will be here.
        </p>
        <Link href="/you" className="set-birthday">
          Set your birthday →
        </Link>
      </main>
    );
  }

  const card = cardForKey(birthday);

  return (
    <main className="view mecard">
      <Link href="/you" className="back">
        ← You
      </Link>

      <p className="mecard__label">Dealt at birth · {formatDayKey(birthday)}</p>
      <h1 className="mecard__name">{card.name}</h1>
      <p className="mecard__sub">{cardSubtitle(card)}</p>

      <p className="mecard__lede">{card.desc}</p>

      <section className="section">
        <h2 className="label rule-under">Your life lesson</h2>
        <p className="section__body">{card.lesson}</p>
      </section>

      {card.archBullets.length > 0 && (
        <section className="section">
          <h2 className="label rule-under">You tend to</h2>
          <ul className="study__bullets">
            {card.archBullets.map((b) => (
              <li key={b} className="study__bullet">
                <span className="study__bullet-text">{b}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link href={`/deck/${card.code}`} className="mecard__full">
        <span>Full card study</span>
        <span aria-hidden="true">→</span>
      </Link>
    </main>
  );
}
