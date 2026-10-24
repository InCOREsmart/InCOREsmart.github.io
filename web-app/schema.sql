-- InCORE web-app MVP schema. Additive and isolated: no existing tables are altered.
-- Apply once to the intended InCORE Supabase project after review.
create extension if not exists pgcrypto;

create type public.inc_app_role as enum ('candidate','employer');
create type public.inc_app_deal_status as enum (
  'draft','terms_agreed','funding_pending','funded','in_progress',
  'submitted','accepted','disputed','paid','refunded','cancelled'
);

create table public.inc_app_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.inc_app_role not null,
  full_name text not null,
  headline text,
  city text,
  work_format text,
  salary_expectation numeric(12,2) check (salary_expectation is null or salary_expectation >= 0),
  bio text,
  skills text[] not null default '{}',
  visibility text not null default 'private' check (visibility in ('private','discoverable')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inc_app_business_goals (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.inc_app_profiles(id),
  title text not null,
  description text,
  solution_direction text not null default 'hire' check (solution_direction = 'hire'),
  expected_outcome text not null,
  target_period text,
  salary_budget numeric(12,2) check (salary_budget is null or salary_budget >= 0),
  required_skills text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','active','paused','filled','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inc_app_vacancies (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.inc_app_profiles(id),
  goal_id uuid references public.inc_app_business_goals(id) on delete set null,
  title text not null,
  description text not null,
  expected_outcome text not null,
  skills text[] not null default '{}',
  salary_min numeric(12,2) check (salary_min is null or salary_min >= 0),
  salary_max numeric(12,2) check (salary_max is null or salary_max >= 0),
  work_format text,
  status text not null default 'draft' check (status in ('draft','published','paused','closed','moderation')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (salary_min is null or salary_max is null or salary_max >= salary_min)
);

create table public.inc_applications (
  id uuid primary key default gen_random_uuid(),
  vacancy_id uuid not null references public.inc_app_vacancies(id) on delete cascade,
  candidate_id uuid not null references public.inc_app_profiles(id),
  status text not null default 'applied' check (status in ('applied','shortlisted','invited','declined','withdrawn','hired')),
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(vacancy_id,candidate_id)
);

create table public.inc_app_deals (
  id uuid primary key default gen_random_uuid(),
  vacancy_id uuid references public.inc_app_vacancies(id) on delete set null,
  goal_id uuid references public.inc_app_business_goals(id) on delete set null,
  employer_id uuid not null references public.inc_app_profiles(id),
  candidate_id uuid not null references public.inc_app_profiles(id),
  title text not null,
  task_description text not null,
  acceptance_criteria jsonb not null default '[]'::jsonb,
  duration_hours integer not null check (duration_hours between 2 and 48),
  hourly_rate numeric(12,2) not null default 1500 check (hourly_rate > 0),
  platform_fee_rate numeric(5,4) not null default 0.12 check (platform_fee_rate between 0 and 1),
  currency char(3) not null default 'RUB',
  status public.inc_app_deal_status not null default 'draft',
  provider_reference text,
  terms_agreed_at timestamptz,
  funded_at timestamptz,
  started_at timestamptz,
  submitted_at timestamptz,
  accepted_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (employer_id <> candidate_id)
);
create index inc_app_deals_employer_idx on public.inc_app_deals(employer_id, created_at desc);
create index inc_app_deals_candidate_idx on public.inc_app_deals(candidate_id, created_at desc);

create table public.inc_app_deal_events (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.inc_app_deals(id) on delete cascade,
  actor_id uuid references public.inc_app_profiles(id),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.inc_app_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.inc_app_profiles(id),
  target_profile_id uuid references public.inc_app_profiles(id),
  vacancy_id uuid references public.inc_app_vacancies(id),
  deal_id uuid references public.inc_app_deals(id),
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now()
);

alter table public.inc_app_profiles enable row level security;
alter table public.inc_app_business_goals enable row level security;
alter table public.inc_app_vacancies enable row level security;
alter table public.inc_applications enable row level security;
alter table public.inc_app_deals enable row level security;
alter table public.inc_app_deal_events enable row level security;
alter table public.inc_app_reports enable row level security;

-- Profiles: self-access by default; discoverable profiles can be viewed by signed-in users.
create policy "profile self or discoverable read" on public.inc_app_profiles
for select to authenticated using (id = (select auth.uid()) or visibility = 'discoverable');
create policy "profile owner insert" on public.inc_app_profiles
for insert to authenticated with check (id = (select auth.uid()));
create policy "profile owner update" on public.inc_app_profiles
for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "employer manages own goals" on public.inc_app_business_goals
for all to authenticated using (employer_id = (select auth.uid()))
with check (employer_id = (select auth.uid()));

create policy "published vacancies visible; owner sees all own" on public.inc_app_vacancies
for select to authenticated using (status = 'published' or employer_id = (select auth.uid()));
create policy "employer creates own vacancies" on public.inc_app_vacancies
for insert to authenticated with check (employer_id = (select auth.uid()));
create policy "employer updates own vacancies" on public.inc_app_vacancies
for update to authenticated using (employer_id = (select auth.uid()))
with check (employer_id = (select auth.uid()));

create policy "application visible to candidate or vacancy owner" on public.inc_applications
for select to authenticated using (
  candidate_id = (select auth.uid()) or exists (
    select 1 from public.inc_app_vacancies v
    where v.id = vacancy_id and v.employer_id = (select auth.uid())
  )
);
create policy "candidate creates own application" on public.inc_applications
for insert to authenticated with check (candidate_id = (select auth.uid()));
create policy "parties update application" on public.inc_applications
for update to authenticated using (
  candidate_id = (select auth.uid()) or exists (
    select 1 from public.inc_app_vacancies v
    where v.id = vacancy_id and v.employer_id = (select auth.uid())
  )
) with check (
  candidate_id = (select auth.uid()) or exists (
    select 1 from public.inc_app_vacancies v
    where v.id = vacancy_id and v.employer_id = (select auth.uid())
  )
);

create policy "deal parties read" on public.inc_app_deals
for select to authenticated using (
  employer_id = (select auth.uid()) or candidate_id = (select auth.uid())
);
create policy "employer creates own draft deal" on public.inc_app_deals
for insert to authenticated with check (
  employer_id = (select auth.uid()) and status = 'draft'
);
-- Intentionally no client UPDATE policy for deals. State changes/payment actions must be server validated.

create policy "deal parties read events" on public.inc_app_deal_events
for select to authenticated using (exists (
  select 1 from public.inc_app_deals d where d.id = deal_id
  and (d.employer_id = (select auth.uid()) or d.candidate_id = (select auth.uid()))
));
-- No client INSERT policy for events: trusted server functions must write the audit trail.

create policy "reporter creates own report" on public.inc_app_reports
for insert to authenticated with check (reporter_id = (select auth.uid()));
create policy "reporter reads own reports" on public.inc_app_reports
for select to authenticated using (reporter_id = (select auth.uid()));

-- Before production:
-- * add a server-only role/admin authorization model;
-- * implement validated deal state transitions and payment webhooks as Edge Functions;
-- * decide profile field-level visibility (this policy exposes the full discoverable row);
-- * add explicit consent, deletion/retention, notification and dispute workflows;
-- * run Supabase Security Advisor and test policies with separate candidate/employer accounts.
