-- InCORE MVP: persistent market data for HH vacancies and resumes
create table if not exists public.market_profiles (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('vacancy', 'resume')),
  source_name text not null,
  title text not null,
  region text not null default 'Не указан',
  salary numeric,
  salary_min numeric,
  salary_max numeric,
  text text not null default '',
  skills jsonb not null default '[]'::jsonb,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists market_profiles_source_type_idx on public.market_profiles(source_type);
create index if not exists market_profiles_created_by_idx on public.market_profiles(created_by);
create index if not exists market_profiles_created_at_idx on public.market_profiles(created_at desc);

alter table public.market_profiles enable row level security;

drop policy if exists "market_profiles_select_own" on public.market_profiles;
drop policy if exists "market_profiles_insert_own" on public.market_profiles;
drop policy if exists "market_profiles_delete_own" on public.market_profiles;

create policy "market_profiles_select_own"
on public.market_profiles for select
to authenticated
using (created_by = auth.uid());

create policy "market_profiles_insert_own"
on public.market_profiles for insert
to authenticated
with check (created_by = auth.uid());

create policy "market_profiles_delete_own"
on public.market_profiles for delete
to authenticated
using (created_by = auth.uid());
