import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { lessonRecord, readerIsAdmin } from '@/lib/lesson-records';
import { LemonfoxNotConfigured, narrate, narrationScript } from '@/lib/lemonfox';
import { VOICES } from '@/lib/voices';
import type { VoiceId } from '@/lib/voices';

const BUCKET = 'lesson-media';

/**
 * Reads a lesson aloud and files the result.
 *
 * Editors only, and the text comes from the stored lesson rather than the
 * request — otherwise this is an open text-to-speech endpoint billed to us by
 * the character.
 */
export async function POST(request: NextRequest) {
  if (!(await readerIsAdmin())) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  let payload: { n?: string; voice?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const n = payload.n ?? '';
  if (!/^(0[1-9]|[1-4][0-9]|50)$/.test(n)) {
    return NextResponse.json({ error: 'unknown lesson' }, { status: 400 });
  }

  const voice: VoiceId = VOICES.some((v) => v.id === payload.voice)
    ? (payload.voice as VoiceId)
    : 'river';

  const lesson = await lessonRecord(n);
  if (!lesson) return NextResponse.json({ error: 'unknown lesson' }, { status: 404 });

  const script = narrationScript(lesson.body);
  if (!script) {
    return NextResponse.json({ error: 'write the lesson first' }, { status: 400 });
  }

  try {
    const { audio, seconds } = await narrate(script, voice);
    const path = `lessons/${n}/audio.mp3`;

    const { error: uploadError } = await supabaseAdmin()
      .storage.from(BUCKET)
      .upload(path, audio, { contentType: 'audio/mpeg', upsert: true });

    if (uploadError) throw new Error(`could not store the audio: ${uploadError.message}`);

    const { error: linkError } = await supabaseAdmin()
      .from('lessons')
      .update({ audio_path: path, audio_seconds: seconds })
      .eq('n', n);

    if (linkError) throw new Error(`could not attach the audio: ${linkError.message}`);

    return NextResponse.json({ path, seconds, characters: script.length, voice });
  } catch (error) {
    if (error instanceof LemonfoxNotConfigured) {
      console.error(error.message);
      return NextResponse.json(
        { error: 'Narration is not configured on this deployment (LEMONFOX_API_KEY).' },
        { status: 503 },
      );
    }
    const message = error instanceof Error ? error.message : 'narration failed';
    console.error(`narrate lesson ${n} —`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
