export enum ContractStatus {
  DRAFT = 'DRAFT',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  ACTIVE = 'ACTIVE',
  IN_PROGRESS = 'IN_PROGRESS',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  COMPLETED = 'COMPLETED',
  DISPUTED = 'DISPUTED',
  CANCELLED = 'CANCELLED',
}

const transitions: Record<ContractStatus, ContractStatus[]> = {
  [ContractStatus.DRAFT]: [
    ContractStatus.PENDING_PAYMENT,
    ContractStatus.CANCELLED,
  ],
  [ContractStatus.PENDING_PAYMENT]: [
    ContractStatus.ACTIVE,
    ContractStatus.CANCELLED,
  ],
  [ContractStatus.ACTIVE]: [
    ContractStatus.IN_PROGRESS,
    ContractStatus.DISPUTED,
    ContractStatus.CANCELLED,
  ],
  [ContractStatus.IN_PROGRESS]: [
    ContractStatus.PENDING_APPROVAL,
    ContractStatus.DISPUTED,
    ContractStatus.CANCELLED,
  ],
  [ContractStatus.PENDING_APPROVAL]: [
    ContractStatus.ACTIVE,
    ContractStatus.COMPLETED,
    ContractStatus.DISPUTED,
  ],
  [ContractStatus.COMPLETED]: [],
  [ContractStatus.DISPUTED]: [
    ContractStatus.COMPLETED,
    ContractStatus.CANCELLED,
  ],
  [ContractStatus.CANCELLED]: [],
};

export function canTransition(from: ContractStatus, to: ContractStatus): boolean {
  return transitions[from]?.includes(to) ?? false;
}

export function assertTransition(from: ContractStatus, to: ContractStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid contract transition: ${from} → ${to}`);
  }
}
