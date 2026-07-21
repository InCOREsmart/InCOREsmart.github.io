import { useTranslation } from 'react-i18next';
import { ContractStatus } from '../../lib/supabase';

interface ContractStatusBadgeProps {
  status: ContractStatus;
}

export function ContractStatusBadge({ status }: ContractStatusBadgeProps) {
  const { t } = useTranslation();

  const getStatusStyles = (status: ContractStatus) => {
    switch (status) {
      case 'ACTIVE':
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'PENDING_APPROVAL':
      case 'PENDING_MANUAL_APPROVAL': // <-- Новый статус
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'DRAFT':
      case 'PENDING_PAYMENT':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'DISPUTED':
      case 'DISPUTED_REJECTED': // <-- Новый статус
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyles(status)}`}>
      {t(`contract.statuses.${status}`) || status}
    </span>
  );
}