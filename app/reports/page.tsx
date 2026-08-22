import type { Metadata } from 'next';
import Link from 'next/link';
import { CATALOGUE, FULL_STUDY } from '@/lib/reports';

export const metadata: Metadata = {
  title: 'On demand',
  description:
    'Ask for a specific reading. It comes back as a document you can keep, and a narration you can listen to.',
};

export default function ReportsPage() {
  return (
    <main className="view">
      <h1 className="page-title">On demand</h1>
      <p className="page-lede" style={{ maxWidth: 620 }}>
        Ask for a specific reading. It comes back as a document you can keep, and a narration you
        can listen to.
      </p>

      <div className="reports__list">
        {CATALOGUE.map((r) => (
          <Link key={r.id} href={`/reports/${r.id}`} className="report">
            <span className="report__head">
              <span className="label label--tight">{r.cat}</span>
              <span className="report__price">{r.price}</span>
            </span>
            <span className="report__title" style={{ display: 'block' }}>
              {r.title}
            </span>
            <span className="report__line" style={{ display: 'block' }}>
              {r.line}
            </span>
            <span className="report__specs">
              <span>{r.pages}</span>
              <span>{r.audio}</span>
            </span>
          </Link>
        ))}
      </div>

      <Link href={`/reports/${FULL_STUDY.id}`} className="study-offer">
        <span className="study-offer__main">
          <span className="study-offer__head">
            <span className="label" style={{ color: 'var(--on-dark-label)' }}>
              One flat fee
            </span>
            <span className="study-offer__price study-offer__price--inline">
              {FULL_STUDY.price}
            </span>
          </span>
          <span className="study-offer__title" style={{ display: 'block' }}>
            {FULL_STUDY.title}
          </span>
          <span className="study-offer__body" style={{ display: 'block' }}>
            Your complete Life Spread — every card, every planetary period, every year read in
            order. Delivered as a 96-page PDF with a ninety-minute narration, both yours to
            download.
          </span>
        </span>
        <span className="study-offer__aside">
          <span className="study-offer__price study-offer__price--block">{FULL_STUDY.price}</span>
          <span className="study-offer__cta" style={{ display: 'block' }}>
            Order the study →
          </span>
        </span>
      </Link>

      <p className="reports__note">
        Every report is written against your card data, then read aloud. Nothing is generated from
        a template.
      </p>
    </main>
  );
}
