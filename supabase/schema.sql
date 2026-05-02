create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'subscription_tier') then
    create type subscription_tier as enum ('free', 'standard', 'pro', 'chef');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'stats_access_level') then
    create type stats_access_level as enum ('basic', 'pro', 'ultra');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  tier subscription_tier not null default 'free',
  subscription_tier subscription_tier not null default 'free',
  subscription_status text not null default 'inactive',
  credits int not null default 0 check (credits >= 0),
  tss_credits int not null default 0 check (tss_credits >= 0),
  stripe_customer_id text,
  stripe_subscription_id text,
  discount_percent numeric(5, 2) not null default 0,
  item_limit int not null default 5 check (item_limit > 0),
  recipe_suggestion_limit int not null default 5 check (recipe_suggestion_limit > 0),
  stats_access_level stats_access_level not null default 'basic',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pantry_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  barcode text not null,
  name text not null,
  kcal int,
  created_at timestamptz not null default now()
);

create table if not exists public.recipes_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  ingredients text[] not null,
  recipe jsonb not null,
  max_calories int,
  allergies text[],
  servings int not null default 1 check (servings > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.stats (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  total_recipes_generated int not null default 0,
  total_pantry_items int not null default 0,
  total_credits_used int not null default 0,
  extra_stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.apply_profile_tier_defaults()
returns trigger
language plpgsql
as $$
declare
  effective_tier subscription_tier;
  tier_changed boolean;
begin
  effective_tier := coalesce(new.subscription_tier, new.tier, 'free');
  new.subscription_tier := effective_tier;
  new.tier := effective_tier;
  tier_changed := tg_op = 'INSERT';

  if tg_op = 'UPDATE' then
    tier_changed := new.subscription_tier is distinct from old.subscription_tier or new.tier is distinct from old.tier;
  end if;

  case effective_tier
    when 'standard' then
      new.discount_percent := 0.10;
      new.item_limit := 10;
      new.recipe_suggestion_limit := 5;
      new.stats_access_level := 'basic';
      if tier_changed then
        new.credits := 250;
        new.tss_credits := 10;
      end if;
    when 'pro' then
      new.discount_percent := 0.25;
      new.item_limit := 50;
      new.recipe_suggestion_limit := 5;
      new.stats_access_level := 'pro';
      if tier_changed then
        new.credits := 3000;
        new.tss_credits := 80;
      end if;
    when 'chef' then
      new.discount_percent := 0.30;
      new.item_limit := 100;
      new.recipe_suggestion_limit := 10;
      new.stats_access_level := 'ultra';
      if tier_changed then
        new.credits := 6500;
        new.tss_credits := 160;
      end if;
    else
      new.discount_percent := 0;
      new.item_limit := 5;
      new.recipe_suggestion_limit := 5;
      new.stats_access_level := 'basic';
      if tier_changed then
        new.credits := 0;
        new.tss_credits := 0;
      end if;
  end case;

  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.stats (user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists set_profiles_defaults on public.profiles;
create trigger set_profiles_defaults
before insert or update on public.profiles
for each row execute function public.apply_profile_tier_defaults();

drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at();

drop trigger if exists update_stats_updated_at on public.stats;
create trigger update_stats_updated_at
before update on public.stats
for each row execute function public.update_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.pantry_items enable row level security;
alter table public.recipes_history enable row level security;
alter table public.stats enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "Service role full access to profiles" on public.profiles;
create policy "Service role full access to profiles" on public.profiles
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Users manage own pantry" on public.pantry_items;
create policy "Users manage own pantry" on public.pantry_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own recipes" on public.recipes_history;
create policy "Users manage own recipes" on public.recipes_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users view own stats" on public.stats;
create policy "Users view own stats" on public.stats
  for select using (auth.uid() = user_id);

drop policy if exists "Service role full access to stats" on public.stats;
create policy "Service role full access to stats" on public.stats
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
