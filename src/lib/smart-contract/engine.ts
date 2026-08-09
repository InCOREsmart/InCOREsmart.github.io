import { supabase } from '../supabase';
import { canTransition, ContractStatus } from './stateMachine';
import { recordContractStatusChange } from './statusHistory';

export interface StateTransition {
  from: ContractStatus;
  to: ContractStatus;
}

export interface ContractEngineContext {
  contractId: string;
  currentStatus: ContractStatus;
  actorRole?: 'agent' | 'ceo' | 'admin' | 'system';
  correlationId?: string;
  engineVersion?: string;
}

export interface ContractTransitionResult {
  allowed: boolean;
  transition?: StateTransition;
  reason?: string;
}

const transitionTargets: Record<ContractStatus, ContractStatus[]> = {
  [ContractStatus.DRAFT]: [ContractStatus.PENDING_PAYMENT, ContractStatus.CANCELLED],
  [ContractStatus.PENDING_PAYMENT]: [ContractStatus.ACTIVE, ContractStatus.CANCELLED],
  [ContractStatus.ACTIVE]: [ContractStatus.IN_PROGRESS, ContractStatus.DISPUTED, ContractStatus.CANCELLED],
  [ContractStatus.IN_PROGRESS]: [ContractStatus.PENDING_APPROVAL, ContractStatus.DISPUTED, ContractStatus.CANCELLED],
  [ContractStatus.PENDING_APPROVAL]: [ContractStatus.ACTIVE, ContractStatus.COMPLETED, ContractStatus.DISPUTED],
  [ContractStatus.COMPLETED]: [],
  [ContractStatus.DISPUTED]: [ContractStatus.COMPLETED, ContractStatus.CANCELLED],
  [ContractStatus.CANCELLED]: [],
};

export function evaluateContractTransition(context: ContractEngineContext, targetStatus: ContractStatus): ContractTransitionResult {
  if (!canTransition(context.currentStatus, targetStatus)) {
    return { allowed: false, reason: `Transition ${context.currentStatus} -> ${targetStatus} is not allowed` };
  }
  return { allowed: true, transition: { from: context.currentStatus, to: targetStatus } };
}

export function getContractTransitions(status: ContractStatus): StateTransition[] {
  return transitionTargets[status].map((to) => ({ from: status, to }));
}

function createCorrelationId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Single persistence boundary for contract status changes.
 * UI actions can use this function without duplicating validation and history writes.
 */
export async function transitionContractStatus(input: {
  contractId: string;
  targetStatus: ContractStatus;
  actorId?: string | null;
  actorRole?: ContractEngineContext['actorRole'];
  reason?: string | null;
  correlationId?: string;
}): Promise<{ success: boolean; error?: string; correlationId?: string }> {
  try {
    const { data: contract, error: fetchError } = await supabase
      .from('contracts')
      .select('id,status,engine_version')
      .eq('id', input.contractId)
      .single();

    if (fetchError) throw fetchError;

    const currentStatus = contract.status as ContractStatus;
    const evaluation = evaluateContractTransition(
      {
        contractId: input.contractId,
        currentStatus,
        actorRole: input.actorRole,
        correlationId: input.correlationId,
        engineVersion: contract.engine_version ?? '1.0',
      },
      input.targetStatus,
    );

    if (!evaluation.allowed) {
      return { success: false, error: evaluation.reason };
    }

    const correlationId = input.correlationId ?? createCorrelationId();
    const { error: updateError } = await supabase
      .from('contracts')
      .update({ status: input.targetStatus })
      .eq('id', input.contractId)
      .eq('status', currentStatus);

    if (updateError) throw updateError;

    const history = await recordContractStatusChange({
      contractId: input.contractId,
      fromStatus: currentStatus,
      toStatus: input.targetStatus,
      actorId: input.actorId,
      correlationId,
      reason: input.reason,
      metadata: {
        actor_role: input.actorRole ?? null,
        engine_version: contract.engine_version ?? '1.0',
      },
    });

    if (history.error) {
      console.error('Contract status history write failed:', history.error);
      return { success: false, error: history.error.message, correlationId };
    }

    return { success: true, correlationId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
