-- InCORE: AI-декомпозиция ролей.
-- ВАЖНО: эта схема не меняет contracts, payout_streams, escrow или существующие финансовые расчёты.

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  industry TEXT NOT NULL,
  category TEXT,
  region TEXT DEFAULT 'ru',
  decomposition_source TEXT NOT NULL DEFAULT 'ai' CHECK (decomposition_source IN ('ai', 'manual', 'template')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, name)
);

CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  skill_type TEXT NOT NULL CHECK (skill_type IN ('hard', 'soft', 'hybrid')),
  verification_level TEXT NOT NULL CHECK (verification_level IN ('L1_bio', 'L2_simulation', 'L3_digital_twin', 'L4_smart_contract')),
  is_required BOOLEAN NOT NULL DEFAULT false,
  expected_outcomes JSONB NOT NULL DEFAULT '[]'::jsonb,
  verification_criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role_id, name)
);

CREATE TABLE IF NOT EXISTS role_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  weight NUMERIC(6,5) NOT NULL CHECK (weight >= 0 AND weight <= 1),
  is_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role_id, skill_id)
);

CREATE TABLE IF NOT EXISTS skills_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  skill_from_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  skill_to_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('requires', 'related_to', 'conflicts_with', 'enhances')),
  strength NUMERIC(6,5) NOT NULL CHECK (strength >= 0 AND strength <= 1),
  is_directed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(skill_from_id, skill_to_id, relation_type)
);

CREATE INDEX IF NOT EXISTS idx_roles_company_id ON roles(company_id);
CREATE INDEX IF NOT EXISTS idx_skills_role_id ON skills(role_id);
CREATE INDEX IF NOT EXISTS idx_role_skills_role_id ON role_skills(role_id);
CREATE INDEX IF NOT EXISTS idx_role_skills_skill_id ON role_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_skills_relations_role_id ON skills_relations(role_id);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills_relations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "CEO reads own roles" ON roles;
DROP POLICY IF EXISTS "CEO inserts own roles" ON roles;
DROP POLICY IF EXISTS "CEO updates own roles" ON roles;
DROP POLICY IF EXISTS "CEO deletes own roles" ON roles;
CREATE POLICY "CEO reads own roles" ON roles FOR SELECT USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));
CREATE POLICY "CEO inserts own roles" ON roles FOR INSERT WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));
CREATE POLICY "CEO updates own roles" ON roles FOR UPDATE USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())) WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));
CREATE POLICY "CEO deletes own roles" ON roles FOR DELETE USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "CEO reads own skills" ON skills;
DROP POLICY IF EXISTS "CEO inserts own skills" ON skills;
CREATE POLICY "CEO reads own skills" ON skills FOR SELECT USING (role_id IN (SELECT id FROM roles WHERE company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())));
CREATE POLICY "CEO inserts own skills" ON skills FOR INSERT WITH CHECK (role_id IN (SELECT id FROM roles WHERE company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())));

DROP POLICY IF EXISTS "CEO reads own role skills" ON role_skills;
DROP POLICY IF EXISTS "CEO inserts own role skills" ON role_skills;
CREATE POLICY "CEO reads own role skills" ON role_skills FOR SELECT USING (role_id IN (SELECT id FROM roles WHERE company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())));
CREATE POLICY "CEO inserts own role skills" ON role_skills FOR INSERT WITH CHECK (role_id IN (SELECT id FROM roles WHERE company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())));

DROP POLICY IF EXISTS "CEO reads own skill relations" ON skills_relations;
DROP POLICY IF EXISTS "CEO inserts own skill relations" ON skills_relations;
CREATE POLICY "CEO reads own skill relations" ON skills_relations FOR SELECT USING (role_id IN (SELECT id FROM roles WHERE company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())));
CREATE POLICY "CEO inserts own skill relations" ON skills_relations FOR INSERT WITH CHECK (role_id IN (SELECT id FROM roles WHERE company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())));

-- Сохраняем всю декомпозицию одной PostgreSQL-транзакцией.
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
  SELECT id INTO v_company_id FROM companies WHERE user_id = auth.uid() LIMIT 1;
  IF v_company_id IS NULL THEN RAISE EXCEPTION 'Компания CEO не найдена'; END IF;

  IF p_source NOT IN ('ai', 'manual', 'template') THEN
    RAISE EXCEPTION 'Недопустимый источник декомпозиции';
  END IF;

  IF jsonb_array_length(p_skills) < 5 OR jsonb_array_length(p_skills) > 8 THEN
    RAISE EXCEPTION 'Декомпозиция должна содержать от 5 до 8 навыков';
  END IF;

  IF ABS((SELECT COALESCE(SUM((item->>'weight')::numeric), 0) FROM jsonb_array_elements(p_skills) item) - 1) > 0.001 THEN
    RAISE EXCEPTION 'Сумма весов навыков должна быть равна 1';
  END IF;

  INSERT INTO roles(company_id, name, description, industry, category, region, decomposition_source)
  VALUES (v_company_id, p_name, p_description, p_industry, p_category, p_region, p_source)
  RETURNING id INTO v_role_id;

  FOR v_skill IN SELECT * FROM jsonb_array_elements(p_skills) LOOP
    INSERT INTO skills(role_id, name, description, skill_type, verification_level, is_required, expected_outcomes, verification_criteria)
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
  SELECT v_role_id, s.id, (item->>'weight')::numeric, COALESCE((item->>'is_required')::boolean, false)
  FROM jsonb_array_elements(p_skills) item
  JOIN skills s ON s.role_id = v_role_id AND s.name = item->>'name';

  FOR v_relation IN SELECT * FROM jsonb_array_elements(COALESCE(p_relations, '[]'::jsonb)) LOOP
    SELECT id INTO v_from FROM skills WHERE role_id = v_role_id AND name = v_relation->>'skill_from';
    SELECT id INTO v_to FROM skills WHERE role_id = v_role_id AND name = v_relation->>'skill_to';
    IF v_from IS NOT NULL AND v_to IS NOT NULL THEN
      INSERT INTO skills_relations(role_id, skill_from_id, skill_to_id, relation_type, strength, is_directed)
      VALUES (v_role_id, v_from, v_to, v_relation->>'relation_type', (v_relation->>'strength')::numeric, COALESCE((v_relation->>'is_directed')::boolean, true));
    END IF;
  END LOOP;

  RETURN v_role_id;
END;
$$;

REVOKE ALL ON FUNCTION save_role_decomposition(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION save_role_decomposition(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB) TO authenticated;
