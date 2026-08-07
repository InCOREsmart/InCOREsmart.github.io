import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Search, Filter, DollarSign, Users, ShieldCheck, FileText } from 'lucide-react';
import { CreateContractModal } from '../../components/ui/CreateContractModal';
import { DEMO_AGENTS } from '../../lib/demoData';

export function CEOContractsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchContracts = async () => {
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
          const { data: realContracts } = await supabase
            .from('contracts')
            .select('*')
            .eq('company_id', companyData.id)
            .order('created_at', { ascending: false });

          const contractsList: any[] = [];

          if (realContracts && realContracts.length > 0) {
            const agentIds = [...new Set(realContracts.map(c => c.agent_id).filter(Boolean))];
            
            let agentsMap = new Map();
            if (agentIds.length > 0) {
              const { data: agentsData } = await supabase
                .from('agents')
                .select('id, full_name')
                .in('id', agentIds);
              
              if (agentsData) {
                agentsData.forEach(a => agentsMap.set(a.id, a.full_name));
              }
            }

            const mappedRealContracts = realContracts.map(c => ({
              ...c,
              agent_name: agentsMap.get(c.agent_id) || 'Не назначен',
              is_demo: false,
            }));
            contractsList.push(...mappedRealContracts);
          }

          if (contractsList.length < 8) {
            const demoContracts = DEMO_AGENTS.flatMap(agent => 
              agent.contracts.map(contract => ({
                ...contract,
                agent_name: agent.full_name,
                agent_id: agent.id,
                is_demo: true,
              }))
            );
            contractsList.push(...demoContracts);
          }

          setContracts(contractsList);
        } else {
          const demoContracts = DEMO_AGENTS.flatMap(agent => 
            agent.contracts.map(contract => ({
              ...contract,
              agent_name: agent.full_name,
              agent_id: agent.id,
              is_demo: true,
            }))
          );
          setContracts(demoContracts);
        }
      } catch (err) {
        console.error('Ошибка загрузки контрактов:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, [user]);

  const handleContractCreated = () => {
    window.location.reload();
  };

  const filteredContracts = contracts.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         c.agent_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalGMV = contracts.reduce((sum, c) => sum + (c.revenue || 0), 0);
  const totalEscrow = contracts.reduce((sum, c) => sum + (c.escrow_amount || 0), 0);
  const activeCount = contracts.filter(c => c.status === 'ACTIVE' || c.status === 'IN_PROGRESS').length;

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      ACTIVE: { bg: 'bg-[#B8860B]/10', text: 'text-[#B8860B]', label: 'Активен' },
      IN_PROGRESS: { bg: 'bg-[#000052]/10', text: 'text-[#000052]', label: 'В работе' },
      PENDING_APPROVAL: { bg: 'bg-[#000052]/5', text: 'text-[#000052]/70', label: 'Ожидает подтверждения' },
      COMPLETED: { bg: 'bg-[#B8860B]/20', text: 'text-[#B8860B]', label: 'Завершен' },
      DRAFT: { bg: 'bg-[#000052]/5', text: 'text-[#000052]/60', label: 'Черновик' },
      DISPUTED: { bg: 'bg-[#000052]/10', text: 'text-[#000052]', label: 'Оспорен' },
      PENDING_PAYMENT: { bg: 'bg-[#B8860B]/10', text: 'text-[#B8860B]', label: 'Ожидает оплаты' },
    };
    const badge = badges[status] || badges.DRAFT;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
        {badge.label}
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#000052]">{t('contracts.title')}</h1>
          <p className="text-sm text-[#000052]/70 mt-1">Управление смарт-контрактами и хеджирование рисков</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#B8860B] text-white rounded-lg hover:bg-[#9a7209] transition text-sm font-semibold"
        >
          <Plus className="w-4 h-4" />
          {t('contracts.createNew')}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#000052] text-white p-5 rounded-xl border border-[#000052]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium opacity-80">Общий GMV</h3>
            <DollarSign className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-2xl font-bold">${totalGMV.toLocaleString()}</p>
          <p className="text-xs opacity-70 mt-1">{contracts.length} контрактов</p>
        </div>

        <div className="bg-[#B8860B] text-white p-5 rounded-xl border border-[#B8860B]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium opacity-80">Заморожено в эскроу</h3>
            <ShieldCheck className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-2xl font-bold">${totalEscrow.toLocaleString()}</p>
          <p className="text-xs opacity-70 mt-1">Защита от рисков</p>
        </div>

        <div className="bg-white text-[#000052] p-5 rounded-xl border border-[#000052]/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[#000052]/70">Активные контракты</h3>
            <Users className="w-5 h-5 text-[#B8860B]" />
          </div>
          <p className="text-2xl font-bold text-[#000052]">{activeCount}</p>
          <p className="text-xs text-[#000052]/60 mt-1">В работе у агентов</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-[#000052]/10">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#000052]/40" />
            <input
              type="text"
              placeholder="Поиск по названию или агенту..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#000052]/5 border border-[#000052]/10 rounded-lg text-sm text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#000052]/40" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2 bg-[#000052]/5 border border-[#000052]/10 rounded-lg text-sm text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30 appearance-none cursor-pointer"
            >
              <option value="all">Все статусы</option>
              <option value="ACTIVE">Активен</option>
              <option value="IN_PROGRESS">В работе</option>
              <option value="PENDING_APPROVAL">Ожидает подтверждения</option>
              <option value="COMPLETED">Завершен</option>
              <option value="DRAFT">Черновик</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#000052]/10 overflow-hidden">
        {filteredContracts.length === 0 ? (
          <div className="text-center py-12 text-[#000052]/60">
            <FileText className="w-16 h-16 mx-auto mb-4 text-[#000052]/20" />
            <p className="text-lg font-medium mb-2">{t('contract.noContracts')}</p>
            <p className="text-sm">{t('contract.createFirst')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-[#000052]/5">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">Название</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">Агент</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">GMV</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">Эскроу</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">Дедлайн</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#000052]/5">
                {filteredContracts.map((contract) => (
                  <tr
                    key={contract.id}
                    onClick={() => navigate(`/ceo/contracts/${contract.id}`)}
                    className="hover:bg-[#000052]/5 cursor-pointer transition"
                  >
                    <td className="py-4 px-4">
                      <div className="font-semibold text-[#000052] text-sm flex items-center gap-2">
                        {contract.title}
                        {contract.is_demo && (
                          <span className="text-xs bg-[#B8860B]/10 text-[#B8860B] px-2 py-0.5 rounded font-normal">демо</span>
                        )}
                      </div>
                      <div className="text-xs text-[#000052]/60 mt-1">
                        Создан: {new Date(contract.start_date || contract.created_at).toLocaleDateString('ru-RU')}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#B8860B]/10 flex items-center justify-center">
                          <Users className="w-4 h-4 text-[#B8860B]" />
                        </div>
                        <span className="text-sm text-[#000052]">{contract.agent_name || 'Не назначен'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm font-bold text-[#000052]">${(contract.revenue || 0).toLocaleString()}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm font-bold text-[#B8860B]">${(contract.escrow_amount || 0).toLocaleString()}</div>
                      <div className="text-xs text-[#000052]/60">Заблокировано</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm text-[#000052]">
                        {contract.deadline ? new Date(contract.deadline).toLocaleDateString('ru-RU') : '—'}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {getStatusBadge(contract.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateContractModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleContractCreated}
      />
    </div>
  );
}