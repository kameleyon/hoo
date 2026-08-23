-- Paid readings: the job that writes one, and where the files end up.
--
-- Order *state* still comes from Stripe, which knows what was bought and
-- whether it was paid for. What Stripe cannot tell us is whether the reading
-- has been written, so that lives here. One row per Checkout Session, which
-- makes the session id a natural primary key and makes the whole pipeline safe
-- to run twice: Stripe delivers at least once, and redelivers after any
-- non-2xx.

create table if not exists public.report_jobs (
  session_id text primary key,
  report_id text not null,
  -- queued  : paid, nothing started
  -- writing : a worker has claimed it
  -- ready   : markdown, pdf and audio all exist
  -- failed  : gave up after repeated attempts, needs a person
  status text not null default 'queued'
    check (status in ('queued', 'writing', 'ready', 'failed')),
  attempts int not null default 0,
  markdown text,
  pdf_path text,
  audio_path text,
  audio_seconds int,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Finding work to retry: anything not finished, oldest first.
create index if not exists report_jobs_pending
  on public.report_jobs (status, updated_at)
  where status in ('queued', 'writing');

create or replace function public.touch_report_job()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists report_jobs_touch on public.report_jobs;
create trigger report_jobs_touch
  before update on public.report_jobs
  for each row execute function public.touch_report_job();

-- No policies, so nothing reaches this table except the service role. A reader
-- gets their files through a route that checks the session was actually paid,
-- never by querying rows directly: the session id travels in a URL, and a URL
-- is not a secret.
alter table public.report_jobs enable row level security;

-- Private bucket. Delivery is always a short-lived signed link.
insert into storage.buckets (id, name, public)
values ('report-media', 'report-media', false)
on conflict (id) do nothing;
