import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  UserPlus,
  Wallet,
  AlertCircle,
  CheckCircle,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  ChevronDown,
  X,
  Lock,
  Unlock,
} from 'lucide-react';
import { supabase, Contract, PaymentStream, DEFAULT_PAYMENT_STREAMS } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface AgentWithUser {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email?: string;
  user_email?: string;
  [key: string]: any;
}

interface CompanyData {
  id: string;
  company_name?: string;
  inn?: string;
  settlement_account?: string;
  bank_name?: string;
  [key: string]: any;
}

export function CEOContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [contract, setContract] = useState<Contract | null>(null);
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [agents, setAgents] = useState<AgentWithUser[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [showEscrowModal, setShowEscrowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    deadline: '',
    kpi_calls: 0,
    kpi_meetings: 0,
    kpi_proposals: 0,
    kpi_revenue: 0,
    min_check: 0,
    target_conversion: 20,
    avg_check: 0,
    target_clients: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !id) return;

      setLoading(true);
      try {
        const { data: companyData } = await supabase
          .from('companies')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        setCompany(companyData);

        const { data: contractData } = await supabase
          .from('contracts')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (contractData) {
          setContract(contractData as Contract);
          setEditForm({
            title: contractData.title || '',
            description: contractData.description || '',
            deadline: contractData.deadline || '',
            kpi_calls: contractData.kpi_calls || 0,
            kpi_meetings: contractData.kpi_meetings || 0,
            kpi_proposals: contractData.kpi_proposals || 0,
            kpi_revenue: contractData.kpi_revenue || 0,
            min_check: contractData.min_check || 0,
            target_conversion: contractData.target_conversion || 20,
            avg_check: contractData.avg_check || 0,
            target_clients: contractData.target_clients || 0,
          });
        }

        if (companyData) {
          const { data: agentsData } = await supabase
            .from('agents')
            .select('*')
            .eq('company_id', companyData.id);

          if (agentsData) {
            setAgents(agentsData as AgentWithUser[]);
          }
        }
      } catch (err) {
        console.error('Ошибка загрузки:', err);
        setError('Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, id]);

  const handleEditContract = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('contracts')
        .update({
          title: editForm.title,
          description: editForm.description,
          deadline: editForm.deadline,
          kpi_calls: editForm.kpi_calls,
          kpi_meetings: editForm.kpi_meetings,
          kpi_proposals: editForm.kpi_proposals,
          kpi_revenue: editForm.kpi_revenue,
          min_check: editForm.min_check,
          target_conversion: editForm.target_conversion,
          avg_check: editForm.avg_check,
          target_clients: editForm.target_clients,
        })
        .eq('id', id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setContract({ ...contract!, ...editForm });
      setShowEditModal(false);
      setSuccess('Контракт обновлен');
    } catch (err) {
      setError('Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignAgent = async () => {
    if (!selectedAgentId) {
      setError('Выберите агента');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('contracts')
        .update({ agent_id: selectedAgentId })
        .eq('id', id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setContract({ ...contract!, agent_id: selectedAgentId });
      setShowAgentDropdown(false);
      setSuccess('Агент назначен');
    } catch (err) {
      setError('Ошибка при назначении агента');
    } finally {
      setSaving(false);
    }
  };

  const handleFundEscrow = async () => {
    setSaving(true);
    setError(null);

    try {
      const escrowAmount = Math.round((contract?.kpi_revenue || 0) * 0.12);

      const { error: updateError } = await supabase
        .from('contracts')
        .update({
          status: 'PENDING_PAYMENT',
          escrow_status: 'FUNDED',
          escrow_amount: escrowAmount,
        })
        .eq('id', id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setContract({
        ...contract!,
        status: 'PENDING_PAYMENT',
        escrow_status: 'FUNDED',
        escrow_amount: escrowAmount,
      });
      setShowEscrowModal(false);
      setSuccess('Эскроу пополнен');
    } catch (err) {
      setError('Ошибка при пополнении эскроу');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    return new Intl.NumberFormat('ru-RU').format(amount || 0);
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'Не указано';
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getStreamStatus = (stream: PaymentStream | any) => {
    if (!contract?.escrow_status || contract.escrow_status === 'PENDING') return 'locked';
    if (contract.escrow_status === 'FUNDED') return 'unlocked';
    if (contract.escrow_status === 'RELEASED') return 'released';
    if (contract.escrow_status === 'FROZEN') return 'frozen';
    return 'locked';
  };

  const selectedAgent = agents.find((a) => a.id === contract?.agent_id);
  const escrowAmount = Math.round((contract?.kpi_revenue || 0) * 0.12);
  const paymentStreams = contract?.payment_streams || DEFAULT_PAYMENT_STREAMS;

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]">Загрузка...</div>;
  }

  if (!contract) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-[#000052] mb-4">Контракт не найден</p>
        <button onClick={() => navigate('/ceo/contracts')} className="bg-[#000052] text-white px-4 py-2 rounded-lg">
          Вернуться к списку
        </button>
      </div>
    );
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'DRAFT': 'Черновик',
      'PENDING_APPROVAL': 'Ожидает подтверждения',
      'ACTIVE': 'Активен',
      'IN_PROGRESS': 'В работе',
      'COMPLETED': 'Завершен',
      'DISPUTED': 'Оспорен',
    };
    return labels[status] || status;
  };

  const getEscrowStatusLabel = (status: string | undefined) => {
    if (!status) return 'Ожидает';
    const labels: Record<string, string> = {
      'PENDING': 'Ожидает оплаты',
      'FUNDED': 'Пополнен',
      'RELEASED': 'Выплачен',
      'FROZEN': 'Заморожен',
    };
    return labels[status] || status;
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/ceo/contracts')}
          className="p-2 text-gray-500 hover:text-[#000052] hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-[#000052]">
            {contract.title}
          </h1>
          <p className="text-gray-600 mt-1">{contract.description}</p>
        </div>
        {contract.status === 'DRAFT' && (
          <button
            onClick={() => setShowEditModal(true)}
            className="bg-[#000052] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#000066]"
          >
            <Edit className="w-5 h-5" />
            Редактировать
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-6">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 mb-6">
          <CheckCircle className="w-5 h-5" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-gray-600 text-sm mb-1">Статус</p>
              <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                {getStatusLabel(contract.status)}
              </span>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-gray-600 text-sm mb-1">Эскроу</p>
              <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                {getEscrowStatusLabel(contract.escrow_status)}
              </span>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-gray-600 text-sm mb-1">Дедлайн</p>
              <div className="flex items-center gap-2 text-[#000052]">
                <Calendar className="w-4 h-4" />
                {formatDate(contract.deadline)}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-gray-600 text-sm mb-1">Выручка</p>
              <div className="flex items-center gap-2 text-[#B8860B]">
                <DollarSign className="w-4 h-4" />
                ${formatCurrency(contract.kpi_revenue)}
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-lg font-bold text-[#000052] mb-4">KPI контракта</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-gray-600 text-sm">Звонки</p>
                <p className="text-2xl font-bold text-[#000052]">{contract.kpi_calls || 0}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Встречи</p>
                <p className="text-2xl font-bold text-[#000052]">{contract.kpi_meetings || 0}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Коммерческие предложения</p>
                <p className="text-2xl font-bold text-[#000052]">{contract.kpi_proposals || 0}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Выручка ($)</p>
                <p className="text-2xl font-bold text-[#B8860B]">${formatCurrency(contract.kpi_revenue)}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Минимальный чек ($)</p>
                <p className="text-2xl font-bold text-[#000052]">${formatCurrency(contract.min_check)}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Целевая конверсия (%)</p>
                <p className="text-2xl font-bold text-[#000052]">{contract.target_conversion || 0}%</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Средний чек ($)</p>
                <p className="text-2xl font-bold text-[#000052]">${formatCurrency(contract.avg_check)}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Целевые клиенты</p>
                <p className="text-2xl font-bold text-[#000052]">{contract.target_clients || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-lg font-bold text-[#000052] mb-4">Потоки выплат</h2>
            <div className="space-y-3">
              {paymentStreams.map((stream: PaymentStream | any, index: number) => {
                const status = getStreamStatus(stream);
                const StatusIcon = status === 'locked' ? Lock : Unlock;
                const statusColor = status === 'locked' ? 'text-gray-400' :
                  status === 'released' ? 'text-[#B8860B]' : 'text-green-600';

                return (
                  <div
                    key={stream.id || index}
                    className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <StatusIcon className={'w-5 h-5 ' + statusColor} />
                      <span className="text-[#000052]">{stream.name || 'Поток'}</span>
                      {stream.clawback && (
                        <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">
                          Clawback
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[#B8860B] font-medium">
                        {stream.percent ? stream.percent + '%' :
                         stream.amount ? '$' + formatCurrency(stream.amount) :
                         stream.release || '—'}
                      </span>
                      <span className={'text-xs px-2 py-1 rounded ' + (
                        status === 'locked' ? 'bg-gray-100 text-gray-600' :
                        status === 'released' ? 'bg-[#B8860B]/20 text-[#B8860B]' :
                        status === 'frozen' ? 'bg-red-100 text-red-600' :
                        'bg-green-100 text-green-600'
                      )}>
                        {status === 'locked' ? 'Заблокировано' :
                         status === 'released' ? 'Выплачено' :
                         status === 'frozen' ? 'Заморожено' : 'Разблокировано'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#B8860B]/20 rounded-lg">
                <Users className="w-5 h-5 text-[#B8860B]" />
              </div>
              <h3 className="text-lg font-bold text-[#000052]">
                Агент исполнителя
              </h3>
            </div>

            {selectedAgent ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-[#B8860B]/20 flex items-center justify-center">
                    <span className="text-[#B8860B] font-medium">
                      {(selectedAgent.full_name || 'A').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-[#000052]">{selectedAgent.full_name}</p>
                    <p className="text-sm text-gray-600">{selectedAgent.phone}</p>
                    {selectedAgent.email && (
                      <p className="text-sm text-gray-600">{selectedAgent.email}</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {agents.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-gray-600 mb-3">Нет агентов</p>
                    <button
                      onClick={() => navigate('/ceo/agents')}
                      className="border border-[#000052] text-[#000052] px-4 py-2 rounded-lg text-sm hover:bg-[#000052] hover:text-white transition-colors"
                    >
                      <UserPlus className="w-4 h-4 inline mr-2" />
                      Перейти к агентам
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <button
                      onClick={() => setShowAgentDropdown(!showAgentDropdown)}
                      className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg text-gray-600 hover:text-[#000052] transition-colors"
                    >
                      <span>Выбрать агента</span>
                      <ChevronDown className="w-5 h-5" />
                    </button>

                    {showAgentDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg overflow-hidden z-10 shadow-lg">
                        {agents.map((agent) => (
                          <button
                            key={agent.id}
                            onClick={() => {
                              setSelectedAgentId(agent.id);
                            }}
                            className={'w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors ' + (
                              selectedAgentId === agent.id ? 'bg-[#B8860B]/10' : ''
                            )}
                          >
                            <div className="w-8 h-8 rounded-full bg-[#B8860B]/20 flex items-center justify-center">
                              <span className="text-[#B8860B] text-sm font-medium">
                                {(agent.full_name || 'A').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                              </span>
                            </div>
                            <div className="text-left">
                              <p className="text-[#000052]">{agent.full_name}</p>
                              <p className="text-sm text-gray-600">{agent.phone}</p>
                            </div>
                          </button>
                        ))}
                        {selectedAgentId && (
                          <div className="p-3 border-t border-gray-200">
                            <button
                              onClick={handleAssignAgent}
                              disabled={saving}
                              className="w-full bg-[#000052] text-white py-2 rounded-lg hover:bg-[#000066] disabled:opacity-50"
                            >
                              {saving ? 'Сохранение...' : 'Назначить агента'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Wallet className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-[#000052]">
                Оплата эскроу
              </h3>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Сумма эскроу (12%)</span>
                <span className="text-xl font-bold text-[#B8860B]">${formatCurrency(escrowAmount)}</span>
              </div>

              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-gray-400" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Статус эскроу</p>
                  <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                    {getEscrowStatusLabel(contract.escrow_status)}
                  </span>
                </div>
              </div>

              {contract.status === 'DRAFT' && (
                <button
                  onClick={() => {
                    if (!contract.agent_id) {
                      setError('Сначала назначьте агента');
                      return;
                    }
                    setShowEscrowModal(true);
                  }}
                  className="w-full bg-[#000052] text-white py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-[#000066]"
                >
                  <Wallet className="w-5 h-5" />
                  Оплатить эскроу
                </button>
              )}
              {contract.status === 'DRAFT' && !contract.agent_id && (
                <p className="text-xs text-gray-500 text-center">
                  Сначала назначьте агента для оплаты эскроу
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-[#000052]">
                Редактировать контракт
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 text-gray-500 hover:text-[#000052]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditContract} className="p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#000052] mb-1.5">Название *</label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#000052]/10"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#000052] mb-1.5">Описание *</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#000052]/10 min-h-[100px]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#000052] mb-1.5">Дедлайн *</label>
                    <input
                      type="date"
                      value={editForm.deadline}
                      onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#000052]/10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm font-bold text-[#000052] mb-4">KPI</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Звонки</label>
                        <input
                          type="number"
                          value={editForm.kpi_calls || ''}
                          onChange={(e) => setEditForm({ ...editForm, kpi_calls: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#000052]/10"
                          min={0}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Встречи</label>
                        <input
                          type="number"
                          value={editForm.kpi_meetings || ''}
                          onChange={(e) => setEditForm({ ...editForm, kpi_meetings: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#000052]/10"
                          min={0}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Коммерческие предложения</label>
                        <input
                          type="number"
                          value={editForm.kpi_proposals || ''}
                          onChange={(e) => setEditForm({ ...editForm, kpi_proposals: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#000052]/10"
                          min={0}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Выручка ($)</label>
                        <input
                          type="number"
                          value={editForm.kpi_revenue || ''}
                          onChange={(e) => setEditForm({ ...editForm, kpi_revenue: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#000052]/10"
                          min={0}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Минимальный чек ($)</label>
                        <input
                          type="number"
                          value={editForm.min_check || ''}
                          onChange={(e) => setEditForm({ ...editForm, min_check: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#000052]/10"
                          min={0}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Целевая конверсия (%)</label>
                        <input
                          type="number"
                          value={editForm.target_conversion}
                          onChange={(e) => setEditForm({ ...editForm, target_conversion: parseInt(e.target.value) || 20 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#000052]/10"
                          min={1}
                          max={100}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Средний чек ($)</label>
                        <input
                          type="number"
                          value={editForm.avg_check || ''}
                          onChange={(e) => setEditForm({ ...editForm, avg_check: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#000052]/10"
                          min={0}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Целевые клиенты</label>
                        <input
                          type="number"
                          value={editForm.target_clients || ''}
                          onChange={(e) => setEditForm({ ...editForm, target_clients: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#000052]/10"
                          min={0}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Отмена
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-[#000052] text-white rounded-lg hover:bg-[#000066] disabled:opacity-50">
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEscrowModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-[#000052]">
                Оплата эскроу
              </h2>
              <button
                onClick={() => setShowEscrowModal(false)}
                className="p-2 text-gray-500 hover:text-[#000052]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-center mb-6">
                <p className="text-gray-600 mb-2">Сумма к оплате:</p>
                <p className="text-4xl font-bold text-[#B8860B]">${formatCurrency(escrowAmount)}</p>
                <p className="text-gray-500 text-sm mt-2">12% от выручки ${formatCurrency(contract.kpi_revenue)}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg text-sm">
                <p className="text-gray-600 mb-2">Реквизиты для оплаты:</p>
                <p className="text-[#000052] font-medium">{company?.company_name || 'Не указано'}</p>
                <p className="text-gray-600 mt-2">ИНН: {company?.inn || 'Не указано'}</p>
                <p className="text-gray-600">Расч. счет: {company?.settlement_account || 'Не указано'}</p>
                <p className="text-gray-600">Банк: {company?.bank_name || 'Не указано'}</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowEscrowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Отмена
                </button>
                <button
                  onClick={handleFundEscrow}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-[#000052] text-white rounded-lg hover:bg-[#000066] disabled:opacity-50"
                >
                  {saving ? 'Обработка...' : 'Подтвердить оплату'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}