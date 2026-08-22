# Haus of Oracle

A cardology app: fifty-two cards, one for every birthday. Read the card of the
day, study any of the fifty-two, look up a birthday, follow the learning path,
and order a written reading.

Imported from the Claude Design canvas **HausofOracle cardology app design**
(`HausofOracle App.dc.html`, project `90d8617e-ebf8-431f-bc6f-5ae7a2240847`).

## Running it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build
npm run typecheck
```

## How the design maps onto the app

The canvas holds two artboards — a phone app (`1a`, twelve screens) and a web
app (`2a`, eight views). Its own copy says *"Same content and the same voice,
laid out for width"*, so this is **one responsive app**, not two: a standing
left nav at ≥1024px, a bottom tab bar below it.

The canvas drove its screens from a `screen` string in component state. Those
became real routes, which is what makes the fifty-two card studies linkable and
statically renderable:

| Canvas screen | Route |
| --- | --- |
| `1a Today` / `2a Web today` | `/` |
| `1a Cards` / `2a Web deck` | `/deck` |
| `1a Card detail` / `2a Web card study` | `/deck/[code]` |
| `1a Learn` / `2a Web learn` | `/learn` |
| `1a Reports` / `2a Web on demand` | `/reports` |
| `1a Report builder` / `2a Web report builder` | `/reports/[id]` |
| `1a Report delivered` / `2a Web report delivered` | `/orders/[id]` |
| `1a You` | `/you` |
| `1a My birth card` | `/you/birth-card` |
| `1a Lookup` | `/you/lookup` |
| `1a Yearly spread` | `/you/year` |
| `1a Paywall` / `2a Web pro` | `/pro` |

### Colour and type

Untouched. Every hex and every type size in `app/globals.css` is copied from the
canvas; the palette sits at the top of that file as custom properties. Type is
Instrument Serif for display, Newsreader for body, and the Helvetica system
stack for UI labels — loaded through `next/font` so there is no layout shift.

The canvas computed its styles as inline strings in JavaScript. Here they are
real CSS, which is what buys hover, focus, and the breakpoint. The one value
that genuinely varies per card — the suit colour — rides on a `--suit` custom
property set on the element.

## Layout of the code

```
app/                 routes, one file per screen
components/          the client islands and shared pieces
lib/
  cardology.ts       the system: date -> card, the Joker, planetary periods
  card-index.ts      client-safe card data (~48 KB)
  cards.ts           full card studies, server-only
  reports.ts         the seven report definitions
  lessons.ts         five modules, fifty lessons
  orders.ts          order records and the fulfilment boundary
  data/*.json        generated — see scripts/build-card-data.mjs
scripts/             data generation
```

Card data is split in two on purpose. `card-index.json` carries what every
screen needs to draw a face, run the deck search, and show the Today hero;
`cards.json` carries the long-form study and is imported only by the static
`/deck/[code]` pages, so the prose never reaches the browser bundle. Regenerate
both with `npm run data`.

## Decisions worth knowing about

**Today is per-request, everything else is static.** The card of the day turns
over at midnight *in the reader's timezone*, so `/` renders with the server's
timestamp and `useNow` corrects it on the client. Nothing flashes, and a tab
left open overnight rolls over on its own.

**Your birthday and a birthday you look up are separate.** The canvas shared one
value between the two, which meant reading for a friend quietly replaced your
own birth card. They are now distinct: the lookup opens on your date and then
goes its own way, which is also what makes the "against your card" comparison
mean anything. Your birthday lives in `localStorage` and is set on `/you`.

**Saved cards are real.** The canvas's You screen listed "Saved cards · 4 saved"
with nothing behind it. Rather than print a number that was not true, cards can
be saved from any study and are listed at `/you/saved`.

**Every clickable thing is a button or a link.** The canvas used `onClick` on
`div`s. Nothing about the look changed; keyboard and screen-reader users get an
app that works.

## Not connected yet

- **Payment.** "Generate report" records the order and takes you to it. No money
  moves. Wire a provider into `BuilderView.generate`.
- **Fulfilment.** The PDF and the narration are the actual product and need a
  server that writes and renders them. `orderAssets()` in `lib/orders.ts` is the
  seam: it returns no URLs today, and the delivered view says *Ordered* rather
  than *Ready*, with Download, Play and Email disabled. Return real URLs there
  and the whole screen lights up as designed.
- **Daily notification.** Listed on `/you` as unavailable rather than shown "On".
- **Lesson content.** The fifty lesson titles and durations are real; the
  lessons themselves are not written, so rows are not yet links.
- **`public/oracle-mark.png` is a rebuild.** The copy in the design project came
  back clipped at the read tool's 256 KiB cap — the last 23% of its scanlines
  are missing, which is trailing padding rather than artwork, and
  `scripts/repair-mark.mjs` rebuilt a valid file from the rest. Drop the
  original in over it when convenient.

## Card data

Fifty-two cards from the Seven Reflections Destiny Cards System, plus a
365-entry date map. December 31 falls outside the fifty-two and returns the
Joker; February 29 is dealt a card like any other date.
