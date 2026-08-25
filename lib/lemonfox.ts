import 'server-only';
import { parseBuffer } from 'music-metadata';
import { NARRATION_VOICE } from './voices';
import { markdownToSpeech } from './markdown-text';

/**
 * Lemonfox text-to-speech.
 *
 * Same endpoint and payload the MotionMax pipeline uses, including the retry
 * shape: 429 and 5xx are transient and worth backing off on, everything else is
 * a real failure and should surface immediately.
 */
const ENDPOINT = 'https://api.lemonfox.ai/v1/audio/speech';
const MAX_ATTEMPTS = 3;

/** Lemonfox bills per character, so a runaway body is a cost problem, not just a slow one. */
export const MAX_INPUT_CHARS = 20000;

export { NARRATION_VOICE } from './voices';

export class LemonfoxNotConfigured extends Error {}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface Narration {
  audio: Uint8Array;
  /** Read from the stream, or null if it could not be determined. */
  seconds: number | null;
}

/**
 * How long the narration actually runs.
 *
 * Guessing from file size needs a bitrate, and Lemonfox returns 32 kbps at
 * 24 kHz rather than the 128 kbps a size-based guess assumes — which made an
 * earlier estimate 42% short. `duration: true` scans the frames instead of
 * trusting a header that may not be there.
 */
async function durationOf(audio: Uint8Array): Promise<number | null> {
  try {
    const { format } = await parseBuffer(audio, { mimeType: 'audio/mpeg' }, { duration: true });
    return format.duration ? Math.round(format.duration) : null;
  } catch (error) {
    console.warn('could not read the narration duration —', error);
    return null;
  }
}

export async function narrate(text: string): Promise<Narration> {
  const key = process.env.LEMONFOX_API_KEY;
  if (!key) throw new LemonfoxNotConfigured('LEMONFOX_API_KEY is not set');

  const input = text.trim();
  if (!input) throw new Error('nothing to narrate');
  if (input.length > MAX_INPUT_CHARS) {
    throw new Error(`too long to narrate: ${input.length} characters, limit ${MAX_INPUT_CHARS}`);
  }

  let lastError = '';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input, voice: NARRATION_VOICE, response_format: 'mp3' }),
    });

    if (response.ok) {
      const audio = new Uint8Array(await response.arrayBuffer());
      if (audio.length < 100) throw new Error('Lemonfox returned empty audio');
      return { audio, seconds: await durationOf(audio) };
    }

    lastError = `${response.status} ${await response.text().catch(() => '')}`.trim();

    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === MAX_ATTEMPTS) break;
    await sleep(2000 * 2 ** (attempt - 1) + Math.floor(Math.random() * 1000));
  }

  throw new Error(`Lemonfox refused the request: ${lastError}`);
}

/**
 * Splits a script into pieces the API will accept, at the largest natural
 * boundary that fits.
 *
 * Paragraphs first, because a break between them is inaudible. Only a single
 * paragraph too big to send on its own falls back to sentences, and only a
 * sentence too big for that gets cut on length, which no real reading reaches.
 */
function chunk(text: string, limit: number): string[] {
  const out: string[] = [];
  let current = '';

  const push = (piece: string) => {
    if (!piece.trim()) return;
    if (current && current.length + piece.length + 2 > limit) {
      out.push(current.trim());
      current = '';
    }
    current = current ? `${current}\n\n${piece}` : piece;
  };

  for (const para of text.split(/\n{2,}/)) {
    if (para.length <= limit) {
      push(para);
      continue;
    }
    let sentence = '';
    for (const part of para.split(/(?<=[.!?])\s+/)) {
      if (sentence.length + part.length + 1 > limit) {
        push(sentence);
        sentence = '';
      }
      sentence = sentence ? `${sentence} ${part}` : part;
    }
    push(sentence);
  }

  if (current.trim()) out.push(current.trim());
  return out;
}

/**
 * Narrates a script of any length.
 *
 * A reading outgrew the single-request limit the moment it went from two
 * thousand words to four, so this sends it in pieces and joins the audio. MP3
 * frames are self-contained, so concatenating the responses produces one
 * playable file, and the duration is measured from the joined result rather
 * than summed, which keeps it honest about what a listener actually gets.
 */
export async function narrateLong(text: string): Promise<Narration> {
  const pieces = chunk(text.trim(), MAX_INPUT_CHARS);
  if (pieces.length === 0) throw new Error('nothing to narrate');
  if (pieces.length === 1) return narrate(pieces[0]);

  console.log(`narrating in ${pieces.length} parts`);
  const parts: Uint8Array[] = [];
  for (const piece of pieces) {
    parts.push((await narrate(piece)).audio);
  }

  const total = parts.reduce((n, p) => n + p.length, 0);
  const audio = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    audio.set(p, at);
    at += p.length;
  }

  return { audio, seconds: await durationOf(audio) };
}

/**
 * What actually gets read aloud.
 *
 * Lessons are markdown, and a voice given markdown says "hash hash" and
 * "asterisk asterisk". The source is lexed and the syntax dropped, keeping
 * every word the author wrote — see lib/markdown-text.ts.
 */
export function narrationScript(body: string): string {
  return markdownToSpeech(body);
}
