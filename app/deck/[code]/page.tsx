import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CardFace } from '@/components/CardFace';
import { SaveCardButton } from '@/components/SaveCardButton';
import { CARDS, CARD_BY_CODE, studySections } from '@/lib/cards';
import { birthdaysFor, cardSubtitle } from '@/lib/cardology';
import { isCrown, planetaryPosition } from '@/lib/reference';

/** All fifty-two studies are static — they never change and they are the pages
 *  worth having in a search index. */
export function generateStaticParams() {
  return CARDS.map((c) => ({ code: c.code }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const card = CARD_BY_CODE[code];
  if (!card) return {};
  return {
    title: card.name,
    description: card.desc,
    openGraph: { title: `${card.name} · Haus of Oracle`, description: card.desc },
  };
}

export default async function CardStudyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const card = CARD_BY_CODE[code];
  if (!card) notFound();

  const sections = studySections(card);
  const birthdays = birthdaysFor(card.name);

  const position = planetaryPosition(card.code);
  const meta = [
    { label: 'Planet', value: card.planet || '—' },
    {
      label: 'Spread',
      value: position
        ? `${position.row} / ${position.column}`
        : isCrown(card.code)
          ? 'Crown'
          : '—',
    },
    { label: 'Intensity', value: card.intensity || '—' },
    { label: 'Volatility', value: card.volatility || '—' },
    { label: 'Birthdays', value: String(birthdays.length), count: true },
  ];

  return (
    <main className="view">
      <Link href="/deck" className="back">
        ← The Deck
      </Link>

      <article className="study">
        <div className="study__aside">
          <div className="study__banner">
            <CardFace card={card} variant="study" />
            <h1 className="study__name">{card.name}</h1>
            <p className="subtitle">{cardSubtitle(card)}</p>

            <dl className="study__meta">
              {meta.map((m) => (
                <div
                  key={m.label}
                  className={`study__meta-cell${m.count ? ' study__meta-cell--count' : ''}`}
                >
                  <dt className="study__meta-label">{m.label}</dt>
                  <dd className="study__meta-value" style={{ margin: 0 }}>
                    {m.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {card.keywords.length > 0 && (
            <ul className="chips study__chips">
              {card.keywords.map((k) => (
                <li key={k} className="chip">
                  {k}
                </li>
              ))}
            </ul>
          )}

          <SaveCardButton code={card.code} name={card.name} />
        </div>

        <div className="study__main">
          {sections.map((s) => (
            <section key={s.label} className="section study__section">
              <h2 className="label label--wide rule-under">{s.label}</h2>
              <p className="section__body">{s.body}</p>
            </section>
          ))}

          {card.archBullets.length > 0 && (
            <section className="section study__section">
              <h2 className="label label--wide rule-under">The archetype</h2>
              <ul className="study__bullets">
                {card.archBullets.map((b) => (
                  <li key={b} className="study__bullet">
                    <span className="study__bullet-text">{b}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <section className="study__dealt">
          <h2 className="label rule-under">Dealt to these birthdays</h2>
          <p className="dealt-to">{birthdays.join(' · ')}</p>
        </section>
      </article>
    </main>
  );
}
