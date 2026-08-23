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
 * What actually gets read aloud.
 *
 * Lessons are markdown, and a voice given markdown says "hash hash" and
 * "asterisk asterisk". The source is lexed and the syntax dropped, keeping
 * every word the author wrote — see lib/markdown-text.ts.
 */
export function narrationScript(body: string): string {
  return markdownToSpeech(body);
}
