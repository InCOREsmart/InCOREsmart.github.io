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
        const { data: companyData } = await supabase.from('companies').select('id').eq('user_id', user.id).maybeSingle();
        if (companyData) {
          setCompanyId(companyData.id);
          const { data: contractsData } = await supabase.from('contracts').select('*').eq('company_id', companyData.id).order('created_at', { ascending: false });
          setContracts(contractsData || []);
        }
      } catch (err) { console.error(err); } 
      finally { setLoading(false); }
    };
    fetchContracts();
  }, [user]);

  const handleContractCreated = () => { setIsModalOpen(false); window.location.reload(); };
  const formatCurrency = (amount: number) => new Intl.NumberFormat('ru-RU').format(amount);
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('ru-RU');

  const activeContracts = contracts.filter(c => !['COMPLETED', 'DISPUTED', 'DISPUTED_REJECTED'].includes(c.status)).length;
  const totalEscrow = contracts.reduce((sum, c) => sum + (c.escrow_amount || 0), 0);
  const totalRevenue = contracts.reduce((sum, c) => sum + (c.revenue || c.kpi_revenue || 0), 0);

  if (loading) return <DashboardLayout><div className="p-8 text-[#000052]">{t('common.loading')}</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#000052]">{t('contracts.title')}</h1>
          <p className="text-gray-600 mt-1">{activeContracts} {t('dashboard.activeContracts').toLowerCase()}</p>
        </div>
        <button onClick={() => companyId ? setIsModalOpen(true) : setShowNoCompanyAlert(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" /> {t('contracts.createNew')}
        </button>
        {showNoCompanyAlert && (
          <div className="absolute top-20 right-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm z-50 shadow-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Сначала заполните данные компании в настройках
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#000052]/10 rounded-lg"><FileText className="w-5 h-5 text-[#000052]" /></div>
            <div><p className="text-xs text-gray-600">{t('dashboard.activeContracts')}</p><p className="text-2xl font-bold text-[#000052]">{activeContracts}</p></div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg"><DollarSign className="w-5 h-5 text-yellow-600" /></div>
            <div><p className="text-xs text-gray-600">{t('dashboard.escrowBalance')}</p><p className="text-2xl font-bold text-[#000052]">{formatCurrency(totalEscrow)} ₽</p></div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg"><TrendingUp className="w-5 h-5 text-green-600" /></div>
            <div><p className="text-xs text-gray-600">{t('dashboard.totalRevenue')}</p><p className="text-2xl font-bold text-[#000052]">{formatCurrency(totalRevenue)} ₽</p></div>
          </div>
        </div>
      </div>

      {contracts.length === 0 ? (
        <div className="card text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[#000052] mb-2">{t('contract.noContracts')}</h3>
          <p className="text-gray-600 mb-6">{t('contract.createFirst')}</p>
          <button onClick={() => companyId ? setIsModalOpen(true) : setShowNoCompanyAlert(true)} className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-5 h-5" /> {t('contracts.createNew')}
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">{t('contract.title')}</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">{t('contract.status')}</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">{t('contract.deadline')}</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">{t('contracts.plannedRevenue')}</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">{t('contract.escrowAmount')}</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">ROI</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr key={contract.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4"><p className="font-medium text-[#000052]">{contract.title}</p><p className="text-sm text-gray-600 truncate max-w-xs">{contract.description}</p></td>
                    <td className="py-4 px-4"><ContractStatusBadge status={contract.status} /></td>
                    <td className="py-4 px-4 text-sm text-gray-600">{formatDate(contract.deadline)}</td>
                    <td className="py-4 px-4 text-right font-medium text-[#000052]">{formatCurrency(contract.revenue || contract.kpi_revenue || 0)} ₽</td>
                    <td className="py-4 px-4 text-right font-medium text-[#000052]">{formatCurrency(contract.escrow_amount || 0)} ₽</td>
                    <td className="py-4 px-4 text-right font-semibold text-green-600">{contract.roi_percentage ? `${contract.roi_percentage.toFixed(1)}%` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <CreateContractModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onCreated={handleContractCreated} />
    </DashboardLayout>
  );
}