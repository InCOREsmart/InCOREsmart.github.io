-- Candidate skill evidence: append-only evidence records for skills claimed by a candidate.
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

drop policy if exists "Employers can submit pending evidence for their candidates"
  on public.candidate_skill_evidence;
create policy "Employers can submit pending evidence for their candidates"
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
        and c.user_id = auth.uid()
    )
  );

grant select, insert on table public.candidate_skill_evidence to authenticated;
grant select, insert, update, delete on table public.candidate_skill_evidence to service_role;

-- Intentionally no browser UPDATE or DELETE policy:
-- evidence is append-only and clients cannot self-award verified status.
-- A trusted server-side verifier using the service role may set verification fields.
