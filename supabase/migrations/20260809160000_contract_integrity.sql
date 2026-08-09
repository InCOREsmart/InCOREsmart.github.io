-- Contract integrity foundation
-- Safe to apply to existing data: all new columns are nullable/defaulted and no existing rows are rewritten.

create table if not exists public.contract_status_history (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid,
  reason text,
  correlation_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_contract_status_history_contract_created
  on public.contract_status_history(contract_id, created_at desc);

alter table public.contracts
  add column if not exists version integer not null default 1;

alter table public.contract_payout_streams
  add column if not exists version integer not null default 1;

alter table public.oracle_events
  add column if not exists correlation_id text;

alter table public.escrow_events
  add column if not exists correlation_id text;

create unique index if not exists ux_oracle_events_contract_correlation
  on public.oracle_events(contract_id, correlation_id)
  where correlation_id is not null;

create index if not exists idx_escrow_events_contract_correlation
  on public.escrow_events(contract_id, correlation_id)
  where correlation_id is not null;

create table if not exists public.contract_versions (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  version integer not null,
  snapshot jsonb not null,
  changed_by uuid,
  change_reason text,
  created_at timestamptz not null default now(),
  unique(contract_id, version)
);

create index if not exists idx_contract_versions_contract_created
  on public.contract_versions(contract_id, created_at desc);

-- Existing contracts start at version 1. Historical snapshots are intentionally not fabricated.
-- A snapshot is created when a contract is actually edited after this migration is applied.

create or replace function public.record_contract_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    insert into public.contract_status_history (
      contract_id,
      from_status,
      to_status,
      changed_by,
      reason
    ) values (
      new.id,
      old.status,
      new.status,
      auth.uid(),
      null
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_contract_status_history on public.contracts;
create trigger trg_contract_status_history
after update of status on public.contracts
for each row
execute function public.record_contract_status_change();
