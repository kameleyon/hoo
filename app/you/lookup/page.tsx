import type { Metadata } from 'next';
import { LookupView } from '@/components/LookupView';

export const metadata: Metadata = {
  title: 'Look up a birthday',
  description: "Anyone's date returns one card. The year does not change it.",
};

export default function LookupPage() {
  return <LookupView />;
}
