import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users, DollarSign, Target, ShieldCheck, Mail, Phone, Award } from 'lucide-react';
import { AddAgentModal } from '../../components/ui/AddAgentModal';
import { DEMO_AGENTS } from '../../lib/demoData';
import { getAnnualBonusForAgent } from '../../lib/annualBonus';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const demoKPI = (agent: any) => {
  if (!agent.contracts?.length) return 0;
  const values = agent.contracts.map((contract: any) => contract.kpi_calls > 0 ? Math.round((Number(contract.actual_calls || 0) / Number(contract.kpi_calls)) * 100) : 0);
  return Math.round(values.reduce((sum: number, value: number) => sum + value, 0) / values.length);
};
const realKPI = (contracts: any[]) => {
  const activeContracts = contracts.filter(contract => contract.status === 'ACTIVE' || contract.status === 'IN_PROGRESS');
  if (!activeContracts.length) return 0;
  const values = activeContracts.map(contract => {
    const pairs = [[contract.actual_calls, contract.kpi_calls], [contract.actual_meetings, contract.kpi_meetings], [contract.actual_proposals, contract.kpi_proposals], [contract.actual_clients, contract.target_clients]].filter(([, target]) => Number(target || 0) > 0);
    if (pairs.length) return Math.round(pairs.reduce((sum, [actual, target]) => sum + (Number(actual || 0) / Number(target || 1)) * 100, 0) / pairs.length);
    const planned = Number(contract.planned_revenue || contract.sales_plan || contract.target_revenue || 0);
    return planned > 0 ? Math.round(Number(contract.actual_revenue || contract.revenue || contract.sales_amount || 0) / planned * 100) : 0;
  });
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
};

const displaySpecialization = (value: any) => value === 'insurance_b2b' ? 'B2B Страхование' : (value || '—');
const displayStartDate = (agent: any, locale: string) => {
  const value = agent.start_date || agent.created_at;
  return value ? new Date(value).toLocaleDateString(locale) : '—';
};

export function CEOAgentsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadAgents = async () => {
      try {
        const demoAgents = DEMO_AGENTS.map(agent => ({ id: agent.id, full_name: agent.full_name, email: agent.email, phone: agent.phone, specialization: agent.specialization, status: 'ACTIVE', contracts_count: agent.contracts.length, total_revenue: agent.contracts.reduce((sum, contract) => sum + contract.revenue, 0), kpi_achievement: demoKPI(agent), active_contracts: agent.contracts.filter(contract => contract.status === 'ACTIVE' || contract.status === 'IN_PROGRESS').length, annual_bonus: getAnnualBonusForAgent(agent, 2026), start_date: agent.start_date }));
        let realAgents: any[] = [];
        if (user) {
          const { data: company, error: companyError } = await supabase.from('companies').select('id').eq('user_id', user.id).maybeSingle();
          if (companyError) throw companyError;
          let query = supabase.from('agents').select('*');
          if (company?.id) query = query.eq('company_id', company.id);
          const { data, error } = await query.order('created_at', { ascending: false });
          if (error) throw error;
          realAgents = (data || []).map(agent => ({ ...agent, contracts: [], contracts_count: 0, total_revenue: 0, kpi_achievement: 0, active_contracts: 0, annual_bonus: getAnnualBonusForAgent({ contracts: [] }, 2026) }));
          const ids = realAgents.map(agent => agent.id).filter(Boolean);
          if (ids.length) {
            const { data: contracts, error: contractsError } = await supabase.from('contracts').select('*').in('agent_id', ids);
            if (contractsError) throw contractsError;
            (contracts || []).forEach(contract => { const agent = realAgents.find(item => item.id === contract.agent_id); if (!agent) return; agent.contracts.push(contract); agent.contracts_count++; agent.total_revenue += Number(contract.revenue || contract.planned_revenue || 0); if (contract.status === 'ACTIVE' || contract.status === 'IN_PROGRESS') agent.active_contracts++; });
            realAgents.forEach(agent => { agent.kpi_achievement = realKPI(agent.contracts); agent.annual_bonus = getAnnualBonusForAgent(agent, 2026); });
          }
        }
        setAgents([...demoAgents, ...realAgents]);
      } catch (error) {
        console.error(error);
        setAgents(DEMO_AGENTS.map(agent => ({ ...agent, contracts_count: agent.contracts.length, total_revenue: agent.contracts.reduce((sum, contract) => sum + contract.revenue, 0), kpi_achievement: demoKPI(agent), active_contracts: agent.contracts.filter(contract => contract.status === 'ACTIVE' || contract.status === 'IN_PROGRESS').length, annual_bonus: getAnnualBonusForAgent(agent, 2026) })));
      } finally { setLoading(false); }
    };
    loadAgents();
  }, [user]);

  const filtered = useMemo(() => agents.filter(agent => agent.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || agent.email?.toLowerCase().includes(searchQuery.toLowerCase()) || displaySpecialization(agent.specialization).toLowerCase().includes(searchQuery.toLowerCase())), [agents, searchQuery]);
  const totalRevenue = agents.reduce((sum, agent) => sum + Number(agent.total_revenue || 0), 0);
  const avgKpi = agents.length ? Math.round(agents.reduce((sum, agent) => sum + Number(agent.kpi_achievement || 0), 0) / agents.length) : 0;
  const activeContracts = agents.reduce((sum, agent) => sum + Number(agent.active_contracts || 0), 0);
  const locale = i18n.language === 'ru' ? 'ru-RU' : i18n.language === 'az' ? 'az-AZ' : i18n.language === 'kk' || i18n.language === 'kz' ? 'kk-KZ' : 'en-US';
  if (loading) return <div className="p-8 text-center text-[#000052]">{t('ui.loading')}</div>;

  return <div className="p-4 md:p-6 space-y-6">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4"><div><h1 className="text-2xl md:text-3xl font-bold text-[#000052]">{t('layout.agents')}</h1><p className="text-sm text-[#000052]/70 mt-1">{t('ui.agentManagement')}</p></div><button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-[#B8860B] text-white rounded-lg text-sm font-semibold"><Plus className="w-4 h-4" />{t('agent.addAgent')}</button></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"><div className="bg-[#000052] text-white p-5 rounded-xl"><div className="flex justify-between mb-3"><span className="text-sm opacity-80">{t('ui.totalAgents')}</span><Users className="w-5 h-5" /></div><p className="text-2xl font-bold">{agents.length}</p></div><div className="bg-[#B8860B] text-white p-5 rounded-xl"><div className="flex justify-between mb-3"><span className="text-sm opacity-80">{t('ui.totalRevenue')}</span><DollarSign className="w-5 h-5" /></div><p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p></div><div className="bg-white text-[#000052] p-5 rounded-xl border border-[#000052]/10"><div className="flex justify-between mb-3"><span className="text-sm text-[#000052]/70">{t('ui.averageKPI')}</span><Target className="w-5 h-5 text-[#B8860B]" /></div><p className="text-2xl font-bold">{avgKpi}%</p></div><div className="bg-white text-[#000052] p-5 rounded-xl border border-[#000052]/10"><div className="flex justify-between mb-3"><span className="text-sm text-[#000052]/70">{t('ui.activeContracts')}</span><ShieldCheck className="w-5 h-5 text-[#B8860B]" /></div><p className="text-2xl font-bold">{activeContracts}</p></div></div>
    <div className="bg-white p-4 rounded-xl border border-[#000052]/10 relative"><Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-[#000052]/40" /><input type="text" placeholder={t('ui.searchAgents')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-[#000052]/5 border border-[#000052]/10 rounded-lg text-sm" /></div>
    <div className="bg-white rounded-xl border border-[#000052]/10 overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[1050px]"><thead className="bg-[#000052]/5"><tr>{['agent','specialization','startDate','contractsCount','revenue','kpi','active','annualBonus'].map(key => <th key={key} className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase">{key === 'revenue' ? t('ui.revenue') : key === 'kpi' ? 'KPI' : t(`ui.${key}`)}</th>)}</tr></thead><tbody className="divide-y divide-[#000052]/5">{filtered.map(agent => { const annual = agent.annual_bonus || getAnnualBonusForAgent(agent, 2026); return <tr key={agent.id} onClick={() => navigate(`/ceo/agents/${agent.id}`)} className="hover:bg-[#000052]/5 transition cursor-pointer"><td className="py-4 px-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-[#B8860B]/10 flex items-center justify-center"><Users className="w-5 h-5 text-[#B8860B]" /></div><div><div className="font-semibold text-[#000052] text-sm">{agent.full_name}</div><div className="flex items-center gap-3 mt-1"><span className="text-xs text-[#000052]/60 flex items-center gap-1"><Mail className="w-3 h-3" />{agent.email || '—'}</span><span className="text-xs text-[#000052]/60 flex items-center gap-1"><Phone className="w-3 h-3" />{agent.phone || '—'}</span></div></div></div></td><td className="py-4 px-4"><span className="px-3 py-1 bg-[#000052]/5 rounded-full text-xs font-medium">{displaySpecialization(agent.specialization)}</span></td><td className="py-4 px-4 text-sm text-[#000052]/70">{displayStartDate(agent, locale)}</td><td className="py-4 px-4"><span className="text-sm font-bold">{agent.contracts_count || 0}</span></td><td className="py-4 px-4"><span className="text-sm font-bold text-[#B8860B]">${Number(agent.total_revenue || 0).toLocaleString()}</span></td><td className="py-4 px-4"><div className="flex items-center gap-2"><div className="w-20 h-2 bg-[#000052]/10 rounded-full overflow-hidden"><div className="h-full bg-[#B8860B]" style={{ width: `${Math.min(Number(agent.kpi_achievement || 0), 100)}%` }} /></div><span className="text-sm font-bold">{agent.kpi_achievement || 0}%</span></div></td><td className="py-4 px-4"><div className="flex items-center gap-1"><Award className="w-4 h-4 text-[#B8860B]" /><span className="text-sm font-semibold">{agent.active_contracts || 0}</span></div></td><td className="py-4 px-4"><div className="min-w-[150px]"><div className="flex justify-between text-xs mb-1"><span className="font-semibold">${annual.accruedBonus.toLocaleString()} / ${annual.maxBonus.toLocaleString()}</span><span>{annual.progressPercent}%</span></div><div className="h-2 bg-[#000052]/10 rounded-full overflow-hidden"><div className="h-full bg-[#B8860B] rounded-full" style={{ width: `${Math.min(annual.progressPercent, 100)}%` }} /></div></div></td></tr>; })}</tbody></table></div></div>
    <AddAgentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onCreated={() => window.location.reload()} />
  </div>;
}
