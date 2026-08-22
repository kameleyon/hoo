import type { Metadata } from 'next';
import { LESSON_GROUPS, MODULES } from '@/lib/lessons';

export const metadata: Metadata = {
  title: 'Learn',
  description: 'Fifty short readings across five modules. In order, or not.',
};

export default function LearnPage() {
  return (
    <main className="view">
      <h1 className="page-title">Learn</h1>
      <p className="page-lede">Fifty short readings. In order, or not.</p>

      <div className="modules">
        {MODULES.map((m) => (
          <article key={m.n} className="module">
            <div className="module__head">
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="label label--tight">{m.n}</p>
                <h2 className="module__title">{m.title}</h2>
                <p className="module__blurb">{m.blurb}</p>
              </div>
              <p className="module__count">{m.count}</p>
            </div>
            <div
              className="module__track"
              role="progressbar"
              aria-valuenow={m.pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${m.title} progress`}
            >
              <div className="module__fill" style={{ width: `${m.pct}%` }} />
            </div>
          </article>
        ))}
      </div>

      <h2 className="label rule-under lessons__heading">All fifty lessons</h2>

      <div className="lessons">
        {LESSON_GROUPS.map((g) => (
          <section key={g.label} className="lessons__group">
            <h3 className="lessons__group-title">{g.label}</h3>
            {g.items.map((l) => (
              <div key={l.n} className="lessons__row">
                <span className="lessons__n">{l.n}</span>
                <span className="lessons__title">{l.title}</span>
                <span className="lessons__mins">{l.mins}</span>
              </div>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
