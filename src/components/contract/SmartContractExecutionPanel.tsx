import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Clock3, FileClock, Lock, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getContractFullData } from '../../lib/smartContractLogic';
import { getDemoContractById } from '../../lib/demoData';
import { getCompletedDemoContractById } from '../../lib/demoCompletedContracts';
import { getEscrowStreams } from '../../lib/annualBonus';

const CORE_STREAM_KEYS = [
  'new_sales_property',
  'new_sales_casco',
  'new_sales_dms',
  'renewal',
  'cross_sell',
  'plan_bonus',
] as const;

const text = {
  ru: {
    title: 'Исполнение смарт-контракта',
    subtitle: 'Потоки, подтверждения и финансовые события фиксируются системой.',
    streams: 'Основные финансовые потоки',
    retention: 'Удержание 90 дней',
    ledger: 'Журнал операций',
    oracle: 'Подтверждения Oracle',
    locked: 'Заблокировано',
    paid: 'Выплачено',
    waiting: 'Ожидает подтверждения',
    completed: 'Выполнено',
    clawedBack: 'Отменено по правилу',
    rule: 'Правило',
    ruleText: 'Если клиент прекращает договор раньше 90 дней, поток удержания отменяется.',
    noData: 'События появятся после исполнения условий контракта.',
    execution: 'Состояние исполнения',
    active: 'Активен',
    monitored: 'Контролируется автоматически',
  },
  en: {
    title: 'Smart contract execution',
    subtitle: 'Streams, confirmations and financial events are recorded by the system.',
    streams: 'Core financial streams',
    retention: '90-day retention',
    ledger: 'Transaction ledger',
    oracle: 'Oracle confirmations',
    locked: 'Locked',
    paid: 'Paid',
    waiting: 'Waiting for confirmation',
    completed: 'Completed',
    clawedBack: 'Cancelled by rule',
    rule: 'Rule',
    ruleText: 'If the client terminates the contract before 90 days, the retention stream is cancelled.',
    noData: 'Events will appear as contract conditions are executed.',
    execution: 'Execution status',
    active: 'Active',
    monitored: 'Automatically monitored',
  },
  kk: {
    title: 'Смарт-келісімшартты орындау',
    subtitle: 'Ағындар, растаулар және қаржылық оқиғалар жүйеде тіркеледі.',
    streams: 'Негізгі қаржылық ағындар',
    retention: '90 күндік ұстап қалу',
    ledger: 'Операциялар журналы',
    oracle: 'Oracle растаулары',
    locked: 'Бұғатталған',
    paid: 'Төленді',
    waiting: 'Растауды күтуде',
    completed: 'Орындалды',
    clawedBack: 'Ереже бойынша тоқтатылды',
    rule: 'Ереже',
    ruleText: 'Егер клиент шартты 90 күнге дейін тоқтатса, ұстап қалу ағыны жойылады.',
    noData: 'Оқиғалар шарт талаптары орындалған кезде пайда болады.',
    execution: 'Орындалу күйі',
    active: 'Белсенді',
    monitored: 'Автоматты бақылауда',
  },
  az: {
    title: 'Smart müqavilənin icrası',
    subtitle: 'Axınlar, təsdiqlər və maliyyə hadisələri sistemdə qeyd olunur.',
    streams: 'Əsas maliyyə axınları',
    retention: '90 günlük saxlanma',
    ledger: 'Əməliyyat jurnalı',
    oracle: 'Oracle təsdiqləri',
    locked: 'Bloklanıb',
    paid: 'Ödənilib',
    waiting: 'Təsdiq gözləyir',
    completed: 'Tamamlanıb',
    clawedBack: 'Qaydaya əsasən ləğv edilib',
    rule: 'Qayda',
    ruleText: 'Müştəri müqaviləni 90 gündən əvvəl dayandırarsa, saxlanma axını ləğv edilir.',
    noData: 'Hadisələr müqavilə şərtləri icra olunduqca görünəcək.',
    execution: 'İcra vəziyyəti',
    active: 'Aktiv',
    monitored: 'Avtomatik nəzarətdə',
  },
} as const;

function localeKey(language: string): keyof typeof text {
  if (language === 'az') return 'az';
  if (language === 'kk' || language === 'kz') return 'kk';
  if (language === 'en') return 'en';
  return 'ru';
}

function statusText(status: string, copy: (typeof text)['ru']) {
  if (status === 'PAID') return copy.paid;
  if (status === 'CLAWED_BACK' || status === 'CANCELLED') return copy.clawedBack;
  if (status === 'UNLOCKED' || status === 'PAYABLE') return copy.completed;
  return copy.waiting;
}

export function SmartContractExecutionPanel() {
  const { i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const copy = text[localeKey(i18n.resolvedLanguage || i18n.language || 'ru')];
  const [contract, setContract] = useState<any>(null);
  const [streams, setStreams] = useState<any[]>([]);
  const [ledgerCount, setLedgerCount] = useState(0);
  const [oracleCount, setOracleCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const demo = getDemoContractById(id) || getCompletedDemoContractById(id);
        if (demo) {
          if (cancelled) return;
          setContract(demo);
          setStreams(getEscrowStreams(demo.payout_streams || []));
          setLedgerCount((demo.escrow_events || []).length);
          setOracleCount((demo.oracle_events || []).length);
          return;
        }

        const data = await getContractFullData(id);
        if (cancelled || !data) return;
        setContract(data.contract);
        setStreams(getEscrowStreams(data.streams || []));
        setOracleCount((data.oracleEvents || []).length);

        const { count } = await supabase
          .from('transactions')
          .select('id', { count: 'exact', head: true })
          .eq('contract_id', id);
        if (!cancelled) setLedgerCount(count || 0);
      } catch (error) {
        console.error('Smart contract execution panel:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const coreStreams = useMemo(
    () => streams.filter(stream => CORE_STREAM_KEYS.includes(stream.stream_key)),
    [streams],
  );
  const retention = streams.find(stream => stream.stream_key === 'retention');

  if (loading || !contract) return null;

  return (
    <section className="w-full min-w-0 overflow-hidden rounded-2xl bg-white p-4 shadow-sm sm:p-5 md:p-6">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <ShieldCheck className="h-5 w-5 shrink-0 text-[#000052]" />
            <h2 className="min-w-0 break-words text-base font-bold text-[#000052] sm:text-lg">{copy.title}</h2>
          </div>
          <p className="mt-1 max-w-3xl break-words text-xs leading-5 text-gray-400 sm:text-sm">{copy.subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-xl bg-[#000052]/5 px-3 py-2 text-xs font-semibold text-[#000052]">
          <CheckCircle className="h-4 w-4" />
          <span>{copy.execution}: {copy.active}</span>
        </div>
      </div>

      <div className="mt-5 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="min-w-0 rounded-xl border border-gray-100 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#000052]"><Lock className="h-4 w-4" />{copy.streams}</div>
          <div className="space-y-2">
            {coreStreams.map(stream => (
              <div key={stream.id} className="flex min-w-0 items-center justify-between gap-3 border-b border-gray-50 py-2 last:border-0">
                <span className="min-w-0 break-words text-xs text-gray-500">{stream.title}</span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-[#000052]">${Number(stream.amount || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-gray-100 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#000052]"><FileClock className="h-4 w-4" />{copy.ledger}</div>
          <div className="text-2xl font-bold tabular-nums text-[#000052]">{ledgerCount}</div>
          <p className="mt-1 text-xs leading-5 text-gray-400">{copy.monitored}</p>
        </div>

        <div className="min-w-0 rounded-xl border border-gray-100 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#000052]"><Clock3 className="h-4 w-4" />{copy.oracle}</div>
          <div className="text-2xl font-bold tabular-nums text-[#000052]">{oracleCount}</div>
          <p className="mt-1 text-xs leading-5 text-gray-400">{copy.noData}</p>
        </div>
      </div>

      {retention && (
        <div className="mt-3 flex min-w-0 flex-col gap-3 rounded-xl border border-[#B8860B]/20 bg-[#B8860B]/5 p-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#8a6508]" />
            <div className="min-w-0">
              <div className="break-words text-sm font-semibold text-[#000052]">{copy.retention}</div>
              <p className="mt-1 break-words text-xs leading-5 text-gray-500">{copy.rule}: {copy.ruleText}</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#8a6508]">{statusText(retention.status, copy)}</span>
        </div>
      )}
    </section>
  );
}
