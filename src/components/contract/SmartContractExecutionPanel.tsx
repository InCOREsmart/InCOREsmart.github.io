import { CheckCircle, Clock3, Database, Link2, Lock, ShieldCheck, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SmartContractExecutionPanelProps {
  streams: any[];
  transactions?: any[];
  oracleEvents?: any[];
}

const PRIMARY_STREAM_KEYS = new Set([
  'new_sales_property',
  'new_sales_casco',
  'new_sales_dms',
  'renewal',
  'cross_sell',
  'retention',
]);

export function SmartContractExecutionPanel({ streams, transactions = [], oracleEvents = [] }: SmartContractExecutionPanelProps) {
  const { t } = useTranslation();
  const primaryStreams = streams.filter((stream) => PRIMARY_STREAM_KEYS.has(stream.stream_key)).slice(0, 6);
  const ledgerEvents = transactions;
  const retention = streams.find((stream) => stream.stream_key === 'retention');
  const clawbackApplied = retention?.status === 'CLAWED_BACK';

  const formatAmount = (value: unknown) => `$${Number(value || 0).toLocaleString()}`;
  const statusLabel = (status: string) => {
    const labels: Record<string, string> = {
      LOCKED: t('contractDetail.statusLocked'),
      UNLOCKED: t('contractDetail.statusUnlocked'),
      PAYABLE: t('contractDetail.statusPayable'),
      PAID: t('contractDetail.statusPaid'),
      CLAWED_BACK: t('contractDetail.statusClawedBack'),
      CANCELLED: t('contractDetail.statusCancelled'),
    };
    return labels[status] || status;
  };

  return (
    <section className="bg-white rounded-2xl shadow-sm p-4 sm:p-5 md:p-6 space-y-5 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#000052] shrink-0" />
            <h2 className="font-bold text-[#000052] text-base sm:text-lg break-words">{t('smartContract.title')}</h2>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1 break-words">{t('smartContract.subtitle')}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-[#000052]/5 px-3 py-1.5 text-xs font-semibold text-[#000052] shrink-0">
          <Zap className="w-3.5 h-3.5" />
          {t('smartContract.activeRule')}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-100 bg-[#F4F5F7] p-3 sm:p-4 min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500"><Lock className="w-4 h-4 text-[#000052]" />{t('smartContract.streams')}</div>
          <div className="mt-2 text-xl font-bold text-[#000052] tabular-nums">{primaryStreams.length}</div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-[#F4F5F7] p-3 sm:p-4 min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500"><Database className="w-4 h-4 text-[#000052]" />{t('smartContract.ledger')}</div>
          <div className="mt-2 text-xl font-bold text-[#000052] tabular-nums">{ledgerEvents.length}</div>
          <div className="text-xs text-gray-400 mt-0.5">{t('smartContract.events')}</div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-[#F4F5F7] p-3 sm:p-4 min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500"><Link2 className="w-4 h-4 text-[#B8860B]" />{t('smartContract.oracle')}</div>
          <div className="mt-2 text-xl font-bold text-[#000052] tabular-nums">{oracleEvents.length}</div>
          <div className="text-xs text-gray-400 mt-0.5">{t('smartContract.confirmations')}</div>
        </div>
      </div>

      <div className="min-w-0">
        <h3 className="text-sm font-bold text-[#000052] mb-3">{t('smartContract.streams')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {primaryStreams.map((stream) => (
            <div key={stream.id || stream.stream_key} className="rounded-xl border border-gray-100 p-3 sm:p-4 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-[#000052] text-sm leading-5 break-words min-w-0">{stream.title || stream.stream_key}</span>
                <CheckCircle className={`w-4 h-4 shrink-0 ${stream.status === 'PAID' ? 'text-[#000052]' : 'text-gray-300'}`} />
              </div>
              <div className="mt-3 flex items-end justify-between gap-2">
                <span className="text-base font-bold text-[#000052] tabular-nums break-words">{formatAmount(stream.amount)}</span>
                <span className="text-[11px] text-gray-400 shrink-0">{statusLabel(stream.status)}</span>
              </div>
            </div>
          ))}
        </div>
        {!primaryStreams.length && <p className="text-sm text-gray-400">{t('ui.noStreams')}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <div className="rounded-xl border border-gray-100 p-3 sm:p-4 min-w-0">
          <div className="flex items-center gap-2 mb-3"><Database className="w-4 h-4 text-[#000052]" /><h3 className="text-sm font-bold text-[#000052]">{t('smartContract.ledger')}</h3></div>
          {ledgerEvents.length ? (
            <div className="space-y-2">
              {ledgerEvents.slice(0, 5).map((event: any, index: number) => (
                <div key={event.id || index} className="flex items-start justify-between gap-3 rounded-lg bg-[#F4F5F7] p-3 min-w-0">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#000052] break-words">{event.transaction_type || event.type || event.event_type || t('smartContract.automatic')}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5 break-words">{event.created_at ? new Date(event.created_at).toLocaleString() : t('smartContract.automatic')}</div>
                  </div>
                  <span className="text-xs font-bold text-[#000052] tabular-nums shrink-0">{formatAmount(event.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-400"><Clock3 className="w-4 h-4 shrink-0" />{t('smartContract.noEvents')}</div>
          )}
        </div>

        <div className="rounded-xl border border-gray-100 p-3 sm:p-4 min-w-0">
          <div className="flex items-center gap-2 mb-3"><Link2 className="w-4 h-4 text-[#B8860B]" /><h3 className="text-sm font-bold text-[#000052]">{t('smartContract.oracle')}</h3></div>
          {oracleEvents.length ? (
            <div className="space-y-2">
              {oracleEvents.slice(0, 5).map((event: any, index: number) => (
                <div key={event.id || index} className="rounded-lg bg-[#F4F5F7] p-3 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-[#000052] break-words min-w-0">{event.event_type || event.type || t('smartContract.verified')}</span>
                    <span className="text-[11px] font-semibold text-[#B8860B] shrink-0">{t('smartContract.verified')}</span>
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5 break-words">{event.created_at ? new Date(event.created_at).toLocaleString() : '—'}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-400"><Clock3 className="w-4 h-4 shrink-0" />{t('smartContract.noOracleEvents')}</div>
          )}
        </div>
      </div>

      <div className={`rounded-xl p-3 sm:p-4 border min-w-0 ${clawbackApplied ? 'bg-[#faf3e0] border-[#B8860B]/25' : 'bg-[#000052]/5 border-[#000052]/10'}`}>
        <div className="flex items-start gap-3">
          <ShieldCheck className={`w-5 h-5 shrink-0 mt-0.5 ${clawbackApplied ? 'text-[#B8860B]' : 'text-[#000052]'}`} />
          <div className="min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
              <h3 className="text-sm font-bold text-[#000052]">{t('smartContract.clawback')}</h3>
              <span className={`text-xs font-semibold ${clawbackApplied ? 'text-[#B8860B]' : 'text-[#000052]'}`}>
                {clawbackApplied ? t('smartContract.clawbackApplied') : t('smartContract.clawbackNotTriggered')}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 break-words">{t('smartContract.clawbackDescription')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
