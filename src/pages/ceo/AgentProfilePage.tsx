import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Users, Mail, Phone, DollarSign, Target, ShieldCheck, Clock, FileText, Filter, Award } from 'lucide-react';
import { DemoContract, calculateAgentKPI, calculateContractKPI, getDemoAgentById } from '../../lib/demoData';
import { getAnnualBonusForAgent } from '../../lib/annualBonus';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type ContractFilter = 'ALL' | 'ACTIVE' | 'IN_PROGRESS' | 'COMPLETED';

const getContractStart = (contract: any) => contract.start_date || contract.start_at || contract.startDate || contract.created_at;
const getContractDeadline = (contract: any) => contract.deadline || contract.end_date || contract.end_at || contract.endDate;
const getStatusLabel = (status: string) => ({ COMPLETED: 'Завершен', IN_PROGRESS: 'В работе', ACTIVE: 'Активен' }[status] || status || 'Без статуса');

export function AgentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<any>(null);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ContractFilter>('ALL');

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const demoAgent = getDemoAgentById(id);
        if (demoAgent) {
          setAgent(demoAgent);
          setContracts(demoAgent.contracts);
          return;
        }

        if (!user) return;
        const { data: realAgent, error: agentError } = await supabase
          .from('agents')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (agentError) throw agentError;
        if (!realAgent) return;

        const { data: realContracts, error: contractError } = await supabase
          .from('contracts')
          .select('*')
          .eq('agent_id', id);
        if (contractError) throw contractError;

        const sortedContracts = [...(realContracts || [])].sort((a, b) => {
          const aDate = new Date(getContractStart(a) || 0).getTime();
          const bDate = new Date(getContractStart(b) || 0).getTime();
          return aDate - bDate;
        });

        setAgent(realAgent);
        setContracts(sortedContracts);
      } catch (error) {
        console.error('Ошибка загрузки профиля агента:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, user]);

  const isDemo = Boolean((agent?.id || '').startsWith('demo-'));
  const filteredContracts = useMemo(() => {
    if (statusFilter === 'ALL') return contracts;
    return contracts.filter(contract => contract.status === statusFilter);
  }, [contracts, statusFilter]);

  if (loading) return <div className="p-8 text-center text-[#000052]">Загрузка...</div>;
  if (!agent) return <div className="p-8 max-w-2xl mx-auto"><div className="bg-[#000052]/5 rounded-xl p-6"><h3 className="text-lg font-bold text-[#000052] mb-2">{t('ui.agentNotFound')}</h3><button onClick={() => navigate('/ceo/agents')} className="px-4 py-2 bg-[#000052] text-white rounded-lg">Назад к агентам</button></div></div>;

  const kpi = isDemo ? calculateAgentKPI(agent) : 0;
  const totalRevenue = contracts.reduce((sum, contract) => sum + Number(contract.revenue || contract.planned_revenue || 0), 0);
  const activeContracts = contracts.filter(contract => contract.status === 'ACTIVE' || contract.status === 'IN_PROGRESS').length;
  const annualBonus = getAnnualBonusForAgent({ ...agent, contracts }, 2026);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <button onClick={() => navigate('/ceo/agents')} className="flex items-center text-[#000052]/70 hover:text-[#000052]"><ArrowLeft className="w-4 h-4 mr-2" />Назад к агентам</button>

      <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-[#B8860B]/10 flex items-center justify-center"><Users className="w-10 h-10 text-[#B8860B]" /></div>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-[#000052] mb-2">{agent.full_name}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-[#000052]/70"><span className="flex items-center gap-1"><Mail className="w-4 h-4" />{agent.email || '—'}</span><span className="flex items-center gap-1"><Phone className="w-4 h-4" />{agent.phone || '—'}</span><span className="px-3 py-1 bg-[#000052]/5 rounded-full">{agent.specialization || '—'}</span></div>
            <p className="text-sm text-[#000052]/60 mt-2">Дата подключения: {agent.start_date ? new Date(agent.start_date).toLocaleDateString('ru-RU') : '—'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#000052] text-white p-5 rounded-xl"><div className="flex justify-between mb-3"><span className="text-sm opacity-80">Общий KPI</span><Target className="w-5 h-5" /></div><p className="text-2xl font-bold">{kpi}%</p><div className="mt-2 h-2 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-[#B8860B]" style={{ width: `${Math.min(kpi, 100)}%` }} /></div></div>
        <div className="bg-[#B8860B] text-white p-5 rounded-xl"><div className="flex justify-between mb-3"><span className="text-sm opacity-80">{t('ui.totalRevenue')}</span><DollarSign className="w-5 h-5" /></div><p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p></div>
        <div className="bg-white text-[#000052] p-5 rounded-xl border border-[#000052]/10"><div className="flex justify-between mb-3"><span className="text-sm text-[#000052]/70">Активные контракты</span><ShieldCheck className="w-5 h-5 text-[#B8860B]" /></div><p className="text-2xl font-bold">{activeContracts}</p></div>
        <div className="bg-white text-[#000052] p-5 rounded-xl border border-[#000052]/10"><div className="flex justify-between mb-3"><span className="text-sm text-[#000052]/70">Всего контрактов</span><FileText className="w-5 h-5 text-[#B8860B]" /></div><p className="text-2xl font-bold">{contracts.length}</p></div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
        <div className="flex items-center justify-between gap-4 mb-3"><div><h2 className="text-lg font-bold text-[#000052] flex items-center gap-2"><Award className="w-5 h-5 text-[#B8860B]" />Годовой бонус · {annualBonus.year}</h2><p className="text-sm text-[#000052]/60 mt-1">Накопление по результатам выполнения плана продаж. В эскроу не входит.</p></div><div className="text-right"><div className="text-xl font-bold text-[#000052]">${annualBonus.accruedBonus.toLocaleString()}</div><div className="text-xs text-[#000052]/60">из ${annualBonus.maxBonus.toLocaleString()}</div></div></div>
        <div className="h-3 bg-[#000052]/10 rounded-full overflow-hidden"><div className="h-full bg-[#B8860B] rounded-full" style={{ width: `${Math.min(annualBonus.progressPercent, 100)}%` }} /></div>
        <div className="flex justify-between mt-2 text-xs text-[#000052]/60"><span>Выполнение плана: {annualBonus.planAchievementPercent}%</span><span>Накоплено: {annualBonus.progressPercent}%</span></div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div><h2 className="text-lg font-bold text-[#000052]">Контракты агента</h2><span className="text-sm text-[#000052]/60">Показано {filteredContracts.length} из {contracts.length}</span></div>
          <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-[#000052]/50" /><select value={statusFilter} onChange={e => setStatusFilter(e.target.value as ContractFilter)} className="px-3 py-2 bg-[#000052]/5 border border-[#000052]/10 rounded-lg text-sm text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30"><option value="ALL">Все статусы</option><option value="ACTIVE">Активные</option><option value="IN_PROGRESS">{t('ui.inProgress')}</option><option value="COMPLETED">Завершенные</option></select></div>
        </div>

        <div className="space-y-4">
          {filteredContracts.length === 0 && <div className="py-10 text-center text-[#000052]/60">Контрактов с выбранным статусом нет.</div>}
          {filteredContracts.map((contract: DemoContract | any) => {
            const contractKpi = isDemo ? calculateContractKPI(contract) : 0;
            const callsProgress = contract.kpi_calls ? Math.round(Number(contract.actual_calls || 0) / Number(contract.kpi_calls) * 100) : 0;
            const meetingsProgress = contract.kpi_meetings ? Math.round(Number(contract.actual_meetings || 0) / Number(contract.kpi_meetings) * 100) : 0;
            const proposalsProgress = contract.kpi_proposals ? Math.round(Number(contract.actual_proposals || 0) / Number(contract.kpi_proposals) * 100) : 0;
            const clientsProgress = contract.target_clients ? Math.round(Number(contract.actual_clients || 0) / Number(contract.target_clients) * 100) : 0;
            const overallProgress = isDemo ? contractKpi : Math.round((callsProgress + meetingsProgress + proposalsProgress + clientsProgress) / 4);
            const start = getContractStart(contract);
            const deadline = getContractDeadline(contract);
            return <div key={contract.id} className="border border-[#000052]/10 rounded-lg p-4 hover:shadow-sm transition">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="flex-1"><h3 className="text-base font-bold text-[#000052] mb-1">{contract.title}</h3><p className="text-sm text-[#000052]/70">{contract.description || 'Ежемесячный контракт'}</p><div className="flex gap-4 mt-2 text-xs text-[#000052]/60"><span className="flex items-center gap-1"><Clock className="w-3 h-3" />{start ? new Date(start).toLocaleDateString('ru-RU') : '—'} - {deadline ? new Date(deadline).toLocaleDateString('ru-RU') : '—'}</span><span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${Number(contract.revenue || contract.planned_revenue || 0).toLocaleString()}</span></div></div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#B8860B]/10 text-[#B8860B]">{getStatusLabel(contract.status)}</span>
              </div>
              <div><div className="flex justify-between mb-2"><span className="text-sm font-semibold text-[#000052]">Выполнение KPI</span><span className="text-sm font-bold text-[#B8860B]">{overallProgress}%</span></div><div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[[`Звонки`, contract.actual_calls, contract.kpi_calls, callsProgress], [`Встречи`, contract.actual_meetings, contract.kpi_meetings, meetingsProgress], [`КП`, contract.actual_proposals, contract.kpi_proposals, proposalsProgress], [`Клиенты`, contract.actual_clients, contract.target_clients, clientsProgress]].map(([label, actual, target, progress]) => <div key={String(label)}><div className="flex justify-between text-xs mb-1"><span className="text-[#000052]/70">{label}</span><span className="font-semibold text-[#000052]">{actual || 0}/{target || 0}</span></div><div className="h-2 bg-[#000052]/10 rounded-full overflow-hidden"><div className="h-full bg-[#B8860B] rounded-full" style={{ width: `${Math.min(Number(progress) || 0, 100)}%` }} /></div></div>)}
              </div></div>
              <button onClick={() => navigate(`/ceo/contracts/${contract.id}`)} className="mt-4 text-sm font-semibold text-[#B8860B] hover:underline">Открыть финансовую историю →</button>
            </div>;
          })}
        </div>
      </div>
    </div>
  );
}
