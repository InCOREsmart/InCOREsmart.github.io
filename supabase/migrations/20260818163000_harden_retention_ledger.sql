-- Financial retention execution hardening.
-- The 90-day rule remains a contract financial rule, not a role skill.

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS client_left_date date,
  ADD COLUMN IF NOT EXISTS retention_clawback_at timestamptz,
  ADD COLUMN IF NOT EXISTS execution_status text NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS execution_version text NOT NULL DEFAULT '1.0';

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS stream_id uuid,
  ADD COLUMN IF NOT EXISTS oracle_event_id uuid,
  ADD COLUMN IF NOT EXISTS correlation_id uuid,
  ADD COLUMN IF NOT EXISTS reference text,
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS actor_id uuid,
  ADD COLUMN IF NOT EXISTS actor_role text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_transactions_contract_id ON public.transactions(contract_id);
CREATE INDEX IF NOT EXISTS idx_transactions_stream_id ON public.transactions(stream_id);
CREATE INDEX IF NOT EXISTS idx_transactions_correlation_id ON public.transactions(correlation_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_transactions_idempotency_key
  ON public.transactions(idempotency_key) WHERE idempotency_key IS NOT NULL;

DROP POLICY IF EXISTS "insert_own_transactions" ON public.transactions;
DROP POLICY IF EXISTS "transactions_no_direct_insert" ON public.transactions;
DROP POLICY IF EXISTS "transactions_no_update" ON public.transactions;
DROP POLICY IF EXISTS "transactions_no_delete" ON public.transactions;
DROP POLICY IF EXISTS "select_contract_transactions" ON public.transactions;

CREATE POLICY "transactions_no_update" ON public.transactions FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "transactions_no_delete" ON public.transactions FOR DELETE TO authenticated USING (false);
CREATE POLICY "select_contract_transactions" ON public.transactions FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.contracts c JOIN public.companies co ON co.id = c.company_id
    WHERE c.id = transactions.contract_id AND co.user_id = (select auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.contracts c JOIN public.agents a ON a.id = c.agent_id
    WHERE c.id = transactions.contract_id AND a.user_id = (select auth.uid())
  )
);

CREATE OR REPLACE FUNCTION public.prevent_transaction_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Financial ledger is append-only; create a corrective transaction instead.' USING ERRCODE = 'P0001';
END;
$$;
DROP TRIGGER IF EXISTS trg_transactions_append_only ON public.transactions;
CREATE TRIGGER trg_transactions_append_only
BEFORE UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.prevent_transaction_mutation();

CREATE TABLE IF NOT EXISTS public.contract_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES public.contracts(id) ON DELETE CASCADE,
  rule_key text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  actions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contract_id, rule_key, version)
);
CREATE INDEX IF NOT EXISTS idx_contract_rules_contract_id ON public.contract_rules(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_rules_active ON public.contract_rules(contract_id, rule_key, active);
ALTER TABLE public.contract_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_contract_rules" ON public.contract_rules;
CREATE POLICY "select_contract_rules" ON public.contract_rules FOR SELECT TO authenticated USING (
  contract_id IS NULL
  OR EXISTS (
    SELECT 1 FROM public.contracts c JOIN public.companies co ON co.id = c.company_id
    WHERE c.id = contract_rules.contract_id AND co.user_id = (select auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.contracts c JOIN public.agents a ON a.id = c.agent_id
    WHERE c.id = contract_rules.contract_id AND a.user_id = (select auth.uid())
  )
);

INSERT INTO public.contract_rules (contract_id, rule_key, version, conditions, actions)
SELECT NULL, 'RETENTION_90_DAYS', 1,
  jsonb_build_object('retention_days', 90),
  jsonb_build_object('on_client_churn', 'CLAW_BACK_RETENTION')
WHERE NOT EXISTS (
  SELECT 1 FROM public.contract_rules WHERE contract_id IS NULL AND rule_key = 'RETENTION_90_DAYS' AND version = 1
);

CREATE OR REPLACE FUNCTION public.record_transaction_from_escrow_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  mapped_type transaction_type;
  txn_currency text := 'USD';
  stream_uuid uuid;
  correlation_uuid uuid;
  actor_uuid uuid;
  actor_role_text text;
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

  SELECT COALESCE(c.currency, 'USD') INTO txn_currency FROM public.contracts c WHERE c.id = NEW.contract_id;
  BEGIN stream_uuid := NULLIF(NEW.metadata ->> 'stream_id', '')::uuid; EXCEPTION WHEN invalid_text_representation THEN stream_uuid := NULL; END;
  BEGIN correlation_uuid := NULLIF(NEW.metadata ->> 'correlation_id', '')::uuid; EXCEPTION WHEN invalid_text_representation THEN correlation_uuid := NULL; END;
  BEGIN actor_uuid := NULLIF(NEW.metadata ->> 'actor_id', '')::uuid; EXCEPTION WHEN invalid_text_representation THEN actor_uuid := NULL; END;
  actor_role_text := NULLIF(NEW.metadata ->> 'actor_role', '');

  INSERT INTO public.transactions (
    contract_id, type, amount, currency, status, stream_id, correlation_id,
    reference, idempotency_key, actor_id, actor_role, metadata
  ) VALUES (
    NEW.contract_id, mapped_type, ROUND(COALESCE(NEW.amount, 0))::integer, txn_currency,
    'SUCCESS'::transaction_status, stream_uuid, correlation_uuid, NEW.event_type,
    'escrow-event:' || NEW.id::text, actor_uuid, actor_role_text,
    COALESCE(NEW.metadata, '{}'::jsonb) || jsonb_build_object('escrow_event_id', NEW.id)
  ) ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_record_transaction_from_escrow_event ON public.escrow_events;
CREATE TRIGGER trg_record_transaction_from_escrow_event
AFTER INSERT ON public.escrow_events FOR EACH ROW EXECUTE FUNCTION public.record_transaction_from_escrow_event();

CREATE OR REPLACE FUNCTION public.apply_retention_clawback(p_contract_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE affected integer := 0; clawback_amount integer := 0;
BEGIN
  UPDATE public.contract_payout_streams
  SET status = 'CLAWED_BACK', clawback_reason = 'Client left before 90-day retention period'
  WHERE contract_id = p_contract_id AND stream_key = 'retention'
    AND status IN ('LOCKED', 'UNLOCKED', 'PAYABLE');
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected > 0 THEN
    SELECT ROUND(COALESCE(SUM(amount), 0))::integer INTO clawback_amount
    FROM public.contract_payout_streams WHERE contract_id = p_contract_id
      AND stream_key = 'retention' AND status = 'CLAWED_BACK';
    UPDATE public.contracts SET clawback_applied = true, retention_clawback_at = now() WHERE id = p_contract_id;
    INSERT INTO public.escrow_events (contract_id, event_type, amount, actor_role, metadata)
    VALUES (p_contract_id, 'CLAWBACK', clawback_amount, 'SYSTEM',
      jsonb_build_object('rule_key','RETENTION_90_DAYS','automatic',true,'retention_days',90,'clawback_amount',clawback_amount));
  END IF;
  RETURN affected;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.apply_retention_clawback(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_retention_clawback(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.trigger_retention_clawback_from_contract()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('postgres','service_role')
     AND COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN RETURN NEW; END IF;
  IF NEW.client_left_date IS NOT NULL AND NEW.created_at IS NOT NULL
     AND NEW.client_left_date < (NEW.created_at::date + COALESCE(NEW.retention_days,90))
     AND OLD.client_left_date IS DISTINCT FROM NEW.client_left_date THEN
    PERFORM public.apply_retention_clawback(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_contract_retention_clawback ON public.contracts;
CREATE TRIGGER trg_contract_retention_clawback
AFTER UPDATE OF client_left_date ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.trigger_retention_clawback_from_contract();

REVOKE EXECUTE ON FUNCTION public.record_transaction_from_escrow_event() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_transaction_mutation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_retention_clawback_from_contract() FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.transactions IS 'Append-only financial ledger for smart-contract execution. Corrective actions create new rows.';
COMMENT ON TABLE public.contract_rules IS 'Versioned smart-contract business rules. Historical versions are immutable.';
