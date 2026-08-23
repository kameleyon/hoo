import 'server-only';
import { supabaseAdmin } from './supabase/admin';

/**
 * Finds somewhere to put a new article.
 *
 * The outline in lib/lessons.ts names the lessons of the course, but not every
 * article has to be one of them — so a new piece takes the lowest empty slot,
 * and if the outline is full it gets a number past the end. `lessonTitle()`
 * falls back to "Lesson NN" for those, and the article supplies its own.
 *
 * Rows are created here rather than assumed, so the outline and the table can
 * drift apart without anything breaking.
 */
export async function nextFreeLesson(): Promise<string> {
  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from('lessons')
    .select('n, title, body, published_at')
    .order('n');

  if (error) throw new Error(`could not read the lessons: ${error.message}`);

  const rows = data ?? [];
  const empty = rows.find(
    (row) => !row.published_at && !row.title && !String(row.body ?? '').trim(),
  );
  if (empty) return empty.n as string;

  // Everything is spoken for — add a slot past the last one.
  const highest = rows.reduce((max, row) => Math.max(max, Number(row.n)), 0);
  const next = String(highest + 1).padStart(2, '0');
  if (!/^(0[1-9]|[1-9][0-9])$/.test(next)) {
    throw new Error('no lesson numbers left — the table is full at 99');
  }

  const { error: insertError } = await supabase.from('lessons').insert({ n: next });
  if (insertError) throw new Error(`could not create lesson ${next}: ${insertError.message}`);

  return next;
}
