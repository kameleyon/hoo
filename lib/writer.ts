import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Writing a reading.
 *
 * The prompt is a file in the repository rather than a string in here, because
 * it is the product: the voice rules, the banned phrases and the section
 * structure are edited far more often than this code is, and a writer should
 * be able to change them without touching TypeScript.
 */

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

/** Five and a half thousand words is roughly 7,500 tokens; this leaves room. */
const MAX_TOKENS = 16000;

const MODEL = process.env.OPENROUTER_MODEL ?? 'anthropic/claude-sonnet-4.5';

export class WriterNotConfigured extends Error {}

const cachedPrompts = new Map<string, string>();

/**
 * The system prompt, read once per process.
 *
 * process.cwd() is the project root in a Vercel function, and the file is
 * included because it is read by a literal path. Building the path from a
 * variable would work locally and 404 in production.
 */
async function systemPrompt(file: string): Promise<string> {
  const held = cachedPrompts.get(file);
  if (held) return held;
  const text = await readFile(join(process.cwd(), file), 'utf8');
  cachedPrompts.set(file, text);
  return text;
}

/** Which prompt writes which report. */
const PROMPTS: Record<string, string> = {
  love: 'promptlovereport.txt',
  biz: 'promptbusinessreport.txt',
};

export function hasWriter(reportId: string): boolean {
  return reportId in PROMPTS;
}

/**
 * The em dash is banned by the prompt, so it is also removed mechanically.
 *
 * Order matters. A dash opening a line is an attribution, and turning that one
 * into a comma produces a line that starts ", Sacred Symbols" — so those go
 * first and are dropped rather than replaced. Only then is the ordinary
 * mid-sentence dash swapped for a comma.
 */
function scrub(text: string): string {
  return text
    .replace(/^(\s*[*_>]*)\s*[—–]\s*/gm, '$1')
    .replace(/\s*[—–]\s*/g, ', ')
    .trim();
}

export interface Written {
  markdown: string;
  words: number;
}

export async function writeReport(reportId: string, brief: string): Promise<Written> {
  const promptFile = PROMPTS[reportId];
  if (!promptFile) throw new Error(`no writer for ${reportId}`);
  return write(promptFile, brief);
}

async function write(promptFile: string, brief: string): Promise<Written> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new WriterNotConfigured('OPENROUTER_API_KEY is not set');

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      // OpenRouter attributes usage to the site that sent the request.
      'http-referer': 'https://www.hausoforacle.com',
      'x-title': 'Haus of Oracle',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: 0.7,
      messages: [
        { role: 'system', content: await systemPrompt(promptFile) },
        { role: 'user', content: brief },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    // The key can appear in an upstream error, so only the status travels on.
    throw new Error(`the writer returned ${response.status}: ${detail.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = data.choices?.[0]?.message?.content ?? '';
  if (!raw.trim()) throw new Error('the writer returned nothing');

  const markdown = scrub(raw);
  return { markdown, words: markdown.split(/\s+/).filter(Boolean).length };
}
