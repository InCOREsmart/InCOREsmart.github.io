import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Search, Users, DollarSign, Target, ShieldCheck, Mail, Phone, Award } from 'lucide-react';
import { AddAgentModal } from '../../components/ui/AddAgentModal';

// Демо-данные для питча (7 агентов с разными показателями)
const DEMO_AGENTS = [
  { id: 'demo-1', full_name: 'Александр Смирнов', email: 'a.smirnov@demo.com', phone: '+7 900 123-45-67', specialization: 'B2B Страхование', status: 'ACTIVE', contracts_count: 12, total_revenue: 12000000, kpi_achievement: 95, active_contracts: 3 },
  { id: 'demo-2', full_name: 'Мария Козлова', email: 'm.kozlova@demo.com', phone: '+7 900 234-56-78', specialization: 'Корпоративные клиенты', status: 'ACTIVE', contracts_count: 15, total_revenue: 15000000, kpi_achievement: 110, active_contracts: 4 },
  { id: 'demo-3', full_name: 'Дмитрий Волков', email: 'd.volkov@demo.com', phone: '+7 900 345-67-89', specialization: 'МСБ сегмент', status: 'ACTIVE', contracts_count: 8, total_revenue: 8000000, kpi_achievement: 85, active_contracts: 2 },
  { id: 'demo-4', full_name: 'Елена Петрова', email: 'e.petrova@demo.com', phone: '+7 900 456-78-90', specialization: 'Страхование жизни', status: 'ACTIVE', contracts_count: 10, total_revenue: 10000000, kpi_achievement: 102, active_contracts: 3 },
  { id: 'demo-5', full_name: 'Иван Тихонов', email: 'i.tikhonov@demo.com', phone: '+7 900 567-89-01', specialization: 'Региональные продажи', status: 'ACTIVE', contracts_count: 6, total_revenue: 6000000, kpi_achievement: 78, active_contracts: 2 },
  { id: 'demo-6', full_name: 'Ольга Морозова', email: 'o.morozova@demo.com', phone: '+7 900 678-90-12', specialization: 'Удержание клиентов', status: 'ACTIVE', contracts_count: 18, total_revenue: 18000000, kpi_achievement: 115, active_contracts: 5 },
  { id: 'demo-7', full_name: 'Сергей Новиков', email: 's.novikov@demo.com', phone: '+7 900 789-01-23', specialization: 'Партнерская сеть', status: 'ACTIVE', contracts_count: 9, total_revenue: 9000000, kpi_achievement: 92, active_contracts: 3 },
];

export function CEOAgentsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchAgents = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data: companyData } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (companyData) {
          const { data: agentsData } = await supabase
            .from('agents')
            .select('*')
            .eq('company_id', companyData.id)
            .eq('status', 'ACTIVE')
            .order('created_at', { ascending: false });

          if (agentsData && agentsData.length > 0) {
            // Получаем статистику по контрактам для каждого агента
            const agentsWithStats = await Promise.all(
              agentsData.map(async (agent) => {
                const { data: contractsData } = await supabase
                  .from('contracts')
                  .select('*')
                  .eq('agent_id', agent.id);

                const activeContracts = (contractsData || []).filter(c => 
                  c.status === 'ACTIVE' || c.status === 'IN_PROGRESS' || c.status === 'PENDING_APPROVAL'
                );
                const totalRevenue = (contractsData || []).reduce((sum, c) => sum + (c.revenue || 0), 0);
                const avgKpi = contractsData && contractsData.length > 0
                  ? (contractsData || []).reduce((sum, c) => sum + (c.roi_percentage || 100), 0) / contractsData.length
                  : 100;

                return {
                  ...agent,
                  contracts_count: (contractsData || []).length,
                  total_revenue: totalRevenue,
                  kpi_achievement: Math.round(avgKpi),
                  active_contracts: activeContracts.length,
                };
              })
            );

            setAgents(agentsWithStats);
          } else {
            // Если агентов нет — показываем демо-данные для питча
            setAgents(DEMO_AGENTS);
          }
        } else {
          setAgents(DEMO_AGENTS);
        }
      } catch (err) {
        console.error('Ошибка загрузки агентов:', err);
        setAgents(DEMO_AGENTS);
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, [user]);

  const handleAgentCreated = () => {
    window.location.reload();
  };

  // Фильтрация по поиску
  const filteredAgents = agents.filter(a => 
    a.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.specialization?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Статистика
  const totalAgents = agents.length;
  const totalRevenue = agents.reduce((sum, a) => sum + (a.total_revenue || 0), 0);
  const avgKpi = agents.length > 0 
    ? Math.round(agents.reduce((sum, a) => sum + (a.kpi_achievement || 100), 0) / agents.length)
    : 0;
  const activeContracts = agents.reduce((sum, a) => sum + (a.active_contracts || 0), 0);

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
      {/* Шапка */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#000052]">{t('nav.agents')}</h1>
          <p className="text-sm text-[#000052]/70 mt-1">Управление командой страховых агентов</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#B8860B] text-white rounded-lg hover:bg-[#9a7209] transition text-sm font-semibold"
        >
          <Plus className="w-4 h-4" />
          {t('agent.addAgent')}
        </button>
      </div>

      {/* 4 ключевые метрики */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#000052] text-white p-5 rounded-xl border border-[#000052]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium opacity-80">Всего агентов</h3>
            <Users className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-2xl font-bold">{totalAgents}</p>
          <p className="text-xs opacity-70 mt-1">Активных в системе</p>
        </div>

        <div className="bg-[#B8860B] text-white p-5 rounded-xl border border-[#B8860B]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium opacity-80">Общая выручка</h3>
            <DollarSign className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
          <p className="text-xs opacity-70 mt-1">По всем контрактам</p>
        </div>

        <div className="bg-white text-[#000052] p-5 rounded-xl border border-[#000052]/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[#000052]/70">Средний KPI</h3>
            <Target className="w-5 h-5 text-[#B8860B]" />
          </div>
          <p className="text-2xl font-bold text-[#000052]">{avgKpi}%</p>
          <p className="text-xs text-[#000052]/60 mt-1">Выполнение плана</p>
        </div>

        <div className="bg-white text-[#000052] p-5 rounded-xl border border-[#000052]/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[#000052]/70">Активные контракты</h3>
            <ShieldCheck className="w-5 h-5 text-[#B8860B]" />
          </div>
          <p className="text-2xl font-bold text-[#000052]">{activeContracts}</p>
          <p className="text-xs text-[#000052]/60 mt-1">В работе у агентов</p>
        </div>
      </div>

      {/* Поиск */}
      <div className="bg-white p-4 rounded-xl border border-[#000052]/10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#000052]/40" />
          <input
            type="text"
            placeholder="Поиск по имени, email или специализации..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#000052]/5 border border-[#000052]/10 rounded-lg text-sm text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30"
          />
        </div>
      </div>

      {/* Таблица агентов */}
      <div className="bg-white rounded-xl border border-[#000052]/10 overflow-hidden">
        {filteredAgents.length === 0 ? (
          <div className="text-center py-12 text-[#000052]/60">
            <Users className="w-16 h-16 mx-auto mb-4 text-[#000052]/20" />
            <p className="text-lg font-medium mb-2">{t('agent.noAgents')}</p>
            <p className="text-sm">Добавьте первого агента в команду</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-[#000052]/5">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">Агент</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">Специализация</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">Контактов</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">Выручка</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">KPI</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">Активные</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#000052]/5">
                {filteredAgents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-[#000052]/5 transition">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#B8860B]/10 flex items-center justify-center flex-shrink-0">
                          <Users className="w-5 h-5 text-[#B8860B]" />
                        </div>
                        <div>
                          <div className="font-semibold text-[#000052] text-sm">{agent.full_name}</div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-[#000052]/60 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {agent.email || '—'}
                            </span>
                            <span className="text-xs text-[#000052]/60 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {agent.phone || '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-3 py-1 bg-[#000052]/5 text-[#000052] rounded-full text-xs font-medium">
                        {agent.specialization || '—'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm font-bold text-[#000052]">{agent.contracts_count || 0}</div>
                      <div className="text-xs text-[#000052]/60">контрактов</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm font-bold text-[#B8860B]">${(agent.total_revenue || 0).toLocaleString()}</div>
                      <div className="text-xs text-[#000052]/60">общая выручка</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-[#000052]/10 rounded-full overflow-hidden max-w-[80px]">
                          <div 
                            className={`h-full rounded-full ${agent.kpi_achievement >= 100 ? 'bg-[#B8860B]' : 'bg-[#000052]'}`}
                            style={{ width: `${Math.min(agent.kpi_achievement || 0, 100)}%` }}
                          ></div>
                        </div>
                        <span className={`text-sm font-bold ${agent.kpi_achievement >= 100 ? 'text-[#B8860B]' : 'text-[#000052]'}`}>
                          {agent.kpi_achievement || 0}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1">
                        <Award className="w-4 h-4 text-[#B8860B]" />
                        <span className="text-sm font-semibold text-[#000052]">{agent.active_contracts || 0}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Модалка добавления агента */}
      <AddAgentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleAgentCreated}
      />
    </div>
  );
}