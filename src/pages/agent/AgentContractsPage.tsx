import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Clock, CheckCircle, DollarSign } from 'lucide-react';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Contract {
  id: string;
  title: string;
  description: string;
  status: string;
  escrow_amount: number;
  escrow_status: string;
  deadline: string;
}

export function AgentContractsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrCreateContract = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('contracts')
          .select('*')
          .eq('agent_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Ошибка загрузки контрактов:', error);
        } else if (data && data.length > 0) {
          setContracts(data);
        } else {
          console.log('Контрактов нет, создаем тестовый...');
          const testContract = {
            agent_id: user.id,
            title: 'Тестовый контракт: Привлечение 5 клиентов',
            description: 'Провести 5 встреч с корпоративными клиентами и закрыть 1 сделку. KPI начнут считаться после принятия.',
            status: 'PENDING_APPROVAL',
            escrow_amount: 50000,
            escrow_status: 'FUNDED',
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          };

          const { data: newContract, error: insertError } = await supabase
            .from('contracts')
            .insert(testContract)
            .select()
            .single();

          if (insertError) {
            console.error('Ошибка создания тестового контракта:', insertError);
          } else {
            setContracts([newContract]);
          }
        }
      } catch (err) {
        console.error('Ошибка:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrCreateContract();
  }, [user]);

  const handleAcceptContract = async (contractId: string) => {
    const { error } = await supabase
      .from('contracts')
      .update({ status: 'ACTIVE' })
      .eq('id', contractId);

    if (!error) {
      setContracts(prev => prev.map(c => 
        c.id === contractId ? { ...c, status: 'ACTIVE' } : c
      ));
      alert('✅ Контракт принят! Смарт-контракт активирован, KPI начали считаться.');
    } else {
      console.error('Ошибка при принятии контракта:', error);
      alert('Ошибка при принятии контракта');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'DISPUTED': return 'bg-red-100 text-red-800';
      case 'PENDING_APPROVAL': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-text-primary">
          {t('contracts.title')}
        </h1>
      </div>

      {contracts.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-12 text-center">
          <FileText className="w-16 h-16 text-text-secondary/30 mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            {t('dashboard.noActiveContracts')}
          </h3>
          <p className="text-text-secondary max-w-md">
            {t('dashboard.contractWillAppear')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contracts.map((contract) => (
            <div key={contract.id} className="card hover:shadow-lg transition-shadow border border-text-secondary/10">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-gold/10 rounded-lg">
                  <FileText className="w-5 h-5 text-gold" />
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(contract.status)}`}>
                  {t(`contract.statuses.${contract.status}`) || contract.status}
                </span>
              </div>
              
              <h3 className="text-lg font-semibold text-text-primary mb-2 line-clamp-2">
                {contract.title}
              </h3>
              
              <p className="text-sm text-text-secondary mb-4 line-clamp-3">
                {contract.description}
              </p>

              <div className="space-y-3 pt-4 border-t border-text-secondary/10">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-text-secondary">
                    <DollarSign className="w-4 h-4" />
                    <span>{t('contract.escrowAmount')}</span>
                  </div>
                  <span className="font-semibold text-text-primary">
                    {contract.escrow_amount.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-text-secondary">
                    <Clock className="w-4 h-4" />
                    <span>{t('contract.deadline')}</span>
                  </div>
                  <span className="text-text-primary">
                    {new Date(contract.deadline).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-text-secondary/10">
                {contract.status === 'PENDING_APPROVAL' ? (
                  <button 
                    onClick={() => handleAcceptContract(contract.id)}
                    className="w-full bg-gold hover:bg-gold/90 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Принять контракт
                  </button>
                ) : contract.status === 'ACTIVE' ? (
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-300">
                    {t('contract.submitWork')}
                  </button>
                ) : (
                  <button disabled className="w-full bg-gray-200 text-gray-500 font-medium py-2.5 px-4 rounded-lg cursor-not-allowed">
                    {t(`contract.statuses.${contract.status}`)}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}