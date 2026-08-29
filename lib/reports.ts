export type FieldKind = 'date' | 'text' | 'long';

export interface ReportField {
  key: string;
  kind: FieldKind;
  label: string;
}

export interface ReportDefinition {
  id: string;
  cat: string;
  title: string;
  price: string;
  /**
   * What a Pro subscriber pays instead. Absent means the report costs the same
   * for everyone, which is the honest default until a Pro price is decided for
   * it. Never read this in the browser to decide what to charge - it is a
   * display value, and the amount is resolved again on the server.
   */
  proPrice?: string;
  line: string;
  pages: string;
  audio: string;
  turn: string;
  pdfLine: string;
  audioLine: string;
  inside: string;
  fields: ReportField[];
}

const field = (key: string, kind: FieldKind, label: string): ReportField => ({ key, kind, label });

/**
 * What this reader pays for this report.
 *
 * The builder calls it to label the button and the checkout route calls it to
 * set the amount, so the price on screen and the price charged come from the
 * same line of code. Whether someone is Pro is established server-side before
 * the amount is read - the browser is only ever told the answer.
 */
export function priceFor(report: ReportDefinition, pro: boolean): string {
  return pro ? (report.proPrice ?? report.price) : report.price;
}

export const REPORTS: ReportDefinition[] = [
  {
    id: 'love',
    cat: 'Relationships',
    title: 'Love & Compatibility',
    price: '$3.49',
    proPrice: '$2.59',
    line: 'Two cards read against each other — attraction, friction, and the pattern that keeps repeating.',
    pages: '18 pages',
    audio: '14 min narration',
    turn: 'Ready in about two minutes',
    // Length varies with the pairing, so the copy no longer names a number it
    // cannot keep. The real page count and running time are shown on the order
    // once the files exist and are known.
    pdfLine: 'A full PDF, yours to download and keep',
    audioLine: 'A narration you can listen to offline',
    inside:
      'The reading opens with each card on its own, then reads them against each other — where they agree, where one keeps asking the other for something it cannot give, and what the pattern has already cost. It closes with the part you can actually act on.',
    fields: [field('a', 'date', 'Your birthday'), field('b', 'date', 'Their birthday')],
  },
  {
    id: 'biz',
    cat: 'Money & Work',
    title: 'Business Name & Launch',
    price: '$3.49',
    proPrice: '$2.59',
    line: 'A name, a launch date, and whether the two agree with the card running your year.',
    pages: '24 pages',
    audio: '19 min narration',
    turn: 'Ready in about three minutes',
    pdfLine: 'A full PDF, yours to download and keep',
    audioLine: 'A narration you can listen to offline',
    inside:
      'The reading takes the name apart, sets the card behind it against your own, then tests the launch date — whether it lands in a period that opens doors or one that audits them. It closes with two alternative dates and the case for each.',
    fields: [
      field('name', 'text', 'Business name'),
      field('launch', 'date', 'Intended launch date'),
      field('a', 'date', 'Your birthday'),
    ],
  },
  {
    id: 'year',
    cat: 'Forecast',
    title: 'The Year Ahead',
    price: '$24',
    line: 'All seven planetary periods of your next year, with what each one is asking for.',
    pages: '32 pages',
    audio: '26 min narration',
    turn: 'Ready in about three minutes',
    pdfLine: 'A 32-page PDF, yours to download and keep',
    audioLine: 'A 26-minute narration you can listen to offline',
    inside:
      'Each of the seven planetary periods gets its own chapter: the dates, the card sitting in it, what it tends to ask for and what it tends to punish. The last chapter reads the year as one arc, so you can see where to put the heavy work.',
    fields: [field('a', 'date', 'Your birthday')],
  },
  {
    id: 'career',
    cat: 'Money & Work',
    title: 'Career Direction',
    price: '$19',
    line: 'What your card is built to do, and the work it keeps refusing.',
    pages: '16 pages',
    audio: '13 min narration',
    turn: 'Ready in about two minutes',
    pdfLine: 'A 16-page PDF, yours to download and keep',
    audioLine: 'A 13-minute narration you can listen to offline',
    inside:
      'The reading starts with what your card is built to do well, then names the work it keeps avoiding and why the avoidance looks reasonable from the inside. It ends with three directions worth testing this year.',
    fields: [field('a', 'date', 'Your birthday')],
  },
  {
    id: 'family',
    cat: 'Relationships',
    title: 'Family & Household',
    price: '$34',
    line: 'Up to five birthdays read as one chart — who carries what, and where it collides.',
    pages: '38 pages',
    audio: '30 min narration',
    turn: 'Ready in about four minutes',
    pdfLine: 'A 38-page PDF, yours to download and keep',
    audioLine: 'A 30-minute narration you can listen to offline',
    inside:
      'Every birthday is read on its own first, then the household is read as a single chart — who carries the weight, who spends it, and where two cards want the same thing from the same person. It closes with the conversation worth having.',
    fields: [
      field('a', 'date', 'Your birthday'),
      field('b', 'date', 'Second birthday'),
      field('c', 'date', 'Third birthday'),
    ],
  },
  {
    id: 'custom',
    cat: 'Open',
    title: 'One Question',
    price: '$15',
    line: 'Ask the thing you actually want to know. Answered against your card, not in general.',
    pages: '10 pages',
    audio: '8 min narration',
    turn: 'Ready in about two minutes',
    pdfLine: 'A 10-page PDF, yours to download and keep',
    audioLine: 'An 8-minute narration you can listen to offline',
    inside:
      'The reading answers the question you asked, in the terms you asked it, against your card and the period you are standing in right now. Where the honest answer is not yet, it says so and gives you the date.',
    fields: [field('q', 'long', 'Your question'), field('a', 'date', 'Your birthday')],
  },
  {
    id: 'study',
    cat: 'One flat fee',
    title: 'The Full Study',
    price: '$89',
    line: 'Your complete Life Spread — every card, every planetary period, every year read in order.',
    pages: '96 pages',
    audio: '90 min narration',
    turn: 'Ready in about ten minutes',
    pdfLine: 'A 96-page PDF, yours to download and keep',
    audioLine: 'A 90-minute narration you can listen to offline',
    inside:
      'The full study walks your Life Spread from the first card to the last: your birth card, every planetary position it sits in, and every year of periods read in order. It is the reference document — written once, kept for good.',
    fields: [field('a', 'date', 'Your birthday')],
  },
];

/** The Full Study gets its own slot on the On demand page, not a card in the grid. */
export const STUDY_ID = 'study';

export const CATALOGUE = REPORTS.filter((r) => r.id !== STUDY_ID);

export const FULL_STUDY = REPORTS.find((r) => r.id === STUDY_ID)!;

export function reportById(id: string): ReportDefinition | undefined {
  return REPORTS.find((r) => r.id === id);
}

export const FIELD_PLACEHOLDER: Record<string, string> = {
  name: 'Haus of Oracle',
  q: 'Should I take the offer, or wait for the one I want?',
};

export const PRO_ROWS = [
  { sym: '♠', title: 'Your full Life Spread', sub: 'Every planetary period, every year, with its card.' },
  { sym: '♥', title: 'All fifty-two card studies', sub: 'Love, money, health and shadow readings in full.' },
  { sym: '♦', title: 'Saved charts and comparisons', sub: 'Keep the birthdays you read for and set them side by side.' },
  { sym: '♣', title: 'The complete learning path', sub: 'Every lesson, read aloud and yours to keep.' },
];

/** Free trial on Pro, in days. Drives both the button copy and the Stripe
 *  subscription, so the two cannot drift apart. */
export const TRIAL_DAYS = 3;

export const PLANS = [
  { key: 'month', title: 'Monthly', sub: 'Billed every month', price: '$6.99' },
  { key: 'year', title: 'Yearly', sub: 'Two months free', price: '$49' },
];

/** Filenames the delivered document is presented under. */
export function documentNames(def: ReportDefinition) {
  const stem = def.title.replace(/ & /g, ' and ');
  const pageCount = Number(def.pages.replace(/\D/g, ''));
  return {
    pdfName: `${stem}.pdf`,
    pdfSize: `${(pageCount * 0.12).toFixed(1)} MB`,
    mp3Name: `${stem}.mp3`,
    mp3Len: def.audio.replace(' narration', ''),
  };
}
