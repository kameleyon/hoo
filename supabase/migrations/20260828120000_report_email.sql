-- When the reading was emailed, so it is emailed exactly once.
-- Null means never sent; the timestamp is both the flag and the record.
alter table public.report_jobs
  add column if not exists emailed_at timestamptz;
