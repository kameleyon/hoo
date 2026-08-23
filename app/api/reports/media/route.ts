import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { jobFor } from '@/lib/report-jobs';
import { stripe } from '@/lib/stripe';

const BUCKET = 'report-media';
const LINK_SECONDS = 60 * 30;

/**
 * A paid reading's PDF or narration.
 *
 * The session id is the only credential, and it travels in a URL, so the check
 * that matters happens here rather than on the page that linked to it: Stripe
 * is asked whether this session was actually paid, every time, before anything
 * is handed over. A guessed or shared id gets nothing without a payment behind
 * it, and a refunded order stops working on its own.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session') ?? '';
  const kind = searchParams.get('kind');

  if (!sessionId.startsWith('cs_') || (kind !== 'audio' && kind !== 'pdf')) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  let paid = false;
  try {
    const session = await stripe().checkout.sessions.retrieve(sessionId);
    paid = session.payment_status !== 'unpaid';
  } catch {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  if (!paid) return NextResponse.json({ error: 'not paid' }, { status: 403 });

  const job = await jobFor(sessionId);
  const path = kind === 'pdf' ? job?.pdf_path : job?.audio_path;
  if (!path) return NextResponse.json({ error: 'not ready' }, { status: 404 });

  const { data, error } = await supabaseAdmin()
    .storage.from(BUCKET)
    // The PDF is something to keep, so it downloads; the narration is
    // something to play, so it streams.
    .createSignedUrl(path, LINK_SECONDS, kind === 'pdf' ? { download: true } : undefined);

  if (error || !data?.signedUrl) {
    console.error(`could not sign ${kind} for ${sessionId} —`, error?.message);
    return NextResponse.json({ error: 'could not open the file' }, { status: 500 });
  }

  // The signed link is the secret, so nothing in between may cache it.
  return NextResponse.redirect(data.signedUrl, {
    status: 307,
    headers: { 'cache-control': 'private, no-store' },
  });
}
