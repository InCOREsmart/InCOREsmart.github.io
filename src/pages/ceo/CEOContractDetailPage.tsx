import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { ContractStatusBadge } from '../../components/ui/ContractStatusBadge';
import { EscrowBadge } from '../../components/ui/EscrowBadge';
import { supabase, Contract, Agent, Company, DEFAULT_PAYMENT_STREAMS, PaymentStream } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface AgentWithUser extends Agent {
  user_email?: string;
}

export function CEOContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [contract, setContract] = useState<Contract | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [agents, setAgents] = useState<AgentWithUser[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [showEscrowModal, setShowEscrowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit form state
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

      console.log('[CEOContractDetailPage] fetchData called');
      setLoading(true);
      try {
        // Get company
        const { data: companyData } = await supabase
          .from('companies')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        setCompany(companyData);

        // Get contract
        const { data: contractData } = await supabase
          .from('contracts')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        console.log('[CEOContractDetailPage] Contract data:', contractData);

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

        // Get agents for this company
        if (companyData) {
          const { data: agentsData } = await supabase
            .from('agents')
            .select('*')
            .eq('company_id', companyData.id);

          console.log('[CEOContractDetailPage] Agents data:', agentsData);
          if (agentsData) {
            setAgents(agentsData as AgentWithUser[]);
          }
        }
      } catch (err) {
        console.error('[CEOContractDetailPage] Error fetching:', err);
        setError('Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, id]);

  const handleEditContract = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[handleEditContract] Starting edit');
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

      setContract({
        ...contract!,
        ...editForm,
      });
      setShowEditModal(false);
      setSuccess('Контракт обновлен');
      console.log('[handleEditContract] Success');
    } catch (err) {
      setError('Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignAgent = async () => {
    console.log('[handleAssignAgent] Starting, agentId:', selectedAgentId);
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

      setContract({
        ...contract!,
        agent_id: selectedAgentId,
      });
      setShowAgentDropdown(false);
      setSuccess('Агент назначен');
      console.log('[handleAssignAgent] Success');
    } catch (err) {
      setError('Ошибка при назначении агента');
    } finally {
      setSaving(false);
    }
  };

  const handleFundEscrow = async () => {
    console.log('[handleFundEscrow] Starting');
    setSaving(true);
    setError(null);

    try {
      const escrowAmount = Math.round((contract?.kpi_revenue || 0) * 0.12);

      // Update contract status
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

      // Create transaction record
      const { error: txnError } = await supabase
        .from('transactions')
        .insert({
          contract_id: id,
          type: 'ESCROW_FUND',
          amount: escrowAmount,
          currency: 'USD',
          status: 'SUCCESS',
        });

      if (txnError) {
        console.error('[handleFundEscrow] Transaction error:', txnError);
      }

      setContract({
        ...contract!,
        status: 'PENDING_PAYMENT',
        escrow_status: 'FUNDED',
        escrow_amount: escrowAmount,
      });
      setShowEscrowModal(false);
      setSuccess('Эскроу пополнен');
      console.log('[handleFundEscrow] Success');
    } catch (err) {
      setError('Ошибка при пополнении эскроу');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU').format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getStreamStatus = (stream: PaymentStream) => {
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
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-text-secondary">{t('common.loading')}</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!contract) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <AlertCircle className="w-12 h-12 text-error mb-4" />
          <p className="text-text-primary mb-4">Контракт не найден</p>
          <button onClick={() => navigate('/ceo/contracts')} className="btn-primary">
            Вернуться к списку
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/ceo/contracts')}
          className="p-2 text-text-secondary hover:text-text-primary hover:bg-card rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-display font-bold text-text-primary">
            {contract.title}
          </h1>
          <p className="text-text-secondary mt-1">{contract.description}</p>
        </div>
        {contract.status === 'DRAFT' && (
          <button
            onClick={() => {
              console.log('[Edit button] Clicked');
              setShowEditModal(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Edit className="w-5 h-5" />
            Редактировать
          </button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-error/20 border border-error/30 rounded-lg text-error mb-6">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-4 bg-success/20 border border-success/30 rounded-lg text-success mb-6">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card">
              <p className="text-text-secondary text-sm mb-1">Статус</p>
              <ContractStatusBadge status={contract.status} />
            </div>
            <div className="card">
              <p className="text-text-secondary text-sm mb-1">Эскроу</p>
              <EscrowBadge status={contract.escrow_status} />
            </div>
            <div className="card">
              <p className="text-text-secondary text-sm mb-1">Дедлайн</p>
              <div className="flex items-center gap-2 text-text-primary">
                <Calendar className="w-4 h-4" />
                {formatDate(contract.deadline)}
              </div>
            </div>
            <div className="card">
              <p className="text-text-secondary text-sm mb-1">Выручка</p>
              <div className="flex items-center gap-2 text-gold">
                <DollarSign className="w-4 h-4" />
                ${formatCurrency(contract.kpi_revenue)}
              </div>
            </div>
          </div>

          {/* KPI Metrics */}
          <div className="card">
            <h2 className="text-lg font-display font-semibold text-text-primary mb-4">
              {t('kpi.title')}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-text-secondary text-sm">{t('kpi.calls')}</p>
                <p className="text-2xl font-bold text-text-primary">{contract.kpi_calls}</p>
              </div>
              <div>
                <p className="text-text-secondary text-sm">{t('kpi.meetings')}</p>
                <p className="text-2xl font-bold text-text-primary">{contract.kpi_meetings}</p>
              </div>
              <div>
                <p className="text-text-secondary text-sm">{t('kpi.proposals')}</p>
                <p className="text-2xl font-bold text-text-primary">{contract.kpi_proposals}</p>
              </div>
              <div>
                <p className="text-text-secondary text-sm">{t('kpi.revenue')}</p>
                <p className="text-2xl font-bold text-gold">${formatCurrency(contract.kpi_revenue)}</p>
              </div>
              <div>
                <p className="text-text-secondary text-sm">{t('kpi.minCheck')}</p>
                <p className="text-2xl font-bold text-text-primary">${formatCurrency(contract.min_check)}</p>
              </div>
              <div>
                <p className="text-text-secondary text-sm">{t('kpi.targetConversion')}</p>
                <p className="text-2xl font-bold text-text-primary">{contract.target_conversion}%</p>
              </div>
              <div>
                <p className="text-text-secondary text-sm">{t('kpi.avgCheck')}</p>
                <p className="text-2xl font-bold text-text-primary">${formatCurrency(contract.avg_check)}</p>
              </div>
              <div>
                <p className="text-text-secondary text-sm">{t('kpi.targetClients')}</p>
                <p className="text-2xl font-bold text-text-primary">{contract.target_clients}</p>
              </div>
            </div>
          </div>

          {/* 6 Payment Streams */}
          <div className="card">
            <h2 className="text-lg font-display font-semibold text-text-primary mb-4">
              {t('paymentStreams.title')}
            </h2>
            <div className="space-y-3">
              {paymentStreams.map((stream) => {
                const status = getStreamStatus(stream);
                const StatusIcon = status === 'locked' ? Lock : Unlock;
                const statusColor = status === 'locked' ? 'text-text-muted' :
                  status === 'released' ? 'text-gold' : 'text-success';

                return (
                  <div
                    key={stream.id}
                    className="flex items-center justify-between py-3 px-4 bg-primary-dark rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <StatusIcon className={`w-5 h-5 ${statusColor}`} />
                      <span className="text-text-primary">{stream.name}</span>
                      {stream.clawback && (
                        <span className="text-xs px-2 py-0.5 rounded bg-warning/20 text-warning">
                          Clawback
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gold font-medium">
                        {stream.percent ? `${stream.percent}%` :
                         stream.amount ? `$${formatCurrency(stream.amount)}` :
                         stream.release || '—'}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        status === 'locked' ? 'bg-text-muted/20 text-text-muted' :
                        status === 'released' ? 'bg-gold/20 text-gold' :
                        status === 'frozen' ? 'bg-error/20 text-error' :
                        'bg-success/20 text-success'
                      }`}>
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

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Agent Block */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gold/20 rounded-lg">
                <Users className="w-5 h-5 text-gold" />
              </div>
              <h3 className="text-lg font-display font-semibold text-text-primary">
                Агент исполнителя
              </h3>
            </div>

            {selectedAgent ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-primary-dark rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                    <span className="text-gold font-medium">
                      {selectedAgent.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">{selectedAgent.full_name}</p>
                    <p className="text-sm text-text-secondary">{selectedAgent.phone}</p>
                    {selectedAgent.email && (
                      <p className="text-sm text-text-secondary">{selectedAgent.email}</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {agents.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-text-secondary mb-3">Нет агентов</p>
                    <button
                      onClick={() => navigate('/ceo/agents')}
                      className="btn-outline text-sm"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Перейти к агентам
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <button
                      onClick={() => {
                        console.log('[Agent dropdown] Clicked');
                        setShowAgentDropdown(!showAgentDropdown);
                      }}
                      className="w-full flex items-center justify-between p-3 bg-primary-dark rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                    >
                      <span>Выбрать агента</span>
                      <ChevronDown className="w-5 h-5" />
                    </button>

                    {showAgentDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-text-secondary/20 rounded-lg overflow-hidden z-10">
                        {agents.map((agent) => (
                          <button
                            key={agent.id}
                            onClick={() => {
                              setSelectedAgentId(agent.id);
                              console.log('[Agent selected]', agent.id);
                            }}
                            className={`w-full flex items-center gap-3 p-3 hover:bg-primary-dark transition-colors ${
                              selectedAgentId === agent.id ? 'bg-gold/10' : ''
                            }`}
                          >
                            <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center">
                              <span className="text-gold text-sm font-medium">
                                {agent.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                              </span>
                            </div>
                            <div className="text-left">
                              <p className="text-text-primary">{agent.full_name}</p>
                              <p className="text-sm text-text-secondary">{agent.phone}</p>
                            </div>
                          </button>
                        ))}
                        {selectedAgentId && (
                          <div className="p-3 border-t border-text-secondary/10">
                            <button
                              onClick={handleAssignAgent}
                              disabled={saving}
                              className="btn-primary w-full"
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

          {/* Escrow Block */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-success/20 rounded-lg">
                <Wallet className="w-5 h-5 text-success" />
              </div>
              <h3 className="text-lg font-display font-semibold text-text-primary">
                Оплата эскроу
              </h3>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-text-secondary/10">
                <span className="text-text-secondary">Сумма эскроу (12%)</span>
                <span className="text-xl font-bold text-gold">${formatCurrency(escrowAmount)}</span>
              </div>

              <div className="flex items-center gap-2 p-3 bg-primary-dark rounded-lg">
                <TrendingUp className="w-5 h-5 text-text-muted" />
                <div className="flex-1">
                  <p className="text-sm text-text-secondary">Статус эскроу</p>
                  <EscrowBadge status={contract.escrow_status} />
                </div>
              </div>

              {contract.status === 'DRAFT' && (
                <button
                  onClick={() => {
                    console.log('[Escrow button] Clicked');
                    if (!contract.agent_id) {
                      setError('Сначала назначьте агента');
                      return;
                    }
                    setShowEscrowModal(true);
                  }}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  <Wallet className="w-5 h-5" />
                  Оплатить эскроу
                </button>
              )}
              {contract.status === 'DRAFT' && !contract.agent_id && (
                <p className="text-xs text-text-muted text-center">
                  Сначала назначьте агента для оплаты эскроу
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-primary border border-text-secondary/20 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-text-secondary/10">
              <h2 className="text-xl font-display font-semibold text-text-primary">
                Редактировать контракт
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditContract} className="p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="label">{t('contract.title')} *</label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">{t('contract.description')} *</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="input min-h-[100px]"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">{t('contract.deadline')} *</label>
                    <input
                      type="date"
                      value={editForm.deadline}
                      onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                      className="input"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="card bg-primary-light">
                    <h3 className="text-sm font-medium text-text-primary mb-4">{t('kpi.title')}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label text-xs">{t('kpi.calls')}</label>
                        <input
                          type="number"
                          value={editForm.kpi_calls || ''}
                          onChange={(e) => setEditForm({ ...editForm, kpi_calls: parseInt(e.target.value) || 0 })}
                          className="input"
                          min={0}
                        />
                      </div>
                      <div>
                        <label className="label text-xs">{t('kpi.meetings')}</label>
                        <input
                          type="number"
                          value={editForm.kpi_meetings || ''}
                          onChange={(e) => setEditForm({ ...editForm, kpi_meetings: parseInt(e.target.value) || 0 })}
                          className="input"
                          min={0}
                        />
                      </div>
                      <div>
                        <label className="label text-xs">{t('kpi.proposals')}</label>
                        <input
                          type="number"
                          value={editForm.kpi_proposals || ''}
                          onChange={(e) => setEditForm({ ...editForm, kpi_proposals: parseInt(e.target.value) || 0 })}
                          className="input"
                          min={0}
                        />
                      </div>
                      <div>
                        <label className="label text-xs">{t('kpi.revenue')} ($)</label>
                        <input
                          type="number"
                          value={editForm.kpi_revenue || ''}
                          onChange={(e) => setEditForm({ ...editForm, kpi_revenue: parseInt(e.target.value) || 0 })}
                          className="input"
                          min={0}
                        />
                      </div>
                      <div>
                        <label className="label text-xs">{t('kpi.minCheck')} ($)</label>
                        <input
                          type="number"
                          value={editForm.min_check || ''}
                          onChange={(e) => setEditForm({ ...editForm, min_check: parseInt(e.target.value) || 0 })}
                          className="input"
                          min={0}
                        />
                      </div>
                      <div>
                        <label className="label text-xs">{t('kpi.targetConversion')} (%)</label>
                        <input
                          type="number"
                          value={editForm.target_conversion}
                          onChange={(e) => setEditForm({ ...editForm, target_conversion: parseInt(e.target.value) || 20 })}
                          className="input"
                          min={1}
                          max={100}
                        />
                      </div>
                      <div>
                        <label className="label text-xs">{t('kpi.avgCheck')} ($)</label>
                        <input
                          type="number"
                          value={editForm.avg_check || ''}
                          onChange={(e) => setEditForm({ ...editForm, avg_check: parseInt(e.target.value) || 0 })}
                          className="input"
                          min={0}
                        />
                      </div>
                      <div>
                        <label className="label text-xs">{t('kpi.targetClients')}</label>
                        <input
                          type="number"
                          value={editForm.target_clients || ''}
                          onChange={(e) => setEditForm({ ...editForm, target_clients: parseInt(e.target.value) || 0 })}
                          className="input"
                          min={0}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-text-secondary/10">
                <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary">
                  {t('common.cancel')}
                </button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? t('common.loading') : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Escrow Modal */}
      {showEscrowModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-primary border border-text-secondary/20 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-text-secondary/10">
              <h2 className="text-xl font-display font-semibold text-text-primary">
                Оплата эскроу
              </h2>
              <button
                onClick={() => setShowEscrowModal(false)}
                className="p-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-center mb-6">
                <p className="text-text-secondary mb-2">Сумма к оплате:</p>
                <p className="text-4xl font-bold text-gold">${formatCurrency(escrowAmount)}</p>
                <p className="text-text-muted text-sm mt-2">12% от выручки ${formatCurrency(contract.kpi_revenue)}</p>
              </div>

              <div className="card bg-primary-light text-sm">
                <p className="text-text-secondary mb-2">Реквизиты для оплаты:</p>
                <p className="text-text-primary font-medium">{company?.company_name}</p>
                <p className="text-text-secondary mt-2">ИНН: {company?.inn}</p>
                <p className="text-text-secondary">Расч. счет: {company?.settlement_account}</p>
                <p className="text-text-secondary">Банк: {company?.bank_name}</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowEscrowModal(false)} className="btn-secondary flex-1">
                  Отмена
                </button>
                <button
                  onClick={handleFundEscrow}
                  disabled={saving}
                  className="btn-primary flex-1"
                >
                  {saving ? 'Обработка...' : 'Подтвердить оплату'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
