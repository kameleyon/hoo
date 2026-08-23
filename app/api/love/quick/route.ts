import { NextResponse } from 'next/server';
import { parseDayKey } from '@/lib/cardology';
import { readLove } from '@/lib/love';

/**
 * The free half of the Love report.
 *
 * Nine percentages and one line, from two birthdays. This costs nothing to
 * serve because nothing here is generated: the scores are arithmetic over the
 * two birth cards, so the answer is the same every time and no model is
 * involved. That is the whole reason it can be given away.
 *
 * What it deliberately does not return is the reading. The percentages are the
 * question; the two thousand words are the answer, and those are what is paid
 * for.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const { a, b } = (body ?? {}) as { a?: unknown; b?: unknown };
  if (typeof a !== 'string' || typeof b !== 'string') {
    return NextResponse.json({ error: 'two birthdays are required' }, { status: 400 });
  }

  // parseDayKey validates rather than converts, so the keys stay the strings
  // that came in once they are known to be real dates.
  if (!parseDayKey(a) || !parseDayKey(b)) {
    return NextResponse.json({ error: 'those are not both dates' }, { status: 400 });
  }

  const reading = readLove(a, b);
  if (!reading) {
    return NextResponse.json({ error: 'no cards for those dates' }, { status: 400 });
  }

  return NextResponse.json({
    a: { name: reading.a.name, code: reading.a.code },
    b: { name: reading.b.name, code: reading.b.code },
    categories: reading.categories,
    overall: reading.overall,
    hook: reading.hook,
  });
}
