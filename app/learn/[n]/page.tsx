import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LESSONS } from '@/lib/lessons';
import { parseLessonBody, readingMinutes } from '@/lib/lesson-body';
import { lessonRecord, readerIsAdmin, readerIsPro } from '@/lib/lesson-records';

export const dynamic = 'force-dynamic';

function lessonByNumber(n: string) {
  return LESSONS.find((l) => l.n === n);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ n: string }>;
}): Promise<Metadata> {
  const { n } = await params;
  const lesson = lessonByNumber(n);
  if (!lesson) return {};
  return { title: lesson.title, description: `Lesson ${n} of ${LESSONS.length}.` };
}

export default async function LessonPage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const lesson = lessonByNumber(n);
  if (!lesson) notFound();

  const record = await lessonRecord(n);
  const isEditor = await readerIsAdmin();
  const published = Boolean(record?.published_at);
  const locked = record?.access === 'pro' && !isEditor && !(await readerIsPro());

  const index = LESSONS.findIndex((l) => l.n === n);
  const previous = index > 0 ? LESSONS[index - 1] : null;
  const next = index < LESSONS.length - 1 ? LESSONS[index + 1] : null;

  const blocks = record && published && !locked ? parseLessonBody(record.body) : [];
  const minutes = record?.body ? readingMinutes(record.body) : null;

  return (
    <main className="view lesson">
      <Link href="/learn" className="back">
        ← Learn
      </Link>

      <p className="label label--tight">
        Lesson {n} of {LESSONS.length}
        {minutes ? ` · ${minutes} min read` : ` · ${lesson.mins}`}
      </p>
      <h1 className="lesson__title">{lesson.title}</h1>

      {!published && (
        <p className="empty-note">
          This one has not been written yet. The fifty titles are the shape of the course; the
          readings are being written in order.
          {isEditor ? ' You are seeing it because you can edit.' : ''}
        </p>
      )}

      {locked && (
        <>
          <p className="empty-note">This reading is part of Pro.</p>
          <Link href="/pro" className="set-birthday">
            See what Pro includes →
          </Link>
        </>
      )}

      {(record?.audio_path || record?.pdf_path) && !locked && published && (
        <div className="lesson__media">
          {record.audio_path && (
            <div className="lesson__audio">
              <p className="label label--tight">Listen</p>
              {/* Points at the signing route, not at storage: the bucket is
                  private and the link is minted per request. */}
              <audio controls preload="none" src={`/api/lesson-media?n=${n}&kind=audio`}>
                Your browser cannot play audio.{' '}
                <a href={`/api/lesson-media?n=${n}&kind=audio`}>Download the narration</a>.
              </audio>
            </div>
          )}
          {record.pdf_path && (
            <a href={`/api/lesson-media?n=${n}&kind=pdf`} className="btn-secondary lesson__pdf">
              Download the PDF
            </a>
          )}
        </div>
      )}

      {blocks.length > 0 && (
        <article className="lesson__body">
          {blocks.map((block, i) =>
            block.kind === 'heading' ? (
              <h2 key={i} className="lesson__heading">
                {block.text}
              </h2>
            ) : (
              <p key={i} className="lesson__paragraph">
                {block.text}
              </p>
            ),
          )}
        </article>
      )}

      <nav className="lesson__nav" aria-label="Lessons">
        {previous ? (
          <Link href={`/learn/${previous.n}`} className="lesson__nav-link">
            <span className="label label--tight">Previous</span>
            <span className="lesson__nav-title">{previous.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={`/learn/${next.n}`} className="lesson__nav-link lesson__nav-link--next">
            <span className="label label--tight">Next</span>
            <span className="lesson__nav-title">{next.title}</span>
          </Link>
        )}
      </nav>
    </main>
  );
}
