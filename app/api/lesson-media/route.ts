import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { lessonRecord, readerIsAdmin, readerIsPro } from '@/lib/lesson-records';

const BUCKET = 'lesson-media';
const LINK_SECONDS = 60 * 30;

/**
 * Hands out a short-lived link to a lesson's audio or PDF.
 *
 * The bucket is private, so a path is not a URL and guessing one gets you
 * nothing. Access is decided here — published, and Pro if the lesson says Pro —
 * and only then is a signed link minted and redirected to. The redirect is what
 * lets `<audio src>` and a download link work without any client-side signing.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const n = searchParams.get('n') ?? '';
  const kind = searchParams.get('kind');

  if (!/^(0[1-9]|[1-4][0-9]|50)$/.test(n) || (kind !== 'audio' && kind !== 'pdf')) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const lesson = await lessonRecord(n);
  if (!lesson) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const isEditor = await readerIsAdmin();
  if (!lesson.published_at && !isEditor) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  if (lesson.access === 'pro' && !isEditor && !(await readerIsPro())) {
    return NextResponse.json({ error: 'this lesson needs Pro' }, { status: 403 });
  }

  const path = kind === 'audio' ? lesson.audio_path : lesson.pdf_path;
  if (!path) return NextResponse.json({ error: 'nothing uploaded yet' }, { status: 404 });

  const { data, error } = await supabaseAdmin()
    .storage.from(BUCKET)
    .createSignedUrl(path, LINK_SECONDS, kind === 'pdf' ? { download: true } : undefined);

  if (error || !data?.signedUrl) {
    console.error(`could not sign ${kind} for lesson ${n} —`, error?.message);
    return NextResponse.json({ error: 'could not open the file' }, { status: 500 });
  }

  // The signed link is itself the secret, so it must not be cached by anything
  // in between.
  return NextResponse.redirect(data.signedUrl, {
    status: 307,
    headers: { 'cache-control': 'private, no-store' },
  });
}
