# Drop source files here

`.csv`, `.txt`, `.md`, `.json` — whatever you have. Nothing in this folder is
read by the app directly. A generator turns each file into indexed JSON one
level up in `lib/data/`, and the app imports that.

That indirection is the point:

- **It ships.** Generated JSON is imported, so it is always in the bundle.
  A raw file is only included if some code reads it by a literal path — build
  the path from a variable and it works locally and 404s in production.
- **It is checked.** The generators refuse to write when the data is
  incomplete: the card database must have all fifty-two, the spread must place
  each of them exactly once. A bad row fails the build instead of a reading.
- **It is indexed.** A reading sends the AI only the rows it needs — the two
  cards in a compatibility report, not the whole table. Prompts are billed by
  the token, so this is a cost decision as much as a quality one.

## What already works this way

| Source | Generated | Script |
| --- | --- | --- |
| `.design-src/cardData.js` | `cards.json`, `card-index.json`, `day-card.json`, `keywords.json` | `npm run data` |
| `cardreftab.md` | `spread.json`, `solar.json` | `npm run data:reference` |

## When you add a file

Say what the columns mean and how a row is found — by card code (`AH`, `10S`),
by suit, by a pair of cards, by date, or none of those because it is prose.
That decides how it gets indexed, and it cannot be guessed reliably from the
header row alone.

Keep the original here even after it is converted. It is the source of record,
and the JSON beside it is disposable — every generated file can be rebuilt from
this folder.
