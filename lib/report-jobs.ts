import 'server-only';
import type Stripe from 'stripe';
import { waitUntil } from '@vercel/functions';
import { supabaseAdmin } from './supabase/admin';
import { compatibilityBrief } from './love-brief';
import { writeLoveReport } from './writer';
import { documentPdf } from './lesson-pdf';
import { narrate, narrationScript } from './lemonfox';
import { reportById } from './reports';

/**
 * Turning a paid order into files.
 *
 * The work is slow: a couple of thousand words from a model, a PDF render, and
 * a narration that has to be generated and measured. Stripe wants an answer in
 * seconds, so the webhook only records that the job exists and this runs
 * afterwards. That split is also what makes it recoverable, because a job that
 * dies half way is a row someone can retry rather than a payment with nothing
 * behind it.
 */

const BUCKET = 'report-media';

/** Beyond this a job is presumed dead and may be claimed again. */
const STALE_MINUTES = 10;

/** Enough for a transient model or network failure, not enough to loop. */
const MAX_ATTEMPTS = 3;

export interface ReportJob {
  session_id: string;
  report_id: string;
  status: 'queued' | 'writing' | 'ready' | 'failed';
  attempts: number;
  markdown: string | null;
  pdf_path: string | null;
  audio_path: string | null;
  audio_seconds: number | null;
  error: string | null;
  updated_at: string;
}

export async function jobFor(sessionId: string): Promise<ReportJob | null> {
  const { data } = await supabaseAdmin()
    .from('report_jobs')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();
  return (data as ReportJob) ?? null;
}

/**
 * Records that a paid order needs writing.
 *
 * Safe to call repeatedly: the session id is the key, and a job that already
 * exists is left exactly as it is, so a redelivered Stripe event cannot reset
 * a finished reading or double the attempt count.
 */
export async function enqueueReport(session: Stripe.Checkout.Session): Promise<void> {
  const reportId = session.metadata?.reportId;
  if (!reportId) return;

  const { error } = await supabaseAdmin()
    .from('report_jobs')
    .upsert(
      { session_id: session.id, report_id: reportId },
      { onConflict: 'session_id', ignoreDuplicates: true },
    );

  if (error) console.error(`could not queue ${session.id} —`, error.message);
}

/**
 * Takes ownership of a job, refusing if someone else already has it.
 *
 * The status and attempt count are both part of the match, so two workers
 * racing on the same row cannot both win: the second update matches nothing.
 */
async function claim(job: ReportJob): Promise<boolean> {
  const { data } = await supabaseAdmin()
    .from('report_jobs')
    .update({ status: 'writing', attempts: job.attempts + 1 })
    .eq('session_id', job.session_id)
    .eq('attempts', job.attempts)
    .in('status', ['queued', 'writing'])
    .select('session_id');

  return Boolean(data?.length);
}

async function fail(sessionId: string, attempts: number, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`report ${sessionId} failed on attempt ${attempts} —`, message);
  await supabaseAdmin()
    .from('report_jobs')
    .update({
      // Back to queued while there are attempts left, so a retry picks it up.
      status: attempts >= MAX_ATTEMPTS ? 'failed' : 'queued',
      error: message.slice(0, 500),
    })
    .eq('session_id', sessionId);
}

/**
 * Writes one reading end to end.
 *
 * Each artefact is stored as soon as it exists, so a failure in narration does
 * not throw away the words that were already paid for. Only when all three are
 * present does the job become ready.
 */
export async function processJob(job: ReportJob, session: Stripe.Checkout.Session): Promise<void> {
  if (!(await claim(job))) return;

  const attempts = job.attempts + 1;
  const db = supabaseAdmin();

  try {
    const report = reportById(job.report_id);
    if (!report) throw new Error(`unknown report ${job.report_id}`);
    if (job.report_id !== 'love') throw new Error(`no writer for ${job.report_id} yet`);

    const a = session.metadata?.f_a;
    const b = session.metadata?.f_b;
    if (!a || !b) throw new Error('the order is missing its birthdays');

    // 1. The words. Reused on a retry so a narration failure does not pay for
    //    the writing twice.
    let markdown = job.markdown;
    if (!markdown) {
      const built = compatibilityBrief(a, b);
      if (!built) throw new Error('could not read those two dates');
      const written = await writeLoveReport(built.brief);
      markdown = written.markdown;
      await db.from('report_jobs').update({ markdown }).eq('session_id', job.session_id);
    }

    const title = `${report.title}: ${titleFor(a, b)}`;

    // 2. The PDF.
    let pdfPath = job.pdf_path;
    if (!pdfPath) {
      const pdf = await documentPdf({ title, markdown, eyebrow: 'A READING' });
      pdfPath = `${job.session_id}/reading.pdf`;
      const { error } = await db.storage
        .from(BUCKET)
        .upload(pdfPath, pdf, { contentType: 'application/pdf', upsert: true });
      if (error) throw new Error(`could not store the pdf: ${error.message}`);
      await db.from('report_jobs').update({ pdf_path: pdfPath }).eq('session_id', job.session_id);
    }

    // 3. The narration, from a script with the markup taken out so nothing
    //    reads punctuation aloud.
    let audioPath = job.audio_path;
    let seconds = job.audio_seconds;
    if (!audioPath) {
      const narration = await narrate(narrationScript(markdown));
      audioPath = `${job.session_id}/reading.mp3`;
      const { error } = await db.storage
        .from(BUCKET)
        .upload(audioPath, narration.audio, { contentType: 'audio/mpeg', upsert: true });
      if (error) throw new Error(`could not store the narration: ${error.message}`);
      seconds = narration.seconds;
    }

    await db
      .from('report_jobs')
      .update({ status: 'ready', audio_path: audioPath, audio_seconds: seconds, error: null })
      .eq('session_id', job.session_id);

    console.log(`report ${job.session_id} ready`);
  } catch (error) {
    await fail(job.session_id, attempts, error);
  }
}

/** "8 October and 26 February" — the two dates, for the document's title. */
function titleFor(a: string, b: string): string {
  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const say = (key: string) => {
    const [m, d] = key.split('-').map(Number);
    return `${d} ${MONTHS[m - 1] ?? ''}`.trim();
  };
  return `${say(a)} and ${say(b)}`;
}

/**
 * Makes sure a paid order is actually being written, whoever asks.
 *
 * The webhook is the fast path, not the only one. A destination can be
 * deleted, disabled, pointed at a stale domain, or never configured, and every
 * one of those turns a paid order into a page that says "Writing" forever. So
 * the order page calls this too: if the money is real and no reading exists,
 * one starts now.
 *
 * Safe to call on every render. Enqueuing ignores duplicates and claiming is
 * atomic, so a reader refreshing the page cannot start a second writer or
 * disturb one already running.
 */
export async function ensureReportStarted(session: Stripe.Checkout.Session): Promise<void> {
  if (session.payment_status === 'unpaid') return;

  await enqueueReport(session);

  const job = await jobFor(session.id);
  if (!job || job.status === 'ready' || job.status === 'failed') return;

  // Only step in when nothing else has touched it recently, so a reader
  // watching the page does not interrupt the webhook's own attempt.
  const idleMs = Date.now() - new Date(job.updated_at).getTime();
  if (job.status === 'writing' && idleMs < STALE_MINUTES * 60_000) return;
  if (job.attempts >= MAX_ATTEMPTS) return;

  waitUntil(processJob(job, session));
}

/** Jobs that never finished, oldest first, for a retry sweep. */
export async function stalledJobs(limit = 5): Promise<ReportJob[]> {
  const cutoff = new Date(Date.now() - STALE_MINUTES * 60_000).toISOString();
  const { data } = await supabaseAdmin()
    .from('report_jobs')
    .select('*')
    .in('status', ['queued', 'writing'])
    .lt('updated_at', cutoff)
    .lt('attempts', MAX_ATTEMPTS)
    .order('updated_at', { ascending: true })
    .limit(limit);
  return (data as ReportJob[]) ?? [];
}
