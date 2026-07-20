import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Shield, AlertTriangle, Check, AlertCircle, TrendingDown, Users } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface Risk {
  id: string;
  score: number; // 0-100
  status: 'safe' | 'warning' | 'danger';
}

interface RiskHedgingWidgetProps {
  risks: Risk[];
}

const riskIcons: Record<string, LucideIcon> = {
  fraud: AlertTriangle,
  nonPerformance: AlertCircle,
  quality: Check,
  deadline: TrendingDown,
  retention: Users,
};

export function RiskHedgingWidget({ risks }: RiskHedgingWidgetProps) {
  const { t, i18n } = useTranslation();
  const [key, setKey] = useState(0);

  // Force re-render when language changes
  useEffect(() => {
    setKey(prev => prev + 1);
  }, [i18n.language]);

  const getRiskName = (id: string): string => {
    switch (id) {
      case 'fraud':
        return t('risk.fraud');
      case 'nonPerformance':
        return t('risk.nonPerformance');
      case 'quality':
        return t('risk.quality');
      case 'deadline':
        return t('risk.deadline');
      case 'retention':
        return t('risk.retention');
      default:
        return id;
    }
  };

  const getStatusStyles = (status: Risk['status']) => {
    switch (status) {
      case 'safe':
        return {
          bg: 'bg-success/20',
          text: 'text-success',
          bar: 'bg-success',
        };
      case 'warning':
        return {
          bg: 'bg-orange/20',
          text: 'text-orange',
          bar: 'bg-orange',
        };
      case 'danger':
        return {
          bg: 'bg-error/20',
          text: 'text-error',
          bar: 'bg-error',
        };
    }
  };

  const overallRiskScore = Math.round(risks.reduce((sum, r) => sum + r.score, 0) / risks.length);

  return (
    <div className="card" key={key}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gold/20 rounded-lg">
          <Shield className="w-5 h-5 text-gold" />
        </div>
        <h3 className="text-lg font-display font-semibold text-text-primary">
          {t('risk.title')}
        </h3>
        <div className="ml-auto">
          <span className={`text-2xl font-display font-bold ${
            overallRiskScore >= 70 ? 'text-success' : overallRiskScore >= 40 ? 'text-orange' : 'text-error'
          }`}>
            {overallRiskScore}%
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {risks.map((risk) => {
          const Icon = riskIcons[risk.id] || Shield;
          const styles = getStatusStyles(risk.status);

          return (
            <div key={risk.id} className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${styles.bg}`}>
                <Icon className={`w-4 h-4 ${styles.text}`} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-text-secondary">{getRiskName(risk.id)}</span>
                  <span className={`text-sm font-medium ${styles.text}`}>{risk.score}%</span>
                </div>
                <div className="h-1.5 bg-primary-dark rounded-full overflow-hidden">
                  <div
                    className={`h-full ${styles.bar} transition-all duration-300 rounded-full`}
                    style={{ width: `${risk.score}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
