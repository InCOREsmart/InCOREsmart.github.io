import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Users, Mail, Phone, DollarSign, Target, ShieldCheck, Clock, CheckCircle, FileText } from 'lucide-react';
import { DEMO_AGENTS, calculateAgentKPI } from '../../lib/demoData';

export function AgentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const demoAgent = DEMO_AGENTS.find(a => a.id === id);
    if (demoAgent) {
      setAgent(demoAgent);
    }
    setLoading(false);
  }, [id]);

  if (loading) {
    return (
      <div className="p-8 text-center text-[#000052]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8860B]"></div>
        <p className="mt-2">{t('common.loading')}</p>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-[#000052]/5 border border-[#000052]/10 rounded-xl p-6">
          <h3 className="text-lg font-bold text-[#000052] mb-2">Агент не найден</h3>
          <button onClick={() => navigate('/ceo/agents')} className="px-4 py-2 bg-[#000052] text-white rounded-lg text-sm">
            Назад к агентам
          </button>
        </div>
      </div>
    );
  }

  const kpi = calculateAgentKPI(agent);
  const totalRevenue = agent.contracts.reduce((sum: number, c: any) => sum + c.revenue, 0);
  const activeContracts = agent.contracts.filter((c: any) => c.status === 'ACTIVE' || c.status === 'IN_PROGRESS').length;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <button onClick={() => navigate('/ceo/agents')} className="flex items-center text-[#000052]/70 hover:text-[#000052] transition">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Назад к агентам
      </button>

      {/* Шапка профиля */}
      <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-[#B8860B]/10 flex items-center justify-center flex-shrink-0">
            <Users className="w-10 h-10 text-[#B8860B]" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-[#000052] mb-2">{agent.full_name}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-[#000052]/70">
              <span className="flex items-center gap-1"><Mail className="w-4 h-4" />{agent.email}</span>
              <span className="flex items-center gap-1"><Phone className="w-4 h-4" />{agent.phone}</span>
              <span className="px-3 py-1 bg-[#000052]/5 text-[#000052] rounded-full text-xs font-medium">{agent.specialization}</span>
            </div>
            <p className="text-sm text-[#000052]/60 mt-2">Дата подключения: {new Date(agent.start_date).toLocaleDateString('ru-RU')}</p>
          </div>
        </div>
      </div>

      {/* KPI метрики */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#000052] text-white p-5 rounded-xl border border-[#000052]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium opacity-80">Общий KPI</h3>
            <Target className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-2xl font-bold">{kpi}%</p>
          <div className="mt-2 h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-[#B8860B] rounded-full" style={{ width: `${Math.min(kpi, 100)}%` }}></div>
          </div>
        </div>

        <div className="bg-[#B8860B] text-white p-5 rounded-xl border border-[#B8860B]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium opacity-80">Общая выручка</h3>
            <DollarSign className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
        </div>

        <div className="bg-white text-[#000052] p-5 rounded-xl border border-[#000052]/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[#000052]/70">Активные контракты</h3>
            <ShieldCheck className="w-5 h-5 text-[#B8860B]" />
          </div>
          <p className="text-2xl font-bold">{activeContracts}</p>
        </div>

        <div className="bg-white text-[#000052] p-5 rounded-xl border border-[#000052]/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[#000052]/70">Всего контрактов</h3>
            <FileText className="w-5 h-5 text-[#B8860B]" />
          </div>
          <p className="text-2xl font-bold">{agent.contracts.length}</p>
        </div>
      </div>

      {/* Контракты агента */}
      <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
        <h2 className="text-lg font-bold text-[#000052] mb-4">Контракты агента</h2>
        <div className="space-y-4">
          {agent.contracts.map((contract: any) => {
            const kpiCallsProgress = Math.round((contract.actual_calls / contract.kpi_calls) * 100);
            const kpiMeetingsProgress = Math.round((contract.actual_meetings / contract.kpi_meetings) * 100);
            const kpiProposalsProgress = Math.round((contract.actual_proposals / contract.kpi_proposals) * 100);
            const kpiClientsProgress = Math.round((contract.actual_clients / contract.target_clients) * 100);
            const overallProgress = Math.round((kpiCallsProgress + kpiMeetingsProgress + kpiProposalsProgress + kpiClientsProgress) / 4);

            return (
              <div key={contract.id} className="border border-[#000052]/10 rounded-lg p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-[#000052] mb-1">{contract.title}</h3>
                    <p className="text-sm text-[#000052]/70">{contract.description}</p>
                    <div className="flex gap-4 mt-2 text-xs text-[#000052]/60">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(contract.start_date).toLocaleDateString('ru-RU')} - {new Date(contract.deadline).toLocaleDateString('ru-RU')}</span>
                      <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${contract.revenue.toLocaleString()}</span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    contract.status === 'ACTIVE' ? 'bg-[#B8860B]/10 text-[#B8860B]' :
                    contract.status === 'IN_PROGRESS' ? 'bg-[#000052]/10 text-[#000052]' :
                    'bg-[#B8860B]/20 text-[#B8860B]'
                  }`}>
                    {contract.status === 'ACTIVE' ? 'Активен' : contract.status === 'IN_PROGRESS' ? 'В работе' : 'Завершен'}
                  </span>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-[#000052]">Выполнение KPI</span>
                    <span className="text-sm font-bold text-[#B8860B]">{overallProgress}%</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#000052]/70">Звонки</span>
                        <span className="font-semibold text-[#000052]">{contract.actual_calls}/{contract.kpi_calls}</span>
                      </div>
                      <div className="h-2 bg-[#000052]/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#B8860B] rounded-full" style={{ width: `${kpiCallsProgress}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#000052]/70">Встречи</span>
                        <span className="font-semibold text-[#000052]">{contract.actual_meetings}/{contract.kpi_meetings}</span>
                      </div>
                      <div className="h-2 bg-[#000052]/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#B8860B] rounded-full" style={{ width: `${kpiMeetingsProgress}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#000052]/70">КП</span>
                        <span className="font-semibold text-[#000052]">{contract.actual_proposals}/{contract.kpi_proposals}</span>
                      </div>
                      <div className="h-2 bg-[#000052]/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#B8860B] rounded-full" style={{ width: `${kpiProposalsProgress}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#000052]/70">Клиенты</span>
                        <span className="font-semibold text-[#000052]">{contract.actual_clients}/{contract.target_clients}</span>
                      </div>
                      <div className="h-2 bg-[#000052]/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#B8860B] rounded-full" style={{ width: `${kpiClientsProgress}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}