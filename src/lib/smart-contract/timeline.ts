export interface ContractTimelineEvent {
  id: string;
  contractId: string;
  status?: string;
  eventType: string;
  correlationId?: string;
  occurredAt: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}

export function sortContractTimeline(events: ContractTimelineEvent[]): ContractTimelineEvent[] {
  return [...events].sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
}
