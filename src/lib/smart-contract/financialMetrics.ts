export interface ContractFinancialSnapshot {
  escrow: number;
  released: number;
  liability?: number;
  expectedIncome?: number;
}

export interface CEOFinancialKpi { locked: number; released: number; liability: number; }

export function calculateCEOFinancialKpi(contracts: ContractFinancialSnapshot[]): CEOFinancialKpi {
  return contracts.reduce((result, contract) => {
    const locked = Math.max(0, contract.escrow - contract.released);
    result.locked += locked;
    result.released += Math.max(0, contract.released);
    result.liability += Math.max(0, contract.liability ?? locked);
    return result;
  }, { locked: 0, released: 0, liability: 0 });
}

export function calculateAgentExpectedIncome(contracts: ContractFinancialSnapshot[]): number {
  return contracts.reduce((total, contract) => total + Math.max(0, contract.expectedIncome ?? contract.escrow - contract.released), 0);
}
