'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Keeps an in-progress order page honest without a websocket.
 *
 * The page is server-rendered from Stripe and the asset store, so the cheapest
 * way to show real progress is to render it again.
 *
 * Every refresh costs a Stripe API call, so this is bounded twice over. The
 * interval backs off, and there is a hard cap on refreshes, because the
 * terminating condition is a job completing and a job that never completes
 * would otherwise leave one abandoned tab polling a paid API until the browser
 * closes. Waiting is not the same as waiting usefully: past the cap a human has
 * to intervene, and the page says so rather than spinning.
 */
const FIRST_INTERVAL_MS = 15_000;
const MAX_INTERVAL_MS = 60_000;
const MAX_REFRESHES = 40;

export function OrderPoller({ active }: { active: boolean }) {
  const router = useRouter();
  const [exhausted, setExhausted] = useState(false);
  const count = useRef(0);

  useEffect(() => {
    if (!active || exhausted) return;

    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;

    const tick = () => {
      if (stopped) return;
      if (count.current >= MAX_REFRESHES) {
        setExhausted(true);
        return;
      }
      count.current += 1;
      router.refresh();
      schedule();
    };

    // Doubles up to the ceiling, so a long wait costs a request a minute
    // rather than four.
    const schedule = () => {
      const delay = Math.min(FIRST_INTERVAL_MS * 2 ** Math.floor(count.current / 8), MAX_INTERVAL_MS);
      timer = setTimeout(tick, delay);
    };

    schedule();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [active, exhausted, router]);

  if (!active || !exhausted) return null;

  return (
    <p className="fineprint" style={{ textAlign: 'left', marginTop: 12 }} role="status">
      This page has stopped checking for updates. Reload it to check again.
    </p>
  );
}
