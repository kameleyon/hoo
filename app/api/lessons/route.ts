import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { LESSONS } from '@/lib/lessons';
import { markdownToSpeech } from '@/lib/markdown-text';

/**
 * Where an automation posts a finished lesson.
 *
 * Authenticated by a shared token rather than a session, because a scheduled
 * job cannot follow a magic link. The token is the whole of the security here,
 * so it is compared in constant time and the endpoint can only ever touch the
 * lessons table — it cannot read a reader, take a payment, or reach storage.
 *
 * Posts arrive as **drafts**. Publishing is a human pressing a button in
 * /admin/lessons, which is also what triggers the narration — nothing goes live
 * or gets spoken without someone having read it.
 *
 *   POST /api/lessons
 *   Authorization: Bearer $CONTENT_API_KEY
 *   { "n": "02", "title": "...", "body": "# markdown ...", "access": "free" }
 */
const MAX_BODY_CHARS = 60000;

function authorised(request: NextRequest): boolean {
  const expected = process.env.CONTENT_API_KEY;
  if (!expected) return false;

  const header = request.headers.get('authorization') ?? '';
  const given = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!given) return false;

  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on a length mismatch, which is itself a leak of
  // length — compare a fixed-size digest of each instead.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!process.env.CONTENT_API_KEY) {
    console.error('CONTENT_API_KEY is not set — the lesson API is disabled');
    return NextResponse.json({ error: 'posting is not configured' }, { status: 503 });
  }
  if (!authorised(request)) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }

  let payload: { n?: string; title?: string; body?: string; access?: string; publish?: boolean };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const n = String(payload.n ?? '').padStart(2, '0');
  if (!/^(0[1-9]|[1-4][0-9]|50)$/.test(n)) {
    return NextResponse.json(
      { error: 'n must be a lesson number from 01 to 50' },
      { status: 400 },
    );
  }

  const body = typeof payload.body === 'string' ? payload.body.trim() : '';
  if (!body) return NextResponse.json({ error: 'body is required' }, { status: 400 });
  if (body.length > MAX_BODY_CHARS) {
    return NextResponse.json(
      { error: `body is ${body.length} characters, limit ${MAX_BODY_CHARS}` },
      { status: 400 },
    );
  }

  const title = typeof payload.title === 'string' ? payload.title.trim().slice(0, 120) : null;
  const access = payload.access === 'pro' ? 'pro' : 'free';

  const update: Record<string, unknown> = { body, access };
  if (title) update.title = title;
  // Publishing is a decision, not a parameter — but an explicit publish:true is
  // honoured so a trusted pipeline can push a correction live.
  if (payload.publish === true) update.published_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin()
    .from('lessons')
    .update(update)
    .eq('n', n)
    .select('n, title, access, published_at')
    .single();

  if (error) {
    console.error(`could not save lesson ${n} —`, error.message);
    return NextResponse.json({ error: 'could not save the lesson' }, { status: 500 });
  }

  const spoken = markdownToSpeech(body);

  return NextResponse.json({
    n: data.n,
    title: data.title ?? LESSONS.find((l) => l.n === n)?.title ?? null,
    access: data.access,
    published: Boolean(data.published_at),
    characters: body.length,
    narratableCharacters: spoken.length,
    review: `/admin/lessons/${n}`,
    note: data.published_at
      ? 'Published. Narration is generated from the editor.'
      : 'Saved as a draft. Publish it in the editor to make it live and generate the narration.',
  });
}
