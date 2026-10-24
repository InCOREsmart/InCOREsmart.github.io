drop policy if exists "published vacancies visible; owner sees all own" on public.inc_app_vacancies;
create policy "published vacancies or candidate applications visible" on public.inc_app_vacancies
for select to authenticated using (
  status = 'published'
  or employer_id = (select auth.uid())
  or exists (
    select 1 from public.inc_applications a
    where a.vacancy_id = inc_app_vacancies.id and a.candidate_id = (select auth.uid())
  )
);
