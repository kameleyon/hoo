import type { Metadata } from 'next';
import { ProView } from '@/components/ProView';

export const metadata: Metadata = {
  title: 'Pro',
  description: 'A card a day is free, and always will be. Pro is for the rest of the system.',
};

export default function ProPage() {
  return <ProView />;
}
