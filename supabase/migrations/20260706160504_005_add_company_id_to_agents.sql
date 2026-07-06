-- Add company_id to agents table for CEO-Agent relationship
ALTER TABLE agents ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

-- Add columns for agent invitation workflow
ALTER TABLE agents ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS specialization text;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS experience text;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS comment text;

-- Update RLS policies for agents
-- Drop existing policies
DROP POLICY IF EXISTS "select_own_agent" ON agents;
DROP POLICY IF EXISTS "insert_own_agent" ON agents;
DROP POLICY IF EXISTS "update_own_agent" ON agents;

-- CEO can read agents from their company
CREATE POLICY "select_company_agents" ON agents FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = agents.company_id AND companies.user_id = auth.uid())
    OR user_id = auth.uid()
  );

-- CEO can create agents for their company
CREATE POLICY "insert_company_agents" ON agents FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = agents.company_id AND companies.user_id = auth.uid())
  );

-- CEO can update agents from their company
CREATE POLICY "update_company_agents" ON agents FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = agents.company_id AND companies.user_id = auth.uid())
    OR user_id = auth.uid()
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_agents_company_id ON agents(company_id);