-- Lesson 01 — "Dealt at birth". Content, not schema, so this is a seed rather
-- than a migration: re-running it overwrites the body with whatever is here.
--
-- Body format is deliberately not markdown. A line starting with "## " is a
-- section heading; blank lines separate paragraphs; everything else is prose.
-- Nothing is parsed as HTML, so nothing written here can inject any.

update public.lessons
set
  body = $body$
Every date in the year returns one card. Not a card that suits you, not a card
someone chose for you — the one that date has always returned and always will.
Find the day you were born on the chart and there it is.

The year is not part of the calculation. Someone born on 12 July 1961 and
someone born on 12 July 2004 are dealt the same card. That surprises people who
expect the system to work like astrology, where the year moves everything. It
does not. The deck runs on the date alone.

## What the chart is doing

Fifty-two cards, fifty-two weeks, and a calendar that runs backwards through the
deck. Start at the King of Spades on 1 January and walk down: the ranks descend,
the suits turn over, and by 31 December you have used the whole deck exactly
once. That is the entire mechanism. It is arithmetic, not augury.

Two dates sit outside the pattern and are worth knowing before anyone asks you
about them.

29 February is dealt the 9 of Clubs. It is a real date on the chart, whatever
you may have read elsewhere — the leap day is not homeless.

31 December is the Joker. There is no fifty-third card, so the last day of the
year belongs to none of them. If you were born on it, read the days on either
side and treat the Joker as what it is: a card that refuses a house.

## What it is not

Your birth card is not a verdict. It does not say what will happen to you, and
it is not a personality test with fifty-two outcomes. It describes a pattern —
what you reach for, what you avoid, what you will do the work for — and patterns
can be read well or badly by the person living inside them.

The whole of the rest of this course is learning to read one honestly. That
starts with knowing that the card was never a choice. It was dealt.

## Before the next lesson

Look up your own date, and one other — someone you know well enough to argue
with. Read both cards. Notice which one you find easier to be fair about.
$body$,
  access = 'free',
  published_at = coalesce(published_at, now())
where n = '01';
