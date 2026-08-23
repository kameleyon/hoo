import type { Metadata } from 'next';
import Link from 'next/link';
import { LESSONS } from '@/lib/lessons';

export const metadata: Metadata = {
  title: 'Learn',
  description: 'Fifty short readings on cardology, in order or not.',
};

export default function LearnPage() {
  return (
    <main className="view">
      <h1 className="page-title">Learn</h1>
      <p className="page-lede">Fifty short readings. In order, or not.</p>

      <Link href="/reference" className="learn__reference">
        <span className="label">The three tables</span>
        <span className="learn__reference-title">
          The birthday chart, the Grand Solar Spread, and the solar values
        </span>
        <span className="learn__reference-sub">
          Everything else is built on these. Keep the tab open. →
        </span>
      </Link>

      <ol className="lessons">
        {LESSONS.map((lesson) => (
          <li key={lesson.n} className="lessons__row">
            <span className="lessons__n">{lesson.n}</span>
            <span className="lessons__title">{lesson.title}</span>
            <span className="lessons__mins">{lesson.mins}</span>
          </li>
        ))}
      </ol>
    </main>
  );
}
