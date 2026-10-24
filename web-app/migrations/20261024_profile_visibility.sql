-- Privacy-aware profile visibility: a candidate profile is visible to the employer
-- who received that candidate's application, even when the candidate is not in the public directory.
drop policy if exists "profile self or discoverable read" on public.inc_app_profiles;
create policy "profile self, discoverable, or applicant read" on public.inc_app_profiles
for select to authenticated using (
  id = (select auth.uid())
  or visibility = 'discoverable'
  or exists (
    select 1
    from public.inc_applications a
    join public.inc_app_vacancies v on v.id = a.vacancy_id
    where a.candidate_id = inc_app_profiles.id
      and v.employer_id = (select auth.uid())
  )
);

drop policy if exists "employer creates own draft deal" on public.inc_app_deals;
create policy "employer creates own draft deal" on public.inc_app_deals
for insert to authenticated with check (
  employer_id = (select auth.uid())
  and status = 'draft'
  and exists (
    select 1 from public.inc_app_profiles p
    where p.id = (select auth.uid()) and p.role = 'employer'
  )
  and exists (
    select 1 from public.inc_app_profiles p
    where p.id = inc_app_deals.candidate_id and p.role = 'candidate'
      and (
        p.visibility = 'discoverable'
        or exists (
          select 1 from public.inc_applications a
          join public.inc_app_vacancies v on v.id = a.vacancy_id
          where a.candidate_id = inc_app_deals.candidate_id
            and v.employer_id = (select auth.uid())
        )
      )
  )
);
