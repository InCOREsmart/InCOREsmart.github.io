import { supabase } from '../supabase';
import type { ContractStatus } from './stateMachine';

export interface ContractStatusHistoryRecord {
  id: string;
  contract_id: string;
  from_status: ContractStatus | null;
  to_status: ContractStatus;
  actor_id?: string | null;
  correlation_id?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export async function recordContractStatusChange(input: {
  contractId: string;
  fromStatus?: ContractStatus | null;
  toStatus: ContractStatus;
  actorId?: string | null;
  correlationId?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}) {
  return supabase.from('contract_status_history').insert({
    contract_id: input.contractId,
    from_status: input.fromStatus ?? null,
    to_status: input.toStatus,
    actor_id: input.actorId ?? null,
    correlation_id: input.correlationId ?? null,
    reason: input.reason ?? null,
    metadata: input.metadata ?? null,
  });
}

export async function getContractStatusHistory(contractId: string) {
  return supabase
    .from('contract_status_history')
    .select('*')
    .eq('contract_id', contractId)
    .order('created_at', { ascending: true });
}
