import type { CSSProperties } from 'react';

/**
 * `today` and `study` are the two responsive sizes — they grow from the phone
 * size to the desktop size at the breakpoint. The rest are fixed.
 */
type Variant = 'grid' | 'sm' | 'lg' | 'today' | 'study' | 'dark' | 'md';

interface FaceCard {
  short: string;
  sym: string;
  red: boolean;
  name?: string;
}

/**
 * The card stock. Eight sizes, one shape.
 *
 * Suit colour rides on the `--suit` custom property rather than a modifier
 * class, because it is the one value that varies per card rather than per size.
 */
export function CardFace({
  card,
  variant,
  className = '',
}: {
  card: FaceCard;
  variant: Variant;
  className?: string;
}) {
  return (
    <div
      className={`face face--${variant} ${className}`.trim()}
      style={{ '--suit': card.red ? 'var(--red)' : 'var(--ink)' } as CSSProperties}
      aria-hidden="true"
    >
      <div className="face__rank">{card.short}</div>
      <div className="face__suit">{card.sym}</div>
    </div>
  );
}

/** The one-line rank+suit token used in week lists and date fields. */
export function ChipFace({
  card,
  className = '',
}: {
  card: FaceCard;
  className?: string;
}) {
  return (
    <div
      className={`chip-face ${className}`.trim()}
      style={{ '--suit': card.red ? 'var(--red)' : 'var(--ink)' } as CSSProperties}
      aria-hidden="true"
    >
      {card.short}
      {card.sym}
    </div>
  );
}
