'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { CardFace } from './CardFace';
import { useDeckFilter } from './DeckFilterProvider';
import { useAccount } from './AccountProvider';
import { useNow } from './useNow';
import { cardForKey, todayLabel } from '@/lib/cardology';

const NAV = [
  { href: '/', label: 'Today', tab: 'TODAY' },
  { href: '/deck', label: 'The Deck', tab: 'CARDS' },
  { href: '/learn', label: 'Learn', tab: 'LEARN' },
  { href: '/reports', label: 'On demand', tab: 'REPORTS' },
] as const;

const YOU_TAB = { href: '/you', label: 'You', tab: 'YOU' } as const;

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const now = useNow();
  const { birthday } = useAccount();
  const { q, setQ } = useDeckFilter();

  const birthCard = birthday ? cardForKey(birthday) : null;

  // Typing filters in place on the deck; from anywhere else, Enter takes you there.
  const goToDeck = () => {
    if (pathname !== '/deck') {
      router.push(q.trim() ? `/deck?q=${encodeURIComponent(q.trim())}` : '/deck');
    }
  };

  return (
    <div className="shell">
      <aside className="sidenav">
        <Link href="/" className="sidenav__brand">
          <Image src="/oracle-mark.png" alt="" width={30} height={30} style={{ mixBlendMode: 'multiply' }} />
          <span className="sidenav__wordmark">
            Haus of
            <br />
            Oracle
          </span>
          <span className="visually-hidden">Haus of Oracle — home</span>
        </Link>

        <nav className="sidenav__links" aria-label="Sections">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="sidenav__link"
              aria-current={isActive(pathname, item.href) ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidenav__spacer" />

        <Link href={birthCard ? '/you/birth-card' : '/you'} className="sidenav__you">
          {birthCard ? (
            <CardFace card={birthCard} variant="sm" />
          ) : (
            <CardFace card={{ short: '?', sym: '', red: false }} variant="sm" />
          )}
          <span style={{ minWidth: 0 }}>
            <span className="sidenav__you-label">Your card</span>
            <span className="sidenav__you-name" style={{ display: 'block' }}>
              {birthCard ? birthCard.name : 'Set your birthday'}
            </span>
          </span>
        </Link>
      </aside>

      <div className="shell__main">
        <header className="topbar">
          <div className="topbar__date">{now ? todayLabel(now) : ' '}</div>
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              goToDeck();
            }}
          >
            <label htmlFor="deck-search" className="visually-hidden">
              Search a card or a keyword
            </label>
            <input
              id="deck-search"
              type="search"
              className="topbar__search"
              placeholder="Search a card or a keyword"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </form>
          <Link href="/pro" className="pill-pro">
            Pro
          </Link>
        </header>

        {children}

        <nav className="tabbar" aria-label="Sections">
          {[...NAV, YOU_TAB].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="tabbar__item"
              aria-current={isActive(pathname, item.href) ? 'page' : undefined}
            >
              <span className="tabbar__dot" />
              <span className="tabbar__label">{item.tab}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

/** The logo-and-Pro strip the phone shows above the Today screen. */
export function MobileHeader() {
  return (
    <div className="mobilehead">
      <Link href="/" className="mobilehead__brand">
        <Image src="/oracle-mark.png" alt="" width={26} height={26} style={{ mixBlendMode: 'multiply' }} />
        <span className="mobilehead__wordmark">Haus of Oracle</span>
      </Link>
      <Link href="/pro" className="pill-pro">
        Pro
      </Link>
    </div>
  );
}
