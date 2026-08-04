import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { DollarSign, ShieldCheck, Clock, TrendingUp, CheckCircle } from 'lucide-react';

interface Payout {
  id: string;
  contract_id: string;
  contract_title: string;
  type: string;
  amount: number;
  status: string;
  created_at: string;
  paid_at?: string;
}

export function AgentPayoutsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [agentInfo, setAgentInfo] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data: agentData } = await supabase
          .from('agents')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (agentData) {
          setAgentInfo(agentData);

          const { data: contractsData } = await supabase
            .from('contracts')
            .select('*')
            .eq('agent_id', agentData.id)
            .eq('status', 'COMPLETED');

          if (contractsData && contractsData.length > 0) {
            const payoutsData: Payout[] = [];
            
            contractsData.forEach(contract => {
              const revenue = contract.revenue || contract.kpi_revenue || 0;
              
              payoutsData.push({
                id: `${contract.id}-new-sales`,
                contract_id: contract.id,
                contract_title: contract.title,
                type: 'new_sales',
                amount: revenue * 0.50,
                status: 'paid',
                created_at: contract.created_at,
                paid_at: contract.deadline,
              });

              payoutsData.push({
                id: `${contract.id}-renewal`,
                contract_id: contract.id,
                contract_title: contract.title,
                type: 'renewal',
                amount: revenue * 0.15,
                status: 'paid',
                created_at: contract.created_at,
                paid_at: contract.deadline,
              });

              payoutsData.push({
                id: `${contract.id}-cross-sell`,
                contract_id: contract.id,
                contract_title: contract.title,
                type: 'cross_sell',
                amount: revenue * 0.10,
                status: 'paid',
                created_at: contract.created_at,
                paid_at: contract.deadline,
              });

              payoutsData.push({
                id: `${contract.id}-plan-bonus`,
                contract_id: contract.id,
                contract_title: contract.title,
                type: 'plan_bonus',
                amount: revenue * 0.10,
                status: 'paid',
                created_at: contract.created_at,
                paid_at: contract.deadline,
              });

              payoutsData.push({
                id: `${contract.id}-retention`,
                contract_id: contract.id,
                contract_title: contract.title,
                type: 'retention',
                amount: revenue * 0.10,
                status: 'pending',
                created_at: contract.created_at,
              });

              payoutsData.push({
                id: `${contract.id}-annual`,
                contract_id: contract.id,
                contract_title: contract.title,
                type: 'annual',
                amount: revenue * 0.05,
                status: 'pending',
                created_at: contract.created_at,
              });
            });

            setPayouts(payoutsData);
          }
        }
      } catch (err) {
        console.error('Ошибка загрузки выплат:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const totalPaid = payouts
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPending = payouts
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalAmount = totalPaid + totalPending;

  const payoutsByType = {
    new_sales: payouts.filter(p => p.type === 'new_sales').reduce((sum, p) => sum + p.amount, 0),
    renewal: payouts.filter(p => p.type === 'renewal').reduce((sum, p) => sum + p.amount, 0),
    cross_sell: payouts.filter(p => p.type === 'cross_sell').reduce((sum, p) => sum + p.amount, 0),
    plan_bonus: payouts.filter(p => p.type === 'plan_bonus').reduce((sum, p) => sum + p.amount, 0),
    retention: payouts.filter(p => p.type === 'retention').reduce((sum, p) => sum + p.amount, 0),
    annual: payouts.filter(p => p.type === 'annual').reduce((sum, p) => sum + p.amount, 0),
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      new_sales: 'Новые продажи (50%)',
      renewal: 'Продление (15%)',
      cross_sell: 'Кросс-продажи (10%)',
      plan_bonus: 'Бонус за план (10%)',
      retention: 'Удержание 90 дней (10%)',
      annual: 'Годовой бонус (5%)',
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'paid') {
      return (
        <span className="px-3 py-1 bg-[#B8860B]/10 text-[#B8860B] rounded-full text-xs font-semibold flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Выплачено
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-[#000052]/10 text-[#000052] rounded-full text-xs font-semibold flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Ожидает
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-[#000052]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8860B]"></div>
        <p className="mt-2">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#000052]">{t('payouts.title')}</h1>
        <p className="text-sm text-[#000052]/70 mt-1">{t('payouts.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#B8860B] text-white p-5 rounded-xl border border-[#B8860B]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium opacity-80">Всего заработано</h3>
            <DollarSign className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-2xl font-bold">${totalAmount.toLocaleString()}</p>
          <p className="text-xs opacity-70 mt-1">По всем контрактам</p>
        </div>

        <div className="bg-[#000052] text-white p-5 rounded-xl border border-[#000052]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium opacity-80">Выплачено</h3>
            <CheckCircle className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-2xl font-bold">${totalPaid.toLocaleString()}</p>
          <p className="text-xs opacity-70 mt-1">Уже на вашем счету</p>
        </div>

        <div className="bg-white text-[#000052] p-5 rounded-xl border border-[#000052]/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[#000052]/70">Ожидает выплаты</h3>
            <Clock className="w-5 h-5 text-[#B8860B]" />
          </div>
          <p className="text-2xl font-bold text-[#000052]">${totalPending.toLocaleString()}</p>
          <p className="text-xs text-[#000052]/60 mt-1">После верификации</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
        <h2 className="text-lg font-bold text-[#000052] mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#B8860B]" />
          Детализация по 6 потокам
        </h2>
        <div className="space-y-3">
          {Object.entries(payoutsByType).map(([type, amount]) => (
            <div key={type} className="flex justify-between items-center p-4 bg-[#000052]/5 rounded-lg border border-[#000052]/10">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${type === 'retention' ? 'bg-[#B8860B]' : 'bg-[#000052]'}`}></div>
                <span className="text-sm font-medium text-[#000052]">{getTypeLabel(type)}</span>
              </div>
              <span className="text-lg font-bold text-[#000052]">${amount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#000052]/10 overflow-hidden">
        <div className="p-4 border-b border-[#000052]/10">
          <h3 className="text-lg font-bold text-[#000052]">История выплат</h3>
        </div>
        {payouts.length === 0 ? (
          <div className="text-center py-12 text-[#000052]/60">
            <DollarSign className="w-16 h-16 mx-auto mb-4 text-[#000052]/20" />
            <p className="text-lg font-medium mb-2">Нет выплат</p>
            <p className="text-sm">Выплаты появятся здесь после завершения контрактов</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-[#000052]/5">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">Тип</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">Контракт</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">Сумма</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">Дата создания</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#000052]/5">
                {payouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-[#000052]/5 transition">
                    <td className="py-4 px-4">
                      <span className="text-sm font-medium text-[#000052]">{getTypeLabel(payout.type)}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-[#000052]">{payout.contract_title}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm font-bold text-[#B8860B]">${payout.amount.toLocaleString()}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-[#000052]/70">
                        {new Date(payout.created_at).toLocaleDateString('ru-RU')}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {getStatusBadge(payout.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-[#B8860B]/10 border-2 border-[#B8860B]/30 p-6 rounded-xl">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-6 h-6 text-[#B8860B] flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-bold text-[#000052] mb-2">Условия смарт-контракта</h3>
            <div className="space-y-2 text-sm text-[#000052]/80">
              <p>
                <strong>Бонус за удержание (10%)</strong> — выплачивается ТОЛЬКО если клиент остается с компанией более 90 дней.
                Если клиент уходит раньше — бонус не выплачивается (Clawback).
              </p>
              <p>
                <strong>Годовой бонус (5%)</strong> — накапливается ежемесячно (1/12 от годовой суммы) и выплачивается в конце года
                при выполнении KPI.
              </p>
              <p>
                <strong>Остальные бонусы (50% + 15% + 10% + 10% = 85%)</strong> — выплачиваются мгновенно после верификации
                результата через InCORE (поступление денег от клиента, подписание продления, выполнение KPI).
              </p>
            </div>
          </div>
        </div>
      </div>

      {agentInfo && (
        <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
          <h3 className="text-lg font-bold text-[#000052] mb-4">Ваш налоговый статус</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-[#000052]/5 rounded-lg border border-[#000052]/10">
              <p className="text-xs text-[#000052]/60 mb-1">Статус</p>
              <p className="text-sm font-semibold text-[#000052]">
                {agentInfo.tax_status === 'self_employed' ? 'Самозанятый (6%)' : 'ИП (6%)'}
              </p>
            </div>
            <div className="p-4 bg-[#000052]/5 rounded-lg border border-[#000052]/10">
              <p className="text-xs text-[#000052]/60 mb-1">ИНН</p>
              <p className="text-sm font-semibold text-[#000052]">{agentInfo.inn || '—'}</p>
            </div>
          </div>
          <p className="text-xs text-[#000052]/60 mt-4">
            Налоги (6%) автоматически удерживаются платформой и перечисляются в налоговую.
            Вы получаете сумму за вычетом налогов.
          </p>
        </div>
      )}
    </div>
  );
}