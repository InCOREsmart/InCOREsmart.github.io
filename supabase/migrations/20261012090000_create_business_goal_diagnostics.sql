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
  financial_unit text not null default '₽' check (char_length(trim(financial_unit)) between 1 and 12),
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
  status text not null default 'diagnosing' check (status in ('diagnosing', 'comparing', 'solution_selected', 'ready_for_role')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, company_id, user_id)
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

create or replace function public.set_business_goal_diagnostics_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger business_goal_diagnostics_updated_at
before update on public.business_goal_diagnostics
for each row execute function public.set_business_goal_diagnostics_updated_at();

grant select, insert, update, delete on public.business_goal_diagnostics to authenticated;

create table if not exists public.business_goal_alternatives (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.business_goal_diagnostics(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  solution_key text not null check (solution_key in ('develop_team', 'redeploy', 'hire', 'contractor', 'automate', 'redesign_process')),
  one_time_cost numeric not null default 0 check (one_time_cost >= 0),
  monthly_cost numeric not null default 0 check (monthly_cost >= 0),
  expected_monthly_value numeric not null default 0,
  confidence_pct numeric not null default 50 check (confidence_pct between 0 and 100),
  time_to_effect_months integer not null default 0 check (time_to_effect_months between 0 and 60),
  comparison_horizon_months integer not null default 12 check (comparison_horizon_months between 1 and 60),
  risk_reserve numeric not null default 0 check (risk_reserve >= 0),
  expected_benefit numeric generated always as (
    expected_monthly_value
      * greatest(comparison_horizon_months - time_to_effect_months, 0)
      * confidence_pct / 100
  ) stored,
  total_cost numeric generated always as (
    one_time_cost + monthly_cost * comparison_horizon_months + risk_reserve
  ) stored,
  net_value numeric generated always as (
    expected_monthly_value
      * greatest(comparison_horizon_months - time_to_effect_months, 0)
      * confidence_pct / 100
    - one_time_cost - monthly_cost * comparison_horizon_months - risk_reserve
  ) stored,
  roi_pct numeric generated always as (
    case
      when one_time_cost + monthly_cost * comparison_horizon_months + risk_reserve = 0 then null
      else (
        (
          expected_monthly_value
            * greatest(comparison_horizon_months - time_to_effect_months, 0)
            * confidence_pct / 100
          - one_time_cost - monthly_cost * comparison_horizon_months - risk_reserve
        ) / (one_time_cost + monthly_cost * comparison_horizon_months + risk_reserve)
      ) * 100
    end
  ) stored,
  notes text not null default '' check (char_length(notes) <= 3000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (goal_id, solution_key),
  constraint business_goal_alternative_goal_owner foreign key (goal_id, company_id, user_id)
    references public.business_goal_diagnostics(id, company_id, user_id) deferrable initially immediate
);

create index if not exists business_goal_alternatives_goal_idx
  on public.business_goal_alternatives(goal_id, net_value desc);

alter table public.business_goal_alternatives enable row level security;

create policy "business_goal_alternatives_select_own"
  on public.business_goal_alternatives for select to authenticated
  using (exists (
    select 1 from public.business_goal_diagnostics g
    join public.companies c on c.id = g.company_id
    where g.id = business_goal_alternatives.goal_id
      and g.company_id = business_goal_alternatives.company_id
      and c.user_id = (select auth.uid())
  ));

create policy "business_goal_alternatives_insert_own"
  on public.business_goal_alternatives for insert to authenticated
  with check (
    user_id = (select auth.uid()) and exists (
      select 1 from public.business_goal_diagnostics g
      join public.companies c on c.id = g.company_id
      where g.id = business_goal_alternatives.goal_id
        and g.company_id = business_goal_alternatives.company_id
        and g.user_id = (select auth.uid())
        and c.user_id = (select auth.uid())
    )
  );

create policy "business_goal_alternatives_update_own"
  on public.business_goal_alternatives for update to authenticated
  using (exists (
    select 1 from public.business_goal_diagnostics g
    join public.companies c on c.id = g.company_id
    where g.id = business_goal_alternatives.goal_id
      and g.company_id = business_goal_alternatives.company_id
      and c.user_id = (select auth.uid())
  ))
  with check (
    user_id = (select auth.uid()) and exists (
      select 1 from public.business_goal_diagnostics g
      join public.companies c on c.id = g.company_id
      where g.id = business_goal_alternatives.goal_id
        and g.company_id = business_goal_alternatives.company_id
        and g.user_id = (select auth.uid())
        and c.user_id = (select auth.uid())
    )
  );

create policy "business_goal_alternatives_delete_own"
  on public.business_goal_alternatives for delete to authenticated
  using (exists (
    select 1 from public.business_goal_diagnostics g
    join public.companies c on c.id = g.company_id
    where g.id = business_goal_alternatives.goal_id
      and g.company_id = business_goal_alternatives.company_id
      and c.user_id = (select auth.uid())
  ));

grant select, insert, update, delete on public.business_goal_alternatives to authenticated;

create table if not exists public.hh_oauth_states (
  id uuid primary key default gen_random_uuid(),
  state_hash text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists hh_oauth_states_expiry_idx on public.hh_oauth_states(expires_at);

alter table public.hh_oauth_states enable row level security;
revoke all on public.hh_oauth_states from anon, authenticated;
grant all on public.hh_oauth_states to service_role;

create table if not exists public.hh_oauth_connections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'hh',
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  token_type text,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, provider)
);

alter table public.hh_oauth_connections enable row level security;
revoke all on public.hh_oauth_connections from anon, authenticated;
grant all on public.hh_oauth_connections to service_role;
create index if not exists hh_oauth_connections_user_idx on public.hh_oauth_connections(company_id, provider);

create trigger hh_oauth_connections_updated_at
before update on public.hh_oauth_connections
for each row execute function public.set_business_goal_diagnostics_updated_at();
