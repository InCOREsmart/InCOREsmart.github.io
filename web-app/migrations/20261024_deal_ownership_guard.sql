-- Ensure a draft deal cannot reference another employer's vacancy or goal.
drop policy if exists "employer creates own draft deal" on public.inc_app_deals;
create policy "employer creates own draft deal" on public.inc_app_deals
for insert to authenticated with check (
  employer_id = (select auth.uid())
  and status = 'draft'
  and exists (
    select 1 from public.inc_app_profiles p
    where p.id = (select auth.uid()) and p.role = 'employer'
  )
  and (
    vacancy_id is null
    or exists (
      select 1 from public.inc_app_vacancies v
      where v.id = inc_app_deals.vacancy_id and v.employer_id = (select auth.uid())
    )
  )
  and (
    goal_id is null
    or exists (
      select 1 from public.inc_app_business_goals g
      where g.id = inc_app_deals.goal_id and g.employer_id = (select auth.uid())
    )
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
            and v.id = inc_app_deals.vacancy_id
        )
      )
  )
);
