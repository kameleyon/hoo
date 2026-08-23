import { NextResponse, type NextRequest } from 'next/server';
import { processJob, stalledJobs } from '@/lib/report-jobs';
import { stripe } from '@/lib/stripe';

/** The pipeline is slow, so give it most of a function's life. */
export const maxDuration = 300;

/**
 * The retry sweep.
 *
 * The webhook starts a reading immediately, which covers the ordinary case.
 * This covers the rest: a function killed mid-write, a model that was down, a
 * webhook that never arrived. Without it, every one of those is a customer who
 * paid and silently got nothing, and nobody finds out until they complain.
 *
 * Runs on a schedule and is safe to call by hand.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('CRON_SECRET is not set');
    return NextResponse.json({ error: 'not configured' }, { status: 503 });
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'no' }, { status: 401 });
  }

  const jobs = await stalledJobs();
  const handled: string[] = [];

  // Sequential on purpose. Each job is a model call and a narration, and
  // running several at once is the quickest way to hit a rate limit and turn
  // one stalled reading into five.
  for (const job of jobs) {
    try {
      const session = await stripe().checkout.sessions.retrieve(job.session_id);
      if (session.payment_status === 'unpaid') continue;
      await processJob(job, session);
      handled.push(job.session_id);
    } catch (error) {
      console.error(`sweep could not process ${job.session_id} —`, error);
    }
  }

  return NextResponse.json({ found: jobs.length, handled });
}
