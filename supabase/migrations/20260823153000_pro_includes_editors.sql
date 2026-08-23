-- An editor is Pro.
--
-- Downloads already treated them that way (isEditor || isPro at every call
-- site), but is_pro() did not, so the You screen told the owner of the site
-- they were not subscribed. One definition, used everywhere.
create or replace function public.is_pro()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.subscriptions
    where user_id = (select auth.uid())
      and status in ('active', 'trialing')
  );
$$;
