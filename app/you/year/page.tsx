import type { Metadata } from 'next';
import { YearView } from '@/components/YearView';

export const metadata: Metadata = {
  title: 'Your year',
  robots: { index: false },
};

export default function YearPage() {
  return <YearView />;
}
