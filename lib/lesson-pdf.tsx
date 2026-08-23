import 'server-only';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import { marked } from 'marked';
import type { Token, Tokens } from 'marked';

/**
 * A lesson as a PDF: the mark, the title, and the reading laid out like the
 * markdown it came from.
 *
 * Built with @react-pdf rather than a headless browser — no Chromium to ship,
 * and it runs inside a normal function invocation. Type is the built-in Times
 * family: Instrument Serif and Newsreader would have to be fetched at render
 * time, and a font download is not worth a failed download on the one request
 * that matters.
 */
const INK = '#0E1A2E';
const BODY = '#2B3444';
const MUTED = '#6C6A65';
const LINE = '#DEDBD5';

const styles = StyleSheet.create({
  page: { paddingTop: 56, paddingBottom: 64, paddingHorizontal: 64, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 34 },
  mark: { width: 24, height: 24 },
  wordmark: { fontFamily: 'Helvetica', fontSize: 8, letterSpacing: 2, color: '#3A4658' },
  eyebrow: { fontFamily: 'Helvetica', fontSize: 8, letterSpacing: 1.6, color: MUTED, marginBottom: 8 },
  title: { fontFamily: 'Times-Roman', fontSize: 30, color: INK, marginBottom: 22, lineHeight: 1.15 },
  h2: { fontFamily: 'Times-Roman', fontSize: 17, color: INK, marginTop: 22, marginBottom: 8 },
  h3: { fontFamily: 'Times-Bold', fontSize: 12, color: INK, marginTop: 16, marginBottom: 6 },
  p: { fontFamily: 'Times-Roman', fontSize: 11.5, lineHeight: 1.65, color: BODY, marginBottom: 11 },
  li: { fontFamily: 'Times-Roman', fontSize: 11.5, lineHeight: 1.6, color: BODY, marginBottom: 6, paddingLeft: 14 },
  quote: {
    fontFamily: 'Times-Italic', fontSize: 11.5, lineHeight: 1.6, color: MUTED,
    marginBottom: 11, paddingLeft: 14, borderLeftWidth: 1, borderLeftColor: LINE,
  },
  rule: { borderBottomWidth: 1, borderBottomColor: LINE, marginVertical: 16 },
  footer: {
    position: 'absolute', bottom: 32, left: 64, right: 64,
    fontFamily: 'Helvetica', fontSize: 8, color: '#9A978F',
    flexDirection: 'row', justifyContent: 'space-between',
  },
});

let markCache: string | null = null;
function markDataUri(): string | null {
  if (markCache !== null) return markCache || null;
  try {
    // The 500px original is ~197 KB and would dominate a 20 KB lesson PDF.
    const bytes = readFileSync(resolve(process.cwd(), 'public/oracle-mark-96.png'));
    markCache = `data:image/png;base64,${bytes.toString('base64')}`;
  } catch {
    markCache = '';
  }
  return markCache || null;
}

/** Flatten inline markdown to a string — the PDF keeps structure, not emphasis. */
function inlineText(tokens: Token[] | undefined, fallback = ''): string {
  if (!tokens) return fallback;
  return tokens
    .map((token) => {
      // Nested tokens first: a list item's `text` token still holds the raw
      // "**bold**" in .text, and only its children have it parsed.
      if ('tokens' in token && Array.isArray((token as Tokens.Strong).tokens)) {
        return inlineText((token as Tokens.Strong).tokens, (token as Tokens.Strong).text ?? '');
      }
      if (token.type === 'text' || token.type === 'codespan' || token.type === 'escape') {
        return (token as Tokens.Text).text;
      }
      return 'text' in token ? String((token as { text?: string }).text ?? '') : '';
    })
    .join('');
}

function blocks(markdown: string): React.ReactElement[] {
  const out: React.ReactElement[] = [];
  let key = 0;

  const walk = (tokens: Token[]) => {
    for (const token of tokens) {
      switch (token.type) {
        case 'heading': {
          const text = inlineText((token as Tokens.Heading).tokens, (token as Tokens.Heading).text);
          const depth = (token as Tokens.Heading).depth;
          out.push(
            <Text key={key++} style={depth <= 2 ? styles.h2 : styles.h3}>
              {text}
            </Text>,
          );
          break;
        }
        case 'paragraph':
          out.push(
            <Text key={key++} style={styles.p}>
              {inlineText((token as Tokens.Paragraph).tokens, (token as Tokens.Paragraph).text)}
            </Text>,
          );
          break;
        case 'list': {
          const list = token as Tokens.List;
          list.items.forEach((item, i) => {
            const bullet = list.ordered ? `${Number(list.start || 1) + i}.` : '·';
            out.push(
              <Text key={key++} style={styles.li}>
                {bullet}  {inlineText(item.tokens, item.text)}
              </Text>,
            );
          });
          break;
        }
        case 'blockquote':
          out.push(
            <Text key={key++} style={styles.quote}>
              {inlineText((token as Tokens.Blockquote).tokens, '')}
            </Text>,
          );
          break;
        case 'hr':
          out.push(<View key={key++} style={styles.rule} />);
          break;
        case 'code':
          out.push(
            <Text key={key++} style={styles.p}>
              {(token as Tokens.Code).text}
            </Text>,
          );
          break;
        default:
          break;
      }
    }
  };

  walk(marked.lexer(markdown));
  return out;
}

/**
 * Any Haus of Oracle document: same masthead, same type, same footer.
 *
 * The eyebrow is the only thing that differs between a lesson and a paid
 * reading, so they share a renderer rather than drifting apart into two that
 * are almost the same.
 */
export async function documentPdf({
  title,
  markdown,
  eyebrow = 'A LESSON',
}: {
  title: string;
  markdown: string;
  eyebrow?: string;
}): Promise<Buffer> {
  const mark = markDataUri();

  const document = (
    <Document title={`${title} — Haus of Oracle`} author="Haus of Oracle">
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          {mark ? <Image src={mark} style={styles.mark} /> : null}
          <Text style={styles.wordmark}>HAUS OF ORACLE</Text>
        </View>

        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>

        {blocks(markdown)}

        <View style={styles.footer} fixed>
          <Text>hausoforacle.com</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );

  return renderToBuffer(document);
}

/** The lesson flavour, kept so existing callers read the way they always did. */
export function lessonPdf(args: { title: string; markdown: string }): Promise<Buffer> {
  return documentPdf(args);
}
