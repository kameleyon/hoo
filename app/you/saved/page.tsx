import type { Metadata } from 'next';
import { SavedView } from '@/components/SavedView';

export const metadata: Metadata = {
  title: 'Saved cards',
  robots: { index: false },
};

export default function SavedPage() {
  return <SavedView />;
}
