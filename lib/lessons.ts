export interface LearnModule {
  n: string;
  title: string;
  blurb: string;
  count: string;
  /** Completion, 0–100. Wired to a progress store when lessons ship. */
  pct: number;
}

export const MODULES: LearnModule[] = [
  {
    n: 'Module one',
    title: 'Foundations',
    blurb: 'Where the fifty-two come from and why a date returns a card.',
    count: '10 lessons',
    pct: 20,
  },
  {
    n: 'Module two',
    title: 'The Four Suits',
    blurb: 'Hearts, Clubs, Diamonds, Spades — and what each one is actually about.',
    count: '10 lessons',
    pct: 0,
  },
  {
    n: 'Module three',
    title: 'Reading a Birth Card',
    blurb: 'Rank, suit, planetary position, and the lesson underneath.',
    count: '10 lessons',
    pct: 0,
  },
  {
    n: 'Module four',
    title: 'The Grand Solar Spread',
    blurb: 'The grid every other reading is built on.',
    count: '10 lessons',
    pct: 0,
  },
  {
    n: 'Module five',
    title: 'Planetary Periods',
    blurb: 'Seven fifty-two-day stretches, counted from your birthday.',
    count: '10 lessons',
    pct: 0,
  },
];

export interface LessonGroup {
  label: string;
  items: { n: string; title: string; mins: string }[];
}

const RAW_GROUPS: { label: string; items: [string, string][] }[] = [
  {
    label: 'Foundations',
    items: [
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
    ],
  },
  {
    label: 'The Four Suits',
    items: [
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
    ],
  },
  {
    label: 'Reading a Birth Card',
    items: [
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
    ],
  },
  {
    label: 'The Grand Solar Spread',
    items: [
      ['The grid everything sits on', '6 min'],
      ['Rows are planets, columns are pressure', '7 min'],
      ['Finding your card in the spread', '5 min'],
      ['Neighbours and what they lend you', '6 min'],
      ['The Crown row', '5 min'],
      ['Mercury and the talking cards', '6 min'],
      ['Saturn and the cards that get taught', '6 min'],
      ['Uranus and the cards that break pattern', '6 min'],
      ['Neptune and the cards that imagine', '6 min'],
      ['Reading two spreads side by side', '9 min'],
    ],
  },
  {
    label: 'Planetary Periods',
    items: [
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
    ],
  },
];

/** Numbered 01–50 across the whole path, the way the design lists them. */
export const LESSON_GROUPS: LessonGroup[] = RAW_GROUPS.map((g, gi) => ({
  label: g.label,
  items: g.items.map(([title, mins], i) => ({
    n: String(gi * 10 + i + 1).padStart(2, '0'),
    title,
    mins,
  })),
}));

export const CONTINUE_LESSON = {
  module: 'Foundations',
  title: 'Why the calendar deals backwards',
  position: 'Lesson 2 of 10',
  pct: 20,
};
