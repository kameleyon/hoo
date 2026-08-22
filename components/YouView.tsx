'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useState } from 'react';
import { CardFace } from './CardFace';
import { MonthDaySelect } from './MonthDaySelect';
import { useProfile } from './ProfileProvider';
import { useSaved } from './SavedProvider';
import { cardForKey, cardSubtitle, formatDayKey } from '@/lib/cardology';

export function YouView() {
  const { birthday, setBirthday, ready } = useProfile();
  const { saved } = useSaved();
  const [draft, setDraft] = useState('07-12');

  const card = birthday ? cardForKey(birthday) : null;

  const rows: {
    title: string;
    sub: string;
    href: Route | null;
    tag: string;
    tagClass: string;
  }[] = [
    {
      title: 'My birth card',
      sub: card ? card.name : 'Set your birthday first',
      href: card ? '/you/birth-card' : null,
      tag: '→',
      tagClass: '',
    },
    {
      title: 'Your year',
      sub: 'Seven planetary periods',
      href: '/you/year',
      tag: 'Pro',
      tagClass: ' you__row-tag--pill',
    },
    {
      title: 'Look up a birthday',
      sub: 'Anyone, any year',
      href: '/you/lookup',
      tag: '→',
      tagClass: '',
    },
    {
      title: 'Saved cards',
      sub: saved.length === 1 ? '1 saved' : `${saved.length} saved`,
      href: '/you/saved',
      tag: '→',
      tagClass: '',
    },
    {
      title: 'Daily notification',
      sub: 'Not available yet',
      href: null,
      tag: 'Off',
      tagClass: ' you__row-tag--plain',
    },
    {
      title: 'Haus of Oracle Pro',
      sub: 'Not subscribed',
      href: '/pro',
      tag: '→',
      tagClass: '',
    },
  ];

  return (
    <main className="view you">
      <h1 className="page-title">You</h1>
      <p className="page-lede">
        {!ready ? ' ' : birthday ? formatDayKey(birthday) : 'Tell us your birthday and the deck knows which card is yours.'}
      </p>

      <p className="label" style={{ marginTop: 22 }}>
        Your birthday
      </p>
      {/* Once a birthday is set every change commits straight away. Before that
          it needs confirming, otherwise the date the picker happens to open on
          would quietly become the reader's card. */}
      <div className="birthday-picker">
        <MonthDaySelect
          value={birthday ?? draft}
          onChange={birthday ? setBirthday : setDraft}
          idPrefix="your-birthday"
          label="Your birthday"
        />
        {ready && !birthday && (
          <button
            type="button"
            className="save-pill"
            style={{ marginTop: 0 }}
            onClick={() => setBirthday(draft)}
          >
            Use this date
          </button>
        )}
      </div>

      {card ? (
        <Link href="/you/birth-card" className="you__card" style={{ marginTop: 26 }}>
          <CardFace card={card} variant="dark" />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="you__card-label">Dealt at birth</span>
            <span className="you__card-name" style={{ display: 'block' }}>
              {card.name}
            </span>
            <span className="you__card-sub" style={{ display: 'block' }}>
              {cardSubtitle(card)}
            </span>
          </span>
        </Link>
      ) : null}

      <div className="you__rows">
        {rows.map((r) =>
          r.href ? (
            <Link key={r.title} href={r.href} className="you__row">
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="you__row-title" style={{ display: 'block' }}>
                  {r.title}
                </span>
                <span className="you__row-sub" style={{ display: 'block' }}>
                  {r.sub}
                </span>
              </span>
              <span className={`you__row-tag${r.tagClass}`}>{r.tag}</span>
            </Link>
          ) : (
            <div key={r.title} className="you__row">
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="you__row-title" style={{ display: 'block' }}>
                  {r.title}
                </span>
                <span className="you__row-sub" style={{ display: 'block' }}>
                  {r.sub}
                </span>
              </span>
              <span className={`you__row-tag${r.tagClass}`}>{r.tag}</span>
            </div>
          ),
        )}
      </div>

      <p className="you__colophon">
        Haus of Oracle · hausoforacle.com
        <br />
        Card data: Seven Reflections Destiny Cards System
      </p>
    </main>
  );
}
