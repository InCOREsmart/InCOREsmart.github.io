import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Phone, DollarSign, FileText, AlertCircle, Plus } from 'lucide-react';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { AddAgentModal } from '../../components/ui/AddAgentModal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface AgentWithStats {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  created_at: string;
  contract_count: number;
  total_payout: number;
}

export function CEOAgentsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [agents, setAgents] = useState<AgentWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const fetchAgents = async () => {
      if (!user) return;

      setLoading(true);
      try {
        // Get company ID first
        const { data: companyData } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!companyData) {
          setLoading(false);
          return;
        }

        // Get contracts for this company with agents
        const { data: contractsData } = await supabase
          .from('contracts')
          .select('agent_id')
          .eq('company_id', companyData.id)
          .not('agent_id', 'is', null);

        if (!contractsData || contractsData.length === 0) {
          setAgents([]);
          setLoading(false);
          return;
        }

        // Get unique agent IDs
        const agentIds = [...new Set(contractsData.map((c) => c.agent_id))];

        // Get agent profiles
        const { data: agentsData } = await supabase
          .from('agents')
          .select('*')
          .in('id', agentIds);

        if (!agentsData) {
          setAgents([]);
          setLoading(false);
          return;
        }

        // Get contract counts and payouts for each agent
        const agentsWithStats: AgentWithStats[] = await Promise.all(
          agentsData.map(async (agent) => {
            // Count contracts for this agent
            const { count } = await supabase
              .from('contracts')
              .select('*', { count: 'exact', head: true })
              .eq('agent_id', agent.id);

            // Get total payouts
            const { data: transactionsData } = await supabase
              .from('transactions')
              .select('amount')
              .eq('type', 'SALARY_PAYOUT')
              .eq('status', 'SUCCESS')
              .in('contract_id', contractsData.filter((c) => c.agent_id === agent.id).map(() => {
                // We need to get contract IDs for this agent
                return '';
              }));

            // Get contract IDs for this agent to calculate payouts
            const { data: agentContracts } = await supabase
              .from('contracts')
              .select('id')
              .eq('agent_id', agent.id);

            let totalPayout = 0;
            if (agentContracts && agentContracts.length > 0) {
              const { data: payouts } = await supabase
                .from('transactions')
                .select('amount')
                .eq('type', 'SALARY_PAYOUT')
                .eq('status', 'SUCCESS')
                .in('contract_id', agentContracts.map((c) => c.id));

              totalPayout = payouts?.reduce((sum, p) => sum + p.amount, 0) || 0;
            }

            return {
              id: agent.id,
              user_id: agent.user_id,
              full_name: agent.full_name,
              phone: agent.phone,
              created_at: agent.created_at,
              contract_count: count || 0,
              total_payout: totalPayout,
            };
          })
        );

        setAgents(agentsWithStats);
      } catch (err) {
        console.error('Error fetching agents:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, [user]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU').format(amount);
  };

  const totalAgents = agents.length;
  const totalPayouts = agents.reduce((sum, a) => sum + a.total_payout, 0);
  const activeContracts = agents.reduce((sum, a) => sum + a.contract_count, 0);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-text-secondary">{t('common.loading')}</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-text-primary">
            {t('nav.agents')}
          </h1>
          <p className="text-text-secondary mt-1">
            {totalAgents} {t('agent.title').toLowerCase()}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Добавить агента
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gold/20 rounded-lg">
              <Users className="w-5 h-5 text-gold" />
            </div>
            <div>
              <p className="text-text-secondary text-sm">{t('nav.agents')}</p>
              <p className="text-2xl font-bold text-text-primary">{totalAgents}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-light/20 rounded-lg">
              <FileText className="w-5 h-5 text-primary-light" />
            </div>
            <div>
              <p className="text-text-secondary text-sm">{t('dashboard.activeContracts')}</p>
              <p className="text-2xl font-bold text-text-primary">{activeContracts}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-text-secondary text-sm">{t('dashboard.pendingPayouts')}</p>
              <p className="text-2xl font-bold text-text-primary">${formatCurrency(totalPayouts)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Agents Table */}
      {agents.length === 0 ? (
        <div className="card text-center py-12">
          <AlertCircle className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-2">{t('agent.noAgents')}</h3>
          <p className="text-text-secondary">
            Агенты появятся, когда откликнутся на ваши контракты
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-text-secondary/10">
                  <th className="text-left py-4 px-4 text-text-secondary text-sm font-medium">
                    {t('agent.fullName')}
                  </th>
                  <th className="text-left py-4 px-4 text-text-secondary text-sm font-medium">
                    {t('agent.phone')}
                  </th>
                  <th className="text-left py-4 px-4 text-text-secondary text-sm font-medium">
                    {t('dashboard.activeContracts')}
                  </th>
                  <th className="text-right py-4 px-4 text-text-secondary text-sm font-medium">
                    {t('dashboard.pendingPayouts')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr
                    key={agent.id}
                    className="border-b border-text-secondary/5 hover:bg-primary-light transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                          <span className="text-gold font-medium">
                            {agent.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <span className="font-medium text-text-primary">{agent.full_name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 text-text-secondary">
                        <Phone className="w-4 h-4" />
                        {agent.phone}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-light/20 text-primary-light">
                        {agent.contract_count}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-medium text-success">
                      ${formatCurrency(agent.total_payout)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Agent Modal */}
      {showAddModal && (
        <AddAgentModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            // Refresh agents list
            setLoading(true);
            // Re-fetch will happen on next render
          }}
        />
      )}
    </DashboardLayout>
  );
}
