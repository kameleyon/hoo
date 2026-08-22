'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CardFace } from './CardFace';
import { MonthDaySelect } from './MonthDaySelect';
import { useAccount } from './AccountProvider';
import { cardForKey, cardSubtitle, firstSentence } from '@/lib/cardology';

/**
 * Looking a birthday up is deliberately separate from your own: the design's
 * mock shared one value between them, which meant reading for a friend quietly
 * replaced your birth card. Here the lookup starts from your date and then goes
 * its own way, which is also what makes "against your card" mean anything.
 */
export function LookupView() {
  const { birthday } = useAccount();
  const [value, setValue] = useState<string | null>(null);

  const key = value ?? birthday ?? '07-12';
  const card = cardForKey(key);
  const mine = birthday ? cardForKey(birthday) : null;

  const comparison = !mine
    ? 'Set your birthday on the You screen and this will read the two cards against each other.'
    : mine.name === card.name
      ? 'That is your own card looking back at you.'
      : `${mine.name} meets ${card.name}. Read the two life lessons side by side before you read anything else.`;

  return (
    <main className="view lookup">
      <Link href="/you" className="back">
        ← You
      </Link>

      <h1 className="page-title">Look up a birthday</h1>
      <p className="page-lede">Anyone&rsquo;s date returns one card. The year does not change it.</p>

      <div className="lookup__selects">
        <MonthDaySelect
          value={key}
          onChange={setValue}
          idPrefix="lookup"
          label="Birthday to look up"
        />
      </div>

      <div className="lookup__result">
        <CardFace card={card} variant="lg" />
        <h2 className="lookup__name">{card.name}</h2>
        <p className="subtitle" style={{ marginTop: 5, fontSize: 15 }}>
          {cardSubtitle(card)}
        </p>
        <p className="lookup__desc">{card.desc}</p>
        <Link href={`/deck/${card.code}`} className="lookup__full">
          Read the full card →
        </Link>
      </div>

      <section className="section">
        <h2 className="label rule-under">Against your card</h2>
        <p className="section__body" style={{ fontSize: 16, lineHeight: 1.6 }}>
          {comparison}
        </p>
        {mine && mine.name !== card.name && (
          <p className="empty-note">{firstSentence(mine.lesson)}</p>
        )}
      </section>
    </main>
  );
}
