import { useTranslation } from 'react-i18next';
import { Target, Award } from 'lucide-react';
import { KPIProgressBar } from '../ui';

export function AgentKPIPanel() {
  const { t } = useTranslation();

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gold/20 rounded-lg">
          <Target className="w-5 h-5 text-gold" />
        </div>
        <h2 className="text-lg font-display font-semibold text-text-primary">
          {t('agentKPI.title')}
        </h2>
      </div>

      <div className="space-y-6">
        {/* 1 500$ Комиссия с продаж (из PDF) */}
        <KPIProgressBar
          label={t('agentKPI.newSales')}
          current={1200}
          target={1500}
          unit="$"
          color="gold"
        />

        {/* 200$ Продления (из PDF) */}
        <KPIProgressBar
          label={t('agentKPI.renewal')}
          current={150}
          target={200}
          unit="$"
          color="gold"
        />

        {/* 150$ Кросс-продажи (из PDF) */}
        <KPIProgressBar
          label={t('agentKPI.crossSell')}
          current={90}
          target={150}
          unit="$"
          color="success"
        />

        {/* 400$ 100% выполнение плана (из PDF) */}
        <KPIProgressBar
          label={t('agentKPI.planCompletion')}
          current={68}
          target={100}
          unit="%"
          color="success"
        />

        {/* 500$ дополнительный бонус за удержание клиентов (из PDF) */}
        <KPIProgressBar
          label={t('agentKPI.retention90d')}
          current={400}
          target={500}
          unit="$"
          color="gold"
        />

        {/* Годовой бонус: 10% от годовой премии ($50K от $500K) (из PDF) */}
        <div className="mt-6 p-4 bg-gradient-to-br from-gold/10 to-gold/5 rounded-lg border border-gold/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-gold" />
              <h4 className="text-sm font-semibold text-text-primary">
                {t('agentKPI.annualBonus')}
              </h4>
            </div>
            <span className="text-xs px-2 py-1 bg-gold/20 text-gold rounded-full">
              {t('agentKPI.notPaidYet')}
            </span>
          </div>

          <KPIProgressBar
            label={t('agentKPI.accrued')}
            current={18000}
            target={50000}
            unit="$"
            color="gold"
          />

          <p className="text-xs text-text-secondary mt-3 italic">
            {t('agentKPI.annualBonusHint')}
          </p>
        </div>
      </div>
    </div>
  );
}