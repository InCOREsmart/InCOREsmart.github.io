-- InCORE: исправление сохранения декомпозиции ролей.
-- Финансовую модель и существующие расчёты контрактов не изменяет.
-- Сохранение роли выполняется атомарно и допускает повторное сохранение
-- уже существующей роли той же компании.

CREATE OR REPLACE FUNCTION save_role_decomposition(
  p_name TEXT,
  p_description TEXT,
  p_industry TEXT,
  p_category TEXT,
  p_region TEXT,
  p_source TEXT,
  p_skills JSONB,
  p_relations JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_role_id UUID;
  v_skill JSONB;
  v_relation JSONB;
  v_from UUID;
  v_to UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Пользователь не авторизован';
  END IF;

  SELECT id INTO v_company_id
  FROM companies
  WHERE user_id = auth.uid()
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Для пользователя не найдена компания';
  END IF;

  IF NULLIF(trim(p_name), '') IS NULL THEN
    RAISE EXCEPTION 'Название роли не может быть пустым';
  END IF;

  IF p_source NOT IN ('ai', 'manual', 'template') THEN
    RAISE EXCEPTION 'Недопустимый источник декомпозиции';
  END IF;

  IF jsonb_array_length(COALESCE(p_skills, '[]'::jsonb)) < 5
     OR jsonb_array_length(COALESCE(p_skills, '[]'::jsonb)) > 8 THEN
    RAISE EXCEPTION 'Декомпозиция должна содержать от 5 до 8 навыков';
  END IF;

  IF ABS(
    (SELECT COALESCE(SUM((item->>'weight')::numeric), 0)
     FROM jsonb_array_elements(p_skills) item) - 1
  ) > 0.001 THEN
    RAISE EXCEPTION 'Сумма весов навыков должна быть равна 1';
  END IF;

  -- Роль уже может существовать после предыдущей попытки сохранения.
  -- В этом случае обновляем её и полностью пересобираем дочерние записи.
  INSERT INTO roles(company_id, name, description, industry, category, region, decomposition_source, is_active, updated_at)
  VALUES (v_company_id, trim(p_name), p_description, p_industry, p_category, p_region, p_source, true, now())
  ON CONFLICT (company_id, name)
  DO UPDATE SET
    description = EXCLUDED.description,
    industry = EXCLUDED.industry,
    category = EXCLUDED.category,
    region = EXCLUDED.region,
    decomposition_source = EXCLUDED.decomposition_source,
    is_active = true,
    updated_at = now()
  RETURNING id INTO v_role_id;

  DELETE FROM skills_relations WHERE role_id = v_role_id;
  DELETE FROM role_skills WHERE role_id = v_role_id;
  DELETE FROM skills WHERE role_id = v_role_id;

  FOR v_skill IN SELECT * FROM jsonb_array_elements(p_skills) LOOP
    INSERT INTO skills(
      role_id,
      name,
      description,
      skill_type,
      verification_level,
      is_required,
      expected_outcomes,
      verification_criteria
    )
    VALUES (
      v_role_id,
      v_skill->>'name',
      v_skill->>'description',
      v_skill->>'skill_type',
      v_skill->>'verification_level',
      COALESCE((v_skill->>'is_required')::boolean, false),
      COALESCE(v_skill->'expected_outcomes', '[]'::jsonb),
      COALESCE(v_skill->'verification_criteria', '[]'::jsonb)
    );
  END LOOP;

  INSERT INTO role_skills(role_id, skill_id, weight, is_required)
  SELECT
    v_role_id,
    s.id,
    (item->>'weight')::numeric,
    COALESCE((item->>'is_required')::boolean, false)
  FROM jsonb_array_elements(p_skills) item
  JOIN skills s
    ON s.role_id = v_role_id
   AND s.name = item->>'name';

  FOR v_relation IN SELECT * FROM jsonb_array_elements(COALESCE(p_relations, '[]'::jsonb)) LOOP
    SELECT id INTO v_from
    FROM skills
    WHERE role_id = v_role_id AND name = v_relation->>'skill_from';

    SELECT id INTO v_to
    FROM skills
    WHERE role_id = v_role_id AND name = v_relation->>'skill_to';

    IF v_from IS NOT NULL AND v_to IS NOT NULL THEN
      INSERT INTO skills_relations(
        role_id,
        skill_from_id,
        skill_to_id,
        relation_type,
        strength,
        is_directed
      )
      VALUES (
        v_role_id,
        v_from,
        v_to,
        v_relation->>'relation_type',
        (v_relation->>'strength')::numeric,
        COALESCE((v_relation->>'is_directed')::boolean, true)
      );
    END IF;
  END LOOP;

  RETURN v_role_id;
END;
$$;

REVOKE ALL ON FUNCTION save_role_decomposition(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION save_role_decomposition(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB) TO authenticated;
