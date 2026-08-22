'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChipFace } from './CardFace';
import { MonthDaySelect } from './MonthDaySelect';
import { useAccount } from './AccountProvider';
import { cardForKey } from '@/lib/cardology';
import { FIELD_PLACEHOLDER } from '@/lib/reports';
import type { ReportDefinition } from '@/lib/reports';
import type { DayKey } from '@/lib/types';

/** Where each date field starts before the reader touches it. */
const SEED_DATES: Record<string, DayKey> = {
  a: '07-12',
  b: '02-26',
  c: '10-03',
  launch: '09-15',
};

export function BuilderView({ report }: { report: ReportDefinition }) {
  const { birthday } = useAccount();
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // "Your birthday" starts from the saved one when there is one.
  const valueFor = (key: string, kind: string): string => {
    if (key in overrides) return overrides[key];
    if (kind !== 'date') return '';
    if (key === 'a' && birthday) return birthday;
    return SEED_DATES[key] ?? '01-01';
  };

  const set = (key: string, value: string) =>
    setOverrides((prev) => ({ ...prev, [key]: value }));

  /**
   * Hands off to Stripe Checkout. The price is never sent from here — the
   * server reads it from the report definition — and the answers travel as
   * session metadata, which is what /orders/[id] reads back afterwards.
   */
  const generate = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const values = Object.fromEntries(
      report.fields.map((f) => [f.key, valueFor(f.key, f.kind)]),
    );

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind: 'report', reportId: report.id, values }),
      });
      const data: { url?: string; error?: string } = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error ?? 'checkout unavailable');
      window.location.assign(data.url);
    } catch {
      setError('We could not open checkout. Nothing has been charged — please try again.');
      setSubmitting(false);
    }
  };

  return (
    <main className="view">
      <Link href="/reports" className="back">
        ← On demand
      </Link>

      <div className="builder">
        <div className="builder__main">
          <p className="label label--tight">{report.cat}</p>
          <h1 className="builder__title">{report.title}</h1>
          <p className="builder__line">{report.line}</p>

          <div className="builder__fields">
            {report.fields.map((f) => {
              const value = valueFor(f.key, f.kind);

              if (f.kind === 'date') {
                const card = cardForKey(value);
                return (
                  <div key={f.key} className="field">
                    <span className="field__label">{f.label}</span>
                    <div className="field__date">
                      <MonthDaySelect
                        value={value}
                        onChange={(next) => set(f.key, next)}
                        idPrefix={`f-${f.key}`}
                        label={f.label}
                      />
                      <ChipFace card={card} className="chip-face--form" />
                      <p className="field__resolved">{card.name}</p>
                    </div>
                  </div>
                );
              }

              if (f.kind === 'long') {
                return (
                  <div key={f.key} className="field">
                    <label className="field__label" htmlFor={`f-${f.key}`}>
                      {f.label}
                    </label>
                    <textarea
                      id={`f-${f.key}`}
                      className="control"
                      rows={4}
                      maxLength={500}
                      placeholder={FIELD_PLACEHOLDER[f.key]}
                      value={value}
                      onChange={(e) => set(f.key, e.target.value)}
                    />
                  </div>
                );
              }

              return (
                <div key={f.key} className="field">
                  <label className="field__label" htmlFor={`f-${f.key}`}>
                    {f.label}
                  </label>
                  <input
                    id={`f-${f.key}`}
                    type="text"
                    className="control"
                    placeholder={FIELD_PLACEHOLDER[f.key]}
                    value={value}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <aside className="builder__summary">
          <h2 className="label rule-under">What you get</h2>
          <ul className="getlist">
            {[report.pdfLine, report.audioLine, report.turn].map((line) => (
              <li key={line} className="getlist__item">
                <span className="getlist__text">{line}</span>
              </li>
            ))}
          </ul>

          <div className="builder__total">
            <span className="label label--tight">Total</span>
            <span className="builder__total-price">{report.price}</span>
          </div>

          <button type="button" className="btn-primary" onClick={generate} disabled={submitting}>
            <span>{submitting ? 'Opening checkout' : 'Generate report'}</span>
            <span className="btn-primary__price">{report.price}</span>
          </button>
          {error ? (
            <p className="fineprint fineprint--error" role="alert">
              {error}
            </p>
          ) : (
            <p className="fineprint">Charged once. No subscription.</p>
          )}
        </aside>
      </div>
    </main>
  );
}
