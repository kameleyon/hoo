import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LESSONS, lessonTitle } from '@/lib/lessons';
import { LessonBody } from '@/components/LessonBody';
import { readingMinutes } from '@/lib/markdown-text';
import { clock } from '@/lib/duration';
import { lessonRecord, readerIsAdmin, readerIsPro } from '@/lib/lesson-records';


/** A download arrow over a sound wave. */
function AudioIcon() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor"
      strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v9" />
      <path d="m8.5 8.5 3.5 3.5 3.5-3.5" />
      <path d="M4 16v2M8 14.5v5M12 16v2M16 14.5v5M20 16v2" />
    </svg>
  );
}

/** A download arrow over a page. */
function PdfIcon() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor"
      strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v8" />
      <path d="m8.5 7.5 3.5 3.5 3.5-3.5" />
      <path d="M5 14v4.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V14" />
    </svg>
  );
}

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
  if (!lessonByNumber(n)) return {};
  const record = await lessonRecord(n);
  const title = lessonTitle(n, record?.title);
  return { title, description: `A cardology lesson: ${title}.` };
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
      <h1 className="lesson__title">{lessonTitle(n, record?.title)}</h1>

      {!published && (
        <p className="empty-note">
          This one has not been written yet. The fifty titles are the shape of the course; the
          readings are being written in order.
          {isEditor ? ' You are seeing it because you can edit.' : ''}
        </p>
      )}

      {locked && (
        <div className="locked">
          <p className="locked__tag">
            <span aria-hidden="true">&#128274;</span>
            Part of Pro
          </p>
          <p className="locked__body">
            This reading is written and waiting. Pro opens every lesson, the narration for each
            one, and the PDF to keep.
          </p>
          <Link href="/pro" className="btn-dark locked__cta">
            See what Pro includes
          </Link>
        </div>
      )}

      {published && !locked && (record?.audio_path || hasPdf) && (
        <div className="lesson__media">
          {record?.audio_path && (
            <div className="lesson__audio">
              <p className="label label--tight">
                Listen
                {clock(record.audio_seconds) ? ` · ${clock(record.audio_seconds)}` : ''}
              </p>
              {canDownload ? (
                /* Points at the signing route, not at storage: the bucket is
                   private and the link is minted per request. */
                <audio controls preload="none" src={`/api/lesson-media?n=${n}&kind=audio`}>
                  Your browser cannot play audio.{' '}
                  <a href={`/api/lesson-media?n=${n}&kind=audio`}>Download the narration</a>.
                </audio>
              ) : (
                <p className="lesson__audio-locked">
                  The narration is read by Haus of Oracle for subscribers. The lesson itself stays
                  free to read.
                </p>
              )}
            </div>
          )}
          <div className="lesson__keep">
            {record?.audio_path &&
              (canDownload ? (
                <a
                  href={`/api/lesson-media?n=${n}&kind=audio&download=1`}
                  className="lesson__keep-button"
                  title="Download the audio"
                >
                  <AudioIcon />
                  <span className="visually-hidden">Download the audio</span>
                </a>
              ) : (
                <span className="lesson__keep-button" aria-disabled="true" title="Downloading is part of Pro">
                  <AudioIcon />
                  <span className="visually-hidden">Download the audio — part of Pro</span>
                </span>
              ))}

            {hasPdf &&
              (canDownload ? (
                <a
                  href={`/api/lesson-media?n=${n}&kind=pdf`}
                  className="lesson__keep-button"
                  title="Download the PDF"
                >
                  <PdfIcon />
                  <span className="visually-hidden">Download the PDF</span>
                </a>
              ) : (
                <span className="lesson__keep-button" aria-disabled="true" title="Downloading is part of Pro">
                  <PdfIcon />
                  <span className="visually-hidden">Download the PDF — part of Pro</span>
                </span>
              ))}

            {!canDownload && (
              <Link href="/pro" className="lesson__pdf-note">
                Pro
              </Link>
            )}
          </div>
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
