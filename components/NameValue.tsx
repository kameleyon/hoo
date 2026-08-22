'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { spell, wordValue } from '@/lib/reference';

/**
 * Takes a name or a word apart into its cards.
 *
 * Each letter carries a solar value and a card; the running total is the word's
 * value. What that total then *reduces* to is a separate rule the reference
 * does not state, so nothing here claims a single card for the whole name.
 */
export function NameValue() {
  const [text, setText] = useState('Haus of Oracle');

  const letters = useMemo(() => spell(text), [text]);
  const total = useMemo(() => wordValue(text), [text]);
  const skipped = useMemo(
    () => [...text].filter((c) => c.trim() && !letters.some((l) => l.letter === c)).length,
    [text, letters],
  );

  return (
    <section className="section">
      <h2 className="label rule-under">Take a name apart</h2>

      <label className="field__label" htmlFor="name-value" style={{ marginTop: 16 }}>
        A name or a word
      </label>
      <input
        id="name-value"
        type="text"
        className="control"
        style={{ maxWidth: 420 }}
        value={text}
        maxLength={80}
        onChange={(e) => setText(e.target.value)}
      />

      {letters.length > 0 && (
        <>
          <ul className="spell">
            {letters.map((l, i) => (
              <li
                key={`${l.letter}-${i}`}
                className="spell__item"
                style={{ '--suit': l.card.red ? 'var(--red)' : 'var(--ink)' } as CSSProperties}
              >
                <Link href={`/deck/${l.card.code}`} className="spell__link">
                  <span className="spell__letter">{l.letter}</span>
                  <span className="spell__card">
                    {l.card.short}
                    {l.card.sym}
                  </span>
                  <span className="spell__value">{l.value}</span>
                </Link>
              </li>
            ))}
          </ul>

          <p className="spell__total">
            <span className="label">Value</span>
            <span className="spell__total-number">{total}</span>
          </p>

          <p className="fineprint" style={{ textAlign: 'left' }}>
            {letters.length} letter{letters.length === 1 ? '' : 's'} counted
            {skipped > 0 ? `, ${skipped} character${skipped === 1 ? '' : 's'} outside the cipher ignored` : ''}
            . Case matters: lower case runs Hearts then Clubs, upper case Diamonds then Spades.
          </p>
        </>
      )}
    </section>
  );
}
