import { marked } from 'marked';
import type { Token, Tokens } from 'marked';

/**
 * Markdown reduced to what a voice should actually say.
 *
 * Reading the source aloud is the obvious failure here — "hash hash What the
 * chart is doing", "asterisk asterisk dealt asterisk asterisk". So the text is
 * lexed and the syntax dropped, keeping the words. Headings are kept as their
 * own line, because they are content; the marks around them are not.
 */
export function markdownToSpeech(markdown: string): string {
  const blocks: string[] = [];

  const inline = (tokens: Token[] | undefined, fallback: string): string => {
    if (!tokens) return fallback;
    return tokens
      .map((token) => {
        // A `text` token inside a list item still carries the nested inline
        // tokens; returning its .text hands back the raw "**bold**".
        if (token.type === 'text' && 'tokens' in token && Array.isArray(token.tokens)) {
          return inline(token.tokens as Token[], (token as Tokens.Text).text);
        }
        switch (token.type) {
          case 'text':
          case 'codespan':
            return (token as Tokens.Text).text;
          case 'escape':
            return (token as Tokens.Escape).text;
          case 'strong':
          case 'em':
          case 'del':
          case 'link':
            return inline((token as Tokens.Strong).tokens, (token as Tokens.Strong).text ?? '');
          case 'br':
            return ' ';
          case 'image':
            // Alt text is written for someone who cannot see it, which is
            // exactly the listener's position.
            return (token as Tokens.Image).text ?? '';
          default:
            return 'text' in token ? String((token as { text?: string }).text ?? '') : '';
        }
      })
      .join('');
  };

  const walk = (tokens: Token[]): void => {
    for (const token of tokens) {
      switch (token.type) {
        case 'heading':
        case 'paragraph': {
          const text = inline(
            (token as Tokens.Paragraph).tokens,
            (token as Tokens.Paragraph).text,
          ).trim();
          if (text) blocks.push(text);
          break;
        }
        case 'blockquote':
          walk((token as Tokens.Blockquote).tokens ?? []);
          break;
        case 'list': {
          for (const item of (token as Tokens.List).items) {
            const text = inline(item.tokens, item.text).trim();
            if (text) blocks.push(text);
          }
          break;
        }
        case 'table': {
          // A table read cell by cell is noise; skip it and let the prose carry.
          break;
        }
        case 'code':
        case 'space':
        case 'hr':
          break;
        default: {
          const text = 'text' in token ? String((token as { text?: string }).text ?? '') : '';
          if (text.trim()) blocks.push(text.trim());
        }
      }
    }
  };

  walk(marked.lexer(markdown));

  return blocks
    .map((block) => block.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');
}

/** Rough reading time from the spoken words, not the markdown source. */
export function readingMinutes(markdown: string): number {
  const words = markdownToSpeech(markdown).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}
