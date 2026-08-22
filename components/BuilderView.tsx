'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ChipFace } from './CardFace';
import { MonthDaySelect } from './MonthDaySelect';
import { useProfile } from './ProfileProvider';
import { cardForKey } from '@/lib/cardology';
import { createOrder } from '@/lib/orders';
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
  const router = useRouter();
  const { birthday } = useProfile();
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // "Your birthday" starts from the saved one when there is one.
  const valueFor = (key: string, kind: string): string => {
    if (key in overrides) return overrides[key];
    if (kind !== 'date') return '';
    if (key === 'a' && birthday) return birthday;
    return SEED_DATES[key] ?? '01-01';
  };

  const set = (key: string, value: string) =>
    setOverrides((prev) => ({ ...prev, [key]: value }));

  const generate = () => {
    if (submitting) return;
    setSubmitting(true);
    const values = Object.fromEntries(
      report.fields.map((f) => [f.key, valueFor(f.key, f.kind)]),
    );
    const order = createOrder(report.id, values);
    router.push(`/orders/${order.id}`);
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
            <span>Generate report</span>
            <span className="btn-primary__price">{report.price}</span>
          </button>
          <p className="fineprint">Charged once. No subscription.</p>
        </aside>
      </div>
    </main>
  );
}
