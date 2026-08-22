'use client';

import { useEffect, useState } from 'react';

/**
 * The clock, resolved in the reader's own timezone.
 *
 * Screens that must paint a card on first byte (Today) pass the server's
 * timestamp as `seed`: both renders start from the same value so hydration
 * matches, then the effect corrects it to the browser's local date. Screens
 * where a one-frame delay is invisible pass nothing and get `null` until mount.
 *
 * Re-ticks just after local midnight so a tab left open overnight rolls over.
 */
export function useNow(seed?: string): Date | null {
  const [now, setNow] = useState<Date | null>(() => (seed ? new Date(seed) : null));

  useEffect(() => {
    setNow(new Date());

    let timer: ReturnType<typeof setTimeout>;
    const scheduleRollover = () => {
      const d = new Date();
      const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 5);
      timer = setTimeout(() => {
        setNow(new Date());
        scheduleRollover();
      }, midnight.getTime() - d.getTime());
    };
    scheduleRollover();

    return () => clearTimeout(timer);
  }, []);

  return now;
}
