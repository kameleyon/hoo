import type { Metadata } from 'next';
import { DeckView } from '@/components/DeckView';

export const metadata: Metadata = {
  title: 'The Deck',
  description: 'Fifty-two cards, one for every birthday.',
};

export default function DeckPage() {
  return <DeckView />;
}
