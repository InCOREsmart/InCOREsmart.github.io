import { useTranslation } from 'react-i18next';
import type { EscrowStatus } from '../../lib/supabase';

interface EscrowBadgeProps {
  status: EscrowStatus;
  size?: 'sm' | 'md' | 'lg';
}

export function EscrowBadge({ status, size = 'md' }: EscrowBadgeProps) {
  const { t } = useTranslation();

  const statusConfig = {
    PENDING: {
      bg: 'bg-text-secondary/20',
      text: 'text-text-secondary',
      dot: 'bg-text-secondary',
    },
    FUNDED: {
      bg: 'bg-success/20',
      text: 'text-success',
      dot: 'bg-success',
    },
    RELEASED: {
      bg: 'bg-gold/20',
      text: 'text-gold',
      dot: 'bg-gold',
    },
    FROZEN: {
      bg: 'bg-error/20',
      text: 'text-error',
      dot: 'bg-error',
    },
  };

  const config = statusConfig[status];
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full ${config.bg} ${config.text} ${sizeClasses[size]}`}>
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      {t(`contract.escrowStatuses.${status}`)}
    </span>
  );
}
