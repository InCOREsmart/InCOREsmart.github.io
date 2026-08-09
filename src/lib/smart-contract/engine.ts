import { canTransition, ContractStatus } from './stateMachine';

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
  [ContractStatus.PENDING_APPROVAL]: [ContractStatus.COMPLETED, ContractStatus.DISPUTED],
  [ContractStatus.COMPLETED]: [],
  [ContractStatus.DISPUTED]: [ContractStatus.COMPLETED, ContractStatus.CANCELLED],
  [ContractStatus.CANCELLED]: [],
};

export function evaluateContractTransition(
  context: ContractEngineContext,
  targetStatus: ContractStatus,
): ContractTransitionResult {
  if (!canTransition(context.currentStatus, targetStatus)) {
    return {
      allowed: false,
      reason: `Transition ${context.currentStatus} -> ${targetStatus} is not allowed`,
    };
  }

  return {
    allowed: true,
    transition: { from: context.currentStatus, to: targetStatus },
  };
}

export function getContractTransitions(status: ContractStatus): StateTransition[] {
  return transitionTargets[status].map((to) => ({ from: status, to }));
}
