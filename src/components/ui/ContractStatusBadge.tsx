import React from 'react';
import { useTranslation } from 'react-i18next';
import { ContractStatus } from '../../lib/supabase';

interface ContractStatusBadgeProps {
  status: ContractStatus;
}

export function ContractStatusBadge({ status }: ContractStatusBadgeProps) {
  const { t } = useTranslation();

  const statusStyles: Record<ContractStatus, string> = {
    DRAFT: 'bg-text-secondary/20 text-text-secondary border-text-secondary/30',
    PENDING_PAYMENT: 'bg-orange/20 text-orange border-orange/30',
    ACTIVE: 'bg-success/20 text-success border-success/30',
    IN_PROGRESS: 'bg-primary-light/20 text-primary-light border-primary-light/30',
    PENDING_APPROVAL: 'bg-gold/20 text-gold border-gold/30',
    COMPLETED: 'bg-gold/20 text-gold border-gold/30',
    DISPUTED: 'bg-error/20 text-error border-error/30',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        statusStyles[status]
      }`}
    >
      {t(`contract.statuses.${status}`)}
    </span>
  );
}
