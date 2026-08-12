-- Исправление RLS для создания контрактов CEO.
-- Контракт может создавать только авторизованный пользователь,
-- которому принадлежит указанная компания.
-- Проверка вынесена в SECURITY DEFINER, чтобы RLS таблицы companies
-- не блокировал проверку владельца компании.

create or replace function public.incore_user_owns_company(p_company_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.companies c
    where c.id = p_company_id
      and c.user_id = (select auth.uid())
  );
$$;

revoke all on function public.incore_user_owns_company(uuid) from public;
grant execute on function public.incore_user_owns_company(uuid) to authenticated;

-- Убираем старые INSERT-политики, которые проверяли companies напрямую.
drop policy if exists "CEO creates contracts" on public.contracts;
drop policy if exists "contracts_insert_company" on public.contracts;

-- Одна понятная политика для CEO.
create policy "CEO creates contracts"
on public.contracts
for insert
to authenticated
with check (
  (select public.incore_user_owns_company(company_id))
);

-- После INSERT форма делает .select().single(), поэтому CEO должен
-- иметь право увидеть созданный им контракт.
drop policy if exists "contracts_select_accessible" on public.contracts;

create policy "contracts_select_accessible"
on public.contracts
for select
to authenticated
using (
  (select public.incore_user_owns_company(company_id))
  or (select can_access_contract(id))
);

-- Индекс ускоряет проверку владельца компании.
create index if not exists companies_user_id_idx
on public.companies(user_id);
