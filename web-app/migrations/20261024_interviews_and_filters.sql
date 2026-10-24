-- Extend vacancy filters and add direct interview scheduling.
alter table public.inc_app_profiles add column if not exists resume_text text;
alter table public.inc_app_vacancies
  add column if not exists city text,
  add column if not exists employment_type text not null default 'full_time',
  add column if not exists schedule text not null default 'full_time',
  add column if not exists experience_level text not null default 'any';

alter table public.inc_app_vacancies
  drop constraint if exists inc_app_vacancies_employment_type_check,
  add constraint inc_app_vacancies_employment_type_check
    check (employment_type in ('full_time','part_time','project','internship')),
  drop constraint if exists inc_app_vacancies_schedule_check,
  add constraint inc_app_vacancies_schedule_check
    check (schedule in ('full_time','flexible','shift','rotating')),
  drop constraint if exists inc_app_vacancies_experience_level_check,
  add constraint inc_app_vacancies_experience_level_check
    check (experience_level in ('any','none','1_3','3_6','6_plus'));

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
for select to authenticated using (
  employer_id = (select auth.uid()) or candidate_id = (select auth.uid())
);
create policy "employer schedules own vacancy interview" on public.inc_app_interviews
for insert to authenticated with check (
  employer_id = (select auth.uid())
  and exists (select 1 from public.inc_app_profiles p where p.id = (select auth.uid()) and p.role = 'employer')
  and exists (
    select 1 from public.inc_applications a
    join public.inc_app_vacancies v on v.id = a.vacancy_id
    where a.id = application_id and a.candidate_id = inc_app_interviews.candidate_id
      and a.vacancy_id = inc_app_interviews.vacancy_id
      and v.employer_id = (select auth.uid())
  )
);
create policy "employer manages own interviews" on public.inc_app_interviews
for update to authenticated using (employer_id = (select auth.uid()))
with check (employer_id = (select auth.uid()));
create policy "candidate confirms or declines proposed interview" on public.inc_app_interviews
for update to authenticated using (
  candidate_id = (select auth.uid()) and status = 'proposed'
) with check (
  candidate_id = (select auth.uid()) and status in ('confirmed','declined')
);
