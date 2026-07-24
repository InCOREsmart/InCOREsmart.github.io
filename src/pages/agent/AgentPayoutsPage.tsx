import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { useTranslation } from 'react-i18next';
import { 
  DollarSign, 
  Clock, 
  ShieldCheck, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Loader2,
  FileText,
  PieChart,
  TrendingUp
} from 'lucide-react';

export const AgentPayoutsPage: React.FC = () => {
  const { user, role } = useAuth();
  const { t } = useTranslation();
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayouts = async () => {
      try {
        setLoading(true);
        // В реальном проекте здесь будет запрос к Supabase
        // const { data, error } = await supabase.from('payouts').select('*');
        // if (error) throw error;
        // setPayouts(data || []);
        
        // Для демо временно используем тестовые данные
        setPayouts([
          {
            id: '1',
            type: 'new_sales',
            amount: 5000,
            status: 'PENDING',
            description: 'Бонус за новые продажи',
            releaseDate: new Date(Date.now() + 86400000).toISOString(),
            contractId: 'contract-1'
          },
          {
            id: '2',
            type: 'renewal',
            amount: 1500,
            status: 'PENDING',
            description: 'Бонус за продление',
            releaseDate: new Date(Date.now() + 172800000).toISOString(),
            contractId: 'contract-2'
          },
          {
            id: '3',
            type: 'retention',
            amount: 1000,
            status: 'PENDING',
            description: 'Бонус за удержание (90 дней)',
            releaseDate: new Date(Date.now() + 7776000000).toISOString(),
            contractId: 'contract-3'
          },
          {
            id: '4',
            type: 'annual',
            amount: 500,
            status: 'PENDING',
            description: 'Годовой бонус (1/12)',
            releaseDate: new Date(Date.now() + 2592000000).toISOString(),
            contractId: 'contract-4'
          }
        ]);
      } catch (error) {
        console.error('Error fetching payouts:', error);
      } finally {
        setLoading(false);
      }
    };

    if (role === 'AGENT') {
      fetchPayouts();
    }
  }, [role]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            {t('payouts.status.pending', { defaultValue: 'Ожидает' })}
          </span>
        );
      case 'RELEASED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {t('payouts.status.released', { defaultValue: 'Выплачено' })}
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            {t('payouts.status.cancelled', { defaultValue: 'Отменено' })}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {t('payouts.status.unknown', { defaultValue: 'Неизвестно' })}
          </span>
        );
    }
  };

  if (!user || role !== 'AGENT') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#000052] mb-2">
              {t('payouts.title', { defaultValue: 'Выплаты и потоки' })}
            </h1>
            <p className="text-gray-500">
              {t('payouts.subtitle', { defaultValue: 'Ваши выплаты и условия смарт-контрактов' })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h2 className="text-xl font-semibold text-[#000052] mb-6 flex items-center">
                <FileText className="w-5 h-5 text-[#B8860B] mr-2" />
                {t('payouts.paymentStreams', { defaultValue: 'Потоки выплат' })}
              </h2>
              
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="animate-spin h-8 w-8 text-[#B8860B]" />
                </div>
              ) : payouts.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <div className="text-5xl mb-4">💰</div>
                  <h3 className="text-xl font-medium text-[#000052] mb-2">
                    {t('payouts.noPayouts', { defaultValue: 'Выплаты не найдены' })}
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {t('payouts.noPayoutsDescription', { defaultValue: 'Ваша история выплат будет отображена здесь' })}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {payouts.map((payout) => (
                    <div key={payout.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <div className="bg-[#B8860B] p-2 rounded-lg mr-3">
                              <DollarSign className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="text-lg font-medium text-[#000052]">
                              {payout.description}
                            </h3>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-2">
                            <span className="bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-700">
                              {t(`payouts.types.${payout.type}`, { defaultValue: payout.type })}
                            </span>
                            <span className="bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-700">
                              {t('payouts.releaseDate', { defaultValue: 'Дата релиза' })}: {new Date(payout.releaseDate).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm">
                            {t('payouts.details', { defaultValue: 'Контракт' })}: #{payout.contractId}
                          </p>
                        </div>
                        <div className="text-right mt-4 md:mt-0">
                          <div className="text-2xl font-bold text-[#000052] mb-1">
                            {new Intl.NumberFormat('ru-RU', { 
                              style: 'currency', 
                              currency: 'RUB',
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0
                            }).format(payout.amount)}
                          </div>
                          {getStatusBadge(payout.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-[#000052] mb-6 flex items-center">
                <PieChart className="w-5 h-5 text-[#B8860B] mr-2" />
                {t('payouts.smartContractStatus', { defaultValue: 'Статус смарт-контракта' })}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-[#000052] mb-2 flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    {t('payouts.fundsVerified', { defaultValue: 'Средства верифицированы' })}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {t('payouts.fundsVerifiedDescription', { defaultValue: 'Средства заблокированы в смарт-контракте и готовы к выплате при выполнении условий' })}
                  </p>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center mb-2">
                      <TrendingUp className="w-4 h-4 text-green-500 mr-2" />
                      <span className="font-medium text-green-800">{t('payouts.instantRelease', { defaultValue: 'Мгновенный релиз' })}</span>
                    </div>
                    <p className="text-sm text-green-700">
                      {t('payouts.instantReleaseDescription', { defaultValue: 'Как только Оракул подтверждает поступление средств от клиента, смарт-контракт мгновенно переводит вашу комиссию на расчетный счет.' })}
                    </p>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-[#000052] mb-2 flex items-center">
                    <ShieldCheck className="w-5 h-5 text-red-500 mr-2" />
                    {t('payouts.clawbackWarning', { defaultValue: 'Clawback (Удержание)' })}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {t('payouts.clawbackWarningDescription', { defaultValue: 'Бонус за удержание (10%) не выплачивается, если клиент расторгает договор в течение первых 90 дней. Это защищает бизнес от фрода.' })}
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center mb-2">
                      <Clock className="w-4 h-4 text-red-500 mr-2" />
                      <span className="font-medium text-red-800">{t('payouts.annualBonus', { defaultValue: 'Годовой бонус (5%)' })}</span>
                    </div>
                    <p className="text-sm text-red-700">
                      {t('payouts.annualBonusDescription', { defaultValue: 'Накапливается ежемесячно (1/12). Выплачивается в конце года при выполнении KPI. Ваши деньги застрахованы математикой.' })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-[#000052] mb-6 flex items-center">
                <Calendar className="w-5 h-5 text-[#B8860B] mr-2" />
                {t('payouts.upcomingPayouts', { defaultValue: 'Предстоящие выплаты' })}
              </h2>
              
              {loading ? (
                <div className="flex justify-center items-center h-48">
                  <Loader2 className="animate-spin h-8 w-8 text-[#B8860B]" />
                </div>
              ) : payouts.filter(p => p.status === 'PENDING').length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📅</div>
                  <h3 className="text-lg font-medium text-[#000052] mb-2">
                    {t('payouts.noUpcomingPayouts', { defaultValue: 'Предстоящих выплат нет' })}
                  </h3>
                  <p className="text-gray-500">
                    {t('payouts.noUpcomingPayoutsDescription', { defaultValue: 'Все выплаты уже обработаны' })}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {payouts.filter(p => p.status === 'PENDING').map((payout) => (
                    <div key={payout.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium text-[#000052]">
                            {payout.description}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {new Date(payout.releaseDate).toLocaleDateString('ru-RU', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>
                        <span className="bg-[#B8860B] text-white px-3 py-1 rounded-full text-sm font-medium">
                          {new Intl.NumberFormat('ru-RU', { 
                            style: 'currency', 
                            currency: 'RUB',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                          }).format(payout.amount)}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#B8860B] rounded-full" 
                          style={{ width: '75%' }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};