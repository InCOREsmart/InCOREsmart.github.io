create or replace function public.get_role_market_skill_stats(
  p_role_key text,
  p_country text,
  p_skills jsonb
)
returns table(
  skill_name text,
  demand_count integer,
  supply_count integer,
  demand_share numeric,
  supply_share numeric,
  skill_gap numeric
)
language sql
stable
security definer
set search_path = public
as $$
with requested as (
  select s.value->>'name' as skill_name, lower(trim(term)) as term
  from jsonb_array_elements(coalesce(p_skills,'[]'::jsonb)) s
  cross join lateral jsonb_array_elements_text(coalesce(s.value->'terms','[]'::jsonb)) term
  where coalesce(trim(term),'') <> ''
),
v as (
  select id, lower(coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(key_skills::text,'')) as txt
  from public.hh_vacancies
  where role_key=p_role_key and country=upper(p_country)
),
r as (
  select hh_id, lower(coalesce(title,'') || ' ' || coalesce(raw->>'title','') || ' ' || coalesce((select string_agg(coalesce(e->>'position',''),' ') from jsonb_array_elements(coalesce(raw->'experience','[]'::jsonb)) e),'')) as txt
  from public.hh_market_resumes
  where role_key=p_role_key and country=upper(p_country)
),
totals as (
  select (select count(*) from v)::numeric as vacancy_total, (select count(*) from r)::numeric as resume_total
),
agg as (
  select q.skill_name,
    (select count(distinct v1.id) from v v1 where exists(select 1 from requested q1 where q1.skill_name=q.skill_name and v1.txt like '%'||q1.term||'%'))::integer as demand_count,
    (select count(distinct r1.hh_id) from r r1 where exists(select 1 from requested q2 where q2.skill_name=q.skill_name and r1.txt like '%'||q2.term||'%'))::integer as supply_count
  from (select distinct skill_name from requested) q
)
select a.skill_name,a.demand_count,a.supply_count,
  round(case when t.vacancy_total=0 then 0 else a.demand_count*100/t.vacancy_total end,2),
  round(case when t.resume_total=0 then 0 else a.supply_count*100/t.resume_total end,2),
  round((case when t.vacancy_total=0 then 0 else a.demand_count*100/t.vacancy_total end)-(case when t.resume_total=0 then 0 else a.supply_count*100/t.resume_total end),2)
from agg a cross join totals t;
$$;

grant execute on function public.get_role_market_skill_stats(text,text,jsonb) to authenticated;
