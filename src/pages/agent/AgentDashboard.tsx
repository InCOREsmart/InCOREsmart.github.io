import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DollarSign, Shield, Briefcase, CheckCircle, Target, ArrowUpRight, Clock } from 'lucide-react';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { supabase, Contract } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { TrendingUp } from 'lucide-react';

export function AgentDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [metrics, setMetrics] = useState({ totalEarned: 0, pendingPayouts: 0, escrowBalance: 0, activeContracts: 0, completedContracts: 0 });
  const [activeContractsList, setActiveContractsList] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const { data: contracts } = await supabase.from('contracts').select('*').eq('agent_id', user.id).order('created_at', { ascending: false });
        if (contracts) {
          calculateMetrics(contracts);
          setActiveContractsList(contracts.filter(c => ['ACTIVE', 'IN_PROGRESS', 'PENDING_APPROVAL'].includes(c.status)).slice(0, 5));
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchData();
  }, [user]);

  const calculateMetrics = (contracts: Contract[]) => {
    let earned = 0, pending = 0, escrow = 0, active = 0, completed = 0;
    contracts.forEach((c) => {
      const payout = c.agent_payouts_total || 0;
      const esc = c.escrow_amount || 0;
      if (c.status === 'COMPLETED') { earned += payout; completed++; }
      else if (['ACTIVE', 'IN_PROGRESS', 'PENDING_APPROVAL'].includes(c.status)) { pending += payout; escrow += esc; active++; }
    });
    setMetrics({ totalEarned: earned, pendingPayouts: pending, escrowBalance: escrow, activeContracts: active, completedContracts: completed });
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(amount);

  if (loading) return <DashboardLayout><div className="p-8 text-[#000052]">{t('common.loading')}</div></DashboardLayout>;

  const streams = [
    { name: t('payouts.newSales'), percent: 50, color: 'bg-[#000052]' },
    { name: t('payouts.renewal'), percent: 15, color: 'bg-blue-500' },
    { name: t('payouts.crossSell'), percent: 10, color: 'bg-indigo-500' },
    { name: t('payouts.planBonus'), percent: 10, color: 'bg-purple-500' },
    { name: t('payouts.retention'), percent: 10, color: 'bg-[#B8860B]' },
    { name: t('payouts.annual'), percent: 5, color: 'bg-green-500' },
  ];

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#000052]">{t('agent.dashboardTitle')}</h1>
        <p className="text-gray-600 mt-1">{t('agent.dashboardSubtitle')}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="card bg-gradient-to-br from-[#B8860B]/10 to-[#B8860B]/5 border-[#B8860B]/30">
          <div className="flex items-center justify-between mb-3"><DollarSign className="w-5 h-5 text-[#B8860B]" /><ArrowUpRight className="w-4 h-4 text-green-600" /></div>
          <p className="text-2xl font-bold text-[#000052]">{formatCurrency(metrics.totalEarned)} ₽</p>
          <p className="text-xs text-gray-600 mt-1">{t('agent.totalEarned')}</p>
        </div>
        <div className="card bg-gradient-to-br from-[#B8860B]/10 to-[#B8860B]/5 border-[#B8860B]/30">
          <div className="flex items-center justify-between mb-3"><Clock className="w-5 h-5 text-[#B8860B]" /><Target className="w-4 h-4 text-[#B8860B]" /></div>
          <p className="text-2xl font-bold text-[#000052]">{formatCurrency(metrics.pendingPayouts)} ₽</p>
          <p className="text-xs text-gray-600 mt-1">{t('agent.pendingPayouts')}</p>
        </div>
        <div className="card bg-gradient-to-br from-[#B8860B]/10 to-[#B8860B]/5 border-[#B8860B]/30">
          <div className="flex items-center justify-between mb-3"><Shield className="w-5 h-5 text-[#B8860B]" /><CheckCircle className="w-4 h-4 text-[#B8860B]" /></div>
          <p className="text-2xl font-bold text-[#000052]">{formatCurrency(metrics.escrowBalance)} ₽</p>
          <p className="text-xs text-gray-600 mt-1">{t('agent.escrowBalance')}</p>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-3"><Briefcase className="w-5 h-5 text-blue-600" /><TrendingUp className="w-4 h-4 text-blue-600" /></div>
          <p className="text-2xl font-bold text-[#000052]">{metrics.activeContracts}</p>
          <p className="text-xs text-gray-600 mt-1">{t('agent.activeContracts')}</p>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-3"><CheckCircle className="w-5 h-5 text-purple-600" /><ArrowUpRight className="w-4 h-4 text-purple-600" /></div>
          <p className="text-2xl font-bold text-[#000052]">{metrics.completedContracts}</p>
          <p className="text-xs text-gray-600 mt-1">{t('agent.completedContracts')}</p>
        </div>
      </div>

      {/* 6 Streams & Smart Contract Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="card lg:col-span-2">
          <h2 className="text-lg font-semibold text-[#000052] mb-6 flex items-center gap-2">
            <Target className="w-5 h-5 text-gray-600" /> {t('agent.paymentStreams')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {streams.map((stream) => (
              <div key={stream.name} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-[#000052]">{stream.name}</span>
                  <span className="text-sm font-bold text-gray-600">{stream.percent}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div className={`h-full ${stream.color} rounded-full`} style={{ width: `${stream.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <h2 className="text-lg font-semibold text-[#000052] mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-600" /> {t('agent.smartContractStatus')}
          </h2>
          <div className="space-y-4">
            <div className="p-3 bg-white rounded-lg border border-green-200 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800">{t('agent.fundsVerified')}</p>
                <p className="text-xs text-green-700 mt-1">Средства заблокированы в эскроу и будут выплачены автоматически после верификации Оракулом.</p>
              </div>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 flex items-start gap-3">
              <Shield className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-yellow-800">Clawback</p>
                <p className="text-xs text-yellow-700 mt-1">{t('agent.clawbackWarning')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Contracts Table */}
      <div className="card">
        <h2 className="text-lg font-semibold text-[#000052] mb-6 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-gray-600" /> {t('agent.myActiveContracts')}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Название</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Статус</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Эскроу</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Дедлайн</th>
              </tr>
            </thead>
            <tbody>
              {activeContractsList.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-gray-500">{t('agent.noActiveContracts')}</td></tr>
              ) : (
                activeContractsList.map((contract) => (
                  <tr key={contract.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-[#000052]">{contract.title}</td>
                    <td className="py-3 px-4"><span className="badge badge-info">{t(`contract.statuses.${contract.status}`) || contract.status}</span></td>
                    <td className="py-3 px-4 text-right font-semibold text-[#000052]">{formatCurrency(contract.escrow_amount || 0)} ₽</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{new Date(contract.deadline).toLocaleDateString('ru-RU')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}