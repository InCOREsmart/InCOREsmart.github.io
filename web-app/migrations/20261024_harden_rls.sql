-- Tighten role-based RLS for the InCORE web app MVP.
drop policy if exists "employer manages own goals" on public.inc_app_business_goals;
create policy "employer manages own goals" on public.inc_app_business_goals
for all to authenticated using (
  employer_id = (select auth.uid()) and exists (
    select 1 from public.inc_app_profiles p where p.id = (select auth.uid()) and p.role = 'employer'
  )
) with check (
  employer_id = (select auth.uid()) and exists (
    select 1 from public.inc_app_profiles p where p.id = (select auth.uid()) and p.role = 'employer'
  )
);

drop policy if exists "employer creates own vacancies" on public.inc_app_vacancies;
create policy "employer creates own vacancies" on public.inc_app_vacancies
for insert to authenticated with check (
  employer_id = (select auth.uid()) and exists (
    select 1 from public.inc_app_profiles p where p.id = (select auth.uid()) and p.role = 'employer'
  )
);

drop policy if exists "employer updates own vacancies" on public.inc_app_vacancies;
create policy "employer updates own vacancies" on public.inc_app_vacancies
for update to authenticated using (
  employer_id = (select auth.uid()) and exists (
    select 1 from public.inc_app_profiles p where p.id = (select auth.uid()) and p.role = 'employer'
  )
) with check (
  employer_id = (select auth.uid()) and exists (
    select 1 from public.inc_app_profiles p where p.id = (select auth.uid()) and p.role = 'employer'
  )
);

drop policy if exists "candidate creates own application" on public.inc_applications;
create policy "candidate creates own application" on public.inc_applications
for insert to authenticated with check (
  candidate_id = (select auth.uid()) and exists (
    select 1 from public.inc_app_profiles p where p.id = (select auth.uid()) and p.role = 'candidate'
  )
);

drop policy if exists "parties update application" on public.inc_applications;
create policy "employer updates own vacancy applications" on public.inc_applications
for update to authenticated using (
  exists (select 1 from public.inc_app_vacancies v
    where v.id = vacancy_id and v.employer_id = (select auth.uid()))
) with check (
  exists (select 1 from public.inc_app_vacancies v
    where v.id = vacancy_id and v.employer_id = (select auth.uid()))
);
create policy "candidate withdraws own application" on public.inc_applications
for update to authenticated using (
  candidate_id = (select auth.uid()) and status = 'applied'
) with check (
  candidate_id = (select auth.uid()) and status = 'withdrawn'
);

drop policy if exists "employer creates own draft deal" on public.inc_app_deals;
create policy "employer creates own draft deal" on public.inc_app_deals
for insert to authenticated with check (
  employer_id = (select auth.uid()) and status = 'draft'
  and exists (select 1 from public.inc_app_profiles p
    where p.id = (select auth.uid()) and p.role = 'employer')
  and exists (select 1 from public.inc_app_profiles p
    where p.id = candidate_id and p.role = 'candidate' and p.visibility = 'discoverable')
);
