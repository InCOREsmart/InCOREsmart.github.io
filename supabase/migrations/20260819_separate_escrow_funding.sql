-- InCORE: separate financial activation from actual escrow funding.
-- Activating a contract prepares the escrow obligation; this function is the explicit funding event.

create or replace function public.fund_contract_escrow(p_contract_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_status contract_status;
  v_escrow_status escrow_status;
  v_escrow_amount numeric;
begin
  select c.company_id, c.status, c.escrow_status, coalesce(c.escrow_amount, 0)
    into v_company_id, v_status, v_escrow_status, v_escrow_amount
  from public.contracts c
  where c.id = p_contract_id
  for update;

  if v_company_id is null then raise exception 'CONTRACT_NOT_FOUND'; end if;
  if not exists (select 1 from public.companies c where c.id = v_company_id and c.user_id = auth.uid()) then raise exception 'FORBIDDEN'; end if;
  if v_status <> 'ACTIVE' then raise exception 'CONTRACT_NOT_ACTIVE'; end if;
  if v_escrow_status <> 'PENDING' then raise exception 'ESCROW_NOT_PENDING'; end if;
  if v_escrow_amount <= 0 then raise exception 'ESCROW_AMOUNT_INVALID'; end if;

  update public.contracts
  set escrow_status = 'FUNDED', total_locked = v_escrow_amount
  where id = p_contract_id;

  return jsonb_build_object('contract_id', p_contract_id, 'escrow_status', 'FUNDED', 'total_locked', v_escrow_amount);
end;
$$;

revoke all on function public.fund_contract_escrow(uuid) from public;
grant execute on function public.fund_contract_escrow(uuid) to authenticated;
