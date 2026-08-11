-- InCORE security hardening
-- Run this migration in Supabase SQL Editor before production release.
-- Scope: remove public/broad RLS policies, enable RLS on agents,
-- enforce company/agent ownership, and make payout/event data read-only
-- for normal users. service_role bypasses RLS as intended.

begin;

-- -----------------------------------------------------------------------------
-- Helper functions
-- -----------------------------------------------------------------------------

create or replace function public.is_ceo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.companies c
    where c.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_company_owner(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.companies c
    where c.id = p_company_id
      and c.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_agent_owner(p_agent_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.agents a
    where a.id = p_agent_id
      and a.user_id = (select auth.uid())
  );
$$;

create or replace function public.can_access_contract(p_contract_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.contracts c
    left join public.companies co on co.id = c.company_id
    left join public.agents a on a.id = c.agent_id
    where c.id = p_contract_id
      and (
        co.user_id = (select auth.uid())
        or a.user_id = (select auth.uid())
      )
  );
$$;

revoke execute on function public.is_ceo() from public, anon;
revoke execute on function public.is_company_owner(uuid) from public, anon;
revoke execute on function public.is_agent_owner(uuid) from public, anon;
revoke execute on function public.can_access_contract(uuid) from public, anon;
grant execute on function public.is_ceo() to authenticated;
grant execute on function public.is_company_owner(uuid) to authenticated;
grant execute on function public.is_agent_owner(uuid) to authenticated;
grant execute on function public.can_access_contract(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- AGENTS
-- -----------------------------------------------------------------------------

alter table public.agents enable row level security;

drop policy if exists "CEOs can read agents in their company" on public.agents;
drop policy if exists "Users can insert their own agent profile" on public.agents;
drop policy if exists "Users can read and update their own agent profile" on public.agents;
drop policy if exists "insert_company_agents" on public.agents;
drop policy if exists "select_company_agents" on public.agents;
drop policy if exists "update_company_agents" on public.agents;
drop policy if exists "Агент видит только себя" on public.agents;

create policy "agents_select_own"
on public.agents
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "agents_select_company_by_ceo"
on public.agents
for select
to authenticated
using (public.is_company_owner(company_id));

create policy "agents_insert_own"
on public.agents
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "agents_update_own"
on public.agents
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "agents_update_company_by_ceo"
on public.agents
for update
to authenticated
using (public.is_company_owner(company_id))
with check (public.is_company_owner(company_id));

-- -----------------------------------------------------------------------------
-- COMPANIES
-- -----------------------------------------------------------------------------

alter table public.companies enable row level security;

drop policy if exists "CEO видит только свою компанию" on public.companies;
drop policy if exists "Users can insert their own company" on public.companies;
drop policy if exists "Users can update their own company" on public.companies;
drop policy if exists "Users can view their own company" on public.companies;
drop policy if exists "insert_own_company" on public.companies;
drop policy if exists "select_own_company" on public.companies;
drop policy if exists "update_own_company" on public.companies;

create policy "companies_select_own"
on public.companies
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "companies_insert_own"
on public.companies
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "companies_update_own"
on public.companies
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- CONTRACTS
-- -----------------------------------------------------------------------------

alter table public.contracts enable row level security;

drop policy if exists "Agents can view their own contracts" on public.contracts;
drop policy if exists "CEOs can create contracts" on public.contracts;
drop policy if exists "CEOs can update their company contracts" on public.contracts;
drop policy if exists "CEOs can view their company contracts" on public.contracts;
drop policy if exists "insert_company_contracts" on public.contracts;
drop policy if exists "select_own_contracts" on public.contracts;
drop policy if exists "update_own_contracts" on public.contracts;
drop policy if exists "Доступ к контрактам" on public.contracts;

create policy "contracts_select_accessible"
on public.contracts
for select
to authenticated
using (public.can_access_contract(id));

create policy "contracts_insert_company"
on public.contracts
for insert
to authenticated
with check (public.is_company_owner(company_id));

create policy "contracts_update_company"
on public.contracts
for update
to authenticated
using (public.is_company_owner(company_id))
with check (public.is_company_owner(company_id));

-- -----------------------------------------------------------------------------
-- CONTRACT PAYOUT STREAMS
-- Normal users may read streams belonging to contracts they can access.
-- Creation/update/deletion is intentionally reserved for trusted server code.
-- -----------------------------------------------------------------------------

alter table public.contract_payout_streams enable row level security;

drop policy if exists "Allow all authenticated users to manage payout streams" on public.contract_payout_streams;

create policy "payout_streams_select_accessible_contracts"
on public.contract_payout_streams
for select
to authenticated
using (public.can_access_contract(contract_id));

-- -----------------------------------------------------------------------------
-- DISPUTES
-- -----------------------------------------------------------------------------

alter table public.disputes enable row level security;

drop policy if exists "Allow all authenticated users to manage disputes" on public.disputes;
drop policy if exists "Authenticated users can insert disputes" on public.disputes;
drop policy if exists "Authenticated users can update disputes" on public.disputes;
drop policy if exists "Authenticated users can view disputes" on public.disputes;

create policy "disputes_select_accessible_contracts"
on public.disputes
for select
to authenticated
using (public.can_access_contract(contract_id));

create policy "disputes_insert_accessible_contracts"
on public.disputes
for insert
to authenticated
with check (public.can_access_contract(contract_id));

create policy "disputes_update_accessible_contracts"
on public.disputes
for update
to authenticated
using (public.can_access_contract(contract_id))
with check (public.can_access_contract(contract_id));

-- -----------------------------------------------------------------------------
-- ESCROW EVENTS
-- Read-only for normal users. Writes must come from trusted backend/service_role.
-- -----------------------------------------------------------------------------

alter table public.escrow_events enable row level security;

drop policy if exists "Allow all authenticated users to manage escrow events" on public.escrow_events;

create policy "escrow_events_select_accessible_contracts"
on public.escrow_events
for select
to authenticated
using (public.can_access_contract(contract_id));

-- -----------------------------------------------------------------------------
-- ORACLE EVENTS
-- Read-only for normal users. Writes must come from trusted backend/service_role.
-- -----------------------------------------------------------------------------

alter table public.oracle_events enable row level security;

drop policy if exists "Allow all authenticated users to manage oracle events" on public.oracle_events;

create policy "oracle_events_select_accessible_contracts"
on public.oracle_events
for select
to authenticated
using (public.can_access_contract(contract_id));

-- -----------------------------------------------------------------------------
-- USER ROLES
-- Keep current role creation path intact for now. The application currently
-- determines role from Auth metadata/company/agent records. Do not grant DELETE.
-- A future migration should move role assignment fully server-side.
-- -----------------------------------------------------------------------------

alter table public.user_roles enable row level security;

commit;

-- Verification queries:
-- select schemaname, tablename, rowsecurity from pg_tables
-- where schemaname = 'public' order by tablename;
--
-- select schemaname, tablename, policyname, roles, cmd
-- from pg_policies
-- where schemaname = 'public'
-- order by tablename, policyname;
