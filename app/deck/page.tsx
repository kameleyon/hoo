import type { Metadata } from 'next';
import { DeckView } from '@/components/DeckView';
import { LESSONS } from '@/lib/lessons';
import { publishedLessons } from '@/lib/lesson-records';

export const metadata: Metadata = {
  title: 'The Deck',
  description: 'Fifty-two cards, one for every birthday.',
};

export const dynamic = 'force-dynamic';

export default async function DeckPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; suit?: string }>;
}) {
  const { q, suit } = await searchParams;
  const SUITS = ['All', 'Hearts', 'Clubs', 'Diamonds', 'Spades'];
  // Search reaches the written lessons as well as the cards, so the one box in
  // the top bar answers both kinds of question.
  const published = await publishedLessons();
  const lessons = LESSONS.filter((l) => published.has(l.n)).map((l) => ({
    n: l.n,
    title: l.title,
    audioSeconds: published.get(l.n)?.audioSeconds ?? null,
  }));

  return (
    <DeckView
      lessons={lessons}
      initialQ={q ?? ''}
      initialSuit={(SUITS.includes(suit ?? '') ? suit : 'All') as never}
    />
  );
}
