-- Financial safety: make payout streams and Oracle processing idempotent.
-- Annual bonus is intentionally not stored in contract_payout_streams.

-- 1. Keep only one payout stream of each type per contract.
--    This makes createPayoutStreamsForContract safe to retry.
WITH ranked_streams AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY contract_id, stream_key
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.contract_payout_streams
)
DELETE FROM public.contract_payout_streams s
USING ranked_streams r
WHERE s.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_contract_payout_stream_key
  ON public.contract_payout_streams (contract_id, stream_key);

-- 2. Oracle events that represent one contract milestone must be processed once.
--    Dispute events are excluded because a contract may legitimately have more
--    than one dispute during its lifetime.
CREATE UNIQUE INDEX IF NOT EXISTS uq_oracle_contract_milestone
  ON public.oracle_events (contract_id, event_type)
  WHERE event_type IN (
    'CLIENT_PAYMENT_CONFIRMED',
    'CLIENT_PAYMENT_FAILED',
    'CLIENT_CHURNED_BEFORE_90_DAYS',
    'RETENTION_PERIOD_PASSED',
    'RENEWAL_CONFIRMED',
    'CROSS_SELL_CONFIRMED',
    'PLAN_ACHIEVED',
    'ANNUAL_BONUS_CONFIRMED'
  );

-- 3. Prevent a payout from being paid twice even if two requests race.
CREATE OR REPLACE FUNCTION public.prevent_duplicate_payout_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'PAID' AND NEW.status = 'PAID' THEN
    RAISE EXCEPTION 'Payout stream % has already been paid', OLD.id
      USING ERRCODE = 'P0001';
  END IF;

  IF NEW.status = 'PAID' AND OLD.status <> 'UNLOCKED' THEN
    RAISE EXCEPTION 'Payout stream % cannot transition from % to PAID', OLD.id, OLD.status
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_payout_transition
  ON public.contract_payout_streams;

CREATE TRIGGER trg_prevent_duplicate_payout_transition
BEFORE UPDATE OF status ON public.contract_payout_streams
FOR EACH ROW
EXECUTE FUNCTION public.prevent_duplicate_payout_transition();

-- 4. Money values must never be negative.
ALTER TABLE public.contract_payout_streams
  DROP CONSTRAINT IF EXISTS contract_payout_streams_amount_nonnegative;

ALTER TABLE public.contract_payout_streams
  ADD CONSTRAINT contract_payout_streams_amount_nonnegative
  CHECK (amount >= 0);

ALTER TABLE public.escrow_events
  DROP CONSTRAINT IF EXISTS escrow_events_amount_nonnegative;

ALTER TABLE public.escrow_events
  ADD CONSTRAINT escrow_events_amount_nonnegative
  CHECK (amount IS NULL OR amount >= 0);
