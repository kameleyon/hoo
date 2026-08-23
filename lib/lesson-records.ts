import 'server-only';
import { supabaseServer } from './supabase/server';
import { supabaseConfig } from './supabase/config';

export interface LessonRecord {
  n: string;
  body: string;
  audio_path: string | null;
  pdf_path: string | null;
  audio_seconds: number | null;
  access: 'free' | 'pro';
  published_at: string | null;
}

/**
 * One lesson's content. Read with the reader's own session, so row-level
 * security decides what comes back: an unpublished lesson is invisible to
 * everyone except an editor.
 *
 * Returns null when the deployment has no Supabase — the lesson list still
 * works, individual lessons just have nothing to show.
 */
export async function lessonRecord(n: string): Promise<LessonRecord | null> {
  if (!supabaseConfig()) return null;

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('lessons')
    .select('n, body, audio_path, pdf_path, audio_seconds, access, published_at')
    .eq('n', n)
    .maybeSingle();

  if (error) {
    console.error(`could not read lesson ${n} —`, error.message);
    return null;
  }
  return (data as LessonRecord | null) ?? null;
}

/** Which lessons have something to read, for marking up the list. */
export async function publishedLessonNumbers(): Promise<Set<string>> {
  if (!supabaseConfig()) return new Set();

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('lessons')
    .select('n')
    .not('published_at', 'is', null);

  if (error) {
    console.error('could not list published lessons —', error.message);
    return new Set();
  }
  return new Set((data ?? []).map((row) => row.n as string));
}

/** Whether the signed-in reader currently has Pro. False when signed out. */
export async function readerIsPro(): Promise<boolean> {
  if (!supabaseConfig()) return false;
  const supabase = await supabaseServer();
  const { data } = await supabase.rpc('is_pro');
  return data === true;
}

export async function readerIsAdmin(): Promise<boolean> {
  if (!supabaseConfig()) return false;
  const supabase = await supabaseServer();
  const { data } = await supabase.rpc('is_admin');
  return data === true;
}
