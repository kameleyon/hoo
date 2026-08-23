'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { useSupabase } from './SupabaseProvider';
import { parseDayKey } from '@/lib/cardology';
import { BY_CODE } from '@/lib/card-index';
import type { DayKey } from '@/lib/types';

const BIRTHDAY_KEY = 'hoo.birthday';
const SAVED_KEY = 'hoo.saved';

interface AccountValue {
  user: User | null;
  /** False until both local storage and the session have been resolved. */
  ready: boolean;
  birthday: DayKey | null;
  setBirthday: (key: DayKey) => void;
  saved: string[];
  isSaved: (code: string) => boolean;
  toggleSaved: (code: string) => void;
  isPro: boolean;
}

const AccountContext = createContext<AccountValue>({
  user: null,
  ready: false,
  birthday: null,
  setBirthday: () => {},
  saved: [],
  isSaved: () => false,
  toggleSaved: () => {},
  isPro: false,
});

/* -- local storage, used signed-out and as a cache signed-in ---------------- */

function readLocal(): { birthday: DayKey | null; saved: string[] } {
  try {
    const birthday = window.localStorage.getItem(BIRTHDAY_KEY);
    const rawSaved: unknown = JSON.parse(window.localStorage.getItem(SAVED_KEY) ?? '[]');
    return {
      birthday: birthday && parseDayKey(birthday) ? birthday : null,
      saved: Array.isArray(rawSaved)
        ? rawSaved.filter((c): c is string => typeof c === 'string' && c in BY_CODE)
        : [],
    };
  } catch {
    return { birthday: null, saved: [] };
  }
}

function writeLocal(birthday: DayKey | null, saved: string[]): void {
  try {
    if (birthday) window.localStorage.setItem(BIRTHDAY_KEY, birthday);
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
  } catch {
    // Private mode or blocked storage. The app still works, it just forgets.
  }
}

/**
 * Everything the app knows about the reader: who they are, their birthday, the
 * cards they kept, and whether they are Pro.
 *
 * Signed out, this is local storage — the deck, the lookup and saving cards all
 * work with no account, which is the point. Signed in, the database is the
 * source of truth and local storage becomes a cache, so the same birthday and
 * the same saved cards follow them to another device.
 */
export function AccountProvider({ children }: { children: ReactNode }) {
  const supabase = useSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [birthday, setBirthdayState] = useState<DayKey | null>(null);
  const [saved, setSavedState] = useState<string[]>([]);
  const [isPro, setIsPro] = useState(false);
  const [ready, setReady] = useState(false);

  // Kept in a ref so the auth listener can read current values without being
  // re-registered every time they change.
  const localRef = useRef<{ birthday: DayKey | null; saved: string[] }>({
    birthday: null,
    saved: [],
  });

  const pull = useCallback(async (signedIn: User) => {
    if (!supabase) return;

    const [{ data: profile }, { data: pro }] = await Promise.all([
      supabase.from('profiles').select('birthday, saved_cards').eq('id', signedIn.id).maybeSingle(),
      supabase.rpc('is_pro'),
    ]);

    const local = localRef.current;
    const remoteBirthday = (profile?.birthday as DayKey | null) ?? null;
    const remoteSaved: string[] = profile?.saved_cards ?? [];

    // First sign-in on a device that has been used signed-out: adopt what is
    // already there rather than throwing it away. The database wins wherever it
    // already has an answer.
    const nextBirthday = remoteBirthday ?? local.birthday;
    const nextSaved = remoteSaved.length > 0 ? remoteSaved : local.saved;

    const needsPush =
      (nextBirthday && nextBirthday !== remoteBirthday) ||
      (nextSaved.length > 0 && remoteSaved.length === 0);

    if (needsPush) {
      await supabase
        .from('profiles')
        .update({ birthday: nextBirthday, saved_cards: nextSaved })
        .eq('id', signedIn.id);
    }

    setBirthdayState(nextBirthday);
    setSavedState(nextSaved);
    setIsPro(pro === true);
    writeLocal(nextBirthday, nextSaved);
  }, [supabase]);

  useEffect(() => {
    const local = readLocal();
    localRef.current = local;
    setBirthdayState(local.birthday);
    setSavedState(local.saved);

    // No Supabase on this deployment: everything still works, it just stays on
    // this device.
    if (!supabase) {
      setReady(true);
      return;
    }

    supabase.auth.getUser().then(async ({ data }) => {
      const signedIn = data.user ?? null;
      setUser(signedIn);
      if (signedIn) await pull(signedIn);
      setReady(true);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const signedIn = session?.user ?? null;
      setUser(signedIn);
      if (signedIn) {
        await pull(signedIn);
      } else {
        setIsPro(false);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, [pull, supabase]);

  const persist = useCallback(
    (nextBirthday: DayKey | null, nextSaved: string[]) => {
      localRef.current = { birthday: nextBirthday, saved: nextSaved };
      writeLocal(nextBirthday, nextSaved);
      if (!user || !supabase) return;
      void supabase
        .from('profiles')
        .update({ birthday: nextBirthday, saved_cards: nextSaved })
        .eq('id', user.id);
    },
    [user, supabase],
  );

  const setBirthday = useCallback(
    (key: DayKey) => {
      if (!parseDayKey(key)) return;
      setBirthdayState(key);
      persist(key, localRef.current.saved);
    },
    [persist],
  );

  const toggleSaved = useCallback(
    (code: string) => {
      if (!(code in BY_CODE)) return;
      setSavedState((previous) => {
        const next = previous.includes(code)
          ? previous.filter((c) => c !== code)
          : [code, ...previous];
        persist(localRef.current.birthday, next);
        return next;
      });
    },
    [persist],
  );

  const value = useMemo<AccountValue>(
    () => ({
      user,
      ready,
      birthday,
      setBirthday,
      saved,
      isSaved: (code) => saved.includes(code),
      toggleSaved,
      isPro,
    }),
    [user, ready, birthday, setBirthday, saved, toggleSaved, isPro],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountValue {
  return useContext(AccountContext);
}
