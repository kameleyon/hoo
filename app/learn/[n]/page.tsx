import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LESSONS } from '@/lib/lessons';
import { LessonBody } from '@/components/LessonBody';
import { readingMinutes } from '@/lib/markdown-text';
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
  return { title: lesson.title, description: `A cardology lesson: ${lesson.title}.` };
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

  const readable = Boolean(record && published && !locked && record.body.trim());
  const minutes = record?.body?.trim() ? readingMinutes(record.body) : null;
  // The PDF is Pro whatever the lesson costs — it is the thing you keep.
  const canDownload = isEditor || (await readerIsPro());
  const hasPdf = Boolean(record?.body?.trim() || record?.pdf_path);

  return (
    <main className="view lesson">
      <Link href="/learn" className="back">
        ← Learn
      </Link>

      <p className="label label--tight">{minutes ? `${minutes} min read` : lesson.mins}</p>
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

      {published && !locked && (record?.audio_path || hasPdf) && (
        <div className="lesson__media">
          {record?.audio_path && (
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
          {hasPdf &&
            (canDownload ? (
              <a href={`/api/lesson-media?n=${n}&kind=pdf`} className="btn-secondary lesson__pdf">
                Download the PDF
              </a>
            ) : (
              <span className="lesson__pdf-locked">
                <span className="btn-secondary lesson__pdf" aria-disabled="true">
                  Download the PDF
                </span>
                <Link href="/pro" className="lesson__pdf-note">
                  Part of Pro →
                </Link>
              </span>
            ))}
        </div>
      )}

      {readable && record && <LessonBody markdown={record.body} />}

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
