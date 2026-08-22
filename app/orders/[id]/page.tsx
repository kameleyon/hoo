import type { Metadata } from 'next';
import { DeliveredView } from '@/components/DeliveredView';

export const metadata: Metadata = {
  title: 'Your reading',
  robots: { index: false },
};

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DeliveredView orderId={id} />;
}
