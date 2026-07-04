import { useTranslation } from 'react-i18next';
import { TrendingUp, RefreshCw, ArrowRightLeft, Target, Calendar, UserCheck, AlertTriangle } from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import type { PaymentStream } from '../../lib/supabase';

interface SixStreamsGridProps {
  streams: PaymentStream[];
  amounts?: Record<string, number>;
}

const streamIcons: Record<string, LucideIcon> = {
  new_sales: TrendingUp,
  renewal: RefreshCw,
  cross_sell: ArrowRightLeft,
  plan_bonus: Target,
  annual_bonus: Calendar,
  retention_bonus: UserCheck,
};

export function SixStreamsGrid({ streams, amounts = {} }: SixStreamsGridProps) {
  const { t } = useTranslation();

  const formatAmount = (stream: PaymentStream) => {
    const amount = amounts[stream.id] || 0;
    if (stream.percent) {
      return `${stream.percent}%`;
    }
    if (stream.amount) {
      return `$${amount.toLocaleString()}`;
    }
    if (stream.release) {
      return '1/12';
    }
    if (stream.clawback) {
      return `$${amount.toLocaleString()}`;
    }
    return '$0';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {streams.map((stream) => {
        const Icon = streamIcons[stream.id] || TrendingUp;
        const hasClawback = stream.clawback;
        const isCompleted = amounts[stream.id] && amounts[stream.id] > 0;

        return (
          <div
            key={stream.id}
            className={`card hover:border-gold/30 transition-all duration-200 cursor-pointer ${
              hasClawback ? 'border-orange/30' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg ${hasClawback ? 'bg-orange/20' : 'bg-gold/20'}`}>
                <Icon className={`w-5 h-5 ${hasClawback ? 'text-orange' : 'text-gold'}`} />
              </div>
              {hasClawback && (
                <div className="flex items-center gap-1 text-orange text-xs">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Clawback</span>
                </div>
              )}
            </div>

            <h4 className="text-sm text-text-secondary mb-1">
              {t(`paymentStreams.${stream.id}`)}
            </h4>

            <div className="flex items-end justify-between">
              <span className={`text-xl font-display font-bold ${isCompleted ? 'text-success' : 'text-text-primary'}`}>
                {formatAmount(stream)}
              </span>
              {isCompleted && (
                <span className="text-xs text-success flex items-center gap-1">
                  <span className="w-2 h-2 bg-success rounded-full" />
                  Paid
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
