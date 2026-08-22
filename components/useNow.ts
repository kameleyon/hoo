'use client';

import { useEffect, useState } from 'react';

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/**
 * The clock, resolved in the reader's own timezone.
 *
 * Screens that must paint a card on first byte (Today) pass the server's
 * timestamp as `seed`: both renders start from the same value so hydration
 * matches, then the effect corrects it to the browser's local date. Screens
 * where a one-frame delay is invisible pass nothing and get `null` until mount.
 *
 * Rollover is belt and braces. A timer fires just after local midnight, and the
 * date is re-checked whenever the tab is shown or focused — because background
 * timers get throttled, and a laptop asleep at midnight wakes with a timer that
 * is already late. State is only replaced when the *day* actually changed, so
 * focusing the tab does not re-render the page.
 */
export function useNow(seed?: string): Date | null {
  const [now, setNow] = useState<Date | null>(() => (seed ? new Date(seed) : null));

  useEffect(() => {
    // Correct the server's date to the reader's timezone.
    setNow(new Date());

    let timer: ReturnType<typeof setTimeout>;

    const rollOverIfNewDay = () => {
      setNow((previous) => {
        const current = new Date();
        return previous && sameDay(previous, current) ? previous : current;
      });
    };

    const scheduleMidnight = () => {
      const d = new Date();
      const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 5);
      timer = setTimeout(() => {
        rollOverIfNewDay();
        scheduleMidnight();
      }, midnight.getTime() - d.getTime());
    };

    const recheck = () => {
      if (document.visibilityState !== 'visible') return;
      rollOverIfNewDay();
      clearTimeout(timer);
      scheduleMidnight();
    };

    scheduleMidnight();
    document.addEventListener('visibilitychange', recheck);
    window.addEventListener('focus', recheck);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', recheck);
      window.removeEventListener('focus', recheck);
    };
  }, []);

  return now;
}
