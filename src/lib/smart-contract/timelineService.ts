import { getContractStatusHistory } from './statusHistory';
import { sortContractTimeline, type ContractTimelineEvent } from './timeline';

export async function getContractTimeline(contractId: string) {
  const result = await getContractStatusHistory(contractId);
  if (result.error) return { data: null, error: result.error };

  const events: ContractTimelineEvent[] = (result.data ?? []).map(item => ({
    id: item.id,
    contractId: item.contract_id,
    status: item.to_status,
    eventType: 'status_change',
    correlationId: item.correlation_id ?? undefined,
    occurredAt: item.created_at,
    actorId: item.actor_id ?? undefined,
    metadata: item.metadata ?? undefined,
  }));

  return { data: sortContractTimeline(events), error: null };
}
