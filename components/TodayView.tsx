'use client';

import Link from 'next/link';
import { MobileHeader } from './AppShell';
import { CardFace } from './CardFace';
import { useAccount } from './AccountProvider';
import { useNow } from './useNow';
import { WeekList } from './WeekList';
import { cardForDate, cardForKey, cardSubtitle, currentPeriod, todayLabel } from '@/lib/cardology';
import { CONTINUE_LESSON } from '@/lib/lessons';

/**
 * `serverNow` is the timestamp the page was rendered with. It seeds the clock
 * so the hero paints immediately, then useNow corrects it to the reader's own
 * timezone — see components/useNow.ts.
 */
export function TodayView({ serverNow }: { serverNow: string }) {
  const now = useNow(serverNow) ?? new Date(serverNow);
  const { birthday, ready } = useAccount();

  const card = cardForDate(now);
  const birthCard = birthday ? cardForKey(birthday) : null;
  const period = birthday ? currentPeriod(birthday, now) : undefined;

  return (
    <main className="view view--today">
      <MobileHeader />

      <div className="today__hero">
        {/* On the phone the date sits above the card; at width it is already in
            the standing top bar, so the eyebrow moves into the column instead. */}
        <div className="label label--wide today__eyebrow--mobile">{todayLabel(now)}</div>

        <CardFace card={card} variant="today" />

        <div className="today__lede">
          <div className="label label--wide today__eyebrow--desktop">The card today</div>

          <h1 className="today__name">{card.name}</h1>
          <p className="subtitle">{cardSubtitle(card)}</p>

          {card.keywords.length > 0 && (
            <ul className="chips today__chips">
              {card.keywords.map((k) => (
                <li key={k} className="chip">
                  {k}
                </li>
              ))}
            </ul>
          )}

          <div className="today__card">
            <p className="today__card-body">{card.desc}</p>
            <Link href={`/deck/${card.code}`} className="today__more">
              <span>Read the full card</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <WeekList now={now} className="today__week" />
      </div>

      {(card.uplifted || card.shadow) && (
        <div className="today__split">
          {card.uplifted && (
            <section>
              <h2 className="label label--blue rule-under">At its best</h2>
              <p className="today__split-body">{card.uplifted}</p>
            </section>
          )}
          {card.shadow && (
            <section>
              <h2 className="label label--red rule-under">In shadow</h2>
              <p className="today__split-body">{card.shadow}</p>
            </section>
          )}
        </div>
      )}

      <div className="today__tiles">
        <Link href={birthCard ? '/you/birth-card' : '/you'} className="today__tile">
          <span className="label">Your card</span>
          <span className="today__tile-value">
            {!ready ? ' ' : birthCard ? birthCard.name : 'Set your birthday'}
          </span>
        </Link>
        <Link href="/you/year" className="today__tile">
          <span className="label">This period</span>
          <span className="today__tile-value">
            {!ready ? ' ' : period ? period.planet : '—'}
          </span>
        </Link>
      </div>

      <Link href="/learn" className="today__continue">
        <span className="today__continue-label">Continue · {CONTINUE_LESSON.module}</span>
        <span className="today__continue-title" style={{ display: 'block' }}>
          {CONTINUE_LESSON.title}
        </span>
        <span className="today__continue-foot">
          <span className="today__continue-track">
            <span className="today__continue-fill" style={{ width: `${CONTINUE_LESSON.pct}%`, display: 'block' }} />
          </span>
          <span className="today__continue-pos">{CONTINUE_LESSON.position}</span>
        </span>
      </Link>
    </main>
  );
}
