-- The freeze must stop a *reader* editing their own is_admin, not stop the
-- secret key from granting it. A service-role request has no auth.uid(), and
-- neither does direct SQL, so that is the distinction to draw.
create or replace function public.freeze_is_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin
     and (select auth.uid()) is not null then
    raise exception 'is_admin cannot be changed from the app';
  end if;
  return new;
end;
$$;
