import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * A lesson body, written in markdown.
 *
 * react-markdown builds React elements rather than an HTML string, so there is
 * no `dangerouslySetInnerHTML` and no sanitiser to keep correct — raw HTML in a
 * lesson is rendered as text, not executed, because `rehype-raw` is deliberately
 * not installed.
 *
 * Every element is mapped to the app's own classes so a lesson reads like the
 * card studies rather than like a browser default.
 */
export function LessonBody({ markdown }: { markdown: string }) {
  return (
    <article className="lesson__body">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h2 className="lesson__heading">{children}</h2>,
          h2: ({ children }) => <h2 className="lesson__heading">{children}</h2>,
          h3: ({ children }) => <h3 className="lesson__subheading">{children}</h3>,
          h4: ({ children }) => <h3 className="lesson__subheading">{children}</h3>,
          p: ({ children }) => <p className="lesson__paragraph">{children}</p>,
          ul: ({ children }) => <ul className="lesson__list">{children}</ul>,
          ol: ({ children }) => <ol className="lesson__list lesson__list--ordered">{children}</ol>,
          li: ({ children }) => <li className="lesson__list-item">{children}</li>,
          blockquote: ({ children }) => <blockquote className="lesson__quote">{children}</blockquote>,
          hr: () => <hr className="lesson__rule" />,
          code: ({ children }) => <code className="lesson__code">{children}</code>,
          a: ({ href, children }) => (
            <a href={href} rel="noopener noreferrer">
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="ref__scroll">
              <table className="ref__table">{children}</table>
            </div>
          ),
          img: ({ src, alt }) =>
            typeof src === 'string' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={alt ?? ''} className="lesson__image" />
            ) : null,
        }}
      >
        {markdown}
      </Markdown>
    </article>
  );
}
