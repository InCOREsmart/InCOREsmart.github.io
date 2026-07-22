import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Plus, FileText, DollarSign } from 'lucide-react';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { AddAgentModal } from '../../components/ui/AddAgentModal';

export function CEOAgentsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchAgents = async () => {
    if (!user) return;
    try {
      const { data: companyData } = await supabase.from('companies').select('id').eq('user_id', user.id).maybeSingle();
      if (companyData) {
        const { data } = await supabase.from('agents').select('*').eq('company_id', companyData.id);
        setAgents(data || []);
      }
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAgents(); }, [user]);

  if (loading) return <DashboardLayout><div className="p-8 text-[#000052]">{t('common.loading')}</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#000052]">{t('nav.agents')}</h1>
          <p className="text-gray-600 mt-1">{agents.length} {t('agent.title').toLowerCase()}</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> {t('agent.addAgent')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card bg-gradient-to-br from-[#B8860B]/10 to-[#B8860B]/5 border-[#B8860B]/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#B8860B]/20 rounded-lg"><Users className="w-5 h-5 text-[#B8860B]" /></div>
            <div><p className="text-xs text-gray-600">{t('nav.agents')}</p><p className="text-2xl font-bold text-[#000052]">{agents.length}</p></div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><FileText className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-xs text-gray-600">{t('contract.statuses.ACTIVE')}</p><p className="text-2xl font-bold text-[#000052]">0</p></div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-[#B8860B]/10 to-[#B8860B]/5 border-[#B8860B]/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#B8860B]/20 rounded-lg"><DollarSign className="w-5 h-5 text-[#B8860B]" /></div>
            <div><p className="text-xs text-gray-600">{t('ceoDashboard.pendingPayouts')}</p><p className="text-2xl font-bold text-[#000052]">$0</p></div>
          </div>
        </div>
      </div>

      {agents.length === 0 ? (
        <div className="card text-center py-16">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-[#000052] mb-2">{t('agent.noAgents')}</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">{t('agent.waitingTasks')}</p>
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> {t('agent.addAgent')}
          </button>
        </div>
      ) : (
        <div className="card">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">ФИО</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Email</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Телефон</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Специализация</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Статус</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-[#000052]">{agent.full_name}</td>
                  <td className="py-3 px-4 text-gray-600">{agent.email}</td>
                  <td className="py-3 px-4 text-gray-600">{agent.phone}</td>
                  <td className="py-3 px-4 text-gray-600">{agent.specialization}</td>
                  <td className="py-3 px-4">
                    <span className="badge badge-success">Активен</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddAgentModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAgentAdded={fetchAgents}
      />
    </DashboardLayout>
  );
}