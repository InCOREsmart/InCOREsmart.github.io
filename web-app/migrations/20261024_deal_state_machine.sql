-- Add server-controlled agreement timestamps and an atomic deal state machine.
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
  select * into d
  from public.inc_app_deals
  where id = p_deal_id
  for update;

  if not found then
    raise exception 'deal_not_found' using errcode = 'P0002';
  end if;

  if p_actor_id is null or p_actor_id not in (d.employer_id, d.candidate_id) then
    raise exception 'not_a_deal_party' using errcode = '42501';
  end if;

  if p_action = 'accept_terms' then
    if d.status not in ('draft', 'terms_agreed') then
      raise exception 'invalid_status_for_terms' using errcode = '22023';
    end if;
    if p_actor_id = d.employer_id then
      d.employer_terms_accepted_at := coalesce(d.employer_terms_accepted_at, now_at);
    else
      d.candidate_terms_accepted_at := coalesce(d.candidate_terms_accepted_at, now_at);
    end if;
    if d.employer_terms_accepted_at is not null and d.candidate_terms_accepted_at is not null then
      d.status := 'terms_agreed';
      d.terms_agreed_at := coalesce(d.terms_agreed_at, now_at);
    end if;
  elsif p_action = 'start' then
    if p_actor_id <> d.employer_id or d.status <> 'terms_agreed' then
      raise exception 'only_employer_can_start_after_terms' using errcode = '42501';
    end if;
    d.status := 'in_progress';
    d.started_at := coalesce(d.started_at, now_at);
  elsif p_action = 'submit' then
    if p_actor_id <> d.candidate_id or d.status <> 'in_progress' then
      raise exception 'only_candidate_can_submit_in_progress_work' using errcode = '42501';
    end if;
    d.status := 'submitted';
    d.submitted_at := now_at;
  elsif p_action = 'accept_result' then
    if p_actor_id <> d.employer_id or d.status <> 'submitted' then
      raise exception 'only_employer_can_accept_submitted_work' using errcode = '42501';
    end if;
    d.status := 'accepted';
    d.accepted_at := now_at;
  elsif p_action = 'dispute' then
    if d.status not in ('in_progress', 'submitted') then
      raise exception 'invalid_status_for_dispute' using errcode = '22023';
    end if;
    d.status := 'disputed';
  elsif p_action = 'cancel' then
    if p_actor_id <> d.employer_id or d.status not in ('draft', 'terms_agreed') then
      raise exception 'only_employer_can_cancel_before_start' using errcode = '42501';
    end if;
    d.status := 'cancelled';
  else
    raise exception 'unknown_deal_action' using errcode = '22023';
  end if;

  d.updated_at := now_at;
  update public.inc_app_deals
  set status = d.status,
      employer_terms_accepted_at = d.employer_terms_accepted_at,
      candidate_terms_accepted_at = d.candidate_terms_accepted_at,
      terms_agreed_at = d.terms_agreed_at,
      started_at = d.started_at,
      submitted_at = d.submitted_at,
      accepted_at = d.accepted_at,
      updated_at = d.updated_at
  where id = d.id
  returning * into d;

  insert into public.inc_app_deal_events(deal_id, actor_id, event_type, payload)
  values (d.id, p_actor_id, p_action, coalesce(p_payload, '{}'::jsonb));

  return d;
end;
$$;

revoke all on function public.inc_app_transition_deal(uuid, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.inc_app_transition_deal(uuid, uuid, text, jsonb) to service_role;
