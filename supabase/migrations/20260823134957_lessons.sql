-- Lesson content and its media.
--
-- The fifty titles live in code (lib/lessons.ts) because they are the shape of
-- the course and change with the app. The *content* lives here because it is
-- written and re-written without a deploy, and because the audio and the PDF
-- have to go somewhere a browser can reach.

-- ---------------------------------------------------------------------------
-- who may edit
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

comment on column public.profiles.is_admin is
  'Set by hand in SQL. Nothing in the app can grant it — see the admin policies.';

-- A reader must never be able to make themselves an editor. The profiles UPDATE
-- policy already restricts them to their own row, so this trigger is what stops
-- that row's is_admin from being flipped by its owner.
create or replace function public.freeze_is_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin then
    raise exception 'is_admin cannot be changed here';
  end if;
  return new;
end;
$$;

create trigger profiles_freeze_is_admin
  before update on public.profiles
  for each row execute function public.freeze_is_admin();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = (select auth.uid())),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- lessons
-- ---------------------------------------------------------------------------

create table public.lessons (
  -- "01" through "50", matching lib/lessons.ts.
  n text primary key check (n ~ '^(0[1-9]|[1-4][0-9]|50)$'),

  -- Markdown. Empty until someone writes it.
  body text not null default '',

  -- Paths inside the lesson-media bucket, not URLs: the bucket is private and
  -- links are signed per request, so a stored URL would go stale.
  audio_path text,
  pdf_path text,
  audio_seconds integer check (audio_seconds is null or audio_seconds > 0),

  -- 'free' is readable by anyone; 'pro' needs a live subscription.
  access text not null default 'free' check (access in ('free', 'pro')),

  -- Null means a draft: written, not yet visible.
  published_at timestamptz,

  updated_at timestamptz not null default now()
);

comment on table public.lessons is
  'Lesson bodies and media. Titles and ordering stay in lib/lessons.ts.';

create trigger lessons_touch_updated_at
  before update on public.lessons
  for each row execute function public.touch_updated_at();

alter table public.lessons enable row level security;

-- Anyone, signed in or not, may read a published lesson. Whether they may read
-- a 'pro' one is decided in the app, where the entitlement lives — keeping the
-- row readable means the page can say "this one needs Pro" instead of 404ing.
create policy "read published lessons"
  on public.lessons for select
  to anon, authenticated
  using (published_at is not null);

create policy "editors read every lesson"
  on public.lessons for select
  to authenticated
  using (public.is_admin());

create policy "editors write lessons"
  on public.lessons for insert
  to authenticated
  with check (public.is_admin());

create policy "editors update lessons"
  on public.lessons for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Every lesson gets a row so the editor has something to open.
insert into public.lessons (n)
select lpad(i::text, 2, '0') from generate_series(1, 50) as i
on conflict (n) do nothing;

-- ---------------------------------------------------------------------------
-- media
-- ---------------------------------------------------------------------------

-- Private: the app hands out short-lived signed URLs after checking access, so
-- a 'pro' lesson's audio cannot be lifted by guessing a public path.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lesson-media',
  'lesson-media',
  false,
  209715200, -- 200 MB, enough for a long narration
  array['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/wav', 'audio/ogg', 'application/pdf']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public = excluded.public;

create policy "editors upload lesson media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'lesson-media' and public.is_admin());

create policy "editors replace lesson media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'lesson-media' and public.is_admin())
  with check (bucket_id = 'lesson-media' and public.is_admin());

create policy "editors remove lesson media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'lesson-media' and public.is_admin());

create policy "editors read lesson media"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'lesson-media' and public.is_admin());
