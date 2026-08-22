-- Haus of Oracle — initial schema.
--
-- Two tables, deliberately separate:
--
--   profiles       what the reader owns and may edit — their birthday and the
--                  cards they have kept. Moves with them between devices.
--   subscriptions  what Stripe owns. The reader may read it and may never
--                  write it, which is why it is not a column on profiles: one
--                  UPDATE policy on a shared table would let anyone set
--                  status = 'active' and hand themselves Pro.

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------

-- Card codes as they appear in lib/data/cards.json: AH, 10S, QD, ...
create or replace function public.is_card_code_array(codes text[])
returns boolean
language sql
immutable
as $$
  select coalesce(bool_and(code ~ '^(A|[2-9]|10|J|Q|K)[HCDS]$'), true)
  from unnest(codes) as code;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,

  -- "MM-DD". The year never changes which card a date returns, so it is not
  -- stored — and not collecting it is one less piece of personal data to hold.
  birthday text
    check (birthday ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'),

  -- Card codes, newest first. Array rather than a join table: there are at
  -- most fifty-two, order is the whole point, and it is always read whole.
  saved_cards text[] not null default '{}'
    check (public.is_card_code_array(saved_cards))
    check (coalesce(array_length(saved_cards, 1), 0) <= 52),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Reader-owned settings that follow them between devices.';

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;

create policy "read own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "create own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "update own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ---------------------------------------------------------------------------
-- subscriptions
-- ---------------------------------------------------------------------------

create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,

  stripe_customer_id text unique,
  stripe_subscription_id text unique,

  status text not null default 'inactive'
    check (status in ('active', 'trialing', 'past_due', 'canceled', 'inactive')),

  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

comment on table public.subscriptions is
  'Stripe-owned billing state. Written only by the webhook, using the secret key.';

create trigger subscriptions_touch_updated_at
  before update on public.subscriptions
  for each row execute function public.touch_updated_at();

alter table public.subscriptions enable row level security;

-- Read-only for the reader. There is deliberately no insert, update or delete
-- policy: the Stripe webhook writes with the secret key, which bypasses RLS.
create policy "read own subscription"
  on public.subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

create index subscriptions_stripe_customer_id_idx
  on public.subscriptions (stripe_customer_id);

-- ---------------------------------------------------------------------------
-- entitlement
-- ---------------------------------------------------------------------------

-- Single place the app asks "is this reader Pro?", so the definition of Pro
-- cannot drift between call sites. A trial counts as Pro.
create or replace function public.is_pro()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = (select auth.uid())
      and status in ('active', 'trialing')
  );
$$;

-- ---------------------------------------------------------------------------
-- give every new account a profile
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
