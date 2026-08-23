'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Keeps an in-progress order page honest without a websocket.
 *
 * The page is server-rendered from Stripe and the asset store, so the cheapest
 * way to show real progress is to render it again. This asks for a refresh on
 * an interval and stops once there is nothing left to wait for, so a finished
 * order costs nothing and a tab left open overnight does not hammer the route.
 */
export function OrderPoller({ active, seconds = 15 }: { active: boolean; seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [active, seconds, router]);

  return null;
}
