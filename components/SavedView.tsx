'use client';

import Link from 'next/link';
import { CardFace } from './CardFace';
import { useAccount } from './AccountProvider';
import { BY_CODE } from '@/lib/card-index';
import { birthdayCountLabel } from '@/lib/cardology';

export function SavedView() {
  const { saved, ready } = useAccount();
  const cards = saved.map((code) => BY_CODE[code]).filter(Boolean);

  return (
    <main className="view">
      <Link href="/you" className="back">
        ← You
      </Link>

      <h1 className="page-title">Saved cards</h1>
      <p className="page-lede">The ones you keep coming back to.</p>

      {ready && cards.length === 0 && (
        <>
          <p className="empty-note">
            Nothing saved yet. Open any card study and press Save to keep it here.
          </p>
          <Link href="/deck" className="set-birthday">
            Open the deck →
          </Link>
        </>
      )}

      {cards.length > 0 && (
        <ul className="deck__grid" style={{ marginTop: 24 }}>
          {cards.map((card) => (
            <li key={card.code}>
              <Link href={`/deck/${card.code}`} className="deck__cell">
                <CardFace card={card} variant="grid" />
                <span className="visually-hidden">{card.name}</span>
                <span className="deck__cell-caption">{birthdayCountLabel(card.name)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
