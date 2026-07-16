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
const streamTitles: Record<string, string> = {
  new_sales: 'Новые продажи',
  renewal: 'Продление',
  cross_sell: 'Кросс-продажи',
  plan_bonus: 'Бонус за выполнение плана',
  annual_bonus: 'Годовой бонус',
  retention_bonus: 'Удержание клиента',
};
export function SixStreamsGrid({ streams, amounts = {} }: SixStreamsGridProps) {
  const { t } = useTranslation();

  const total = Object.values(amounts).reduce(
    (sum, value) => sum + value,
    0
  );
const paidStreams = Object.values(amounts).filter(
  (value) => value > 0
).length;

const totalStreams = streams.length;

const lastUpdated = new Date().toLocaleDateString('ru-RU', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});
const completionPercent = Math.round(
  (paidStreams / totalStreams) * 100
);

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
  <>
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-display font-semibold text-text-primary">
        Потоки выплат
      </h2>

      <div className="text-right">
        <span className="text-2xl font-display font-bold text-gold">
          ${total.toLocaleString()}
        </span>

        <p className="text-xs text-text-secondary mt-1">
          Обновлено: {lastUpdated}
        </p>

        <p className="text-xs text-text-secondary">
          Выплачено потоков
        </p>

        <p className="text-sm font-semibold text-green-400">
          {paidStreams} из {totalStreams} ({completionPercent}%)
        </p>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {streams.map((stream) => {
        const Icon = streamIcons[stream.id] || TrendingUp;
        const hasClawback = stream.clawback;
        const isCompleted = (amounts[stream.id] || 0) > 0;

        return (
          <div
            key={stream.id}
            onClick={() => console.log(stream)}
            className={`card hover:border-gold/30 hover:scale-[1.02] transition-all duration-200 cursor-pointer ${
              hasClawback ? 'border-orange/30' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className={`p-2 rounded-lg ${
                  hasClawback ? 'bg-orange/20' : 'bg-gold/20'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    hasClawback ? 'text-orange' : 'text-gold'
                  }`}
                />
              </div>

              {hasClawback && (
                <div className="flex items-center gap-1 text-orange text-xs">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Возврат</span>
                </div>
              )}
            </div>

            <h4 className="text-sm text-text-secondary mb-1">
              {streamTitles[stream.id] ?? stream.id}
            </h4>

            <p className="text-xs text-text-muted mb-3">
              Нажмите, чтобы посмотреть детали начисления
            </p>

            <div className="mb-3">
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  isCompleted
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}
              >
                {isCompleted ? 'Активен' : 'Ожидает'}
              </span>
            </div>

            <div className="flex items-end justify-between">
              <span
                className={`text-xl font-display font-bold ${
                  isCompleted ? 'text-success' : 'text-text-primary'
                }`}
              >
                {formatAmount(stream)}
              </span>

              {isCompleted && (
                <span className="text-xs text-success flex items-center gap-1">
                  <span className="w-2 h-2 bg-success rounded-full" />
                  Выплачено
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </>
);
}
      