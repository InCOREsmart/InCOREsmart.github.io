import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, FileText, DollarSign, Calendar, AlertCircle, TrendingUp } from 'lucide-react';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { supabase, Contract } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ContractStatusBadge } from '../../components/ui/ContractStatusBadge';
import { CreateContractModal } from '../../components/ui/CreateContractModal';

export function CEOContractsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [showNoCompanyAlert, setShowNoCompanyAlert] = useState(false);

  useEffect(() => {
    const fetchContracts = async () => {
      if (!user) return;

      setLoading(true);
      try {
        // Получаем ID компании пользователя
        const { data: companyData } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (companyData) {
          setCompanyId(companyData.id);

          // Получаем контракты этой компании
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

  const handleContractCreated = () => {
    setIsModalOpen(false);
    // Перезагружаем страницу, чтобы отобразить новый контракт с рассчитанной экономикой
    window.location.reload();
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

  // Расчет сводных метрик
  const activeContracts = contracts.filter(c => 
    c.status !== 'COMPLETED' && c.status !== 'DISPUTED' && c.status !== 'DISPUTED_REJECTED'
  ).length;
  
  const totalEscrow = contracts.reduce((sum, c) => sum + (c.escrow_amount || 0), 0);
  const totalRevenue = contracts.reduce((sum, c) => sum + (c.revenue || c.kpi_revenue || 0), 0);

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
            {t('contracts.title')}
          </h1>
          <p className="text-text-secondary mt-1">
            {activeContracts} {t('dashboard.activeContracts').toLowerCase()}
          </p>
        </div>
        <button
          onClick={() => {
            if (companyId) {
              setIsModalOpen(true);
            } else {
              setShowNoCompanyAlert(true);
              setTimeout(() => setShowNoCompanyAlert(false), 3000);
            }
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          {t('contracts.createNew')}
        </button>
        
        {/* Alert for missing company data */}
        {showNoCompanyAlert && (
          <div className="absolute top-20 right-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm z-50 shadow-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {t('settings.fillCompanyFirst') || 'Сначала заполните данные компании в настройках'}
          </div>
        )}
      </div>

      {/* Stats Cards */}
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
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-text-secondary text-sm">{t('dashboard.escrowBalance')}</p>
              <p className="text-2xl font-bold text-text-primary">{formatCurrency(totalEscrow)} ₽</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-text-secondary text-sm">{t('dashboard.totalRevenue')}</p>
              <p className="text-2xl font-bold text-text-primary">{formatCurrency(totalRevenue)} ₽</p>
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
                setIsModalOpen(true);
              } else {
                setShowNoCompanyAlert(true);
                setTimeout(() => setShowNoCompanyAlert(false), 3000);
              }
            }}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            {t('contracts.createNew')}
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-text-secondary/10 bg-gray-50/50">
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
                    {t('contracts.plannedRevenue')}
                  </th>
                  <th className="text-right py-4 px-4 text-text-secondary text-sm font-medium">
                    {t('contract.escrowAmount')}
                  </th>
                  <th className="text-right py-4 px-4 text-text-secondary text-sm font-medium">
                    ROI
                  </th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr
                    key={contract.id}
                    className="border-b border-text-secondary/5 hover:bg-gray-50/50 transition-colors"
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
                      {formatCurrency(contract.revenue || contract.kpi_revenue || 0)} ₽
                    </td>
                    <td className="py-4 px-4 text-right font-medium text-gold">
                      {formatCurrency(contract.escrow_amount || 0)} ₽
                    </td>
                    <td className="py-4 px-4 text-right">
                      {contract.roi_percentage ? (
                        <span className={`font-semibold ${contract.roi_percentage > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {contract.roi_percentage.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-text-muted">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Contract Modal with Smart Calculator */}
      <CreateContractModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleContractCreated}
      />
    </DashboardLayout>
  );
}