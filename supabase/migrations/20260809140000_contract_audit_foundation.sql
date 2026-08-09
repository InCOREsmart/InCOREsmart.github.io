-- Safe additive foundation for contract auditability.
-- Existing rows are preserved. No destructive changes and no event_id uniqueness yet.

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS terms_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS terms_locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS engine_version text NOT NULL DEFAULT '1.0';

ALTER TABLE oracle_events
  ADD COLUMN IF NOT EXISTS event_id text,
  ADD COLUMN IF NOT EXISTS correlation_id uuid;

ALTER TABLE escrow_events
  ADD COLUMN IF NOT EXISTS correlation_id uuid;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS correlation_id uuid;

CREATE TABLE IF NOT EXISTS contract_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  actor_id uuid,
  correlation_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_status_history_contract_id
  ON contract_status_history(contract_id);

CREATE INDEX IF NOT EXISTS idx_contract_status_history_correlation_id
  ON contract_status_history(correlation_id);

CREATE INDEX IF NOT EXISTS idx_oracle_events_correlation_id
  ON oracle_events(correlation_id);

CREATE INDEX IF NOT EXISTS idx_escrow_events_correlation_id
  ON escrow_events(correlation_id);

CREATE INDEX IF NOT EXISTS idx_notifications_correlation_id
  ON notifications(correlation_id);

-- Do not add a unique event_id constraint until legacy duplicates have been audited.
-- Once duplicates are resolved, this can safely become a partial unique index:
-- CREATE UNIQUE INDEX ... ON oracle_events(event_id) WHERE event_id IS NOT NULL;
