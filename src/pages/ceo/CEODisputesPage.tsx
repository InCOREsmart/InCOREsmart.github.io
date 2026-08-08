import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Scale, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Plus, 
  Search, 
  Filter,
  ShieldCheck,
  DollarSign,
  Users
} from 'lucide-react';

// Ровно 3 демо-спора для идеального питча
const DEMO_DISPUTES = [
  { 
    id: 'demo-1', 
    type: 'oracle_failure', 
    status: 'OPEN', 
    title: 'Сбой InCORE при верификации платежа',
    description: 'Система InCORE не зафиксировала поступление 100% премии на р/с. Агент утверждает, что деньги пришли, но триггер смарт-контракта не сработал.',
    amount: 12500,
    agent_name: 'Александр Смирнов',
    contract_title: 'Привлечение 10 корпоративных клиентов B2B',
    created_at: '2026-07-15T10:30:00Z',
    resolution: null
  },
  { 
    id: 'demo-2', 
    type: 'kpi_dispute', 
    status: 'IN_REVIEW', 
    title: 'Агент оспаривает расчёт бонусов за 06.2026',
    description: 'Агент утверждает, что 3 сделки были закрыты в последний день июня, но не учтены в расчёте бонуса за выполнение плана (10%) и бонуса за новые продажи (50%).',
    amount: 8800,
    agent_name: 'Мария Козлова',
    contract_title: 'Расширение портфеля страхования в сегменте МСБ',
    created_at: '2026-07-10T14:15:00Z',
    resolution: null
  },
  { 
    id: 'demo-3', 
    type: 'client_retention', 
    status: 'RESOLVED', 
    title: 'Clawback: клиент ушёл через 45 дней',
    description: 'Клиент «ТехноСтрой» расторг договор через 45 дней. Бонус за удержание ($5,000) не выплачивается агенту согласно правилу 90 дней.',
    amount: 5000,
    agent_name: 'Дмитрий Волков',
    contract_title: 'Пролонгация ключевых корпоративных договоров',
    created_at: '2026-06-20T09:00:00Z',
    resolution: 'Бонус за удержание не выплачен. Средства возвращены в пул компании. Агент уведомлён.'
  }
];

interface Dispute {
  id: string;
  type: string;
  status: string;
  title: string;
  description?: string;
  amount: number;
  agent_name?: string;
  contract_title?: string;
  created_at: string;
  resolution?: string | null;
}

export function CEODisputesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolutionText, setResolutionText] = useState('');

  useEffect(() => {
    const fetchDisputes = async () => {
      if (!user) { setLoading(false); return; }
      try {
        const { data: companyData } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (companyData) {
          const { data: disputesData } = await supabase
            .from('disputes')
            .select('*')
            .eq('company_id', companyData.id)
            .order('created_at', { ascending: false });

          if (!disputesData || disputesData.length === 0 || !disputesData[0].title) {
            setDisputes(DEMO_DISPUTES);
          } else {
            const disputesWithDetails = await Promise.all(
              disputesData.map(async (d) => {
                let agent_name = '—';
                let contract_title = '—';
                if (d.agent_id) {
                  const { data: agentData } = await supabase.from('agents').select('full_name').eq('id', d.agent_id).maybeSingle();
                  agent_name = agentData?.full_name || '—';
                }
                if (d.contract_id) {
                  const { data: contractData } = await supabase.from('contracts').select('title').eq('id', d.contract_id).maybeSingle();
                  contract_title = contractData?.title || '—';
                }
                return { ...d, agent_name, contract_title };
              })
            );
            setDisputes(disputesWithDetails);
          }
        } else {
          setDisputes(DEMO_DISPUTES);
        }
      } catch (err) {
        console.error('Ошибка:', err);
        setDisputes(DEMO_DISPUTES);
      } finally {
        setLoading(false);
      }
    };
    fetchDisputes();
  }, [user]);

  const filteredDisputes = disputes.filter(d => {
    const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         d.agent_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openCount = disputes.filter(d => d.status === 'OPEN').length;
  const inReviewCount = disputes.filter(d => d.status === 'IN_REVIEW').length;
  const resolvedCount = disputes.filter(d => d.status === 'RESOLVED').length;
  const totalDisputedAmount = disputes
    .filter(d => d.status !== 'RESOLVED')
    .reduce((sum, d) => sum + (d.amount || 0), 0);

  const handleResolve = async () => {
    if (!selectedDispute || !resolutionText.trim() || !user) return;
    
    try {
      if (selectedDispute.id.startsWith('demo-')) {
        setDisputes(prev => prev.map(d => 
          d.id === selectedDispute.id 
            ? { ...d, status: 'RESOLVED', resolution: resolutionText }
            : d
        ));
      } else {
        const { error } = await supabase
          .from('disputes')
          .update({ 
            status: 'RESOLVED', 
            resolution: resolutionText,
            resolved_by: user.id,
            resolved_at: new Date().toISOString()
          })
          .eq('id', selectedDispute.id);
        if (error) throw error;
      }
      
      setResolutionText('');
      setSelectedDispute(null);
      setIsResolveModalOpen(false);
      alert('✅ Спор успешно разрешён');
    } catch (err) {
      console.error('Ошибка:', err);
      alert('Ошибка: ' + (err as Error).message);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string; icon: any }> = {
      OPEN: { bg: 'bg-[#B8860B]/10', text: 'text-[#B8860B]', label: 'Открыт', icon: AlertCircle },
      IN_REVIEW: { bg: 'bg-[#000052]/10', text: 'text-[#000052]', label: 'На рассмотрении', icon: Clock },
      RESOLVED: { bg: 'bg-[#B8860B]/20', text: 'text-[#B8860B]', label: 'Решён', icon: CheckCircle },
      REJECTED: { bg: 'bg-[#000052]/5', text: 'text-[#000052]/60', label: 'Отклонён', icon: XCircle },
    };
    const badge = badges[status] || badges.OPEN;
    const Icon = badge.icon;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${badge.bg} ${badge.text}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, { label: string; color: string }> = {
      oracle_failure: { label: 'Сбой InCORE', color: 'bg-[#B8860B]/10 text-[#B8860B]' },
      kpi_dispute: { label: 'Спор по бонусам', color: 'bg-[#000052]/10 text-[#000052]' },
      payment_issue: { label: 'Проблема с выплатой', color: 'bg-[#000052]/5 text-[#000052]/80' },
      client_retention: { label: 'Clawback (удержание)', color: 'bg-[#B8860B]/20 text-[#B8860B]' },
    };
    const t = types[type] || types.oracle_failure;
    return <span className={`px-2 py-1 rounded text-xs font-medium ${t.color}`}>{t.label}</span>;
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
          <h1 className="text-2xl md:text-3xl font-bold text-[#000052]">{t('nav.disputes')}</h1>
          <p className="text-sm text-[#000052]/70 mt-1">{t('ceo.disputesSubtitle')}</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#B8860B] text-white rounded-lg hover:bg-[#9a7209] transition text-sm font-semibold"
        >
          <Plus className="w-4 h-4" />
          Создать спор
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#B8860B] text-white p-5 rounded-xl border border-[#B8860B]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium opacity-80">Открытые споры</h3>
            <AlertCircle className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-2xl font-bold">{openCount}</p>
          <p className="text-xs opacity-70 mt-1">Требуют внимания</p>
        </div>

        <div className="bg-[#000052] text-white p-5 rounded-xl border border-[#000052]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium opacity-80">На рассмотрении</h3>
            <Clock className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-2xl font-bold">{inReviewCount}</p>
          <p className="text-xs opacity-70 mt-1">В процессе анализа</p>
        </div>

        <div className="bg-white text-[#000052] p-5 rounded-xl border border-[#000052]/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[#000052]/70">Решено</h3>
            <CheckCircle className="w-5 h-5 text-[#B8860B]" />
          </div>
          <p className="text-2xl font-bold text-[#000052]">{resolvedCount}</p>
          <p className="text-xs text-[#000052]/60 mt-1">Закрытые споры</p>
        </div>

        <div className="bg-white text-[#000052] p-5 rounded-xl border border-[#000052]/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[#000052]/70">Спорная сумма</h3>
            <DollarSign className="w-5 h-5 text-[#B8860B]" />
          </div>
          <p className="text-2xl font-bold text-[#000052]">${totalDisputedAmount.toLocaleString()}</p>
          <p className="text-xs text-[#000052]/60 mt-1">В активных спорах</p>
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
              <option value="OPEN">Открыт</option>
              <option value="IN_REVIEW">На рассмотрении</option>
              <option value="RESOLVED">Решён</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#000052]/10 overflow-hidden">
        {filteredDisputes.length === 0 ? (
          <div className="text-center py-12 text-[#000052]/60">
            <Scale className="w-16 h-16 mx-auto mb-4 text-[#000052]/20" />
            <p className="text-lg font-medium mb-2">{t('ceo.noDisputes')}</p>
            <p className="text-sm">{t('ceo.noManualApprovals')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-[#000052]/5">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">Тип</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">Описание</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">Агент</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">{t('ui.amount')}</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">{t('ui.status')}</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#000052]/5">
                {filteredDisputes.map((dispute) => (
                  <tr key={dispute.id} className="hover:bg-[#000052]/5 transition">
                    <td className="py-4 px-4">
                      {getTypeLabel(dispute.type)}
                    </td>
                    <td className="py-4 px-4 max-w-md">
                      <div className="font-semibold text-[#000052] text-sm">{dispute.title}</div>
                      <div className="text-xs text-[#000052]/60 mt-1 line-clamp-2">{dispute.description}</div>
                      {dispute.resolution && (
                        <div className="mt-2 p-2 bg-[#B8860B]/5 border border-[#B8860B]/20 rounded text-xs text-[#000052]/80">
                          <strong>Решение:</strong> {dispute.resolution}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#B8860B]/10 flex items-center justify-center">
                          <Users className="w-4 h-4 text-[#B8860B]" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-[#000052]">{dispute.agent_name || '—'}</div>
                          <div className="text-xs text-[#000052]/60">{dispute.contract_title || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm font-bold text-[#B8860B]">${(dispute.amount || 0).toLocaleString()}</div>
                    </td>
                    <td className="py-4 px-4">
                      {getStatusBadge(dispute.status)}
                    </td>
                    <td className="py-4 px-4">
                      {(dispute.status === 'OPEN' || dispute.status === 'IN_REVIEW') && (
                        <button
                          onClick={() => {
                            setSelectedDispute(dispute);
                            setIsResolveModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-[#000052] text-white rounded-lg text-xs font-semibold hover:bg-[#000052]/90 transition"
                        >
                          Принять решение
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isResolveModalOpen && selectedDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-[#000052]/10">
            <div className="flex items-center justify-between p-6 border-b border-[#000052]/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#B8860B]/10 flex items-center justify-center">
                  <Scale className="w-5 h-5 text-[#B8860B]" />
                </div>
                <h2 className="text-2xl font-bold text-[#000052]">Принятие решения по спору</h2>
              </div>
              <button onClick={() => { setIsResolveModalOpen(false); setSelectedDispute(null); }} className="p-2 hover:bg-[#000052]/5 rounded-full transition-colors">
                <XCircle className="w-5 h-5 text-[#000052]" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-[#000052]/5 p-4 rounded-lg border border-[#000052]/10">
                <p className="text-xs text-[#000052]/60 mb-1">Тип спора</p>
                <div className="mb-3">{getTypeLabel(selectedDispute.type)}</div>
                <p className="text-xs text-[#000052]/60 mb-1">Описание</p>
                <p className="text-sm text-[#000052] font-semibold mb-3">{selectedDispute.title}</p>
                <p className="text-sm text-[#000052]/70">{selectedDispute.description}</p>
                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-[#000052]/10">
                  <div>
                    <p className="text-xs text-[#000052]/60">Агент</p>
                    <p className="text-sm font-medium text-[#000052]">{selectedDispute.agent_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#000052]/60">Спорная сумма</p>
                    <p className="text-sm font-bold text-[#B8860B]">${selectedDispute.amount.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#000052] mb-2">Ваше решение *</label>
                <textarea
                  value={resolutionText}
                  onChange={(e) => setResolutionText(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30 focus:border-[#B8860B]"
                  placeholder="Опишите ваше решение по данному спору..."
                  required
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-[#000052]/10">
                <button
                  type="button"
                  onClick={() => { setIsResolveModalOpen(false); setSelectedDispute(null); }}
                  className="flex-1 py-3 px-4 bg-[#000052]/5 hover:bg-[#000052]/10 text-[#000052] rounded-lg font-semibold transition"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleResolve}
                  disabled={!resolutionText.trim()}
                  className="flex-1 py-3 px-4 bg-[#B8860B] hover:bg-[#9a7209] text-white rounded-lg font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle className="w-5 h-5" />
                  Подтвердить решение
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-[#000052]/10">
            <div className="flex items-center justify-between p-6 border-b border-[#000052]/10">
              <h2 className="text-2xl font-bold text-[#000052]">Создать спор</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-[#000052]/5 rounded-full transition-colors">
                <XCircle className="w-5 h-5 text-[#000052]" />
              </button>
            </div>
            <div className="p-6 text-center">
              <ShieldCheck className="w-16 h-16 mx-auto mb-4 text-[#B8860B]" />
              <p className="text-[#000052] mb-2">В демо-режиме создание споров отключено</p>
              <p className="text-sm text-[#000052]/60">Используйте 3 предзаполненных спора для демонстрации логики</p>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="mt-4 px-6 py-2 bg-[#000052] text-white rounded-lg font-semibold hover:bg-[#000052]/90 transition"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}