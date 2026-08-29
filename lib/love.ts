import 'server-only';
import spread from './data/spread.json';
import solar from './data/solar.json';
import cards from './data/card-index.json';
import { cardForKey } from './cardology';
import type { DayKey } from './types';

/**
 * Compatibility scoring.
 *
 * Everything here is arithmetic over two birth cards. There is no model call,
 * which is why the percentages can be free: the same two birthdays always
 * produce the same nine numbers, and producing them costs nothing.
 *
 * Each derivation below is checked against a worked example printed in the
 * source, by scripts/verify-links.mjs and scripts/verify-composite.mjs. That
 * matters more than usual here, because a reading that is subtly wrong looks
 * exactly like a reading that is right.
 */

/** The seven-by-seven body of the spread, Mercury row first. */
const GRID: string[][] = spread.rows.map((r) => r.cards);

/**
 * All fifty-two in counting order.
 *
 * Rows run top to bottom and each is read right to left, the crown last and
 * read the same way. Verified against the source's own step sequence, which
 * names 6C, 6S, QH, 10C in order and so pins both the direction and the
 * crown's position at the end.
 */
const SEQUENCE: string[] = [
  ...GRID.flatMap((row) => [...row].reverse()),
  ...spread.crown.map((c) => c.code).reverse(),
];

const INDEX = new Map(SEQUENCE.map((code, i) => [code, i]));
const CARD = new Map(cards.map((c) => [c.code, c]));
const SOLAR_CARD = new Map(solar.map((s) => [s.value, s.code]));
const SOLAR_VALUE = new Map(solar.map((s) => [s.code, s.value]));

/**
 * Planetary order. The card you start from is the Sun, so the first card away
 * from it is Mercury. Thirteen seats: a chart is the Sun plus twelve.
 */
const SEATS = [
  'Sun',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
  'Bacchus',
  'Vulcan',
  'Moon',
  'Earth',
] as const;

const CHART_SIZE = SEATS.length;

/** Steps from one card to another going forward, the start counting as one. */
function countTo(from: string, to: string): number {
  const a = INDEX.get(from);
  const b = INDEX.get(to);
  if (a === undefined || b === undefined) return 0;
  return ((b - a + 52) % 52) + 1;
}

/** The thirteen cards seated in someone's chart, keyed by the seat they hold. */
export function chartOf(code: string): Map<string, string> {
  const start = INDEX.get(code);
  const seats = new Map<string, string>();
  if (start === undefined) return seats;
  for (let i = 0; i < CHART_SIZE; i++) {
    seats.set(SEQUENCE[(start + i) % 52], SEATS[i]);
  }
  return seats;
}

/**
 * The deck in perfect order: Ace to King, Hearts, Clubs, Diamonds, Spades.
 * The source calls this the Pure Spread, and it is the solar order.
 */
const PURE: string[] = [...solar].sort((x, y) => x.value - y.value).map((x) => x.code);

/**
 * The layout step the source calls a quadration, recovered rather than quoted.
 *
 * The procedure is not written down in anything we hold, but both of its ends
 * are: it turns the Pure Spread into the Life Spread, and both are known. So
 * the permutation between them is simply read off, and the proof that it is
 * the right one is that repeating it returns to the Pure Spread after exactly
 * ninety steps, which is what the source says happens. See
 * scripts/verify-ages.mjs.
 */
const QUADRATION: number[] = (() => {
  const where = new Map(PURE.map((c, i) => [c, i]));
  return SEQUENCE.map((c) => where.get(c) ?? 0);
})();

/**
 * The ninety Age Spreads. Age 0 is the Life Spread, Age 89 the Pure Spread,
 * and a life longer than that starts over.
 */
const AGE_SPREADS: string[][] = (() => {
  const out: string[][] = [];
  let seq = PURE;
  for (let n = 0; n < 90; n++) {
    seq = QUADRATION.map((from) => seq[from]);
    out.push(seq);
  }
  return out;
})();

/** Where a card's thirteen seats fall in a given year of life. */
function chartAt(code: string, age: number): Map<string, string> {
  const spreadAt = AGE_SPREADS[((age % 90) + 90) % 90];
  const start = spreadAt.indexOf(code);
  const seats = new Map<string, string>();
  if (start === -1) return seats;
  for (let i = 0; i < CHART_SIZE; i++) {
    seats.set(spreadAt[(start + i) % 52], SEATS[i]);
  }
  return seats;
}

/**
 * What it means for one card to be sitting in another's seat.
 *
 * Drawn from the planetary meanings the spread itself carries: Venus and
 * Jupiter are where a relationship is given something, Saturn and Neptune
 * where it is charged for something. Mars is not bad, it is loud, so it counts
 * against a quiet year and not against the pairing.
 */
const SEAT_WEIGHT: Record<string, number> = {
  Sun: 2,
  Venus: 3,
  Jupiter: 3,
  Mercury: 1,
  Moon: 1,
  Earth: 1,
  Bacchus: 1,
  Vulcan: 0,
  Pluto: -1,
  Mars: -1,
  Uranus: -1,
  Saturn: -2,
  Neptune: -2,
};

export interface AgeWindow {
  age: number;
  /** The seat B holds in A's chart that year, and the reverse. */
  bInA: string | null;
  aInB: string | null;
  weight: number;
}

/**
 * The years when these two are easiest on each other, and the years they are
 * hardest, worked out from where each card sits in the other's chart as the
 * spreads turn.
 *
 * Ages with no contact at all are left out rather than scored zero: nothing
 * seated either way is an absence of information, not a neutral year.
 */
export function ageWindows(
  a: string,
  b: string,
  horizon = 90,
): { best: AgeWindow[]; worst: AgeWindow[] } {
  const scored: AgeWindow[] = [];

  // Ranked inside the horizon rather than ranked globally and trimmed after.
  // Trimming leaves a short horizon with nothing to say about its hard years,
  // which is exactly the half a reader needs.
  for (let age = 0; age < Math.min(horizon, 90); age++) {
    const bInA = chartAt(a, age).get(b) ?? null;
    const aInB = chartAt(b, age).get(a) ?? null;
    if (!bInA && !aInB) continue;
    const weight = (bInA ? (SEAT_WEIGHT[bInA] ?? 0) : 0) + (aInB ? (SEAT_WEIGHT[aInB] ?? 0) : 0);
    scored.push({ age, bInA, aInB, weight });
  }

  const byWeight = [...scored].sort((x, y) => y.weight - x.weight || x.age - y.age);
  return {
    best: byWeight.filter((w) => w.weight > 0).slice(0, 6),
    worst: [...byWeight].reverse().filter((w) => w.weight < 0).slice(0, 6),
  };
}

/**
 * Year by year, in order, for as many years as asked for.
 *
 * The source is explicit that the Life Spread is read as the first year of
 * life, Age 0, so year one is the first Age Spread and every year after is the
 * next one. A business launched today is in its first year, not its zeroth.
 *
 * Unlike ageWindows this keeps the quiet years too: a year with no contact is
 * a real answer about that year, and section-by-section writing needs the
 * sequence unbroken rather than only its extremes.
 */
export function ageTimeline(a: string, b: string, years: number): AgeWindow[] {
  const out: AgeWindow[] = [];
  for (let i = 0; i < years; i++) {
    const bInA = chartAt(a, i).get(b) ?? null;
    const aInB = chartAt(b, i).get(a) ?? null;
    out.push({
      age: i + 1,
      bInA,
      aInB,
      weight: (bInA ? (SEAT_WEIGHT[bInA] ?? 0) : 0) + (aInB ? (SEAT_WEIGHT[aInB] ?? 0) : 0),
    });
  }
  return out;
}

/**
 * Whether either person's Venus card is the other person. The source treats
 * this as one of the strongest attraction placements there is, so it is worth
 * naming on its own rather than folding into the general seat list.
 */
export function venusTie(a: string, b: string): { aVenusIsB: boolean; bVenusIsA: boolean } {
  const venusOf = (code: string) => {
    for (const [card, seat] of chartOf(code)) if (seat === 'Venus') return card;
    return null;
  };
  return { aVenusIsB: venusOf(a) === b, bVenusIsA: venusOf(b) === a };
}

/**
 * The card a given card displaced.
 *
 * The source frames the Pure Spread as the original order and the Life Spread
 * as what people made of it, so every card sits in a seat that belonged to
 * another. "Note which card in the Natural spread is displaced by your Birth
 * Card, the card that holds the same position." Its influence is described as
 * working underneath, subconsciously, rather than on the surface.
 *
 * Checked against the source's own examples by scripts/verify-displaced.mjs:
 * the 3 of Hearts displaces the Ace of Hearts, and the 6 of Diamonds displaces
 * the 9 of Clubs.
 */
export function displacedBy(code: string): string | null {
  const at = INDEX.get(code);
  return at === undefined ? null : (PURE[at] ?? null);
}

export type LinkDirection = 'mutual' | 'a-in-b' | 'b-in-a' | 'none';

export interface Link {
  direction: LinkDirection;
  /** The seat A holds in B's chart, when it holds one. */
  aSeat: string | null;
  bSeat: string | null;
}

/**
 * Whether either Sun Card is already seated in the other's permanent chart.
 *
 * The asymmetry is real and is the point: a chart runs forward from its own
 * card, so B can sit inside A's thirteen while A sits outside B's. That is what
 * the source means by a one-directional connection, and it is the single
 * largest term in the score.
 */
export function linkBetween(a: string, b: string): Link {
  if (a === b) return { direction: 'mutual', aSeat: 'Sun', bSeat: 'Sun' };
  const aSeat = chartOf(b).get(a) ?? null; // where A sits in B's chart
  const bSeat = chartOf(a).get(b) ?? null;
  const direction: LinkDirection =
    aSeat && bSeat ? 'mutual' : aSeat ? 'a-in-b' : bSeat ? 'b-in-a' : 'none';
  return { direction, aSeat, bSeat };
}

export interface Dynamic {
  /** How the first reads the connection, and how the second reads it back. */
  aCard: string | null;
  bCard: string | null;
  aCount: number;
  bCount: number;
  /** The two counts always total fifty-four. A useful self-check. */
  balanced: boolean;
}

/**
 * The pair of cards describing how each person experiences the connection.
 *
 * Counting forward from one card to the other, then onward back to the first,
 * always totals fifty-four, so the second card is fixed by the first. The
 * source pre-prints these as a table of pairs; deriving them costs nothing and
 * cannot be mistranscribed.
 */
export function dynamicBetween(a: string, b: string): Dynamic {
  // Two people on the same card are the one case the plain count gets wrong.
  // The source is explicit: the first count is 1, and the second travels the
  // whole circle back to its partner, which is 53. Counting both as 1 would
  // total 2 and quietly break the invariant everything else here relies on.
  const aCount = a === b ? 1 : countTo(a, b);
  const bCount = a === b ? 53 : countTo(b, a);
  return {
    aCount,
    bCount,
    aCard: SOLAR_CARD.get(aCount) ?? null,
    bCard: SOLAR_CARD.get(bCount) ?? null,
    balanced: aCount + bCount === 54,
  };
}

/**
 * A spark is a dynamic card that lands somewhere in that person's own chart.
 * The source's worked example turns on exactly this: one partner's dynamic card
 * is her own Venus card, and that is what makes the connection register rather
 * than stay inert.
 */
export function sparkBetween(a: string, b: string) {
  const d = dynamicBetween(a, b);
  const aSeat = d.aCard ? (chartOf(a).get(d.aCard) ?? null) : null;
  const bSeat = d.bCard ? (chartOf(b).get(d.bCard) ?? null) : null;
  return { ...d, aSeat, bSeat, match: Boolean(aSeat || bSeat) };
}

/** Adding solar values and wrapping at fifty-two. */
export function compositeOf(a: string, b: string): string | null {
  const total = (SOLAR_VALUE.get(a) ?? 0) + (SOLAR_VALUE.get(b) ?? 0);
  if (!total) return null;
  const remainder = total % 52;
  return SOLAR_CARD.get(remainder === 0 ? 52 : remainder) ?? null;
}

const POSITIONS = spread.positions as Record<string, { row: string; column: string }>;

export function contactPoints(a: string, b: string) {
  const pa = POSITIONS[a];
  const pb = POSITIONS[b];
  const shared: string[] = [];
  if (pa && pb) {
    if (pa.row === pb.row) shared.push(pa.row);
    if (pa.column === pb.column) shared.push(pa.column);
  }
  return { a: pa ?? null, b: pb ?? null, shared };
}

/**
 * "In associated Suits, Hearts and Clubs are compatible; Diamonds and Spades
 * are compatible." A suit is taken to sit well with itself.
 */
const SUIT_PARTNER: Record<string, string> = {
  Hearts: 'Clubs',
  Clubs: 'Hearts',
  Diamonds: 'Spades',
  Spades: 'Diamonds',
};

export function suitsCompatible(a: string, b: string): boolean {
  const sa = CARD.get(a)?.suit;
  const sb = CARD.get(b)?.suit;
  if (!sa || !sb) return false;
  return sa === sb || SUIT_PARTNER[sa] === sb;
}

/** A card seated in both charts, which the source treats as an echo. */
export function sharedEcho(a: string, b: string): string[] {
  const ca = chartOf(a);
  const cb = chartOf(b);
  return [...ca.keys()].filter((code) => cb.has(code) && code !== a && code !== b);
}

/**
 * The eight scored categories, each with the words that make a composite card
 * relevant to it. Matching on the composite's own stated expressions is what
 * stops all eight numbers coming out identical: the structural bonuses apply
 * across the board, so this is where a pairing's actual character shows up.
 */
const CATEGORIES: { name: string; words: string[] }[] = [
  {
    name: 'In Love',
    words: ['love', 'affection', 'romance', 'desire', 'attraction', 'devotion', 'heart', 'intimacy'],
  },
  {
    name: 'Partnership',
    words: ['partnership', 'commitment', 'union', 'marriage', 'together', 'loyal', 'stability', 'build'],
  },
  {
    name: 'Friendship',
    words: ['friend', 'social', 'play', 'companion', 'warmth', 'generous', 'community'],
  },
  {
    name: 'Communication',
    words: ['communication', 'words', 'talk', 'mental', 'idea', 'thought', 'clarity', 'express'],
  },
  {
    name: 'Conflict Resolution',
    words: ['peace', 'harmony', 'repair', 'patience', 'diplomacy', 'resolve', 'calm', 'forgive'],
  },
  {
    name: 'Challenges',
    words: ['discipline', 'work', 'endure', 'lesson', 'responsibility', 'growth', 'mature'],
  },
  {
    name: 'Money & Shared Goals',
    words: ['money', 'value', 'work', 'business', 'abundance', 'wealth', 'goal', 'ambition', 'provide'],
  },
  {
    name: 'Trust & Vulnerability',
    words: ['trust', 'honest', 'truth', 'sincerity', 'safe', 'open', 'faith', 'integrity'],
  },
];

const BASELINE = 60;

function relevance(text: string, words: string[]): number {
  const hay = text.toLowerCase();
  return words.filter((w) => hay.includes(w)).length;
}

export interface CategoryScore {
  name: string;
  score: number;
}

export interface LoveReading {
  a: { key: DayKey; code: string; name: string };
  b: { key: DayKey; code: string; name: string };
  composite: string | null;
  compositeName: string | null;
  link: Link;
  spark: ReturnType<typeof sparkBetween>;
  contacts: ReturnType<typeof contactPoints>;
  echo: string[];
  suited: boolean;
  categories: CategoryScore[];
  overall: number;
  /** Years of life these two are easiest, and hardest, on each other. */
  ages: ReturnType<typeof ageWindows>;
  venus: ReturnType<typeof venusTie>;
  /** One line, written to make someone want the rest. */
  hook: string;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function readLove(aKey: DayKey, bKey: DayKey): LoveReading | null {
  const ca = cardForKey(aKey);
  const cb = cardForKey(bKey);
  if (!ca || !cb) return null;

  const link = linkBetween(ca.code, cb.code);
  const spark = sparkBetween(ca.code, cb.code);
  const contacts = contactPoints(ca.code, cb.code);
  const echo = sharedEcho(ca.code, cb.code);
  const suited = suitsCompatible(ca.code, cb.code);
  const composite = compositeOf(ca.code, cb.code);
  const comp = composite ? CARD.get(composite) : null;

  // Structural terms are the same for every category. Absence of a bonus is
  // neutral by design: only a documented conflict subtracts.
  let structural = 0;
  if (link.direction === 'mutual') structural += 20;
  else if (link.direction !== 'none') structural += 12;
  if (spark.match) structural += 15;
  const venus = venusTie(ca.code, cb.code);
  if (venus.aVenusIsB || venus.bVenusIsA) structural += 12;
  structural += contacts.shared.length * 8;
  if (suited) structural += 10;
  if (echo.length) structural += 4;

  const categories = CATEGORIES.map(({ name, words }) => {
    const up = relevance(comp?.uplifted ?? '', words);
    const down = relevance(comp?.shadow ?? '', words);
    // Ten for a composite that speaks to the category at all, rising to twenty
    // as it speaks to it more directly.
    const lift = up ? Math.min(20, 10 + up * 4) : 0;
    // A shadow that names the category is a documented conflict, which is the
    // only thing the rubric allows to subtract.
    const drag = down ? Math.min(10, 5 + down * 2) : 0;
    return { name, score: clamp(BASELINE + structural + lift - drag) };
  });

  const overall = clamp(categories.reduce((sum, c) => sum + c.score, 0) / categories.length);

  return {
    a: { key: aKey, code: ca.code, name: ca.name },
    b: { key: bKey, code: cb.code, name: cb.name },
    composite,
    compositeName: comp?.name ?? null,
    link,
    spark,
    contacts,
    echo,
    suited,
    categories,
    overall,
    ages: ageWindows(ca.code, cb.code),
    venus: venusTie(ca.code, cb.code),
    hook: hookFor(overall, link, spark.match, ca.name, cb.name),
  };
}

/**
 * The free line. It has to be true, specific to these two, and unsatisfying on
 * its own, because the reading it is selling is the thing that resolves it.
 */
function hookFor(
  overall: number,
  link: Link,
  spark: boolean,
  aName: string,
  bName: string,
): string {
  const pair = aName + ' and ' + bName;
  if (link.direction === 'mutual') {
    return pair + " already sit in each other's charts, which is rarer than it sounds and explains why this one does not let go quietly.";
  }
  if (link.direction !== 'none') {
    const seated = link.direction === 'a-in-b' ? aName : bName;
    const holder = link.direction === 'a-in-b' ? bName : aName;
    return seated + ' occupies a seat in ' + holder + "'s chart, but it does not run both ways, and that imbalance is the whole story here.";
  }
  if (spark) {
    return 'No seat either way, yet the connection still registers: ' + pair + ' score ' + overall + ' on a scale where anything built has to be built on purpose.';
  }
  return pair + ' share no seat and no spark, which is not a verdict against them, it just means nothing here arrives automatically.';
}
