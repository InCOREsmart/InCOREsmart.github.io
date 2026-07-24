import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DollarSign, Shield, CheckCircle, AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { supabase, Contract } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export function AgentPayoutsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const { data } = await supabase.from('contracts').select('*').eq('agent_id', user.id);
        setContracts(data || []);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchData();
  }, [user]);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(amount);

  if (loading) return <DashboardLayout><div className="p-8 text-[#000052]">{t('common.loading')}</div></DashboardLayout>;

  const totalPayout = contracts.reduce((sum, c) => sum + (c.agent_payouts_total || 0), 0);
  const completedPayout = contracts.filter(c => c.status === 'COMPLETED').reduce((sum, c) => sum + (c.agent_payouts_total || 0), 0);

  const streams = [
    { key: 'newSales', name: t('payouts.newSales'), percent: 50, color: 'bg-[#000052]' },
    { key: 'renewal', name: t('payouts.renewal'), percent: 15, color: 'bg-blue-500' },
    { key: 'crossSell', name: t('payouts.crossSell'), percent: 10, color: 'bg-indigo-500' },
    { key: 'planBonus', name: t('payouts.planBonus'), percent: 10, color: 'bg-purple-500' },
    { key: 'retention', name: t('payouts.retention'), percent: 10, color: 'bg-[#B8860B]' },
    { key: 'annual', name: t('payouts.annual'), percent: 5, color: 'bg-green-500' },
  ];

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#000052]">{t('payouts.title')}</h1>
        <p className="text-gray-600 mt-1">{t('payouts.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card bg-gradient-to-br from-[#B8860B]/10 to-[#B8860B]/5 border-[#B8860B]/30">
          <div className="flex items-center gap-3"><DollarSign className="w-5 h-5 text-[#B8860B]" /><div><p className="text-xs text-gray-600">{t('agent.pendingPayouts')}</p><p className="text-2xl font-bold text-[#000052]">{formatCurrency(totalPayout - completedPayout)} ₽</p></div></div>
        </div>
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center gap-3"><CheckCircle className="w-5 h-5 text-green-600" /><div><p className="text-xs text-gray-600">{t('agent.totalEarned')}</p><p className="text-2xl font-bold text-[#000052]">{formatCurrency(completedPayout)} ₽</p></div></div>
        </div>
        <div className="card bg-gradient-to-br from-[#B8860B]/10 to-[#B8860B]/5 border-[#B8860B]/30">
          <div className="flex items-center gap-3"><Shield className="w-5 h-5 text-[#B8860B]" /><div><p className="text-xs text-gray-600">{t('payouts.instantRelease')}</p><p className="text-2xl font-bold text-[#000052]">Мгновенно</p></div></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-[#000052] mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-gray-600" /> Структура выплат
          </h2>
          <div className="space-y-4">
            {streams.map((stream) => (
              <div key={stream.key} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-[#000052]">{stream.name}</span>
                  <span className="text-sm font-bold text-[#B8860B]">{stream.percent}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div className={`h-full ${stream.color} rounded-full`} style={{ width: `${stream.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-[#000052] mb-6 flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#B8860B]" /> Условия смарт-контракта
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800">Выплата при верификации</p>
                <p className="text-xs text-green-700 mt-1">Как только Оракул подтверждает поступление средств от клиента, смарт-контракт мгновенно переводит вашу комиссию на расчетный счет.</p>
              </div>
            </div>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-yellow-800">Clawback (Удержание)</p>
                <p className="text-xs text-yellow-700 mt-1">Бонус за удержание (10%) не выплачивается, если клиент расторгает договор в течение первых 90 дней. Это защищает бизнес от фрода.</p>
              </div>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-800">Годовой бонус (5%)</p>
                <p className="text-xs text-blue-700 mt-1">Накапливается ежемесячно (1/12). Выплачивается в конце года при выполнении KPI. Ваши деньги застрахованы математикой.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}