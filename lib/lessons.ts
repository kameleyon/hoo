export interface Lesson {
  /** "01" through "50". */
  n: string;
  title: string;
  mins: string;
}

/**
 * The lessons, in order.
 *
 * The number is a stable key, not a promise about sequence — the page shows no
 * numbers and sorts written lessons first. That means **new titles must be
 * added after any lesson that already has content**: inserting one earlier
 * shifts every number after it, and the bodies in the database would end up
 * under the wrong titles.
 */
const RAW: [string, string][] = [
  ['Dealt at birth', '4 min'],
  ['Why the calendar deals backwards', '6 min'],
  ['Rank is the what, suit is the where', '5 min'],
  ['Reading without predicting', '7 min'],
  ['When two cards disagree', '6 min'],
  ['The fifty-two and the fifty-two weeks', '5 min'],
  ['What the Joker is doing on December 31', '3 min'],
  ['Face cards are people, not events', '6 min'],
  ['Odd ranks move, even ranks hold', '5 min'],
  ['How to keep notes on a reading', '4 min'],
  ['Hearts: what you want to be close to', '6 min'],
  ['Clubs: what you think about all day', '6 min'],
  ['Diamonds: what you assign value to', '6 min'],
  ['Spades: what you will do the work for', '6 min'],
  ['Reading a suit against its opposite', '7 min'],
  ['Red suits in a black-suit year', '5 min'],
  ['Why Clubs argue and Diamonds negotiate', '5 min'],
  ['Spades and the cost of avoidance', '6 min'],
  ['Hearts without boundaries', '5 min'],
  ['Suits in a family chart', '8 min'],
  ['Finding the card behind a date', '4 min'],
  ['Rank first, then suit, then planet', '6 min'],
  ['The life lesson is not a punishment', '7 min'],
  ['Uplifted and shadow are the same trait', '6 min'],
  ['Intensity versus volatility', '5 min'],
  ['When your card is a face card', '6 min'],
  ['Aces and the problem of starting', '5 min'],
  ['Tens and the problem of stopping', '5 min'],
  ['Reading your own card honestly', '8 min'],
  ['What a birth card cannot tell you', '5 min'],
  ['The grid everything sits on', '6 min'],
  ['Rows are planets, columns are pressure', '7 min'],
  ['Finding your card in the spread', '5 min'],
  ['Neighbours and what they lend you', '6 min'],
  ['The Crown row: Saturn, Jupiter, Mars', '5 min'],
  ['Mercury and the talking cards', '6 min'],
  ['Venus and the cards that attract', '6 min'],
  ['Mars and the cards that push', '6 min'],
  ['Jupiter and the cards that are given to', '6 min'],
  ['Saturn and the cards that get taught', '6 min'],
  ['Uranus and the cards that break pattern', '6 min'],
  ['Neptune and the cards that imagine', '6 min'],
  ['Pluto: the card you are being turned into', '7 min'],
  ['The Moon card and who you answer to', '6 min'],
  ['Reading two spreads side by side', '9 min'],
  ['The Result card: where the change settles', '6 min'],
  ['Positive karma: the cards that owe you', '7 min'],
  ['Challenging karma: the cards you owe', '7 min'],
  ['Your marriage card, and what it asks for', '7 min'],
  ['Your money card, and how it earns', '6 min'],
  ['Fifty-two days, seven times', '5 min'],
  ['Counting from your birthday, not January', '4 min'],
  ['Mercury period: what you say yes to', '6 min'],
  ['Venus period: what you spend on', '6 min'],
  ['Mars period: what you push', '6 min'],
  ['Jupiter period: what expands without effort', '6 min'],
  ['Saturn period: what gets audited', '7 min'],
  ['Uranus period: what stops working', '6 min'],
  ['Neptune period: what you cannot see yet', '6 min'],
  ['Closing the year and reading the next', '7 min'],
];

/**
 * The title to show for a lesson: whatever the database holds, else the course
 * outline. One function so the page, the list, the search and the PDF cannot
 * disagree about what a lesson is called.
 */
export function lessonTitle(n: string, stored?: string | null): string {
  return stored?.trim() || LESSONS.find((l) => l.n === n)?.title || `Lesson ${n}`;
}

export const LESSONS: Lesson[] = RAW.map(([title, mins], i) => ({
  n: String(i + 1).padStart(2, '0'),
  title,
  mins,
}));

const WORDS: Record<number, string> = {
  40: 'Forty', 50: 'Fifty', 60: 'Sixty', 70: 'Seventy', 80: 'Eighty', 90: 'Ninety',
};

/** "Sixty" — so the copy counts itself instead of going stale at fifty. */
export const LESSON_COUNT_WORD = WORDS[LESSONS.length] ?? String(LESSONS.length);

/**
 * Where the reader left off. Wired to a progress store when lessons ship —
 * the position and the bar derive from the list so they cannot disagree with it.
 */
const CONTINUE_INDEX = 2;

export const CONTINUE_LESSON = {
  title: LESSONS[CONTINUE_INDEX - 1].title,
  position: `Lesson ${CONTINUE_INDEX} of ${LESSONS.length}`,
  pct: Math.round((CONTINUE_INDEX / LESSONS.length) * 100),
};
