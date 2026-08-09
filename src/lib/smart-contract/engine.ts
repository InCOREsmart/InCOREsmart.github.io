import type { ContractStatus, StateTransition } from './stateMachine';
import { canTransition, getAvailableTransitions } from './stateMachine';

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

export function evaluateContractTransition(context: ContractEngineContext, targetStatus: ContractStatus): ContractTransitionResult {
  const allowed = canTransition(context.currentStatus, targetStatus);
  if (!allowed) return { allowed: false, reason: `Transition ${context.currentStatus} -> ${targetStatus} is not allowed` };
  const transition = getAvailableTransitions(context.currentStatus).find(item => item.to === targetStatus);
  return { allowed: true, transition };
}

export function getContractTransitions(status: ContractStatus): StateTransition[] {
  return getAvailableTransitions(status);
}
