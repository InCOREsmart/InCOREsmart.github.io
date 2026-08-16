import { getContractAccountingSnapshot } from '../contractFinance';

/**
 * Compatibility layer for the smart-contract module.
 *
 * Financial calculations live in contractFinance.ts. This file only adapts
 * those canonical values to the legacy KPI shape used by older screens.
 */
export interface ContractFinancialSnapshot {
  escrow: number;
  released: number;
  liability?: number;
  expectedIncome?: number;
  contract?: any;
}

export interface CEOFinancialKpi {
  locked: number;
  released: number;
  liability: number;
}

export function calculateCEOFinancialKpi(
  contracts: ContractFinancialSnapshot[],
): CEOFinancialKpi {
  return contracts.reduce(
    (result, contract) => {
      if (contract.contract) {
        const snapshot = getContractAccountingSnapshot(contract.contract);
        result.locked += snapshot.locked;
        result.released += snapshot.paid;
        result.liability += snapshot.locked;
        return result;
      }

      // Legacy callers may already provide a financial snapshot.
      // Do not invent a second financial formula here.
      result.locked += Math.max(0, Number(contract.escrow) - Number(contract.released));
      result.released += Math.max(0, Number(contract.released));
      result.liability += Math.max(
        0,
        Number(contract.liability ?? Math.max(0, Number(contract.escrow) - Number(contract.released))),
      );
      return result;
    },
    { locked: 0, released: 0, liability: 0 },
  );
}

export function calculateAgentExpectedIncome(
  contracts: ContractFinancialSnapshot[],
): number {
  return contracts.reduce((total, contract) => {
    if (contract.contract) {
      const snapshot = getContractAccountingSnapshot(contract.contract);
      return total + Math.max(0, snapshot.locked);
    }

    return total + Math.max(
      0,
      Number(contract.expectedIncome ?? Number(contract.escrow) - Number(contract.released)),
    );
  }, 0);
}
