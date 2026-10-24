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
create policy "profile self, discoverable, or applicant read" on public.inc_app_profiles
for select to authenticated using (
  id = (select auth.uid())
  or visibility = 'discoverable'
  or exists (
    select 1 from public.inc_applications a
    join public.inc_app_vacancies v on v.id = a.vacancy_id
    where a.candidate_id = inc_app_profiles.id
      and v.employer_id = (select auth.uid())
  )
);
create policy "profile owner insert" on public.inc_app_profiles
for insert to authenticated with check (id = (select auth.uid()));
create policy "profile owner update" on public.inc_app_profiles
for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "employer manages own goals" on public.inc_app_business_goals
for all to authenticated using (
  employer_id = (select auth.uid()) and exists (
    select 1 from public.inc_app_profiles p where p.id = (select auth.uid()) and p.role = 'employer'
  )
) with check (
  employer_id = (select auth.uid()) and exists (
    select 1 from public.inc_app_profiles p where p.id = (select auth.uid()) and p.role = 'employer'
  )
);

drop policy if exists "published vacancies visible; owner sees all own" on public.inc_app_vacancies;
create policy "published vacancies or candidate applications visible" on public.inc_app_vacancies
for select to authenticated using (
  status = 'published'
  or employer_id = (select auth.uid())
  or exists (
    select 1 from public.inc_applications a
    where a.vacancy_id = inc_app_vacancies.id and a.candidate_id = (select auth.uid())
  )
);
create policy "employer creates own vacancies" on public.inc_app_vacancies
for insert to authenticated with check (
  employer_id = (select auth.uid()) and exists (
    select 1 from public.inc_app_profiles p where p.id = (select auth.uid()) and p.role = 'employer'
  )
);
create policy "employer updates own vacancies" on public.inc_app_vacancies
for update to authenticated using (
  employer_id = (select auth.uid()) and exists (
    select 1 from public.inc_app_profiles p where p.id = (select auth.uid()) and p.role = 'employer'
  )
) with check (
  employer_id = (select auth.uid()) and exists (
    select 1 from public.inc_app_profiles p where p.id = (select auth.uid()) and p.role = 'employer'
  )
);

create policy "application visible to candidate or vacancy owner" on public.inc_applications
for select to authenticated using (
  candidate_id = (select auth.uid()) or exists (
    select 1 from public.inc_app_vacancies v
    where v.id = vacancy_id and v.employer_id = (select auth.uid())
  )
);
create policy "candidate creates own application" on public.inc_applications
for insert to authenticated with check (
  candidate_id = (select auth.uid()) and exists (
    select 1 from public.inc_app_profiles p where p.id = (select auth.uid()) and p.role = 'candidate'
  )
);
create policy "employer updates own vacancy applications" on public.inc_applications
for update to authenticated using (
  exists (select 1 from public.inc_app_vacancies v
    where v.id = vacancy_id and v.employer_id = (select auth.uid()))
) with check (
  exists (select 1 from public.inc_app_vacancies v
    where v.id = vacancy_id and v.employer_id = (select auth.uid()))
);
create policy "candidate withdraws own application" on public.inc_applications
for update to authenticated using (
  candidate_id = (select auth.uid()) and status = 'applied'
) with check (
  candidate_id = (select auth.uid()) and status = 'withdrawn'
);

create policy "deal parties read" on public.inc_app_deals
for select to authenticated using (
  employer_id = (select auth.uid()) or candidate_id = (select auth.uid())
);
create policy "employer creates own draft deal" on public.inc_app_deals
for insert to authenticated with check (
  employer_id = (select auth.uid())
  and status = 'draft'
  and exists (
    select 1 from public.inc_app_profiles p
    where p.id = (select auth.uid()) and p.role = 'employer'
  )
  and (
    vacancy_id is null
    or exists (
      select 1 from public.inc_app_vacancies v
      where v.id = inc_app_deals.vacancy_id and v.employer_id = (select auth.uid())
    )
  )
  and (
    goal_id is null
    or exists (
      select 1 from public.inc_app_business_goals g
      where g.id = inc_app_deals.goal_id and g.employer_id = (select auth.uid())
    )
  )
  and exists (
    select 1 from public.inc_app_profiles p
    where p.id = inc_app_deals.candidate_id and p.role = 'candidate'
      and (
        p.visibility = 'discoverable'
        or exists (
          select 1 from public.inc_applications a
          join public.inc_app_vacancies v on v.id = a.vacancy_id
          where a.candidate_id = inc_app_deals.candidate_id
            and v.employer_id = (select auth.uid())
            and v.id = inc_app_deals.vacancy_id
        )
      )
  )
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


-- Atomic server-controlled state transitions for paid-work verification.
alter table public.inc_app_deals
  add column if not exists employer_terms_accepted_at timestamptz,
  add column if not exists candidate_terms_accepted_at timestamptz;

create or replace function public.inc_app_transition_deal(
  p_deal_id uuid,
  p_actor_id uuid,
  p_action text,
  p_payload jsonb default '{}'::jsonb
)
returns public.inc_app_deals
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  d public.inc_app_deals%rowtype;
  now_at timestamptz := now();
begin
  select * into d from public.inc_app_deals where id = p_deal_id for update;
  if not found then raise exception 'deal_not_found' using errcode = 'P0002'; end if;
  if p_actor_id is null or p_actor_id not in (d.employer_id, d.candidate_id) then
    raise exception 'not_a_deal_party' using errcode = '42501';
  end if;

  if p_action = 'accept_terms' then
    if d.status not in ('draft', 'terms_agreed') then raise exception 'invalid_status_for_terms' using errcode = '22023'; end if;
    if p_actor_id = d.employer_id then d.employer_terms_accepted_at := coalesce(d.employer_terms_accepted_at, now_at);
    else d.candidate_terms_accepted_at := coalesce(d.candidate_terms_accepted_at, now_at); end if;
    if d.employer_terms_accepted_at is not null and d.candidate_terms_accepted_at is not null then
      d.status := 'terms_agreed'; d.terms_agreed_at := coalesce(d.terms_agreed_at, now_at);
    end if;
  elsif p_action = 'start' then
    if p_actor_id <> d.employer_id or d.status <> 'terms_agreed' then raise exception 'only_employer_can_start_after_terms' using errcode = '42501'; end if;
    d.status := 'in_progress'; d.started_at := coalesce(d.started_at, now_at);
  elsif p_action = 'submit' then
    if p_actor_id <> d.candidate_id or d.status <> 'in_progress' then raise exception 'only_candidate_can_submit_in_progress_work' using errcode = '42501'; end if;
    d.status := 'submitted'; d.submitted_at := now_at;
  elsif p_action = 'accept_result' then
    if p_actor_id <> d.employer_id or d.status <> 'submitted' then raise exception 'only_employer_can_accept_submitted_work' using errcode = '42501'; end if;
    d.status := 'accepted'; d.accepted_at := now_at;
  elsif p_action = 'dispute' then
    if d.status not in ('in_progress', 'submitted') then raise exception 'invalid_status_for_dispute' using errcode = '22023'; end if;
    d.status := 'disputed';
  elsif p_action = 'cancel' then
    if p_actor_id <> d.employer_id or d.status not in ('draft', 'terms_agreed') then raise exception 'only_employer_can_cancel_before_start' using errcode = '42501'; end if;
    d.status := 'cancelled';
  else
    raise exception 'unknown_deal_action' using errcode = '22023';
  end if;

  d.updated_at := now_at;
  update public.inc_app_deals set status=d.status,
    employer_terms_accepted_at=d.employer_terms_accepted_at,
    candidate_terms_accepted_at=d.candidate_terms_accepted_at,
    terms_agreed_at=d.terms_agreed_at, started_at=d.started_at,
    submitted_at=d.submitted_at, accepted_at=d.accepted_at, updated_at=d.updated_at
  where id=d.id returning * into d;

  insert into public.inc_app_deal_events(deal_id, actor_id, event_type, payload)
  values (d.id, p_actor_id, p_action, coalesce(p_payload, '{}'::jsonb));
  return d;
end;
$$;
revoke all on function public.inc_app_transition_deal(uuid, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.inc_app_transition_deal(uuid, uuid, text, jsonb) to service_role;


-- Vacancy search filters, resume text and interview scheduling.
alter table public.inc_app_profiles add column if not exists resume_text text;
alter table public.inc_app_vacancies
  add column if not exists city text,
  add column if not exists employment_type text not null default 'full_time',
  add column if not exists schedule text not null default 'full_time',
  add column if not exists experience_level text not null default 'any';
alter table public.inc_app_vacancies
  drop constraint if exists inc_app_vacancies_employment_type_check,
  add constraint inc_app_vacancies_employment_type_check check (employment_type in ('full_time','part_time','project','internship')),
  drop constraint if exists inc_app_vacancies_schedule_check,
  add constraint inc_app_vacancies_schedule_check check (schedule in ('full_time','flexible','shift','rotating')),
  drop constraint if exists inc_app_vacancies_experience_level_check,
  add constraint inc_app_vacancies_experience_level_check check (experience_level in ('any','none','1_3','3_6','6_plus'));

create type public.inc_app_interview_status as enum ('proposed','confirmed','declined','cancelled');
create table public.inc_app_interviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.inc_applications(id) on delete cascade,
  vacancy_id uuid not null references public.inc_app_vacancies(id) on delete cascade,
  employer_id uuid not null references public.inc_app_profiles(id),
  candidate_id uuid not null references public.inc_app_profiles(id),
  starts_at timestamptz not null,
  mode text not null check (mode in ('online','in_person')),
  location_or_link text,
  notes text,
  status public.inc_app_interview_status not null default 'proposed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (employer_id <> candidate_id)
);
create index inc_app_interviews_candidate_time_idx on public.inc_app_interviews(candidate_id, starts_at);
create index inc_app_interviews_employer_time_idx on public.inc_app_interviews(employer_id, starts_at);
alter table public.inc_app_interviews enable row level security;
create policy "interview parties read" on public.inc_app_interviews
for select to authenticated using (employer_id = (select auth.uid()) or candidate_id = (select auth.uid()));
create policy "employer schedules own vacancy interview" on public.inc_app_interviews
for insert to authenticated with check (
  employer_id = (select auth.uid())
  and exists (select 1 from public.inc_app_profiles p where p.id = (select auth.uid()) and p.role = 'employer')
  and exists (
    select 1 from public.inc_applications a join public.inc_app_vacancies v on v.id = a.vacancy_id
    where a.id = inc_app_interviews.application_id
      and a.candidate_id = inc_app_interviews.candidate_id
      and a.vacancy_id = inc_app_interviews.vacancy_id
      and v.employer_id = (select auth.uid())
  )
);
create policy "employer manages own interviews" on public.inc_app_interviews
for update to authenticated using (employer_id = (select auth.uid()))
with check (employer_id = (select auth.uid()));
create policy "candidate confirms or declines proposed interview" on public.inc_app_interviews
for update to authenticated using (candidate_id = (select auth.uid()) and status = 'proposed')
with check (candidate_id = (select auth.uid()) and status in ('confirmed','declined'));
