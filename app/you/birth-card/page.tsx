import type { Metadata } from 'next';
import { BirthCardView } from '@/components/BirthCardView';

export const metadata: Metadata = {
  title: 'My birth card',
  robots: { index: false },
};

export default function BirthCardPage() {
  return <BirthCardView />;
}
