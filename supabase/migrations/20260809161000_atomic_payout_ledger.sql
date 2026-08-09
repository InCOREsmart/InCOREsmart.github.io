-- Financial safety: make payout state change and payout ledger entry one transaction.
-- Supabase/PostgREST executes each UPDATE request in a database transaction.
-- The AFTER UPDATE trigger therefore inserts the ledger entry in the same transaction.

CREATE OR REPLACE FUNCTION public.record_payout_ledger_after_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'PAID' THEN
    INSERT INTO public.escrow_events (
      contract_id,
      event_type,
      amount,
      actor_role,
      actor_id,
      metadata
    )
    VALUES (
      NEW.contract_id,
      'PAYOUT_TO_AGENT',
      NEW.amount,
      'CEO',
      auth.uid(),
      jsonb_build_object(
        'stream_key', NEW.stream_key,
        'stream_id', NEW.id,
        'atomic', true
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_payout_ledger_after_paid
  ON public.contract_payout_streams;

CREATE TRIGGER trg_record_payout_ledger_after_paid
AFTER UPDATE OF status ON public.contract_payout_streams
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'PAID')
EXECUTE FUNCTION public.record_payout_ledger_after_paid();

-- The existing frontend still attempts to insert PAYOUT_TO_AGENT after the
-- status update. The trigger above has already created the event atomically.
-- Treat that second insert as a harmless no-op instead of reporting a false
-- payout failure to the user.
CREATE OR REPLACE FUNCTION public.validate_payout_ledger_event()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  stream_id uuid;
  stream_status text;
  existing_event boolean;
BEGIN
  IF NEW.event_type = 'PAYOUT_TO_AGENT' THEN
    stream_id := NULLIF(NEW.metadata ->> 'stream_id', '')::uuid;

    SELECT EXISTS (
      SELECT 1
      FROM public.escrow_events e
      WHERE e.event_type = 'PAYOUT_TO_AGENT'
        AND e.contract_id = NEW.contract_id
        AND (e.metadata ->> 'stream_id') = stream_id::text
    )
    INTO existing_event;

    IF existing_event THEN
      RETURN NULL;
    END IF;

    SELECT status
      INTO stream_status
      FROM public.contract_payout_streams
     WHERE id = stream_id
       AND contract_id = NEW.contract_id;

    IF stream_status IS DISTINCT FROM 'PAID' THEN
      RAISE EXCEPTION 'Cannot create payout ledger event for stream % because status is %',
        stream_id,
        COALESCE(stream_status, 'NOT_FOUND')
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Defense in depth: there can be at most one payout ledger entry per stream.
CREATE UNIQUE INDEX IF NOT EXISTS uq_escrow_payout_stream_event
  ON public.escrow_events (contract_id, ((metadata ->> 'stream_id')))
  WHERE event_type = 'PAYOUT_TO_AGENT';
