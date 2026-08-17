import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  ArrowLeft,
  DollarSign,
  ShieldCheck,
  Clock,
  Activity,
  Radio,
} from 'lucide-react';

import { evaluateContractTransition } from '../../lib/smart-contract/engine';
import { createCorrelationId } from '../../lib/smart-contract/audit';
import {
  recordContractStatusChange,
  getContractStatusHistory,
  type ContractStatusHistoryRecord,
} from '../../lib/smart-contract/statusHistory';
import { ContractStatus } from '../../lib/smart-contract/stateMachine';
import {
  checkContractHealth,
  type ContractHealthCheck,
} from '../../lib/smart-contract/healthCheck';
import {
  getOracleTrustLevel,
  type OracleTrust,
} from '../../lib/smart-contract/oracleTrust';

import { getAnnualBonusForAgent } from '../../lib/annualBonus';

import {
  getContractAccountingSnapshot,
  getStoredPayoutAmounts,
  money,
} from '../../lib/contractFinance';

export function AgentContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [contract, setContract] = useState<any>(null);
  const [streams, setStreams] = useState<any[]>([]);
  const [history, setHistory] = useState<ContractStatusHistoryRecord[]>([]);
  const [health, setHealth] = useState<ContractHealthCheck | null>(null);
  const [oracleTrust, setOracleTrust] = useState<OracleTrust | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    const fetchContract = async () => {
      if (!user || !id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('contracts')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (fetchError) {
          setError(fetchError.message);
          return;
        }

        if (!data) {
          setError(t('agentContractDetail.errorTitle'));
          return;
        }

        setContract(data);

        setHealth(
          checkContractHealth({
            id: data.id,
            status: data.status as ContractStatus,
            engineVersion: data.engine_version || '1.0',
            version: data.version ?? 1,
          })
        );

        const streamsResult = await supabase
          .from('contract_payout_streams')
          .select('*')
          .eq('contract_id', data.id)
          .order('created_at', { ascending: true });

        if (!streamsResult.error) {
          setStreams(streamsResult.data || []);
        }

        const oracleResult = await supabase
          .from('oracle_events')
          .select('id,event_type,payload,created_at')
          .eq('contract_id', data.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!oracleResult.error && oracleResult.data) {
          const payload = (oracleResult.data.payload || {}) as Record<
            string,
            unknown
          >;

          setOracleTrust(
            getOracleTrustLevel({
              confirmed:
                payload.confirmed === true ||
                payload.status === 'confirmed' ||
                payload.status === 'CONFIRMED',
              signatureValid:
                typeof payload.signatureValid === 'boolean'
                  ? payload.signatureValid
                  : undefined,
              duplicate: payload.duplicate === true,
              stale: payload.stale === true,
            })
          );
        } else {
          setOracleTrust(getOracleTrustLevel({ confirmed: false }));
        }

        const historyResult = await getContractStatusHistory(data.id);

        if (!historyResult.error) {
          setHistory(
            (historyResult.data ?? []) as ContractStatusHistoryRecord[]
          );
        }
      } catch (err) {
        console.error(err);
        setError(t('agentContractDetail.errorTitle'));
      } finally {
        setLoading(false);
      }
    };

    fetchContract();
  }, [user, id, t]);

  const handleAccept = async () => {
    if (!contract || !user) return;

    setAccepting(true);

    const fromStatus = contract.status as ContractStatus;
    const targetStatus = ContractStatus.ACTIVE;

    const transition = evaluateContractTransition(
      {
        contractId: contract.id,
        currentStatus: fromStatus,
        actorRole: 'agent',
        engineVersion: contract.engine_version || '1.0',
      },
      targetStatus
    );

    if (!transition.allowed) {
      setAccepting(false);

      alert(
        `${t('agentContractDetail.errorTitle')}: ${transition.reason}`
      );

      return;
    }

    const correlationId = createCorrelationId();

    try {
      const { error: updateError } = await supabase
        .from('contracts')
        .update({ status: targetStatus })
        .eq('id', contract.id)
        .eq('status', fromStatus);

      if (updateError) throw updateError;

      const historyResult = await recordContractStatusChange({
        contractId: contract.id,
        fromStatus,
        toStatus: targetStatus,
        actorId: user.id,
        correlationId,
        reason: 'agent_acceptance',
      });

      if (historyResult.error) {
        throw historyResult.error;
      }

      setHistory((previous) => [
        ...previous,
        {
          id: correlationId,
          contract_id: contract.id,
          from_status: fromStatus,
          to_status: targetStatus,
          actor_id: user.id,
          correlation_id: correlationId,
          reason: 'agent_acceptance',
          metadata: null,
          created_at: new Date().toISOString(),
        },
      ]);

      setContract((current: any) => ({
        ...current,
        status: targetStatus,
      }));
    } catch (err: any) {
      await supabase
        .from('contracts')
        .update({ status: fromStatus })
        .eq('id', contract.id)
        .eq('status', targetStatus);

      alert(
        `${t('agentContractDetail.errorTitle')}: ${err.message}`
      );
    } finally {
      setAccepting(false);
    }
  };

  const locale =
    i18n.language === 'ru'
      ? 'ru-RU'
      : i18n.language === 'az'
        ? 'az-AZ'
        : i18n.language === 'kk' || i18n.language === 'kz'
          ? 'kk-KZ'
          : 'en-US';

  if (loading) {
    return (
      <div className="p-4 md:p-8 text-center text-[#000052]">
        {t('common.loading')}
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <div className="bg-[#000052]/5 border border-[#000052]/10 rounded-xl p-5 md:p-6">
          <h3 className="text-lg font-bold text-[#000052] mb-2">
            {t('agentContractDetail.errorTitle')}
          </h3>

          <p className="text-sm text-[#000052]/70 mb-4 break-words">
            {error || t('contract.noContracts')}
          </p>

          <button
            onClick={() => navigate('/agent/contracts')}
            className="px-4 py-2 bg-[#000052] text-white rounded-lg text-sm"
          >
            {t('agentContractDetail.backShort')}
          </button>
        </div>
      </div>
    );
  }

  /*
   * ЕДИНЫЙ ИСТОЧНИК ФИНАНСОВЫХ РАСЧЁТОВ.
   *
   * Финансовое ядро используется здесь только для
   * финансовых показателей, которые имеет право видеть агент.
   *
   * Комиссия платформы, прибыль компании и ROI компании
   * НЕ выводятся в кабинете агента.
   */
  const accounting = getContractAccountingSnapshot({
    ...contract,
    payout_streams: streams,
  });

  const payout = getStoredPayoutAmounts(streams);

  const annualBonus = getAnnualBonusForAgent(
    {
      contracts: [contract],
    },
    new Date().getFullYear()
  );

  const contractValue = money(accounting.revenue);
  const escrow = money(accounting.escrow);
  const paid = money(accounting.paid);
  const locked = money(accounting.locked);

  const deadlineDate = new Date(contract.deadline);

  const daysLeft = Math.ceil(
    (deadlineDate.getTime() - Date.now()) / 86400000
  );

  const isExpired = daysLeft <= 0;
  const isCompleted = contract.status === 'COMPLETED';

  const status = String(
    isCompleted
      ? t('agentContractDetail.completed')
      : isExpired
        ? t('agentContractDetail.expired')
        : t(
            `contract.statuses.${contract.status}`,
            contract.status
          )
  );

  const healthLabel = String(
    health?.healthy
      ? t('smartContract.healthHealthy', 'Здоров')
      : t('smartContract.healthWarning', 'Требует внимания')
  );

  const trustLabel = String(
    oracleTrust
      ? t(oracleTrust.labelKey, oracleTrust.level)
      : t('oracleTrust.untrusted', 'Не подтвержден')
  );

  /*
   * Финансовые потоки берём из сохранённых payout streams.
   * Annual остаётся отдельно и НЕ входит в escrow.
   */
  const payoutRows = [
    {
      key: 'property',
      label: 'Имущество/риски',
      value: payout.property,
    },
    {
      key: 'casco',
      label: 'Автопарки (КАСКО)',
      value: payout.casco,
    },
    {
      key: 'dms',
      label: 'Медицина (ДМС)',
      value: payout.dms,
    },
    {
      key: 'renewal',
      label: String(t('agentContractDetail.renewal')),
      value: payout.renewal,
    },
    {
      key: 'crossSell',
      label: String(t('agentContractDetail.crossSell')),
      value: payout.crossSell,
    },
    {
      key: 'planBonus',
      label: String(t('agentContractDetail.planBonus')),
      value: payout.planBonus,
    },
    {
      key: 'retention',
      label: String(t('agentContractDetail.retention')),
      value: payout.retention,
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-5xl mx-auto w-full min-w-0 overflow-x-hidden">
      <button
        onClick={() => navigate('/agent/contracts')}
        className="flex items-center text-[#000052]/70 mb-2 md:mb-4 text-sm"
      >
        <ArrowLeft className="w-4 h-4 mr-2 flex-shrink-0" />

        {t('agentContractDetail.back')}
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
        <h1 className="text-xl md:text-2xl font-bold text-[#000052] break-words min-w-0">
          {contract.title}
        </h1>

        <span className="self-start sm:self-auto px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-semibold bg-[#000052]/5 text-[#000052] whitespace-nowrap">
          {status}
        </span>
      </div>

      <div
        className={`p-4 rounded-xl border ${
          isExpired
            ? 'bg-[#000052]/5 border-[#000052]/10'
            : 'bg-[#B8860B]/5 border-[#B8860B]/10'
        }`}
      >
        <div className="flex items-start gap-3">
          <Clock className="w-6 h-6 text-[#B8860B] flex-shrink-0 mt-0.5" />

          <div className="min-w-0">
            <p className="font-semibold text-[#000052] break-words">
              {isExpired
                ? t('agentContractDetail.deadlineClosed')
                : t('agentContractDetail.daysLeft', {
                    count: daysLeft,
                  })}
            </p>

            <p className="text-sm text-[#000052]/70 break-words">
              {t('agentContractDetail.closingDate')}:{' '}
              {deadlineDate.toLocaleDateString(locale)}
            </p>
          </div>
        </div>
      </div>

      {/* ОСНОВНЫЕ ФИНАНСОВЫЕ ПОКАЗАТЕЛИ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-[#B8860B]/10 p-4 rounded-xl border border-[#B8860B]/20 min-w-0">
          <p className="text-xs text-[#B8860B] mb-1">
            {t('ui.escrow')}
          </p>

          <p className="text-xl font-bold text-[#B8860B] break-words">
            ${escrow.toLocaleString()}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#000052]/10 min-w-0">
          <p className="text-xs text-[#000052]/60 mb-1">
            Сумма контракта
          </p>

          <p className="text-xl font-bold text-[#000052] break-words">
            ${contractValue.toLocaleString()}
          </p>
        </div>

        <div className="bg-[#000052]/5 p-4 rounded-xl border border-[#000052]/10 min-w-0">
          <p className="text-xs text-[#000052]/60 mb-1">
            {t('agentContractDetail.smartContract')}
          </p>

          <p className="text-sm font-semibold text-[#000052] flex items-start gap-1 break-words">
            <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />

            Ваши деньги защищены смарт-контрактом
          </p>
        </div>
      </div>

      {/* HEALTH / ORACLE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        <div
          className={`p-4 md:p-5 rounded-xl border ${
            health?.healthy
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-[#B8860B]/10 border-[#B8860B]/20'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-[#000052] flex-shrink-0" />

            <h3 className="font-bold text-[#000052]">
              Contract Health
            </h3>
          </div>

          <p className="font-semibold text-[#000052]">
            {healthLabel}
          </p>
        </div>

        <div className="p-4 md:p-5 rounded-xl border bg-white border-[#000052]/10">
          <div className="flex items-center gap-2 mb-2">
            <Radio className="w-5 h-5 text-[#B8860B] flex-shrink-0" />

            <h3 className="font-bold text-[#000052]">
              Oracle Trust
            </h3>
          </div>

          <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 max-w-full break-words">
            {trustLabel}
          </span>
        </div>
      </div>

      {/* ПОТОКИ ВЫПЛАТ */}
      <div className="bg-white p-4 md:p-6 rounded-xl border border-[#000052]/10 min-w-0">
        <h3 className="text-lg font-bold text-[#000052] mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-[#B8860B] flex-shrink-0" />

          Потоки выплат
        </h3>

        <div className="space-y-2 md:space-y-3">
          {payoutRows.map((stream) => (
            <div
              key={stream.key}
              className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-1 p-3 rounded-lg bg-[#000052]/5 min-w-0"
            >
              <span className="text-sm text-[#000052]/80 break-words">
                {stream.label}
              </span>

              <span className="font-semibold text-[#000052] whitespace-nowrap">
                ${money(stream.value).toLocaleString()}
              </span>
            </div>
          ))}

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-3 rounded-lg bg-[#B8860B]/10 border border-[#B8860B]/20 min-w-0">
            <div className="min-w-0">
              <span className="text-sm text-[#000052]/80 break-words">
                {String(t('agentContractDetail.annualBonus'))}
              </span>

              <p className="text-xs text-[#000052]/60 mt-1 break-words">
                Накоплено {annualBonus.progressPercent}% годового
                плана. Годовой бонус не входит в escrow.
              </p>
            </div>

            <span className="font-semibold text-[#000052] whitespace-nowrap">
              ${money(payout.annual).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* ИТОГОВЫЙ РАСЧЁТ */}
      <div className="bg-white p-4 md:p-6 rounded-xl border border-[#000052]/10 min-w-0">
        <h3 className="text-lg font-bold text-[#000052] mb-4">
          Итоговый расчёт
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
          <div>
            <div className="text-xs text-gray-400">
              Сумма контракта
            </div>

            <div className="font-bold text-[#000052] mt-1 break-words">
              ${contractValue.toLocaleString()}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-400">
              Эскроу
            </div>

            <div className="font-bold text-[#B8860B] mt-1 break-words">
              ${escrow.toLocaleString()}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-400">
              Выплачено
            </div>

            <div className="font-bold text-emerald-600 mt-1 break-words">
              ${paid.toLocaleString()}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-400">
              Заблокировано
            </div>

            <div className="font-bold text-[#000052] mt-1 break-words">
              ${locked.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* ПРИНЯТИЕ КОНТРАКТА */}
      {contract.status === 'DRAFT' && (
        <button
          onClick={handleAccept}
          disabled={accepting}
          className="w-full sm:w-auto px-5 py-3 bg-[#000052] text-white rounded-xl font-semibold disabled:opacity-50"
        >
          {accepting
            ? t('common.loading')
            : t('agentContractDetail.accept')}
        </button>
      )}
    </div>
  );
}
