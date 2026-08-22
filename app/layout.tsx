import type { Metadata, Viewport } from 'next';
import { Instrument_Serif, Newsreader } from 'next/font/google';
import { AppShell } from '@/components/AppShell';
import { DeckFilterProvider } from '@/components/DeckFilterProvider';
import { ProfileProvider } from '@/components/ProfileProvider';
import { SavedProvider } from '@/components/SavedProvider';
import './globals.css';

const display = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-display',
});

const body = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-body',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://hausoforacle.com'),
  title: {
    default: 'Haus of Oracle',
    template: '%s · Haus of Oracle',
  },
  description:
    'Fifty-two cards, one for every birthday. Read the card of the day, look up any birthday, and study the whole deck.',
  openGraph: {
    siteName: 'Haus of Oracle',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#f5f4f1',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <ProfileProvider>
          <SavedProvider>
            <DeckFilterProvider>
              <AppShell>{children}</AppShell>
            </DeckFilterProvider>
          </SavedProvider>
        </ProfileProvider>
      </body>
    </html>
  );
}
