import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { AddAgentModal } from '../../components/ui/AddAgentModal';
import { ContractStatusBadge } from '../../components/ui/ContractStatusBadge';
import { useTranslation } from 'react-i18next';
import { User, Mail, Phone, Briefcase, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export const CEOAgentsPage: React.FC = () => {
  const { user, role } = useAuth();
  const { t } = useTranslation();
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setLoading(true);
        // В реальном проекте здесь будет запрос к Supabase
        // const { data, error } = await supabase.from('agents').select('*');
        // if (error) throw error;
        // setAgents(data || []);
        
        // Для демо временно используем тестовые данные
        setAgents([
          {
            id: '1',
            full_name: 'Иван Петров',
            email: 'ivan@example.com',
            phone: '+7 999 123-45-67',
            specialization: 'Страхование жизни',
            status: 'ACTIVE',
            tax_status: 'self_employed',
            bank_name: 'Сбербанк',
            bank_bik: '044525225',
            correspondent_account: '30101810400000000225',
            settlement_account: '40802810838000000001',
            created_at: new Date().toISOString()
          },
          {
            id: '2',
            full_name: 'Анна Сидорова',
            email: 'anna@example.com',
            phone: '+7 987 654-32-10',
            specialization: 'Автострахование',
            status: 'ACTIVE',
            tax_status: 'ip',
            bank_name: 'Тинькофф',
            bank_bik: '044525974',
            correspondent_account: '30101810400000000974',
            settlement_account: '40802810138000000002',
            created_at: new Date().toISOString()
          }
        ]);
      } catch (error) {
        console.error('Error fetching agents:', error);
      } finally {
        setLoading(false);
      }
    };

    if (role === 'CEO') {
      fetchAgents();
    }
  }, [role]);

  const handleAddAgent = (newAgent: any) => {
    // В реальном проекте здесь будет сохранение в Supabase
    setAgents([...agents, newAgent]);
    setIsModalOpen(false);
  };

  const handleDeleteAgent = (id: string) => {
    // В реальном проекте здесь будет удаление из Supabase
    setAgents(agents.filter(agent => agent.id !== id));
  };

  if (!user || role !== 'CEO') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#000052] mb-2">
              {t('ceo.agents.title', { defaultValue: 'Управление агентами' })}
            </h1>
            <p className="text-gray-500">
              {t('ceo.agents.subtitle', { defaultValue: 'Добавляйте, редактируйте и управляйте агентами вашей команды' })}
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#000052] hover:bg-[#000070] text-white font-medium py-2 px-4 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <User size={18} />
            <span>{t('ceo.agents.addAgent', { defaultValue: 'Добавить агента' })}</span>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin h-8 w-8 text-[#B8860B]" />
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <div className="text-5xl mb-4">👥</div>
            <h3 className="text-xl font-medium text-[#000052] mb-2">
              {t('ceo.agents.noAgents', { defaultValue: 'Агенты не найдены' })}
            </h3>
            <p className="text-gray-500 mb-6">
              {t('ceo.agents.noAgentsDescription', { defaultValue: 'Добавьте первого агента, чтобы начать работу' })}
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-[#000052] hover:bg-[#000070] text-white font-medium py-2 px-4 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <User size={18} />
              <span>{t('ceo.agents.addFirstAgent', { defaultValue: 'Добавить первого агента' })}</span>
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('ceo.agents.fullName', { defaultValue: 'ФИО' })}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('ceo.agents.contact', { defaultValue: 'Контакты' })}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('ceo.agents.specialization', { defaultValue: 'Специализация' })}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('ceo.agents.status', { defaultValue: 'Статус' })}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('ceo.agents.actions', { defaultValue: 'Действия' })}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {agents.map((agent) => (
                    <tr key={agent.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-[#B8860B] rounded-full flex items-center justify-center text-white font-medium mr-4">
                            {agent.full_name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-[#000052]">{agent.full_name}</div>
                            <div className="text-xs text-gray-500">{agent.tax_status === 'self_employed' ? 'Самозанятый' : 'ИП'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center mb-1">
                            <Mail className="w-4 h-4 text-gray-400 mr-2" />
                            {agent.email}
                          </div>
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 text-gray-400 mr-2" />
                            {agent.phone}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{agent.specialization}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <ContractStatusBadge status={agent.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedAgent(agent)}
                            className="text-[#B8860B] hover:text-[#9a7009] transition-colors"
                          >
                            {t('common.edit', { defaultValue: 'Редактировать' })}
                          </button>
                          <button
                            onClick={() => handleDeleteAgent(agent.id)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                          >
                            {t('common.delete', { defaultValue: 'Удалить' })}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {isModalOpen && (
          <AddAgentModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedAgent(null);
            }}
            onSave={handleAddAgent}
            agent={selectedAgent}
          />
        )}
      </div>
    </DashboardLayout>
  );
};