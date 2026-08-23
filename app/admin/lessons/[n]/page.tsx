import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LessonEditor } from '@/components/LessonEditor';
import { LESSONS } from '@/lib/lessons';
import { lessonRecord, readerIsAdmin } from '@/lib/lesson-records';
import { supabaseConfig } from '@/lib/supabase/config';

export const metadata: Metadata = { title: 'Edit lesson', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function EditLessonPage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;

  if (!supabaseConfig() || !(await readerIsAdmin())) notFound();

  const lesson = LESSONS.find((l) => l.n === n);
  const record = await lessonRecord(n);
  if (!lesson || !record) notFound();

  return (
    <LessonEditor
      lesson={{
        n,
        title: lesson.title,
        body: record.body,
        audio_path: record.audio_path,
        pdf_path: record.pdf_path,
        access: record.access,
        published: Boolean(record.published_at),
      }}
    />
  );
}
