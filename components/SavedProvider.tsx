'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { BY_CODE } from '@/lib/card-index';

const STORAGE_KEY = 'hoo.saved';

interface SavedValue {
  saved: string[];
  isSaved: (code: string) => boolean;
  toggle: (code: string) => void;
  ready: boolean;
}

const SavedContext = createContext<SavedValue>({
  saved: [],
  isSaved: () => false,
  toggle: () => {},
  ready: false,
});

/** The cards the reader has kept, by code, newest first. */
export function SavedProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        setSaved(parsed.filter((c): c is string => typeof c === 'string' && c in BY_CODE));
      }
    } catch {
      // Blocked storage — saving still works for this session.
    }
    setReady(true);
  }, []);

  const toggle = useCallback(
    (code: string) => {
      if (!(code in BY_CODE)) return;
      setSaved((prev) => {
        const next = prev.includes(code) ? prev.filter((c) => c !== code) : [code, ...prev];
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // As above.
        }
        return next;
      });
    },
    [],
  );

  const value = useMemo<SavedValue>(
    () => ({ saved, isSaved: (code) => saved.includes(code), toggle, ready }),
    [saved, toggle, ready],
  );

  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
}

export function useSaved(): SavedValue {
  return useContext(SavedContext);
}
