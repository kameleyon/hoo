import type { Metadata } from 'next';
import Link from 'next/link';
import { LESSONS, lessonTitle } from '@/lib/lessons';
import { publishedLessons } from '@/lib/lesson-records';
import { clock } from '@/lib/duration';

export const metadata: Metadata = {
  title: 'Learn',
  description: 'Fifty short readings on cardology, in order or not.',
};

export const dynamic = 'force-dynamic';

export default async function LearnPage() {
  const published = await publishedLessons();

  // Written lessons first, in their own order; the rest keep the course order
  // behind them. Numbers are gone from the page because lessons are written in
  // whatever order suits, and a number would promise a sequence that is not there.
  const ready = LESSONS.filter((l) => published.has(l.n));
  const soon = LESSONS.filter((l) => !published.has(l.n));

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

      <ul className="lessons">
        {[...ready, ...soon].map((lesson) => {
          const summary = published.get(lesson.n);
          const length = clock(summary?.audioSeconds);
          return (
            <li key={lesson.n} className="lessons__row">
              <Link href={`/learn/${lesson.n}`} className="lessons__title">
                {lessonTitle(lesson.n, summary?.title)}
              </Link>
              <span className={`lessons__mins${summary ? '' : ' lessons__mins--soon'}`}>
                {summary ? (length ?? 'Read') : 'Soon'}
              </span>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
