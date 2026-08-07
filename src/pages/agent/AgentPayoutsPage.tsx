import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Lock, Unlock, CheckCircle, Ban, Clock, AlertTriangle, DollarSign } from 'lucide-react';

export function AgentPayoutsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<any>(null);
  const [streams, setStreams] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const fetchData = async () => {
      try {
        const { data: agentData } = await supabase
          .from('agents').select('*').eq('user_id', user.id).maybeSingle();
        if (!agentData) { setLoading(false); return; }
        setAgent(agentData);

        const { data: contractsData } = await supabase
          .from('contracts').select('*').eq('agent_id', agentData.id);
        setContracts(contractsData || []);

        if (contractsData && contractsData.length > 0) {
          const contractIds = contractsData.map(c => c.id);
          const { data: streamsData } = await supabase
            .from('contract_payout_streams').select('*').in('contract_id', contractIds)
            .order('created_at', { ascending: false });
          setStreams(streamsData || []);
        }
      } catch (err) {
        console.error('Ошибка:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'LOCKED': return { icon: Lock, color: 'text-gray-500', bg: 'bg-gray-100', label: 'Заблокировано' };
      case 'PENDING_VERIFICATION': return { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Ожидает проверки' };
      case 'UNLOCKED': return { icon: Unlock, color: 'text-green-600', bg: 'bg-green-100', label: 'Разблокировано' };
      case 'PAYABLE': return { icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Готово к выплате' };
      case 'PAID': return { icon: CheckCircle, color: 'text-green-700', bg: 'bg-green-200', label: 'Выплачено' };
      case 'CLAWED_BACK': return { icon: Ban, color: 'text-red-600', bg: 'bg-red-100', label: 'Clawback' };
      case 'CANCELLED': return { icon: Ban, color: 'text-gray-600', bg: 'bg-gray-200', label: 'Отменено' };
      default: return { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100', label: status };
    }
  };

  const getContractTitle = (contractId: string) => {
    const contract = contracts.find(c => c.id === contractId);
    return contract?.title || 'Контракт';
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#B8860B]"></div>
        <p className="mt-4 text-[#000052]">Загрузка...</p>
      </div>
    );
  }

  const totalAmount = streams.reduce((sum, s) => sum + s.amount, 0);
  const totalPaid = streams.filter(s => s.status === 'PAID').reduce((sum, s) => sum + s.amount, 0);
  const totalLocked = streams.filter(s => s.status === 'LOCKED').reduce((sum, s) => sum + s.amount, 0);
  const totalClawed = streams.filter(s => s.status === 'CLAWED_BACK').reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#000052]">Мои выплаты</h1>
        <p className="text-sm text-[#000052]/70 mt-1">Детализация 6 потоков по всем контрактам</p>
      </div>

      {/* Сводка */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#000052] text-white p-4 rounded-xl">
          <p className="text-xs opacity-80 mb-1">Всего по контрактам</p>
          <p className="text-xl font-bold">${totalAmount.toLocaleString()}</p>
        </div>
        <div className="bg-green-600 text-white p-4 rounded-xl">
          <p className="text-xs opacity-80 mb-1">Выплачено</p>
          <p className="text-xl font-bold">${totalPaid.toLocaleString()}</p>
        </div>
        <div className="bg-[#B8860B] text-white p-4 rounded-xl">
          <p className="text-xs opacity-80 mb-1">Заблокировано</p>
          <p className="text-xl font-bold">${totalLocked.toLocaleString()}</p>
        </div>
        <div className="bg-red-600 text-white p-4 rounded-xl">
          <p className="text-xs opacity-80 mb-1">Clawback</p>
          <p className="text-xl font-bold">${totalClawed.toLocaleString()}</p>
        </div>
      </div>

      {/* Таблица потоков */}
      <div className="bg-white rounded-xl border border-[#000052]/10 overflow-hidden">
        <div className="p-4 border-b border-[#000052]/10">
          <h2 className="font-bold text-[#000052]">Потоки выплат ({streams.length})</h2>
        </div>

        {streams.length === 0 ? (
          <div className="p-8 text-center text-[#000052]/60">
            <DollarSign className="w-16 h-16 mx-auto mb-4 text-[#000052]/20" />
            <p>Потоков выплат пока нет</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-[#000052]/5">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase">Поток</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase">Контракт</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase">Сумма</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase">Статус</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase">Условие разблокировки</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase">Дата</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#000052]/5">
                {streams.map((stream) => {
                  const statusInfo = getStatusInfo(stream.status);
                  const StatusIcon = statusInfo.icon;
                  return (
                    <tr key={stream.id} className="hover:bg-[#000052]/5">
                      <td className="py-4 px-4">
                        <div className="font-semibold text-[#000052] text-sm">{stream.title}</div>
                        <div className="text-xs text-[#000052]/60">{stream.stream_key}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm text-[#000052]">{getContractTitle(stream.contract_id)}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm font-bold text-[#000052]">${stream.amount.toLocaleString()}</div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${statusInfo.bg} ${statusInfo.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-xs text-[#000052]/70 max-w-xs">
                          {stream.unlock_condition || '—'}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-xs text-[#000052]/70">
                          {stream.unlocked_at && (
                            <div>Разб.: {new Date(stream.unlocked_at).toLocaleDateString('ru-RU')}</div>
                          )}
                          {stream.paid_at && (
                            <div className="text-green-600">Выпл.: {new Date(stream.paid_at).toLocaleDateString('ru-RU')}</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Clawback предупреждение */}
      {streams.some(s => s.stream_key === 'retention' && s.status === 'LOCKED') && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-yellow-800 mb-1">Clawback Warning</h3>
              <p className="text-sm text-yellow-700">
                Бонус за удержание 90 дней будет выплачен только если клиент останется активным более 90 дней. 
                Если клиент уйдёт раньше — бонус не выплачивается (clawback).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}