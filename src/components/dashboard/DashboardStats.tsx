import { useTranslation } from 'react-i18next';
import { DollarSign, Clock, FileText, CheckCircle } from 'lucide-react';
import { StatCard } from '../ui';

interface DashboardStatsProps {
  activeTasks: number;
  completedTasks: number;
  totalEarnings: number;
  pendingPayouts: number;
}

export function DashboardStats({
  activeTasks,
  completedTasks,
  totalEarnings,
  pendingPayouts,
}: DashboardStatsProps) {
  const { t } = useTranslation(); // Добавили хук для переводов

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard
        title={t('dashboard.activeContracts')}
        value={activeTasks}
        icon={FileText}
      />

      <StatCard
        title={t('dashboard.completedContracts')}
        value={completedTasks}
        icon={CheckCircle}
      />

      <StatCard
        title={t('dashboard.totalEarned')}
        value={`$${totalEarnings.toLocaleString()}`}
        icon={DollarSign}
      />

      <StatCard
        title={t('dashboard.pendingPayouts')}
        value={`$${pendingPayouts.toLocaleString()}`}
        icon={Clock}
      />
    </div>
  );
}