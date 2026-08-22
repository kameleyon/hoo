'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { CardFace } from './CardFace';
import { cardSubtitle } from '@/lib/cardology';
import { readWord } from '@/lib/reference';

/**
 * Takes a name or a word apart into its cards, then puts it back together.
 *
 * Each letter carries a solar value; the sum is the word's value; the sum wraps
 * around the fifty-two to land on one card. The arithmetic is shown rather than
 * hidden, so the reduction can be checked at a glance.
 */
export function NameValue() {
  const [text, setText] = useState('Haus of Oracle');

  const reading = useMemo(() => readWord(text), [text]);
  const { letters, total, wraps, value, card } = reading;
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

          {card && value !== null && (
            <div className="spell__result">
              <CardFace card={card} variant="md" />
              <div className="spell__result-body">
                <p className="label label--tight">
                  {wraps === 0
                    ? `Value ${total}`
                    : `${total} ${'− 52 '.repeat(wraps).trim()} = ${value}`}
                </p>
                <p className="spell__result-name">{card.name}</p>
                <p className="subtitle">{cardSubtitle(card)}</p>
                <Link href={`/deck/${card.code}`} className="set-birthday">
                  Read the full card →
                </Link>
              </div>
            </div>
          )}

          <p className="fineprint" style={{ textAlign: 'left' }}>
            {letters.length} letter{letters.length === 1 ? '' : 's'} counted
            {skipped > 0 ? `, ${skipped} character${skipped === 1 ? '' : 's'} outside the cipher ignored` : ''}
            . Case matters: lower case runs Hearts then Clubs, upper case Diamonds then Spades.
            {wraps > 0
              ? ` The total runs past the end of the deck, so it wraps: fifty-two subtracted ${wraps === 1 ? 'once' : wraps === 2 ? 'twice' : `${wraps} times`} lands on ${value}.`
              : ''}
          </p>
        </>
      )}
    </section>
  );
}
