export interface CorrelatedAuditEvent {
  correlationId: string;
  contractId?: string;
  eventType: string;
  occurredAt: string;
  payload?: Record<string, unknown>;
}

export function createCorrelationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createAuditEvent(eventType: string, correlationId: string, payload?: Record<string, unknown>): CorrelatedAuditEvent {
  return { correlationId, eventType, occurredAt: new Date().toISOString(), payload };
}
