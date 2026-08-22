'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { parseDayKey } from '@/lib/cardology';
import type { DayKey } from '@/lib/types';

const STORAGE_KEY = 'hoo.birthday';

interface ProfileValue {
  /** "MM-DD", or null until the reader tells us. The year never matters. */
  birthday: DayKey | null;
  setBirthday: (key: DayKey) => void;
  /** False during the first paint, while localStorage has not been read yet. */
  ready: boolean;
}

const ProfileContext = createContext<ProfileValue>({
  birthday: null,
  setBirthday: () => {},
  ready: false,
});

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [birthday, setStored] = useState<DayKey | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw && parseDayKey(raw)) setStored(raw);
    } catch {
      // Private mode or blocked storage — the app still works, it just forgets.
    }
    setReady(true);
  }, []);

  const setBirthday = useCallback((key: DayKey) => {
    if (!parseDayKey(key)) return;
    setStored(key);
    try {
      window.localStorage.setItem(STORAGE_KEY, key);
    } catch {
      // Same as above: keep the in-memory value, drop the persistence.
    }
  }, []);

  const value = useMemo(() => ({ birthday, setBirthday, ready }), [birthday, setBirthday, ready]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileValue {
  return useContext(ProfileContext);
}
