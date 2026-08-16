export type EscrowOperation = 'lock' | 'release' | 'payout' | 'refund' | 'clawback';

export interface EscrowRequest {
  contractId: string;
  amount: number;
  currency?: string;
  reference?: string;
  metadata?: Record<string, unknown>;
}

export interface EscrowResult {
  success: boolean;
  operation: EscrowOperation;
  reference: string;
  amount: number;
  currency: string;
  error?: string;
}

export interface EscrowProvider {
  execute(operation: EscrowOperation, request: EscrowRequest): Promise<EscrowResult>;
}

/**
 * Provider boundary for the banking/escrow integration.
 * The financial engine does not know which bank is used.
 */
export class SimulatedEscrowProvider implements EscrowProvider {
  async execute(operation: EscrowOperation, request: EscrowRequest): Promise<EscrowResult> {
    const currency = request.currency ?? 'USD';
    const reference = request.reference ?? `ESC-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    return {
      success: true,
      operation,
      reference,
      amount: Math.max(0, Math.round(Number(request.amount) || 0)),
      currency,
    };
  }
}

export function createEscrowProvider(): EscrowProvider {
  return new SimulatedEscrowProvider();
}
