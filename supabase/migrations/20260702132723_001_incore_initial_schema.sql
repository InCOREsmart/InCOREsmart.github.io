/*
# InCore Initial Database Schema

## Overview
Creates the core tables for the InCore smart contract platform for hiring insurance agents (B2B).
This platform enables trust economy with escrow payments, risk hedging, and 6 payment streams.

## New Tables

### 1. user_roles
- `id` (uuid, primary key)
- `user_id` (uuid, references auth.users) - Supabase auth user
- `role` (enum: 'CEO', 'AGENT', 'ADMIN') - user role in the platform
- `created_at` (timestamp)

### 2. companies
- `id` (uuid, primary key)
- `user_id` (uuid, references auth.users)
- `full_name` (text) - CEO full name
- `position` (text) - position/title
- `company_type` (enum: 'ООО', 'ИП') - company legal type
- `company_name` (text) - company name
- `inn` (text) - tax ID
- `kpp` (text) - tax registration reason code
- `ogrn` (text) - primary state registration number
- `legal_address` (text) - legal address
- `bank_name` (text) - bank name
- `bank_bik` (text) - bank identification code
- `bank_inn` (text) - bank tax ID
- `bank_address` (text) - bank address
- `bank_phone` (text) - bank phone
- `correspondent_account` (text) - correspondent account
- `settlement_account` (text) - settlement account
- `created_at` (timestamp)

### 3. agents
- `id` (uuid, primary key)
- `user_id` (uuid, references auth.users)
- `full_name` (text) - agent full name
- `phone` (text) - phone number
- `passport_series` (text) - passport series
- `passport_number` (text) - passport number
- `passport_issued_by` (text) - issuing authority
- `passport_issue_date` (date) - issue date
- `passport_department_code` (text) - department code
- `inn_personal` (text) - personal tax ID
- `snils` (text) - pension insurance number
- `tax_status` (enum: 'self_employed', 'ip') - tax status
- `bank_name` (text) - bank name
- `bank_bik` (text) - bank BIK
- `correspondent_account` (text) - correspondent account
- `settlement_account` (text) - settlement account
- `created_at` (timestamp)

### 4. contracts
- `id` (uuid, primary key)
- `company_id` (uuid, references companies)
- `agent_id` (uuid, references agents, nullable)
- `title` (text) - task/contract title
- `description` (text) - task description
- `deadline` (date) - completion deadline
- `status` (enum: 'DRAFT', 'PENDING_PAYMENT', 'ACTIVE', 'IN_PROGRESS', 'PENDING_APPROVAL', 'COMPLETED', 'DISPUTED')
- `kpi_calls` (integer) - target calls
- `kpi_meetings` (integer) - target meetings
- `kpi_proposals` (integer) - target proposals
- `kpi_revenue` (integer) - target revenue in USD
- `min_check` (integer) - minimum check in USD
- `target_conversion` (integer) - target conversion %
- `avg_check` (integer) - average check in USD
- `target_clients` (integer) - target new clients
- `payment_streams` (jsonb) - 6 payment streams configuration
- `escrow_amount` (integer) - escrow amount in USD
- `escrow_status` (enum: 'PENDING', 'FUNDED', 'RELEASED', 'FROZEN')
- `created_at` (timestamp)
- `completed_at` (timestamp)

### 5. daily_metrics
- `id` (uuid, primary key)
- `contract_id` (uuid, references contracts)
- `date` (date) - metrics date
- `calls` (integer) - number of calls
- `meetings` (integer) - number of meetings
- `proposals` (integer) - proposals sent
- `revenue` (integer) - revenue in USD
- `client_retention_days` (integer) - client retention days
- `is_fraud_risk` (boolean) - fraud risk flag

### 6. transactions
- `id` (uuid, primary key)
- `contract_id` (uuid, references contracts)
- `type` (enum: 'ESCROW_FUND', 'SALARY_PAYOUT', 'BONUS_PAYOUT', 'CLAWBACK', 'COMMISSION')
- `amount` (integer) - amount in USD
- `currency` (text) - currency code (default: USD)
- `status` (enum: 'PENDING', 'SUCCESS', 'FAILED')
- `created_at` (timestamp)

### 7. consents
- `id` (uuid, primary key)
- `user_id` (uuid, references auth.users)
- `version` (text) - consent version
- `ip_address` (text) - user IP
- `user_agent` (text) - browser user agent
- `timestamp` (timestamp) - consent timestamp

### 8. notifications
- `id` (uuid, primary key)
- `user_id` (uuid, references auth.users)
- `title` (text) - notification title
- `message` (text) - notification message
- `type` (enum: 'TASK_CREATED', 'TASK_APPLIED', 'ESCROW_FUNDED', 'TASK_APPROVED', 'PAYOUT_SENT', 'CLAWBACK_APPLIED')
- `is_read` (boolean) - read status
- `created_at` (timestamp)

## Security
- RLS enabled on all tables
- Owner-scoped CRUD policies for user-specific data
- Proper foreign key constraints
*/

-- Create ENUMs
CREATE TYPE user_role AS ENUM ('CEO', 'AGENT', 'ADMIN');
CREATE TYPE company_type AS ENUM ('ООО', 'ИП');
CREATE TYPE tax_status AS ENUM ('self_employed', 'ip');
CREATE TYPE contract_status AS ENUM ('DRAFT', 'PENDING_PAYMENT', 'ACTIVE', 'IN_PROGRESS', 'PENDING_APPROVAL', 'COMPLETED', 'DISPUTED');
CREATE TYPE escrow_status AS ENUM ('PENDING', 'FUNDED', 'RELEASED', 'FROZEN');
CREATE TYPE transaction_type AS ENUM ('ESCROW_FUND', 'SALARY_PAYOUT', 'BONUS_PAYOUT', 'CLAWBACK', 'COMMISSION');
CREATE TYPE transaction_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED');
CREATE TYPE notification_type AS ENUM ('TASK_CREATED', 'TASK_APPLIED', 'ESCROW_FUNDED', 'TASK_APPROVED', 'PAYOUT_SENT', 'CLAWBACK_APPLIED');

-- 1. user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'AGENT',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_user_role" ON user_roles;
CREATE POLICY "select_own_user_role" ON user_roles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_user_role" ON user_roles;
CREATE POLICY "insert_own_user_role" ON user_roles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_user_role" ON user_roles;
CREATE POLICY "update_own_user_role" ON user_roles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  position text,
  company_type company_type NOT NULL,
  company_name text NOT NULL,
  inn text NOT NULL,
  kpp text,
  ogrn text NOT NULL,
  legal_address text NOT NULL,
  bank_name text NOT NULL,
  bank_bik text NOT NULL,
  bank_inn text NOT NULL,
  bank_address text NOT NULL,
  bank_phone text NOT NULL,
  correspondent_account text NOT NULL,
  settlement_account text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_company" ON companies;
CREATE POLICY "select_own_company" ON companies FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_company" ON companies;
CREATE POLICY "insert_own_company" ON companies FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_company" ON companies;
CREATE POLICY "update_own_company" ON companies FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. agents table
CREATE TABLE IF NOT EXISTS agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL,
  passport_series text NOT NULL,
  passport_number text NOT NULL,
  passport_issued_by text NOT NULL,
  passport_issue_date date NOT NULL,
  passport_department_code text NOT NULL,
  inn_personal text NOT NULL,
  snils text NOT NULL,
  tax_status tax_status NOT NULL,
  bank_name text NOT NULL,
  bank_bik text NOT NULL,
  correspondent_account text NOT NULL,
  settlement_account text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_agent" ON agents;
CREATE POLICY "select_own_agent" ON agents FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_agent" ON agents;
CREATE POLICY "insert_own_agent" ON agents FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_agent" ON agents;
CREATE POLICY "update_own_agent" ON agents FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. contracts table
CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL,
  deadline date NOT NULL,
  status contract_status NOT NULL DEFAULT 'DRAFT',
  kpi_calls integer NOT NULL DEFAULT 0,
  kpi_meetings integer NOT NULL DEFAULT 0,
  kpi_proposals integer NOT NULL DEFAULT 0,
  kpi_revenue integer NOT NULL DEFAULT 0,
  min_check integer NOT NULL DEFAULT 0,
  target_conversion integer NOT NULL DEFAULT 20,
  avg_check integer NOT NULL DEFAULT 0,
  target_clients integer NOT NULL DEFAULT 0,
  payment_streams jsonb NOT NULL DEFAULT '[]'::jsonb,
  escrow_amount integer DEFAULT 0,
  escrow_status escrow_status DEFAULT 'PENDING',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Contracts can be read by company owner or assigned agent
DROP POLICY IF EXISTS "select_own_contracts" ON contracts;
CREATE POLICY "select_own_contracts" ON contracts FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = contracts.company_id AND companies.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM agents WHERE agents.id = contracts.agent_id AND agents.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_company_contracts" ON contracts;
CREATE POLICY "insert_company_contracts" ON contracts FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = contracts.company_id AND companies.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_contracts" ON contracts;
CREATE POLICY "update_own_contracts" ON contracts FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = contracts.company_id AND companies.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM agents WHERE agents.id = contracts.agent_id AND agents.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM companies WHERE companies.id = contracts.company_id AND companies.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM agents WHERE agents.id = contracts.agent_id AND agents.user_id = auth.uid())
  );

-- 5. daily_metrics table
CREATE TABLE IF NOT EXISTS daily_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  date date NOT NULL,
  calls integer DEFAULT 0,
  meetings integer DEFAULT 0,
  proposals integer DEFAULT 0,
  revenue integer DEFAULT 0,
  client_retention_days integer DEFAULT 0,
  is_fraud_risk boolean DEFAULT false
);

ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_metrics" ON daily_metrics;
CREATE POLICY "select_own_metrics" ON daily_metrics FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = daily_metrics.contract_id 
      AND (EXISTS (SELECT 1 FROM companies WHERE companies.id = contracts.company_id AND companies.user_id = auth.uid())
           OR EXISTS (SELECT 1 FROM agents WHERE agents.id = contracts.agent_id AND agents.user_id = auth.uid()))
    )
  );

DROP POLICY IF EXISTS "insert_own_metrics" ON daily_metrics;
CREATE POLICY "insert_own_metrics" ON daily_metrics FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = daily_metrics.contract_id 
      AND (EXISTS (SELECT 1 FROM companies WHERE companies.id = contracts.company_id AND companies.user_id = auth.uid())
           OR EXISTS (SELECT 1 FROM agents WHERE agents.id = contracts.agent_id AND agents.user_id = auth.uid()))
    )
  );

-- 6. transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status transaction_status NOT NULL DEFAULT 'PENDING',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_transactions" ON transactions;
CREATE POLICY "select_own_transactions" ON transactions FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = transactions.contract_id 
      AND (EXISTS (SELECT 1 FROM companies WHERE companies.id = contracts.company_id AND companies.user_id = auth.uid())
           OR EXISTS (SELECT 1 FROM agents WHERE agents.id = contracts.agent_id AND agents.user_id = auth.uid()))
    )
  );

DROP POLICY IF EXISTS "insert_own_transactions" ON transactions;
CREATE POLICY "insert_own_transactions" ON transactions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = transactions.contract_id 
      AND EXISTS (SELECT 1 FROM companies WHERE companies.id = contracts.company_id AND companies.user_id = auth.uid())
    )
  );

-- 7. consents table
CREATE TABLE IF NOT EXISTS consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  version text NOT NULL,
  ip_address text,
  user_agent text,
  timestamp timestamptz DEFAULT now()
);

ALTER TABLE consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_consents" ON consents;
CREATE POLICY "select_own_consents" ON consents FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_consents" ON consents;
CREATE POLICY "insert_own_consents" ON consents FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- 8. notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type notification_type NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_company_id ON contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_agent_id ON contracts(agent_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_contract_id ON daily_metrics(contract_id);
CREATE INDEX IF NOT EXISTS idx_transactions_contract_id ON transactions(contract_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
