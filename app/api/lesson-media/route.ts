import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { lessonRecord, readerIsAdmin, readerIsPro } from '@/lib/lesson-records';
import { lessonPdf } from '@/lib/lesson-pdf';
import { LESSONS } from '@/lib/lessons';

const BUCKET = 'lesson-media';
const LINK_SECONDS = 60 * 30;

/**
 * A lesson's audio or PDF.
 *
 * Both are Pro. The reading itself is free — the page, the words, the whole
 * lesson — but the narration and the PDF are what a subscription buys, so
 * playing is gated as tightly as keeping.
 *
 * The PDF is generated from the markdown on request unless a file has been
 * uploaded to stand in for it.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const n = searchParams.get('n') ?? '';
  const kind = searchParams.get('kind');
  const wantsDownload = searchParams.get('download') === '1';

  if (!/^(0[1-9]|[1-4][0-9]|50)$/.test(n) || (kind !== 'audio' && kind !== 'pdf')) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const lesson = await lessonRecord(n);
  if (!lesson) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const isEditor = await readerIsAdmin();
  if (!lesson.published_at && !isEditor) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const isPro = isEditor || (await readerIsPro());

  if (kind === 'pdf') {
    if (!isPro) {
      return NextResponse.json({ error: 'the PDF is part of Pro' }, { status: 403 });
    }

    // An uploaded file wins: if someone has typeset it properly, serve that.
    if (lesson.pdf_path) return signed(lesson.pdf_path, n, 'pdf');

    if (!lesson.body.trim()) {
      return NextResponse.json({ error: 'nothing written yet' }, { status: 404 });
    }

    const title = LESSONS.find((l) => l.n === n)?.title ?? `Lesson ${n}`;
    const pdf = await lessonPdf({ title, markdown: lesson.body });
    const filename = `${title.replace(/[^\w\s-]/g, '').trim()}.pdf`;

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="${filename}"`,
        'cache-control': 'private, no-store',
      },
    });
  }

  if (!isPro) {
    return NextResponse.json({ error: 'the narration is part of Pro' }, { status: 403 });
  }
  if (!lesson.audio_path) {
    return NextResponse.json({ error: 'nothing uploaded yet' }, { status: 404 });
  }
  return signed(lesson.audio_path, n, 'audio', wantsDownload);
}

async function signed(path: string, n: string, kind: string, download = kind === 'pdf') {
  const { data, error } = await supabaseAdmin()
    .storage.from(BUCKET)
    .createSignedUrl(path, LINK_SECONDS, download ? { download: true } : undefined);

  if (error || !data?.signedUrl) {
    console.error(`could not sign ${kind} for lesson ${n} —`, error?.message);
    return NextResponse.json({ error: 'could not open the file' }, { status: 500 });
  }

  // The signed link is the secret, so nothing in between may cache it.
  return NextResponse.redirect(data.signedUrl, {
    status: 307,
    headers: { 'cache-control': 'private, no-store' },
  });
}
