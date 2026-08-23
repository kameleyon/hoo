import 'server-only';
import type { VoiceId } from './voices';

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

export { VOICES } from './voices';
export type { VoiceId } from './voices';

export class LemonfoxNotConfigured extends Error {}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface Narration {
  audio: Uint8Array;
  /** Rough — derived from size at roughly 128 kbps, not decoded. */
  seconds: number;
}

export async function narrate(text: string, voice: VoiceId): Promise<Narration> {
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
      body: JSON.stringify({ input, voice, response_format: 'mp3' }),
    });

    if (response.ok) {
      const audio = new Uint8Array(await response.arrayBuffer());
      if (audio.length < 100) throw new Error('Lemonfox returned empty audio');
      return { audio, seconds: Math.max(1, Math.round(audio.length / 16000)) };
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
 * Section headings are dropped rather than spoken: "What the chart is doing"
 * read as a sentence sounds like a question nobody answers. Paragraphs are
 * joined with a pause instead.
 */
export function narrationScript(body: string): string {
  return body
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block && !block.startsWith('## '))
    .map((block) => block.split('\n').join(' '))
    .join('\n\n');
}
