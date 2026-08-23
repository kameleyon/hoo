import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LESSONS, lessonTitle } from '@/lib/lessons';
import { readerIsAdmin } from '@/lib/lesson-records';
import { NewLessonButton } from '@/components/NewLessonButton';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseConfig } from '@/lib/supabase/config';

export const metadata: Metadata = { title: 'Lessons', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLessonsPage() {
  // Not "redirect to sign-in": an editor-only area should not confirm it exists
  // to someone who is not one.
  if (!supabaseConfig() || !(await readerIsAdmin())) notFound();

  const supabase = await supabaseServer();
  const { data } = await supabase
    .from('lessons')
    .select('n, title, body, audio_path, pdf_path, access, published_at');

  const rows = new Map((data ?? []).map((r) => [r.n as string, r]));

  return (
    <main className="view admin">
      <h1 className="page-title">Lessons</h1>
      <p className="page-lede">Write the readings, attach the audio and the PDF, publish.</p>

      <NewLessonButton />

      <ol className="lessons" style={{ marginTop: 30 }}>
        {LESSONS.map((lesson) => {
          const row = rows.get(lesson.n);
          const written = Boolean(row?.body?.trim());
          const state = !written
            ? 'Empty'
            : row?.published_at
              ? row.access === 'pro'
                ? 'Live · Pro'
                : 'Live'
              : 'Draft';
          return (
            <li key={lesson.n} className="lessons__row">
              <span className="lessons__n">{lesson.n}</span>
              <Link
                href={`/admin/lessons/${lesson.n}`}
                className={`lessons__title${written ? ' lessons__title--ready' : ''}`}
              >
                {lessonTitle(lesson.n, row?.title as string | null)}
              </Link>
              <span className="admin__state" data-state={state.split(' ')[0]}>
                {state}
              </span>
              <span className="lessons__mins">
                {row?.audio_path ? '♪' : ''}
                {row?.pdf_path ? ' PDF' : ''}
              </span>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
