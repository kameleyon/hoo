-- Thirty more articles: money, karma, relationships, family, work.
-- Appended after every written lesson, so no existing number moves.
insert into public.lessons (n)
select lpad(i::text, 2, '0') from generate_series(1, 90) as i
on conflict (n) do nothing;
