-- A lesson can carry its own title.
--
-- The fifty titles live in lib/lessons.ts because they are the shape of the
-- course. But an automation posting a finished article has its own headline,
-- and it cannot edit code — so the database may override, and null means
-- "use the one in the course outline".
alter table public.lessons
  add column if not exists title text check (title is null or length(btrim(title)) between 1 and 120);

comment on column public.lessons.title is
  'Overrides the title in lib/lessons.ts. Null means use the course outline.';
