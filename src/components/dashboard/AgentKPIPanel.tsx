import { Target } from 'lucide-react';
import { KPIProgressBar } from '../ui';

export function AgentKPIPanel() {
  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gold/20 rounded-lg">
          <Target className="w-5 h-5 text-gold" />
        </div>

        <h2 className="text-lg font-display font-semibold text-text-primary">
          KPI
        </h2>
      </div>

      <div className="space-y-6">

        <KPIProgressBar
          label="Звонки"
          current={85}
          target={100}
          color="gold"
        />

        <KPIProgressBar
          label="Встречи"
          current={12}
          target={20}
          color="gold"
        />

        <KPIProgressBar
          label="Предложения"
          current={8}
          target={10}
          color="success"
        />

        <KPIProgressBar
          label="Выручка"
          current={25000}
          target={50000}
          unit="$"
          color="success"
        />

      </div>
    </div>
  );
}