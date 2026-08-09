import type { ContractStatus } from './stateMachine';

export interface ContractHealthCheck { healthy: boolean; issues: string[]; }

export function checkContractHealth(contract: { id: string; status: ContractStatus; engineVersion?: string; version?: number | string }): ContractHealthCheck {
  const issues: string[] = [];
  if (!contract.id) issues.push('Missing contract id');
  if (!contract.status) issues.push('Missing contract status');
  if (!contract.engineVersion) issues.push('Missing engine version');
  if (contract.version === undefined || contract.version === null) issues.push('Missing contract version');
  return { healthy: issues.length === 0, issues };
}
