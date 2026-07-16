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
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard
        title="Активные контракты"
        value={activeTasks}
        icon={FileText}
      />

      <StatCard
        title="Завершенные контракты"
        value={completedTasks}
        icon={CheckCircle}
      />

      <StatCard
        title="Всего заработано"
        value={`$${totalEarnings.toLocaleString()}`}
        icon={DollarSign}
      />

      <StatCard
        title="Ожидают выплаты"
        value={`$${pendingPayouts.toLocaleString()}`}
        icon={Clock}
      />
    </div>
  );
}