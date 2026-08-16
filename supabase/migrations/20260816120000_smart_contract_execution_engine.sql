-- InCORE Smart Contract Execution Engine
-- Additive migration. Existing financial formulas and payout streams are preserved.
-- Annual bonus remains outside escrow.

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS client_left_date date,
  ADD COLUMN IF NOT EXISTS retention_clawback_at timestamptz,
  ADD COLUMN IF NOT EXISTS execution_status text NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS execution_version text NOT NULL DEFAULT '1.0';

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS stream_id uuid,
  ADD COLUMN IF NOT EXISTS oracle_event_id uuid,
  ADD COLUMN IF NOT EXISTS correlation_id uuid,
  ADD COLUMN IF NOT EXISTS reference text,
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS actor_id uuid,
  ADD COLUMN IF NOT EXISTS actor_role text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_transactions_contract_id ON transactions(contract_id);
CREATE INDEX IF NOT EXISTS idx_transactions_stream_id ON transactions(stream_id);
CREATE INDEX IF NOT EXISTS idx_transactions_correlation_id ON transactions(correlation_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_transactions_idempotency_key ON transactions(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- The ledger is append-only. State changes are represented by new rows.
DROP POLICY IF EXISTS "transactions_no_update" ON transactions;
DROP POLICY IF EXISTS "transactions_no_delete" ON transactions;
CREATE POLICY "transactions_no_update" ON transactions FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "transactions_no_delete" ON transactions FOR DELETE TO authenticated USING (false);

-- Read access follows the same contract ownership model used by contracts.
DROP POLICY IF EXISTS "select_contract_transactions" ON transactions;
CREATE POLICY "select_contract_transactions" ON transactions FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM contracts c
    JOIN companies co ON co.id = c.company_id
    WHERE c.id = transactions.contract_id AND co.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM contracts c
    JOIN agents a ON a.id = c.agent_id
    WHERE c.id = transactions.contract_id AND a.user_id = auth.uid()
  )
);

-- Only trusted database functions/triggers create ledger entries.
DROP POLICY IF EXISTS "transactions_no_direct_insert" ON transactions;
CREATE POLICY "transactions_no_direct_insert" ON transactions FOR INSERT TO authenticated WITH CHECK (false);

-- Contract rules are versioned. A new business rule creates a new version;
-- existing contract history is never rewritten.
CREATE TABLE IF NOT EXISTS contract_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES contracts(id) ON DELETE CASCADE,
  rule_key text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  actions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contract_id, rule_key, version)
);

CREATE INDEX IF NOT EXISTS idx_contract_rules_contract_id ON contract_rules(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_rules_active ON contract_rules(contract_id, rule_key, active);

ALTER TABLE contract_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_contract_rules" ON contract_rules;
CREATE POLICY "select_contract_rules" ON contract_rules FOR SELECT TO authenticated USING (
  contract_id IS NULL
  OR EXISTS (
    SELECT 1 FROM contracts c
    JOIN companies co ON co.id = c.company_id
    WHERE c.id = contract_rules.contract_id AND co.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM contracts c
    JOIN agents a ON a.id = c.agent_id
    WHERE c.id = contract_rules.contract_id AND a.user_id = auth.uid()
  )
);

INSERT INTO contract_rules (contract_id, rule_key, version, conditions, actions)
SELECT NULL, 'RETENTION_90_DAYS', 1,
  jsonb_build_object('retention_days', 90),
  jsonb_build_object('on_client_churn', 'CLAW_BACK_RETENTION')
WHERE NOT EXISTS (
  SELECT 1 FROM contract_rules WHERE contract_id IS NULL AND rule_key = 'RETENTION_90_DAYS' AND version = 1
);

-- Canonical ledger writer for escrow events. The event remains the audit record;
-- transactions becomes the accounting ledger used by the UI and exports.
-- We deliberately reuse the existing transaction_type enum to avoid a destructive enum migration.
CREATE OR REPLACE FUNCTION public.record_transaction_from_escrow_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  mapped_type transaction_type;
  mapped_status transaction_status;
  stream_uuid uuid;
BEGIN
  mapped_type := CASE NEW.event_type
    WHEN 'ESCROW_CREATED' THEN 'ESCROW_FUND'::transaction_type
    WHEN 'ESCROW_FUNDED' THEN 'ESCROW_FUND'::transaction_type
    WHEN 'PARTIAL_RELEASE' THEN 'BONUS_PAYOUT'::transaction_type
    WHEN 'PAYOUT_TO_AGENT' THEN 'SALARY_PAYOUT'::transaction_type
    WHEN 'REFUND_TO_CEO' THEN 'COMMISSION'::transaction_type
    WHEN 'CLAWBACK' THEN 'CLAWBACK'::transaction_type
    ELSE NULL
  END;
  IF mapped_type IS NULL THEN RETURN NEW; END IF;

  mapped_status := 'SUCCESS'::transaction_status;
  BEGIN
    stream_uuid := NULLIF(NEW.metadata ->> 'stream_id', '')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    stream_uuid := NULL;
  END;

  INSERT INTO public.transactions (
    contract_id, type, amount, currency, status, stream_id, correlation_id,
    reference, idempotency_key, actor_id, actor_role, metadata
  )
  VALUES (
    NEW.contract_id, mapped_type, COALESCE(NEW.amount, 0), 'USD', mapped_status,
    stream_uuid, NEW.correlation_id, NEW.event_type, 'escrow-event:' || NEW.id::text,
    NEW.actor_id, NEW.actor_role,
    COALESCE(NEW.metadata, '{}'::jsonb) || jsonb_build_object('escrow_event_id', NEW.id)
  )
  ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_transaction_from_escrow_event ON escrow_events;
CREATE TRIGGER trg_record_transaction_from_escrow_event
AFTER INSERT ON escrow_events
FOR EACH ROW EXECUTE FUNCTION public.record_transaction_from_escrow_event();

-- Automatic retention clawback primitive. The trigger and Edge Function both call this function.
CREATE OR REPLACE FUNCTION public.apply_retention_clawback(p_contract_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  affected integer := 0;
  clawback_amount integer := 0;
BEGIN
  UPDATE contract_payout_streams
     SET status = 'CLAWED_BACK',
         clawback_reason = 'Client left before 90-day retention period'
   WHERE contract_id = p_contract_id
     AND stream_key = 'retention'
     AND status IN ('LOCKED', 'UNLOCKED', 'PAYABLE');

  GET DIAGNOSTICS affected = ROW_COUNT;

  IF affected > 0 THEN
    SELECT COALESCE(SUM(amount), 0) INTO clawback_amount
      FROM contract_payout_streams
     WHERE contract_id = p_contract_id
       AND stream_key = 'retention'
       AND status = 'CLAWED_BACK';

    UPDATE contracts
       SET clawback_applied = true,
           retention_clawback_at = now()
     WHERE id = p_contract_id;

    INSERT INTO escrow_events (contract_id, event_type, amount, actor_role, metadata)
    VALUES (
      p_contract_id,
      'CLAWBACK',
      clawback_amount,
      'SYSTEM',
      jsonb_build_object('rule_key', 'RETENTION_90_DAYS', 'automatic', true, 'retention_days', 90)
    );
  END IF;

  RETURN affected;
END;
$$;

-- A CRM/Oracle update to client_left_date becomes an automatic financial action.
CREATE OR REPLACE FUNCTION public.trigger_retention_clawback_from_contract()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.client_left_date IS NOT NULL
     AND NEW.created_at IS NOT NULL
     AND NEW.client_left_date < (NEW.created_at::date + 90)
     AND (OLD.client_left_date IS DISTINCT FROM NEW.client_left_date) THEN
    PERFORM public.apply_retention_clawback(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contract_retention_clawback ON contracts;
CREATE TRIGGER trg_contract_retention_clawback
AFTER UPDATE OF client_left_date ON contracts
FOR EACH ROW EXECUTE FUNCTION public.trigger_retention_clawback_from_contract();

COMMENT ON TABLE transactions IS 'Append-only financial ledger for smart-contract execution. Corrective actions create new rows.';
COMMENT ON TABLE contract_rules IS 'Versioned smart-contract business rules. Historical versions are immutable.';
