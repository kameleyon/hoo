-- Room for more than fifty lessons.
--
-- The number is a key, not a count — the course outline grew past fifty when
-- the Grand Solar Spread gained the planets it was missing, and the karma,
-- marriage and money cards were added. Two digits is the bound, which is far
-- more headroom than the outline is likely to need.
alter table public.lessons drop constraint if exists lessons_n_check;
alter table public.lessons
  add constraint lessons_n_check check (n ~ '^(0[1-9]|[1-9][0-9])$');

insert into public.lessons (n)
select lpad(i::text, 2, '0') from generate_series(1, 60) as i
on conflict (n) do nothing;
