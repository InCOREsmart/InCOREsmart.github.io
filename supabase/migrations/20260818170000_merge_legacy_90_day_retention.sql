-- Canonical insurance-agent model: 90-day retention is part of client retention.
update public.role_skills
set weight = 0.25
where role_id = '864391c4-ba27-4583-807b-a10286a9f6c5'
  and skill_id = 'ee2832f3-6f80-4fd1-b9d2-a27227059c48';

update public.skills
set description = 'Сопровождение действующих корпоративных клиентов, своевременное продление договоров и сохранение клиента после продажи не менее 90 дней.',
    expected_outcomes = '["Действующие договоры продлены в установленный срок.", "Клиент сохраняет договор не менее 90 дней после продажи."]'::jsonb,
    verification_criteria = '["Есть подтвержденное продление договора.", "Нет досрочного расторжения или возврата в течение 90 дней."]'::jsonb,
    updated_at = now()
where id = 'ee2832f3-6f80-4fd1-b9d2-a27227059c48';

delete from public.skills_relations
where role_id = '864391c4-ba27-4583-807b-a10286a9f6c5'
  and (skill_from_id = 'be62a43a-b2b5-46a0-9870-72f3e521f9d3'
    or skill_to_id = 'be62a43a-b2b5-46a0-9870-72f3e521f9d3');

insert into public.skills_relations (role_id, skill_from_id, skill_to_id, relation_type, strength, is_directed)
select '864391c4-ba27-4583-807b-a10286a9f6c5', 'ee2832f3-6f80-4fd1-b9d2-a27227059c48', '9253f310-c97c-4ee2-aec4-cbcb36bf1911', 'requires', 0.80, true
where not exists (
  select 1 from public.skills_relations
  where role_id = '864391c4-ba27-4583-807b-a10286a9f6c5'
    and skill_from_id = 'ee2832f3-6f80-4fd1-b9d2-a27227059c48'
    and skill_to_id = '9253f310-c97c-4ee2-aec4-cbcb36bf1911'
    and relation_type = 'requires'
);

insert into public.skills_relations (role_id, skill_from_id, skill_to_id, relation_type, strength, is_directed)
select '864391c4-ba27-4583-807b-a10286a9f6c5', '056d5cd1-60ec-4e11-9a90-602e79062acc', 'ee2832f3-6f80-4fd1-b9d2-a27227059c48', 'requires', 0.70, true
where not exists (
  select 1 from public.skills_relations
  where role_id = '864391c4-ba27-4583-807b-a10286a9f6c5'
    and skill_from_id = '056d5cd1-60ec-4e11-9a90-602e79062acc'
    and skill_to_id = 'ee2832f3-6f80-4fd1-b9d2-a27227059c48'
    and relation_type = 'requires'
);

delete from public.role_skills
where role_id = '864391c4-ba27-4583-807b-a10286a9f6c5'
  and skill_id = 'be62a43a-b2b5-46a0-9870-72f3e521f9d3';

delete from public.hh_role_skill_market
where role_id = '864391c4-ba27-4583-807b-a10286a9f6c5'
  and role_skill_name = 'Удержание 90 дней';

delete from public.skills
where id = 'be62a43a-b2b5-46a0-9870-72f3e521f9d3';

update public.hh_role_skill_market
set incore_weight = 25
where role_id = '864391c4-ba27-4583-807b-a10286a9f6c5'
  and role_skill_name = 'Удержание клиентов';
