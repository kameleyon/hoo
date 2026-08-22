# Haus of Oracle

A cardology app: fifty-two cards, one for every birthday. Read the card of the
day, study any of the fifty-two, look up a birthday, follow the learning path,
and order a written reading.

Imported from the Claude Design canvas **HausofOracle cardology app design**
(`HausofOracle App.dc.html`, project `90d8617e-ebf8-431f-bc6f-5ae7a2240847`).

## Running it

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev                  # http://localhost:3000
npm run build
npm run typecheck
```

Secrets live in `.env.local`, which is git-ignored. Enable the secret-scanning
hook once per clone — this repository is public:

```bash
git config core.hooksPath .githooks
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
  stripe.ts          server Stripe client, prices, dashboard labels
  fulfilment.ts      what happens after the money moves
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

## Payments

Stripe Checkout, hosted. Two flows:

| Flow | Mode | Where |
| --- | --- | --- |
| A written reading ($15–$89) | `payment` | `/reports/[id]` -> `POST /api/checkout` |
| Haus of Oracle Pro, 7-day trial | `subscription` | `/pro` -> `POST /api/checkout` |

Amounts are read from `lib/reports.ts` **on the server** — the browser sends
only the report id and the answers, never a price. Report prices are inline
`price_data`, so they need no catalogue setup at all.

Pro needs real recurring Prices. Create them once per Stripe account with
`npm run stripe:setup`, which is safe to re-run; the app then resolves them by
**lookup key** (`hoo_pro_monthly`, `hoo_pro_yearly`) rather than a pasted id, so
there is no price id in any environment variable and nothing to get wrong per
deployment. The trial length lives in one place, `TRIAL_DAYS` in
`lib/reports.ts`, so the button copy and the Stripe subscription cannot drift.

**A Checkout Session is the order record.** The reader's answers ride along as
session metadata and `/orders/[id]` reads them back out of Stripe, so orders
need no database. `payment_status` on that session is the single source of truth
for whether it was paid.

### Webhook

Destination: `POST /api/stripe/webhook`. Events:

| Event | Why |
| --- | --- |
| `checkout.session.completed` | fulfil, once `payment_status` is not `unpaid` |
| `checkout.session.async_payment_succeeded` | delayed methods settle hours later |
| `checkout.session.async_payment_failed` | the money never arrived |
| `customer.subscription.created` / `.updated` / `.deleted` | Pro access |
| `invoice.paid` / `invoice.payment_failed` | renewals and dunning |

Fulfilment runs here, not on the success page: a reader can pay and lose their
connection before the redirect lands, and delayed payment methods finish with no
browser involved at all. Signatures are verified before anything is read, a
forged or missing signature gets a `400` so Stripe stops retrying, and a handler
that throws gets a `500` so Stripe retries with backoff — which means handlers
must be safe to run twice.

Locally, without deploying:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
node scripts/smoke-stripe.mjs      # checkout + signature checks, no CLI needed
```

## Reference tables

`/reference` carries the three tables everything else is built on, generated
from `cardreftab.md` rather than retyped — a slip in a 49-cell grid or a 52-row
cipher is invisible by eye and wrong in every reading built on it.

```bash
npm run data:reference   # regenerate spread.json and solar.json from the markdown
npm run data:verify      # check the shipped day-card data against the birthday chart
```

`data:verify` compares all 366 dates in the reference chart against
`lib/data/day-card.json`; they currently agree exactly. The spread generator
refuses to write unless all fifty-two cards appear exactly once (49 in the grid
plus 3 Crown), and the solar table unless values run 1–52 with unique letters.

**Known gap:** the letter cipher gives a value per letter and therefore a total
per name, both of which the app shows. How that total *reduces* to a single card
is not stated anywhere in the reference, so nothing here invents one — see
`lib/reference.ts`.

## Database

Supabase (`pljmjyeftdhjvcxppxdi`). Two tables, deliberately separate:

| Table | Owner | Reader may |
| --- | --- | --- |
| `profiles` | the reader | read, insert and update their own row |
| `subscriptions` | Stripe | **read only** — there is no write policy at all |

That split is the point. If billing state were a column on `profiles`, the one
UPDATE policy that lets someone save their birthday would also let them set
`status = 'active'` and take Pro for free. The webhook writes `subscriptions`
with the secret key, which bypasses RLS; nothing else can write it.

`is_pro()` is the single definition of Pro (active or trialing), so it cannot
drift between call sites. A profile row is created by a trigger on signup, and
the database — not just the app — rejects an impossible birthday or a card code
that is not one of the fifty-two.

```bash
npm run db:push            # apply migrations
npm run supabase:smoke     # prove RLS holds, including that a reader cannot self-upgrade
```

## Not connected yet

- **Fulfilment.** The PDF and the narration are the actual product and need a
  server that writes and renders them. `lib/fulfilment.ts` is the seam:
  `fulfilReport()` is called with a paid session and currently only logs, and
  `orderAssets()` returns no URLs — so the delivered view reads *Ordered*, with
  Download, Play and Email visibly inert rather than offering a file that would
  404. It needs a blob store for the output and a job runner for the writing.
- **Pro entitlement.** `setProEntitlement()` has nowhere to write. The app is
  anonymous — there is no account for a subscription to attach to — so accounts
  come before Pro can gate anything.
- **Tax.** `automatic_tax` is off. Turning it on without an active registration
  in the customer's jurisdiction collects nothing while appearing to work; see
  [Collect taxes](https://docs.stripe.com/billing/taxes/collect-taxes.md).
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
