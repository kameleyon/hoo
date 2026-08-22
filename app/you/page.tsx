import type { Metadata } from 'next';
import { YouView } from '@/components/YouView';

export const metadata: Metadata = {
  title: 'You',
  robots: { index: false },
};

export default function YouPage() {
  return <YouView />;
}
