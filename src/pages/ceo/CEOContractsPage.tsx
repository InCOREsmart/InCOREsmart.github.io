import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, FileText, DollarSign, Calendar, AlertCircle } from 'lucide-react';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { supabase, Contract } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ContractStatusBadge } from '../../components/ui/ContractStatusBadge';
import { CreateContractModal } from '../../components/ui/CreateContractModal';

interface ContractWithCompany extends Contract {
  companies?: {
    company_name: string;
  };
}

export function CEOContractsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [contracts, setContracts] = useState<ContractWithCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [showNoCompanyAlert, setShowNoCompanyAlert] = useState(false);

  useEffect(() => {
    const fetchContracts = async () => {
      if (!user) return;

      setLoading(true);
      try {
        // First get the company ID
        const { data: companyData } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (companyData) {
          setCompanyId(companyData.id);

          // Then get contracts
          const { data: contractsData } = await supabase
            .from('contracts')
            .select('*')
            .eq('company_id', companyData.id)
            .order('created_at', { ascending: false });

          setContracts(contractsData || []);
        }
      } catch (err) {
        console.error('Error fetching contracts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, [user]);

  const handleContractCreated = (newContract: Contract) => {
    setContracts([newContract, ...contracts]);
    setShowCreateModal(false);
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

  // Calculate totals
  const activeContracts = contracts.filter(c => c.status !== 'COMPLETED' && c.status !== 'DISPUTED').length;
  const totalEscrow = contracts.reduce((sum, c) => sum + (c.escrow_amount || 0), 0);
  const totalRevenue = contracts.reduce((sum, c) => sum + (c.kpi_revenue || 0), 0);

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
      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-text-primary">
            {t('nav.contracts')}
          </h1>
          <p className="text-text-secondary mt-1">
            {activeContracts} {t('dashboard.activeContracts').toLowerCase()}
          </p>
        </div>
        <button
          onClick={() => {
            if (companyId) {
              setShowCreateModal(true);
            } else {
              setShowNoCompanyAlert(true);
              setTimeout(() => setShowNoCompanyAlert(false), 3000);
            }
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          {t('contract.createContract')}
        </button>
        {showNoCompanyAlert && (
          <div className="absolute top-20 right-4 bg-error/20 border border-error/30 rounded-lg px-4 py-3 text-error text-sm z-50">
            Сначала заполните данные компании в настройках
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gold/20 rounded-lg">
              <FileText className="w-5 h-5 text-gold" />
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
              <p className="text-text-secondary text-sm">{t('dashboard.escrowBalance')}</p>
              <p className="text-2xl font-bold text-text-primary">${formatCurrency(totalEscrow)}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-light/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-primary-light" />
            </div>
            <div>
              <p className="text-text-secondary text-sm">{t('dashboard.totalRevenue')}</p>
              <p className="text-2xl font-bold text-text-primary">${formatCurrency(totalRevenue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contracts Table */}
      {contracts.length === 0 ? (
        <div className="card text-center py-12">
          <AlertCircle className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-2">{t('contract.noContracts')}</h3>
          <p className="text-text-secondary mb-6">{t('contract.createFirst')}</p>
          <button
            onClick={() => {
              if (companyId) {
                setShowCreateModal(true);
              } else {
                setShowNoCompanyAlert(true);
                setTimeout(() => setShowNoCompanyAlert(false), 3000);
              }
            }}
            className="btn-primary"
          >
            <Plus className="w-5 h-5 mr-2" />
            {t('contract.createContract')}
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-text-secondary/10">
                  <th className="text-left py-4 px-4 text-text-secondary text-sm font-medium">
                    {t('contract.title')}
                  </th>
                  <th className="text-left py-4 px-4 text-text-secondary text-sm font-medium">
                    {t('contract.status')}
                  </th>
                  <th className="text-left py-4 px-4 text-text-secondary text-sm font-medium">
                    {t('contract.deadline')}
                  </th>
                  <th className="text-right py-4 px-4 text-text-secondary text-sm font-medium">
                    {t('kpi.revenue')} ($)
                  </th>
                  <th className="text-right py-4 px-4 text-text-secondary text-sm font-medium">
                    {t('contract.escrowAmount')} ($)
                  </th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr
                    key={contract.id}
                    className="border-b border-text-secondary/5 hover:bg-primary-light transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium text-text-primary">{contract.title}</p>
                        <p className="text-sm text-text-secondary truncate max-w-xs">
                          {contract.description}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <ContractStatusBadge status={contract.status} />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 text-text-secondary">
                        <Calendar className="w-4 h-4" />
                        {formatDate(contract.deadline)}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right font-medium text-text-primary">
                      ${formatCurrency(contract.kpi_revenue || 0)}
                    </td>
                    <td className="py-4 px-4 text-right font-medium text-gold">
                      ${formatCurrency(contract.escrow_amount || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Contract Modal */}
      {showCreateModal && companyId ? (
        <CreateContractModal
          companyId={companyId}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleContractCreated}
        />
      ) : showCreateModal && !companyId ? (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-primary border border-text-secondary/20 rounded-2xl p-6 max-w-md text-center">
            <AlertCircle className="w-12 h-12 text-error mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">Данные компании не найдены</h3>
            <p className="text-text-secondary mb-4">Сначала заполните данные компании в настройках</p>
            <button
              onClick={() => setShowCreateModal(false)}
              className="btn-primary"
            >
              Понятно
            </button>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
