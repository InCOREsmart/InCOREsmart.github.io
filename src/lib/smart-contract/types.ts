export interface ContractVersionSnapshot {
  version: number;
  termsSnapshot: Record<string, unknown>;
  termsLockedAt?: string;
  engineVersion: string;
}

export interface CorrelationFields { correlationId: string; }
