-- Candidate skill evidence: append-only evidence records for skills claimed by a candidate.
-- Allow a candidate to claim the employer-created profile after verifying their email.
alter table public.candidates
  add column if not exists candidate_user_id uuid
  references auth.users(id) on delete set null;

create unique index if not exists candidates_candidate_user_id_unique
  on public.candidates (candidate_user_id)
  where candidate_user_id is not null;

drop policy if exists "Candidates can read their claimed profile" on public.candidates;
create policy "Candidates can read their claimed profile"
  on public.candidates
  for select
  to authenticated
  using (candidate_user_id = auth.uid());

drop policy if exists "Candidates can read role for claimed profile" on public.roles;
create policy "Candidates can read role for claimed profile"
  on public.roles
  for select
  to authenticated
  using (
    exists (
      select 1 from public.candidates c
      where c.role_id = roles.id and c.candidate_user_id = auth.uid()
    )
  );

drop policy if exists "Candidates can read role skills for claimed profile" on public.role_skills;
create policy "Candidates can read role skills for claimed profile"
  on public.role_skills
  for select
  to authenticated
  using (
    exists (
      select 1 from public.candidates c
      where c.role_id = role_skills.role_id and c.candidate_user_id = auth.uid()
    )
  );

drop policy if exists "Candidates can read skills for claimed profile" on public.skills;
create policy "Candidates can read skills for claimed profile"
  on public.skills
  for select
  to authenticated
  using (
    exists (
      select 1
        from public.candidates c
        join public.role_skills rs on rs.role_id = c.role_id
       where c.candidate_user_id = auth.uid()
         and rs.skill_id = skills.id
    )
  );

create or replace function public.claim_candidate_profile()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $
declare
  v_email text;
  v_confirmed_at timestamptz;
  v_candidate public.candidates;
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select email, email_confirmed_at
    into v_email, v_confirmed_at
    from auth.users
   where id = auth.uid();

  if v_email is null or v_confirmed_at is null then
    raise exception 'Verify your email before claiming a candidate profile'
      using errcode = '42501';
  end if;

  select count(*) into v_count
    from public.candidates
   where lower(email) = lower(v_email)
     and (candidate_user_id is null or candidate_user_id = auth.uid());

  if v_count = 0 then
    raise exception 'No unclaimed candidate profile matches this verified email'
      using errcode = 'P0002';
  end if;

  if v_count > 1 then
    raise exception 'More than one candidate profile matches this email; support review is required'
      using errcode = '21000';
  end if;

  update public.candidates
     set candidate_user_id = auth.uid()
   where lower(email) = lower(v_email)
     and (candidate_user_id is null or candidate_user_id = auth.uid())
  returning * into v_candidate;

  return jsonb_build_object(
    'id', v_candidate.id,
    'full_name', v_candidate.full_name,
    'email', v_candidate.email,
    'role_id', v_candidate.role_id
  );
end;
$;

revoke all on function public.claim_candidate_profile() from public, anon;
grant execute on function public.claim_candidate_profile() to authenticated;

-- Link a candidate profile to contracts created from that candidate card.
alter table public.contracts
  add column if not exists candidate_id uuid
  references public.candidates(id) on delete set null;

create index if not exists contracts_candidate_id_idx
  on public.contracts (candidate_id)
  where candidate_id is not null;

-- Verification must be performed by a trusted server-side process, never by the browser client.

create table if not exists public.candidate_skill_evidence (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete restrict,
  source_type text not null check (
    source_type in ('resume', 'portfolio', 'work_sample', 'reference', 'certificate', 'other')
  ),
  source_uri text,
  evidence_text text,
  evidence_metadata jsonb not null default '{}'::jsonb,
  verification_status text not null default 'pending' check (
    verification_status in ('pending', 'verified', 'rejected')
  ),
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint candidate_skill_evidence_verification_consistency check (
    (verification_status = 'pending' and verified_at is null and verified_by is null)
    or
    (verification_status in ('verified', 'rejected') and verified_at is not null)
  ),
  constraint candidate_skill_evidence_source_uri_safe check (
    source_uri is null
    or left(lower(source_uri), 7) = 'http://'
    or left(lower(source_uri), 8) = 'https://'
  ),
  constraint candidate_skill_evidence_has_content check (
    nullif(trim(coalesce(evidence_text, '')), '') is not null
    or nullif(trim(coalesce(source_uri, '')), '') is not null
    or evidence_metadata <> '{}'::jsonb
  )
);

create index if not exists candidate_skill_evidence_candidate_idx
  on public.candidate_skill_evidence (candidate_id, created_at desc);

create index if not exists candidate_skill_evidence_skill_status_idx
  on public.candidate_skill_evidence (skill_id, verification_status);

alter table public.candidate_skill_evidence enable row level security;

drop policy if exists "Employers can read evidence for their candidates"
  on public.candidate_skill_evidence;
create policy "Employers can read evidence for their candidates"
  on public.candidate_skill_evidence
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.candidates c
      where c.id = candidate_skill_evidence.candidate_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Candidates can read evidence for their claimed profile"
  on public.candidate_skill_evidence;
create policy "Candidates can read evidence for their claimed profile"
  on public.candidate_skill_evidence
  for select
  to authenticated
  using (
    exists (
      select 1 from public.candidates c
      where c.id = candidate_skill_evidence.candidate_id
        and c.candidate_user_id = auth.uid()
    )
  );

drop policy if exists "Employers can submit pending evidence for their candidates"
  on public.candidate_skill_evidence;
create policy "Employers and candidates can submit pending evidence"
  on public.candidate_skill_evidence
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and verification_status = 'pending'
    and verified_at is null
    and verified_by is null
    and exists (
      select 1
      from public.candidates c
      where c.id = candidate_skill_evidence.candidate_id
        and (c.user_id = auth.uid() or c.candidate_user_id = auth.uid())
    )
  );

grant select, insert on table public.candidate_skill_evidence to authenticated;
grant select, insert, update, delete on table public.candidate_skill_evidence to service_role;

-- Intentionally no browser UPDATE or DELETE policy:
-- evidence is append-only and clients cannot self-award verified status.
-- A trusted server-side verifier using the service role may set verification fields.

-- Authorized reviewers can inspect evidence submitted by any employer.
drop policy if exists "Reviewers can read candidate skill evidence"
  on public.candidate_skill_evidence;
create policy "Reviewers can read candidate skill evidence"
  on public.candidate_skill_evidence
  for select
  to authenticated
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'reviewer')
    or exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and upper(ur.role::text) = 'ADMIN'
    )
  );

-- Evidence status can only be changed through this role-checked function.
-- Browser clients cannot directly update the table.
create or replace function public.review_candidate_skill_evidence(
  p_evidence_id uuid,
  p_status text
)
returns public.candidate_skill_evidence
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_record public.candidate_skill_evidence;
begin
  v_role := coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');

  if auth.uid() is null
     or not (
       v_role in ('admin', 'reviewer')
       or exists (
         select 1 from public.user_roles ur
         where ur.user_id = auth.uid()
           and upper(ur.role::text) = 'ADMIN'
       )
     ) then
    raise exception 'Not authorized to review candidate evidence'
      using errcode = '42501';
  end if;

  if p_status not in ('verified', 'rejected') then
    raise exception 'Review status must be verified or rejected'
      using errcode = '22023';
  end if;

  update public.candidate_skill_evidence
     set verification_status = p_status,
         verified_by = auth.uid(),
         verified_at = now()
   where id = p_evidence_id
   returning * into v_record;

  if not found then
    raise exception 'Candidate evidence not found'
      using errcode = 'P0002';
  end if;

  return v_record;
end;
$$;

revoke all on function public.review_candidate_skill_evidence(uuid, text) from public, anon;
grant execute on function public.review_candidate_skill_evidence(uuid, text) to authenticated;

-- Reviewers need skill labels in the review queue; skill definitions are not candidate PII.
drop policy if exists "Reviewers can read skill names"
  on public.skills;
create policy "Reviewers can read skill names"
  on public.skills
  for select
  to authenticated
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'reviewer')
    or exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and upper(ur.role::text) = 'ADMIN'
    )
  );

-- Prevent evidence from being attached to a skill outside the candidate's role.
create or replace function public.validate_candidate_skill_evidence_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
      from public.candidates c
      join public.role_skills rs on rs.role_id = c.role_id
     where c.id = new.candidate_id
       and rs.skill_id = new.skill_id
  ) then
    raise exception 'Evidence skill must belong to the candidate role'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists candidate_skill_evidence_role_guard
  on public.candidate_skill_evidence;
create trigger candidate_skill_evidence_role_guard
before insert or update of candidate_id, skill_id
on public.candidate_skill_evidence
for each row execute function public.validate_candidate_skill_evidence_role();

revoke all on function public.validate_candidate_skill_evidence_role() from public, anon, authenticated;

-- A contract can only be linked to a candidate owned by the same company.
create or replace function public.validate_contract_candidate_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.candidate_id is not null and not exists (
    select 1
      from public.candidates c
     where c.id = new.candidate_id
       and c.company_id = new.company_id
  ) then
    raise exception 'Contract candidate must belong to the contract company'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists contracts_candidate_owner_guard on public.contracts;
create trigger contracts_candidate_owner_guard
before insert or update of candidate_id, company_id
on public.contracts
for each row execute function public.validate_contract_candidate_owner();

revoke all on function public.validate_contract_candidate_owner() from public, anon, authenticated;

-- Expose only verified work history to the candidate, not full contract financial records.
drop function if exists public.get_candidate_verified_work_history();
create function public.get_candidate_verified_work_history()
returns table (
  contract_title text,
  skill_name text,
  skill_id uuid,
  verified_at timestamptz,
  evidence jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.candidates c
    where c.candidate_user_id = auth.uid()
  ) then
    raise exception 'No claimed candidate profile for this account'
      using errcode = '42501';
  end if;

  return query
  select c.title, s.name, s.id, cov.verified_at, cov.evidence
    from public.candidates candidate
    join public.contracts c on c.candidate_id = candidate.id
    join public.contract_skill_models csm on csm.contract_id = c.id
    join public.skills s on s.id = csm.skill_id
    join public.contract_outcome_verifications cov
      on cov.contract_skill_model_id = csm.id
   where candidate.candidate_user_id = auth.uid()
     and cov.status = 'VERIFIED'
   order by cov.verified_at desc nulls last;
end;
$$;

revoke all on function public.get_candidate_verified_work_history() from public, anon;
grant execute on function public.get_candidate_verified_work_history() to authenticated;
