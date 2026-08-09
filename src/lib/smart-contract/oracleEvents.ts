import { supabase } from '../supabase';
import { createCorrelationId } from './audit';

export interface OracleEventInput {
  eventId?: string | null;
  correlationId?: string | null;
  eventType: string;
  contractId?: string | null;
  payload?: Record<string, unknown>;
}

export async function recordOracleEvent(input: OracleEventInput) {
  const correlationId = input.correlationId ?? createCorrelationId();
  const eventId = input.eventId ?? null;
  if (eventId) {
    const existing = await supabase.from('oracle_events').select('id').eq('event_id', eventId).maybeSingle();
    if (existing.error) return existing;
    if (existing.data) return { data: existing.data, error: null, duplicate: true };
  }

  return supabase.from('oracle_events').insert({
    event_id: eventId,
    correlation_id: correlationId,
    event_type: input.eventType,
    contract_id: input.contractId ?? null,
    payload: input.payload ?? {},
  });
}
