import Link from 'next/link';
import { ChipFace } from './CardFace';
import { readingWeek } from '@/lib/cardology';

/** Today plus the next six days, each with the card that date is dealt. */
export function WeekList({ now, className = '' }: { now: Date; className?: string }) {
  const week = readingWeek(now);

  return (
    <section className={`week ${className}`.trim()}>
      <h2 className="label rule-under">Reading this week</h2>
      {week.map(({ day, key, card }) => (
        <Link key={key} href={`/deck/${card.code}`} className="week__row">
          <span className="week__day">{day}</span>
          <ChipFace card={card} />
          <span className="week__name">{card.name}</span>
        </Link>
      ))}
    </section>
  );
}
