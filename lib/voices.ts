/**
 * The narration voices, client-safe.
 *
 * Kept apart from lib/lemonfox.ts because that module is `server-only` — the
 * editor needs to offer this list in the browser, and importing the server
 * module to get it would drag the API client into the bundle.
 */
export const VOICES = [
  { id: 'river', label: 'River — female' },
  { id: 'adam', label: 'Adam — male' },
] as const;

export type VoiceId = (typeof VOICES)[number]['id'];
