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
  one_time_cost numeric not null check (one_time_cost >= 0),
  monthly_cost numeric not null check (monthly_cost >= 0),
  expected_monthly_value numeric not null,
  confidence_pct numeric not null check (confidence_pct between 0 and 100),
  time_to_effect_months integer not null check (time_to_effect_months between 0 and 60),
  comparison_horizon_months integer not null check (comparison_horizon_months between 1 and 60),
  risk_reserve numeric not null check (risk_reserve >= 0),
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

create trigger business_goal_alternatives_updated_at
before update on public.business_goal_alternatives
for each row execute function public.set_business_goal_diagnostics_updated_at();

grant select, insert, update, delete on public.business_goal_alternatives to authenticated;

create table if not exists public.business_goal_role_links (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null,
  role_id uuid not null references public.roles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (goal_id, role_id),
  constraint business_goal_role_link_goal_owner foreign key (goal_id, company_id, user_id)
    references public.business_goal_diagnostics(id, company_id, user_id) on delete cascade
);

create or replace function public.enforce_business_goal_diagnosis_transition()
returns trigger
language plpgsql
set search_path = public
as $function$
declare
  v_alternative_count integer;
  v_horizon_count integer;
begin
  if tg_op = 'INSERT' then
    if new.chosen_solution is not null or new.status <> 'diagnosing' then
      raise exception 'New business goal diagnostics must start in diagnosing status without a selected solution';
    end if;
    return new;
  end if;

  if new.chosen_solution is not null then
    select count(*), count(distinct comparison_horizon_months)
      into v_alternative_count, v_horizon_count
    from public.business_goal_alternatives
    where goal_id = new.id;

    if v_alternative_count <> 6 or v_horizon_count <> 1 then
      raise exception 'Save all six alternatives with one shared comparison horizon before choosing a solution';
    end if;

    if new.chosen_solution = 'hire' and coalesce(new.capacity_gap, 0) <= 0 then
      raise exception 'External hire requires a measured positive capacity gap';
    end if;

    if new.chosen_solution = 'hire' and new.status <> 'ready_for_role' then
      raise exception 'External hire selection must use ready_for_role status';
    end if;

    if new.chosen_solution <> 'hire' and new.status <> 'solution_selected' then
      raise exception 'Non-hire solution must use solution_selected status';
    end if;
  elsif new.status in ('ready_for_role', 'solution_selected') then
    raise exception 'A solution must be selected after the economic comparison';
  end if;

  return new;
end;
$function$;

create trigger business_goal_diagnosis_insert_guard
before insert on public.business_goal_diagnostics
for each row execute function public.enforce_business_goal_diagnosis_transition();

create trigger business_goal_diagnosis_transition_guard
before update of chosen_solution, status on public.business_goal_diagnostics
for each row execute function public.enforce_business_goal_diagnosis_transition();

revoke all on function public.enforce_business_goal_diagnosis_transition() from public, anon, authenticated;

create or replace function public.reset_business_goal_solution_on_alternative_change()
returns trigger
language plpgsql
set search_path = public
as $function$
declare
  v_goal_id uuid;
begin
  if tg_op = 'UPDATE' and (
    old.goal_id is distinct from new.goal_id
    or old.company_id is distinct from new.company_id
    or old.user_id is distinct from new.user_id
    or old.solution_key is distinct from new.solution_key
  ) then
    raise exception 'Alternative identity fields cannot be changed';
  end if;

  v_goal_id := case when tg_op = 'DELETE' then old.goal_id else new.goal_id end;

  delete from public.business_goal_role_links where goal_id = v_goal_id;

  update public.business_goal_diagnostics
  set chosen_solution = null, status = 'diagnosing'
  where id = v_goal_id and chosen_solution is not null;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$function$;

create trigger business_goal_alternative_change_resets_solution
before insert or update or delete on public.business_goal_alternatives
for each row execute function public.reset_business_goal_solution_on_alternative_change();

revoke all on function public.reset_business_goal_solution_on_alternative_change() from public, anon, authenticated;

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




create index if not exists business_goal_role_links_company_created_idx
  on public.business_goal_role_links(company_id, created_at desc);

alter table public.business_goal_role_links enable row level security;

create policy "business_goal_role_links_select_own"
  on public.business_goal_role_links for select to authenticated
  using (exists (
    select 1 from public.companies c
    where c.id = business_goal_role_links.company_id
      and c.user_id = (select auth.uid())
  ));

create policy "business_goal_role_links_insert_own_hire_goal"
  on public.business_goal_role_links for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.companies c
      where c.id = business_goal_role_links.company_id
        and c.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.business_goal_diagnostics g
      where g.id = business_goal_role_links.goal_id
        and g.company_id = business_goal_role_links.company_id
        and g.user_id = (select auth.uid())
        and g.chosen_solution = 'hire'
        and g.status = 'ready_for_role'
    )
    and exists (
      select 1 from public.roles r
      where r.id = business_goal_role_links.role_id
        and r.company_id = business_goal_role_links.company_id
    )
  );

create policy "business_goal_role_links_delete_own"
  on public.business_goal_role_links for delete to authenticated
  using (exists (
    select 1 from public.companies c
    where c.id = business_goal_role_links.company_id
      and c.user_id = (select auth.uid())
  ));

grant select, insert, delete on public.business_goal_role_links to authenticated;

create or replace function public.save_role_decomposition_for_goal(
  p_goal_id uuid,
  p_name text,
  p_description text,
  p_industry text,
  p_category text,
  p_region text,
  p_source text,
  p_skills jsonb,
  p_relations jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_company_id uuid;
  v_role_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select c.id into v_company_id
  from public.companies c
  where c.user_id = auth.uid()
  limit 1;

  if v_company_id is null then
    raise exception 'Company not found';
  end if;

  if not exists (
    select 1
    from public.business_goal_diagnostics g
    where g.id = p_goal_id
      and g.company_id = v_company_id
      and g.user_id = auth.uid()
      and g.chosen_solution = 'hire'
      and g.status = 'ready_for_role'
  ) then
    raise exception 'External hire must be selected in an owned business goal diagnosis first';
  end if;

  v_role_id := public.save_role_decomposition(
    p_name, p_description, p_industry, p_category, p_region, p_source, p_skills, p_relations
  );

  if not exists (
    select 1 from public.roles r
    where r.id = v_role_id and r.company_id = v_company_id
  ) then
    raise exception 'Saved role does not belong to the authenticated company';
  end if;

  insert into public.business_goal_role_links(goal_id, role_id, company_id, user_id)
  values (p_goal_id, v_role_id, v_company_id, auth.uid());

  return v_role_id;
end;
$function$;

revoke all on function public.save_role_decomposition_for_goal(uuid, text, text, text, text, text, text, jsonb, jsonb) from public, anon;
grant execute on function public.save_role_decomposition_for_goal(uuid, text, text, text, text, text, text, jsonb, jsonb) to authenticated;

drop policy if exists "CEO inserts own roles" on public.roles;

revoke all on function public.save_role_decomposition(text, text, text, text, text, text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.save_role_decomposition(text, text, text, text, text, text, jsonb, jsonb) to service_role;
