/**
 * Lesson bodies are plain text, not markdown, and that is deliberate.
 *
 * Markdown means either a parser dependency plus an HTML sanitiser, or
 * `dangerouslySetInnerHTML` and a standing XSS risk. Lesson prose needs
 * paragraphs and the occasional section heading — nothing else the card studies
 * do not already have — so the format is:
 *
 *   blank line      new paragraph
 *   "## " prefix    section heading
 *
 * Everything else is text, rendered by React, which escapes it. There is no
 * path from a lesson body to executable HTML.
 */
export type LessonBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string };

export function parseLessonBody(body: string): LessonBlock[] {
  return body
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      if (block.startsWith('## ')) {
        return { kind: 'heading' as const, text: block.slice(3).trim() };
      }
      // Prose is hard-wrapped in the editor; rejoin so it reflows to the column.
      return { kind: 'paragraph' as const, text: block.split('\n').join(' ') };
    });
}

/** Rough reading time, for lessons where nobody has set one. */
export function readingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}
