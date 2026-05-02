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

alter table public.profiles
  add column if not exists subscription_tier subscription_tier,
  add column if not exists subscription_status text not null default 'inactive',
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists discount_percent numeric(5, 2) not null default 0,
  add column if not exists item_limit int not null default 5,
  add column if not exists recipe_suggestion_limit int not null default 5,
  add column if not exists stats_access_level stats_access_level not null default 'basic';

update public.profiles
set subscription_tier = coalesce(subscription_tier, tier, 'free');

update public.profiles
set
  discount_percent = case coalesce(subscription_tier, tier, 'free')
    when 'standard' then 0.10
    when 'pro' then 0.25
    when 'chef' then 0.30
    else 0
  end,
  item_limit = case coalesce(subscription_tier, tier, 'free')
    when 'standard' then 10
    when 'pro' then 50
    when 'chef' then 100
    else 5
  end,
  recipe_suggestion_limit = case coalesce(subscription_tier, tier, 'free')
    when 'chef' then 10
    else 5
  end,
  stats_access_level = case coalesce(subscription_tier, tier, 'free')
    when 'pro' then 'pro'::stats_access_level
    when 'chef' then 'ultra'::stats_access_level
    else 'basic'::stats_access_level
  end;
