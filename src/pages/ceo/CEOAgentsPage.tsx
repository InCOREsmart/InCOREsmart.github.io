import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users, DollarSign, Target, ShieldCheck, Mail, Phone } from 'lucide-react';
import { AddAgentModal } from '../../components/ui/AddAgentModal';
import { DEMO_AGENTS, calculateContractKPI } from '../../lib/demoData';
import { getAnnualBonusForAgent } from '../../lib/annualBonus';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const demoKPI = (agent: any) => {
  const activeContract = agent?.contracts?.find((contract: any) => contract.status === 'ACTIVE' || contract.status === 'IN_PROGRESS');
  return activeContract ? calculateContractKPI(activeContract) : 0;
};

const realKPI = (contracts: any[]) => {
  const activeContracts = contracts.filter(contract => contract.status === 'ACTIVE' || contract.status === 'IN_PROGRESS');
  if (!activeContracts.length) return 0;

  const values = activeContracts.map(contract => {
    const pairs = [
      [contract.actual_calls, contract.kpi_calls],
      [contract.actual_meetings, contract.kpi_meetings],
      [contract.actual_proposals, contract.kpi_proposals],
      [contract.actual_clients, contract.target_clients],
    ].filter(([, target]) => Number(target || 0) > 0);

    if (pairs.length) return Math.round(pairs.reduce((sum, [actual, target]) => sum + (Number(actual || 0) / Number(target || 1)) * 100, 0) / pairs.length);

    const planned = Number(contract.kpi_revenue || contract.planned_revenue || contract.sales_plan || contract.target_revenue || 0);
    const actual = Number(contract.actual_revenue || contract.sales_amount || 0);
    return planned > 0 ? Math.round((actual / planned) * 100) : 0;
  });

  return Math.round(values.reduce((sum: number, value: number) => sum + value, 0) / values.length);
};

const displaySpecialization = (agent: any) =>
  agent?.full_name === 'Киселева Наталья'
    ? 'EdTech & HRTech'
    : (agent?.specialization === 'insurance_b2b' ? 'B2B Страхование' : (agent?.specialization || '—'));

const displayStartDate = (agent: any, locale: string) => {
  if (agent?.full_name === 'Киселева Наталья') return '10.01.2026';
  const value = agent?.start_date || agent?.created_at;
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
        const demoNames = new Set(DEMO_AGENTS.map(agent => agent.full_name.trim().toLowerCase()));
        const demoAgents = DEMO_AGENTS.map(agent => ({
          id: agent.id,
          full_name: agent.full_name,
          email: agent.email,
          phone: agent.phone,
          specialization: agent.specialization,
          status: 'ACTIVE',
          contracts_count: agent.contracts.length,
          total_revenue: agent.contracts.reduce((sum, contract) => sum + contract.revenue, 0),
          kpi_achievement: demoKPI(agent),
          active_contracts: agent.contracts.filter(contract => contract.status === 'ACTIVE' || contract.status === 'IN_PROGRESS').length,
          annual_bonus: getAnnualBonusForAgent(agent, 2026),
          start_date: agent.start_date,
          contracts: agent.contracts,
        }));

        let realAgents: any[] = [];
        if (user) {
          const { data: company, error: companyError } = await supabase.from('companies').select('id').eq('user_id', user.id).maybeSingle();
          if (companyError) throw companyError;
          let query = supabase.from('agents').select('*');
          if (company?.id) query = query.eq('company_id', company.id);
          const { data, error } = await query.order('created_at', { ascending: false });
          if (error) throw error;

          const uniqueRealByName = new Map<string, any>();
          (data || []).forEach(agent => {
            const name = (agent.full_name || agent.name || agent.email || '').trim();
            if (!name || demoNames.has(name.toLowerCase())) return;
            const key = name.toLowerCase();
            if (!uniqueRealByName.has(key)) uniqueRealByName.set(key, agent);
          });

          realAgents = Array.from(uniqueRealByName.values()).map(agent => ({
            ...agent,
            contracts: [],
            contracts_count: 0,
            total_revenue: 0,
            kpi_achievement: 0,
            active_contracts: 0,
            annual_bonus: getAnnualBonusForAgent({ contracts: [] }, 2026),
          }));

          const ids = realAgents.map(agent => agent.id).filter(Boolean);
          if (ids.length) {
            const { data: contracts, error: contractsError } = await supabase.from('contracts').select('*').in('agent_id', ids).order('created_at', { ascending: false });
            if (contractsError) throw contractsError;
            const latestByAgent = new Map<string, any>();
            (contracts || []).forEach(contract => {
              if (!latestByAgent.has(contract.agent_id)) latestByAgent.set(contract.agent_id, contract);
            });
            latestByAgent.forEach((contract, agentId) => {
              const agent = realAgents.find(item => item.id === agentId);
              if (!agent) return;
              agent.contracts = [contract];
              agent.contracts_count = 1;
              agent.total_revenue = Number(contract.revenue || contract.planned_revenue || 0);
              agent.active_contracts = contract.status === 'ACTIVE' || contract.status === 'IN_PROGRESS' ? 1 : 0;
            });
            realAgents.forEach(agent => {
              agent.kpi_achievement = realKPI(agent.contracts);
              agent.annual_bonus = getAnnualBonusForAgent(agent, 2026);
            });
          }
        }

        setAgents([...demoAgents, ...realAgents]);
      } catch (error) {
        console.error(error);
        setAgents(DEMO_AGENTS.map(agent => ({
          ...agent,
          contracts_count: agent.contracts.length,
          total_revenue: agent.contracts.reduce((sum, contract) => sum + contract.revenue, 0),
          kpi_achievement: demoKPI(agent),
          active_contracts: agent.contracts.filter(contract => contract.status === 'ACTIVE' || contract.status === 'IN_PROGRESS').length,
          annual_bonus: getAnnualBonusForAgent(agent, 2026),
        })));
      } finally {
        setLoading(false);
      }
    };
    loadAgents();
  }, [user]);

  const filtered = useMemo(() => agents.filter(agent =>
    agent.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    displaySpecialization(agent).toLowerCase().includes(searchQuery.toLowerCase())
  ), [agents, searchQuery]);

  const totalRevenue = agents.reduce((sum, agent) => sum + Number(agent.total_revenue || 0), 0);
  const avgKpi = agents.length ? Math.round(agents.reduce((sum, agent) => sum + Number(agent.kpi_achievement || 0), 0) / agents.length) : 0;
  const activeContracts = agents.reduce((sum, agent) => sum + Number(agent.active_contracts || 0), 0);
  const locale = i18n.language === 'ru' ? 'ru-RU' : i18n.language === 'az' ? 'az-AZ' : i18n.language === 'kk' || i18n.language === 'kz' ? 'kk-KZ' : 'en-US';

  if (loading) return <div className="p-8 text-center text-[#000052]">{t('ui.loading')}</div>;

  const kpis = [
    { label: t('ui.totalAgents'), value: String(agents.length), icon: Users, box: 'bg-[#000052]/5 text-[#000052]', valueColor: agents.length > 0 ? 'text-[#000052]' : 'text-[#64748B]' },
    { label: t('ui.totalRevenue'), value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, box: 'bg-[#B8860B]/10 text-[#B8860B]', valueColor: totalRevenue > 0 ? 'text-[#000052]' : 'text-[#64748B]' },
    { label: t('ui.averageKPI'), value: `${avgKpi}%`, icon: Target, box: 'bg-[#000052]/5 text-[#000052]', valueColor: avgKpi > 0 ? 'text-[#000052]' : 'text-[#64748B]' },
    { label: t('ui.activeContracts'), value: String(activeContracts), icon: ShieldCheck, box: 'bg-[#B8860B]/10 text-[#B8860B]', valueColor: activeContracts > 0 ? 'text-[#000052]' : 'text-[#64748B]' },
  ];

  return <div className="w-full min-w-0 p-3 sm:p-4 md:p-8 space-y-5 md:space-y-6">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[26px] md:text-3xl font-bold text-[#000052] tracking-tight break-words">{t('layout.agents')}</h1>
        <p className="text-sm text-gray-400 mt-1 break-words">{t('ui.agentManagement')}</p>
      </div>
      <button onClick={() => setIsModalOpen(true)} className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-[#000052] text-white rounded-[14px] text-sm font-semibold shadow-[0_4px_16px_rgba(0,0,82,0.25)] hover:bg-[#14147a] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200">
        <Plus className="w-4 h-4" />{t('agent.addAgent')}
      </button>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
      {kpis.map((kpi, i) => { const Icon = kpi.icon; return <div key={i} className="bg-white p-4 md:p-5 rounded-2xl shadow-sm min-w-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,82,0.12)]">
        <div className="flex items-start justify-between gap-3 mb-4"><h3 className="text-sm font-medium text-gray-500 leading-tight min-w-0 break-words">{kpi.label}</h3><div className={`w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 ${kpi.box}`}><Icon className="w-5 h-5" /></div></div>
        <p className={`text-[26px] font-bold tracking-tight tabular-nums truncate ${kpi.valueColor}`}>{kpi.value}</p>
      </div>; })}
    </div>

    <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-sm relative min-w-0">
      <Search className="absolute left-6 sm:left-8 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input type="text" placeholder={t('ui.searchAgents')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full min-w-0 pl-10 sm:pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-[12px] text-sm text-[#000052] placeholder-gray-400 focus:ring-4 focus:ring-[#000052]/10 focus:border-[#000052] outline-none transition" />
    </div>

    <div className="md:hidden space-y-3">
      {filtered.length === 0 ? <div className="bg-white rounded-2xl shadow-sm p-6 text-center text-sm text-gray-500">{t('ui.noResults')}</div> : filtered.map(agent => {
        const annual = agent.annual_bonus || getAnnualBonusForAgent(agent, 2026);
        const kpi = Number(agent.kpi_achievement || 0);
        return <button key={agent.id} type="button" onClick={() => navigate(`/ceo/agents/${agent.id}`)} className="w-full text-left bg-white rounded-2xl shadow-sm p-4 min-w-0 hover:bg-[#000052]/[0.02] active:scale-[0.995] transition-all">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full bg-[#000052]/5 flex items-center justify-center flex-shrink-0"><Users className="w-5 h-5 text-[#000052]" /></div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-[#000052] text-sm break-words">{agent.full_name}</div>
              <div className="mt-1 text-xs text-gray-500 break-all">{agent.email || '—'}</div>
              {agent.phone && <div className="mt-1 text-xs text-gray-500 break-all">{agent.phone}</div>}
            </div>
            <span className="flex-shrink-0 px-2.5 py-1 bg-[#000052]/5 text-[#000052] rounded-full text-[11px] font-medium max-w-[42%] truncate">{displaySpecialization(agent)}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100">
            <div><div className="text-[11px] text-gray-400">{t('ui.startDate')}</div><div className="mt-1 text-sm font-medium text-gray-600">{displayStartDate(agent, locale)}</div></div>
            <div><div className="text-[11px] text-gray-400">{t('ui.contractsCount')}</div><div className="mt-1 text-sm font-bold text-[#000052] tabular-nums">{agent.contracts_count || 0}</div></div>
            <div><div className="text-[11px] text-gray-400">{t('ui.revenue')}</div><div className={`mt-1 text-sm font-bold tabular-nums ${Number(agent.total_revenue || 0) > 0 ? 'text-[#B8860B]' : 'text-[#64748B]'}`}>${Number(agent.total_revenue || 0).toLocaleString()}</div></div>
            <div><div className="text-[11px] text-gray-400">KPI</div><div className="mt-1 flex items-center gap-2"><div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-[#B8860B] to-[#D4A017] rounded-full" style={{ width: `${Math.min(kpi, 100)}%` }} /></div><span className="text-sm font-bold text-[#000052] tabular-nums">{kpi}%</span></div></div>
            <div><div className="text-[11px] text-gray-400">{t('ui.active')}</div><div className="mt-1 text-sm font-semibold text-[#000052] tabular-nums">{agent.active_contracts || 0}</div></div>
            <div><div className="text-[11px] text-gray-400">{t('ui.annualBonus')}</div><div className="mt-1 text-sm font-semibold text-[#000052] tabular-nums">${annual.accruedBonus.toLocaleString()} / ${annual.maxBonus.toLocaleString()}</div><div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-[#B8860B] to-[#D4A017] rounded-full" style={{ width: `${Math.min(annual.progressPercent, 100)}%` }} /></div><div className="mt-1 text-[11px] text-gray-500">{annual.progressPercent}%</div></div>
          </div>
        </button>;
      })}
    </div>

    <div className="hidden md:block bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1050px]"><thead><tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{['agent', 'specialization', 'startDate', 'contractsCount', 'revenue', 'kpi', 'active', 'annualBonus'].map(key => <th key={key} className={`py-3.5 px-5 ${key === 'revenue' ? 'text-right' : ''}`}>{key === 'revenue' ? t('ui.revenue') : key === 'kpi' ? 'KPI' : t(`ui.${key}`)}</th>)}</tr></thead><tbody className="divide-y divide-gray-50">
          {filtered.map(agent => { const annual = agent.annual_bonus || getAnnualBonusForAgent(agent, 2026); return <tr key={agent.id} onClick={() => navigate(`/ceo/agents/${agent.id}`)} className="hover:bg-[#000052]/[0.02] transition-colors cursor-pointer"><td className="py-4 px-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-[#000052]/5 flex items-center justify-center flex-shrink-0"><Users className="w-5 h-5 text-[#000052]" /></div><div className="min-w-0"><div className="font-semibold text-[#000052] text-sm break-words">{agent.full_name}</div><div className="flex items-center gap-3 mt-1"><span className="text-xs text-gray-500 flex items-center gap-1 break-all"><Mail className="w-3 h-3 flex-shrink-0" />{agent.email || '—'}</span><span className="text-xs text-gray-500 flex items-center gap-1 break-all"><Phone className="w-3 h-3 flex-shrink-0" />{agent.phone || '—'}</span></div></div></div></td><td className="py-4 px-5"><span className="px-3 py-1 bg-[#000052]/5 text-[#000052] rounded-full text-xs font-medium whitespace-nowrap">{displaySpecialization(agent)}</span></td><td className="py-4 px-5 text-sm text-gray-500">{displayStartDate(agent, locale)}</td><td className="py-4 px-5"><span className="text-sm font-bold text-[#000052] tabular-nums">{agent.contracts_count || 0}</span></td><td className="py-4 px-5 text-right"><span className={`text-sm font-bold tabular-nums ${Number(agent.total_revenue || 0) > 0 ? 'text-[#B8860B]' : 'text-[#64748B]'}`}>${Number(agent.total_revenue || 0).toLocaleString()}</span></td><td className="py-4 px-5"><div className="flex items-center gap-2"><div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-[#B8860B] to-[#D4A017] rounded-full" style={{ width: `${Math.min(Number(agent.kpi_achievement || 0), 100)}%` }} /></div><span className="text-sm font-bold text-[#000052] tabular-nums">{agent.kpi_achievement || 0}%</span></div></td><td className="py-4 px-5"><span className="text-sm font-semibold text-[#000052] tabular-nums">{agent.active_contracts || 0}</span></td><td className="py-4 px-5"><div className="min-w-[150px]"><div className="flex justify-end gap-3 text-xs mb-1"><span className="font-semibold text-[#000052] tabular-nums">${annual.accruedBonus.toLocaleString()} / ${annual.maxBonus.toLocaleString()}</span><span className="text-gray-500">{annual.progressPercent}%</span></div><div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-[#B8860B] to-[#D4A017] rounded-full" style={{ width: `${Math.min(annual.progressPercent, 100)}%` }} /></div></div></td></tr>; })}
        </tbody></table>
      </div>
    </div>

    <AddAgentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onCreated={() => window.location.reload()} />
  </div>;
}
