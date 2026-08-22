import type { Metadata } from 'next';
import Link from 'next/link';
import { Fragment } from 'react';
import type { CSSProperties } from 'react';
import { NameValue } from '@/components/NameValue';
import { BY_NAME, DAY_CARD } from '@/lib/card-index';
import { MONTHS, dayKey } from '@/lib/cardology';
import {
  CROWN_CARDS,
  FIXED_CARDS,
  PLANETS,
  PLANET_ENERGY,
  SOLAR,
  SPREAD_ROWS,
} from '@/lib/reference';
import { CARD_BY_CODE } from '@/lib/cards';

export const metadata: Metadata = {
  title: 'Reference',
  description:
    'The three cardology tables in one place: the birthday chart to find your birth card, the full Grand Solar Spread with planetary positions for all fifty-two, and the solar values and letter codes.',
};

const suitStyle = (red: boolean) =>
  ({ '--suit': red ? 'var(--red)' : 'var(--ink)' }) as CSSProperties;

/** A card as it appears inside a dense table: rank, suit, in the suit colour. */
function Token({ code }: { code: string }) {
  const card = CARD_BY_CODE[code];
  if (!card) return <span className="ref__none">—</span>;
  return (
    <Link href={`/deck/${card.code}`} className="ref__token" style={suitStyle(card.red)}>
      {card.short}
      {card.sym}
      <span className="visually-hidden">{card.name}</span>
    </Link>
  );
}

export default function ReferencePage() {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <main className="view">
      <h1 className="page-title">Reference</h1>
      <p className="page-lede" style={{ maxWidth: 620 }}>
        The three tables everything else is built on. The chart that turns a date into a card, the
        spread that gives every card its two planets, and the values behind the letters.
      </p>

      {/* -- 1. the birthday chart -------------------------------------------- */}
      <section className="section">
        <h2 className="label rule-under">The birthday chart</h2>
        <p className="section__body" style={{ maxWidth: 620 }}>
          Find the month across the top and the day down the side. Where they meet is the card that
          date is dealt — the year never changes it. December 31 falls outside the fifty-two and
          returns the Joker.
        </p>

        <div className="ref__scroll">
          <table className="ref__table ref__table--chart">
            <caption className="visually-hidden">Birth card for every date of the year</caption>
            <thead>
              <tr>
                <th scope="col">Day</th>
                {MONTHS.map((m) => (
                  <th scope="col" key={m}>
                    {m.slice(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day}>
                  <th scope="row">{day}</th>
                  {MONTHS.map((month, monthIndex) => {
                    const name = DAY_CARD[dayKey(monthIndex, day)];
                    const card = name ? BY_NAME[name] : undefined;
                    const isDec31 = monthIndex === 11 && day === 31;
                    return (
                      <td key={month}>
                        {card ? (
                          <Token code={card.code} />
                        ) : isDec31 ? (
                          <span className="ref__joker">★</span>
                        ) : (
                          <span className="ref__none">·</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* -- 2. the grand solar spread ---------------------------------------- */}
      <section className="section">
        <h2 className="label rule-under">The Grand Solar Spread</h2>
        <p className="section__body" style={{ maxWidth: 620 }}>
          The planetary grid every card lives inside. The row it sits in is its row planet, the
          column its column planet — two of the three forces shaping its pattern. The third is the
          personal planetary ruler, which comes from astrology rather than from the deck.
        </p>

        <div className="ref__scroll">
          <table className="ref__table ref__table--spread">
            <caption className="visually-hidden">
              The Mundane Spread: rows and columns are planets
            </caption>
            <thead>
              <tr>
                <th scope="col" />
                {PLANETS.map((p) => (
                  <th scope="col" key={p}>
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SPREAD_ROWS.map((row) => (
                <tr key={row.row}>
                  <th scope="row">{row.row}</th>
                  {row.cards.map((code) => (
                    <td key={code}>
                      <Token code={code} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ref__notes">
          <p className="ref__note">
            <span className="label label--tight">The Crown</span>
            <span>
              {CROWN_CARDS.map((c, i) => (
                <span key={c.code}>
                  {i > 0 ? ' · ' : ''}
                  <Token code={c.code} /> {c.position}
                </span>
              ))}
            </span>
            <span className="ref__note-body">
              These three sit above the grid and can move through it. They run on different rules.
            </span>
          </p>
          <p className="ref__note">
            <span className="label label--tight">Fixed</span>
            <span>
              {FIXED_CARDS.map((code, i) => (
                <span key={code}>
                  {i > 0 ? ' · ' : ''}
                  <Token code={code} />
                </span>
              ))}
            </span>
            <span className="ref__note-body">
              These never move from their Mundane position, whatever the calculation.
            </span>
          </p>
        </div>

        <table className="ref__table ref__table--energy">
          <caption className="visually-hidden">What each planet means as a row or column</caption>
          <tbody>
            {PLANETS.map((planet) => (
              <tr key={planet}>
                <th scope="row">{planet}</th>
                <td>{PLANET_ENERGY[planet]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* -- 3. solar values --------------------------------------------------- */}
      <section className="section">
        <h2 className="label rule-under">Solar values and letters</h2>
        <p className="section__body" style={{ maxWidth: 620 }}>
          Every card has a value from one to fifty-two and a letter. Hearts run lower case a to m,
          Clubs n to z, Diamonds upper case A to M, Spades N to Z — so case is not decoration, it
          picks the suit.
        </p>

        <div className="ref__scroll">
          <table className="ref__table ref__table--solar">
            <caption className="visually-hidden">Solar value and letter code for each card</caption>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Letter</th>
                <th scope="col">Card</th>
                <th scope="col">#</th>
                <th scope="col">Letter</th>
                <th scope="col">Card</th>
                <th scope="col">#</th>
                <th scope="col">Letter</th>
                <th scope="col">Card</th>
                <th scope="col">#</th>
                <th scope="col">Letter</th>
                <th scope="col">Card</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 13 }, (_, i) => (
                <tr key={i}>
                  {[0, 13, 26, 39].map((offset) => {
                    const entry = SOLAR[i + offset];
                    return (
                      <Fragment key={offset}>
                        <td className="ref__num">{entry.value}</td>
                        <td className="ref__letter">{entry.letter}</td>
                        <td>
                          <Token code={entry.code} />
                        </td>
                      </Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <NameValue />
    </main>
  );
}
