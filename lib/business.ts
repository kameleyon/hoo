import 'server-only';
import solar from './data/solar.json';
import cards from './data/card-index.json';
import { cardForKey } from './cardology';
import { readWord } from './reference';
import {
  contactPoints,
  displacedBy,
  linkBetween,
  sharedEcho,
  suitsCompatible,
  type Link,
} from './love';
import type { DayKey } from './types';

/**
 * The Business Name & Launch reading.
 *
 * Two cards carry this report, and neither is a person. The Business ID comes
 * from the name and the launch date, and the Dynamic comes from the launch
 * date and the founder. The founder's own card is an input to the second, not
 * a subject in its own right: a personal reading is a different product.
 *
 * Everything is arithmetic over those cards, so the eight percentages cost
 * nothing to produce and are the same every time.
 */

const CARD = new Map(cards.map((c) => [c.code, c]));
const SOLAR_VALUE = new Map(solar.map((s) => [s.code, s.value]));
const valueOf = (code: string | null | undefined) => (code ? (SOLAR_VALUE.get(code) ?? 0) : 0);

export interface CardFacts {
  code: string;
  name: string;
  value: number;
  archetype: string | null;
  keywords: string[];
  intensity: string | null;
  uplifted: string | null;
  shadow: string | null;
  money: string | null;
  row: string | null;
  column: string | null;
  displaced: { code: string; name: string } | null;
}

/**
 * The planetary seats, in this project's own words.
 *
 * The source's Link table is a copyrighted work, so its wording is not copied
 * here. These are the same planetary meanings the spread already carries,
 * written for a business rather than a romance, which is what section eight
 * needs: a specific reading of the seat rather than generic language.
 */
const SEAT_MEANING: Record<string, string> = {
  Sun: 'The two are the same card. The business is an extension of its founder with no distance between them, which removes friction and removes perspective at the same time.',
  Mercury:
    'A talking seat. Information moves quickly between the two, and the risk is noise rather than silence: plans get discussed into existence and out of it again.',
  Venus:
    'An attraction seat. The pairing draws people, money and goodwill toward it easily, and it is the seat most likely to make a founder overlook a real problem because the thing is pleasant to be around.',
  Mars: 'A drive seat. Energy is not the shortage here; direction is. It pushes hard and argues hard, and it burns fuel whether or not anyone is steering.',
  Jupiter:
    'A giving seat. This is the placement associated with expansion and benefactors, where growth arrives more easily than it is earned, and where overreach costs more than a slow start would have.',
  Saturn:
    'A teaching seat, and an expensive one. It exacts discipline and it audits. What is built here is built slowly and holds, and what is rushed here gets sent back.',
  Uranus:
    'A disruption seat. The pairing does not run to plan: it innovates, and it breaks its own patterns without warning. Good for what has not been done before, punishing for anything that needs to be the same every day.',
  Neptune:
    'An imagination seat, and the one to watch. It sees what could be rather than what is, which makes it excellent at vision and unreliable at accounting.',
  Pluto: 'A transformation seat. Whatever this pairing touches does not stay in its original form, including the business itself.',
  Bacchus: 'An indulgence seat. It rewards appetite, and it does not warn when appetite has become the strategy.',
  Vulcan: 'A forging seat. Slow, effortful making, where the value is in the craft rather than the speed.',
  Moon: 'A habit seat. The pairing repeats what it already knows, which is a strength in operations and a trap in strategy.',
  Earth: 'A grounding seat. It brings the pairing back to what is physically true: cash, stock, the thing that actually has to ship.',
};

function facts(code: string): CardFacts | null {
  const c = CARD.get(code);
  if (!c) return null;
  const contact = contactPoints(code, code);
  const disp = displacedBy(code);
  const dispCard = disp ? CARD.get(disp) : null;
  return {
    code,
    name: c.name,
    value: valueOf(code),
    archetype: c.archName?.trim() || null,
    keywords: c.keywords ?? [],
    intensity: c.intensity?.trim() || null,
    uplifted: c.uplifted?.trim() || null,
    shadow: c.shadow?.trim() || null,
    money: c.lesson?.trim() || null,
    row: contact.a?.row ?? null,
    column: contact.a?.column ?? null,
    displaced: dispCard ? { code: dispCard.code, name: dispCard.name } : null,
  };
}

/**
 * The eight categories, with the words that make a card relevant to each.
 * Overall is the average of the seven above it, so it is not scored directly.
 */
const CATEGORIES: { name: string; words: string[] }[] = [
  {
    name: 'Brand Identity Clarity',
    words: ['identity', 'clarity', 'authentic', 'sincere', 'confident', 'creative', 'express', 'distinct'],
  },
  {
    name: 'Founder-Business Alignment',
    words: ['partnership', 'together', 'loyal', 'commitment', 'union', 'shared', 'aligned', 'devotion'],
  },
  {
    name: 'Financial Foundation',
    words: ['money', 'value', 'abundance', 'wealth', 'prosperity', 'financial', 'provide', 'stability'],
  },
  {
    name: 'Public Reception',
    words: ['social', 'attract', 'magnetic', 'community', 'audience', 'charm', 'warmth', 'popular'],
  },
  {
    name: 'Operational Stability',
    words: ['discipline', 'consistency', 'routine', 'responsibility', 'steady', 'structure', 'order', 'reliable'],
  },
  {
    name: 'Risk of Early Struggle',
    words: ['patience', 'endure', 'lesson', 'mature', 'grounded', 'realistic', 'prepared'],
  },
  {
    name: 'Growth Potential',
    words: ['growth', 'expansion', 'ambition', 'opportunity', 'scale', 'progress', 'innovation', 'reach'],
  },
];

const BASELINE = 60;
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const relevance = (text: string, words: string[]) => {
  const hay = text.toLowerCase();
  return words.filter((w) => hay.includes(w)).length;
};

export interface BusinessReading {
  inputs: { name: string; launch: DayKey; founder: DayKey };
  nameCard: { name: string; value: number; total: number };
  launchCard: { code: string; name: string; value: number };
  founderCard: { code: string; name: string; value: number };
  businessId: CardFacts;
  dynamic: CardFacts;
  link: Link;
  seatMeaning: string | null;
  echo: { code: string; name: string }[];
  contacts: { shared: string[] };
  suited: boolean;
  categories: { name: string; score: number }[];
  overall: number;
  hook: string;
}

export function readBusiness(
  name: string,
  launch: DayKey,
  founder: DayKey,
): BusinessReading | null {
  const word = readWord(name);
  const launchCard = cardForKey(launch);
  const founderCard = cardForKey(founder);
  if (!word.value || !launchCard || !founderCard) return null;

  const launchValue = valueOf(launchCard.code);
  const founderValue = valueOf(founderCard.code);

  // Both composites are the same wrap-at-fifty-two addition the rest of the
  // system uses, so a business is read with the same arithmetic as a couple.
  const wrap = (total: number) => {
    const remainder = total % 52;
    return solar.find((s) => s.value === (remainder === 0 ? 52 : remainder))?.code ?? null;
  };

  const idCode = wrap(word.value + launchValue);
  const dynCode = wrap(launchValue + founderValue);
  if (!idCode || !dynCode) return null;

  const businessId = facts(idCode);
  const dynamic = facts(dynCode);
  if (!businessId || !dynamic) return null;

  const link = linkBetween(idCode, dynCode);
  const contacts = contactPoints(idCode, dynCode);
  const suited = suitsCompatible(idCode, dynCode);
  const echo = sharedEcho(idCode, dynCode)
    .map((code) => CARD.get(code))
    .filter(Boolean)
    .map((c) => ({ code: c!.code, name: c!.name }));

  let structural = 0;
  if (link.direction === 'mutual') structural += 20;
  else if (link.direction !== 'none') structural += 12;
  structural += contacts.shared.length * 8;
  if (suited) structural += 10;
  if (echo.length) structural += 4;

  const categories = CATEGORIES.map(({ name: label, words }) => {
    // Both cards speak to a category, so both are read for it.
    const up =
      relevance(businessId.uplifted ?? '', words) + relevance(dynamic.uplifted ?? '', words);
    const down = relevance(businessId.shadow ?? '', words) + relevance(dynamic.shadow ?? '', words);
    const lift = up ? Math.min(20, 8 + up * 4) : 0;
    const drag = down ? Math.min(10, 4 + down * 2) : 0;
    return { name: label, score: clamp(BASELINE + structural + lift - drag) };
  });

  const overall = clamp(categories.reduce((sum, c) => sum + c.score, 0) / categories.length);
  const seat = link.bSeat ?? link.aSeat;

  return {
    inputs: { name, launch, founder },
    nameCard: { name: word.card?.name ?? 'not available', value: word.value, total: word.total },
    launchCard: { code: launchCard.code, name: launchCard.name, value: launchValue },
    founderCard: { code: founderCard.code, name: founderCard.name, value: founderValue },
    businessId,
    dynamic,
    link,
    seatMeaning: seat ? (SEAT_MEANING[seat] ?? null) : null,
    echo,
    contacts: { shared: contacts.shared },
    suited,
    categories,
    overall,
    hook: hookFor(name, businessId.name, link, overall),
  };
}

function hookFor(business: string, idName: string, link: Link, overall: number): string {
  if (link.direction === 'mutual') {
    return `${business} runs on the ${idName}, and it and you are seated in each other's charts, which is the closest thing to a founder and a business wanting the same thing.`;
  }
  if (link.direction !== 'none') {
    return `${business} runs on the ${idName}, and the connection to you goes one way only, which decides who is carrying whom.`;
  }
  return `${business} runs on the ${idName}, and it holds no seat with you at all, scoring ${overall}: this is a business that will do what it is built to do rather than what you want it to.`;
}
