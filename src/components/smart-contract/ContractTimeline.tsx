import { useEffect, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getContractTimeline } from '../../lib/smart-contract/timelineService';

export function ContractTimeline({ contractId }: { contractId: string }) {
  const { t, i18n } = useTranslation();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const result = await getContractTimeline(contractId);
      if (active) {
        setEvents(result.data ?? []);
        setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [contractId]);

  const locale = i18n.language === 'ru' ? 'ru-RU' : i18n.language === 'az' ? 'az-AZ' : i18n.language === 'kk' || i18n.language === 'kz' ? 'kk-KZ' : 'en-US';
  const statusLabel = (status: string) => {
    const key = `contract.statuses.${status}`;
    const translated = t(key);
    return translated === key ? status : translated;
  };

  return (
    <section className="bg-white p-5 rounded-xl border border-[#000052]/10">
      <h2 className="text-xl font-bold text-[#000052] mb-5">{t('contractDetail.timeline', 'Timeline')}</h2>
      {loading ? (
        <div className="text-sm text-[#000052]/60">{t('ui.loading')}</div>
      ) : events.length === 0 ? (
        <div className="text-sm text-[#000052]/60">{t('contractDetail.noTimelineEvents', 'No timeline events')}</div>
      ) : (
        <div className="space-y-4">
          {events.map((event, index) => (
            <div key={event.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-full bg-[#B8860B]/10 flex items-center justify-center">
                  <Clock3 className="w-4 h-4 text-[#B8860B]" />
                </div>
                {index < events.length - 1 && <div className="w-px flex-1 bg-[#000052]/10 mt-1" />}
              </div>
              <div className="pb-4 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-[#000052]">{statusLabel(event.status)}</span>
                  {event.correlationId && <span className="text-[10px] text-[#000052]/40 font-mono truncate max-w-[220px]">{event.correlationId}</span>}
                </div>
                <p className="text-xs text-[#000052]/60 mt-1">{new Date(event.occurredAt).toLocaleString(locale)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
