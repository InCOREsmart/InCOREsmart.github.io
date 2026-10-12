create table if not exists public.business_goal_diagnostics (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_title text not null check (char_length(trim(goal_title)) between 1 and 240),
  business_outcome text not null check (char_length(trim(business_outcome)) between 1 and 4000),
  metric_name text not null check (char_length(trim(metric_name)) between 1 and 120),
  baseline_value numeric not null check (baseline_value >= 0),
  target_value numeric not null check (target_value >= 0),
  unit text not null check (char_length(trim(unit)) between 1 and 40),
  target_date date,
  process_description text not null check (char_length(trim(process_description)) between 1 and 5000),
  constraint_description text not null check (char_length(trim(constraint_description)) between 1 and 5000),
  current_capacity numeric check (current_capacity is null or current_capacity >= 0),
  required_capacity numeric check (required_capacity is null or required_capacity >= 0),
  capacity_gap numeric generated always as (
    case
      when current_capacity is null or required_capacity is null then null
      else greatest(required_capacity - current_capacity, 0)
    end
  ) stored,
  chosen_solution text check (chosen_solution is null or chosen_solution in ('develop_team', 'redeploy', 'hire', 'contractor', 'automate', 'redesign_process')),
  status text not null default 'diagnosing' check (status in ('diagnosing', 'solution_selected', 'ready_for_role')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_goal_diagnostics_company_created_idx
  on public.business_goal_diagnostics(company_id, created_at desc);

alter table public.business_goal_diagnostics enable row level security;

create policy "business_goal_diagnostics_select_own"
  on public.business_goal_diagnostics for select to authenticated
  using (exists (
    select 1 from public.companies c
    where c.id = business_goal_diagnostics.company_id and c.user_id = (select auth.uid())
  ));

create policy "business_goal_diagnostics_insert_own"
  on public.business_goal_diagnostics for insert to authenticated
  with check (
    user_id = (select auth.uid()) and exists (
      select 1 from public.companies c
      where c.id = business_goal_diagnostics.company_id and c.user_id = (select auth.uid())
    )
  );

create policy "business_goal_diagnostics_update_own"
  on public.business_goal_diagnostics for update to authenticated
  using (exists (
    select 1 from public.companies c
    where c.id = business_goal_diagnostics.company_id and c.user_id = (select auth.uid())
  ))
  with check (
    user_id = (select auth.uid()) and exists (
      select 1 from public.companies c
      where c.id = business_goal_diagnostics.company_id and c.user_id = (select auth.uid())
    )
  );

create policy "business_goal_diagnostics_delete_own"
  on public.business_goal_diagnostics for delete to authenticated
  using (exists (
    select 1 from public.companies c
    where c.id = business_goal_diagnostics.company_id and c.user_id = (select auth.uid())
  ));

grant select, insert, update, delete on public.business_goal_diagnostics to authenticated;
