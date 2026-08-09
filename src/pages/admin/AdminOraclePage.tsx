import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  FileText, 
  Zap,
  Ban,
  DollarSign
} from 'lucide-react';
import { 
  simulateOracleEvent, 
  openDispute, 
  OracleEvent 
} from '../../lib/smartContractLogic';

export function AdminOraclePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<any[]>([]);
  const [oracleEvents, setOracleEvents] = useState<any[]>([]);
  const [escrowEvents, setEscrowEvents] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'contracts' | 'oracle' | 'escrow' | 'disputes'>('contracts');

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const loadData = async () => {
      try {
        const { data: contractsData } = await supabase
          .from('contracts')
          .select('*')
          .order('created_at', { ascending: false });
        setContracts(contractsData || []);

        const { data: oracleData } = await supabase
          .from('oracle_events')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        setOracleEvents(oracleData || []);

        const { data: escrowData } = await supabase
          .from('escrow_events')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        setEscrowEvents(escrowData || []);

        const { data: disputesData } = await supabase
          .from('disputes')
          .select('*')
          .order('created_at', { ascending: false });
        setDisputes(disputesData || []);
      } catch (err) {
        console.error('Ошибка загрузки:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  const handleOracleEvent = async (contractId: string, eventType: OracleEvent['event_type']) => {
    if (!user) return;
    const confirmed = window.confirm(`Симулировать событие: ${eventType}?`);
    if (!confirmed) return;

    try {
      const result = await simulateOracleEvent(contractId, eventType, user.id);
      if (result.success) {
        alert(`Событие ${eventType} успешно симулировано`);
        // Перезагружаем данные
        const { data: oracleData } = await supabase
          .from('oracle_events')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        setOracleEvents(oracleData || []);

        const { data: escrowData } = await supabase
          .from('escrow_events')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        setEscrowEvents(escrowData || []);
      } else {
        alert('Ошибка: ' + result.error);
      }
    } catch (err) {
      console.error('Ошибка:', err);
    }
  };

  const handleOpenDispute = async (contractId: string) => {
    if (!user) return;
    const reason = prompt('Причина открытия спора:');
    if (!reason) return;

    try {
      const result = await openDispute(contractId, user.id, reason);
      if (result.success) {
        alert('Спор открыт');
        const { data: disputesData } = await supabase
          .from('disputes')
          .select('*')
          .order('created_at', { ascending: false });
        setDisputes(disputesData || []);
      } else {
        alert('Ошибка: ' + result.error);
      }
    } catch (err) {
      console.error('Ошибка:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#B8860B]"></div>
        <p className="mt-4 text-[#000052]">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#000052]">Oracle Panel</h1>
          <p className="text-sm text-[#000052]/70 mt-1">Управление событиями смарт-контрактов (демо-режим)</p>
        </div>
        <button
          onClick={() => navigate('/ceo')}
          className="px-4 py-2 bg-[#000052]/5 hover:bg-[#000052]/10 text-[#000052] rounded-lg transition text-sm font-semibold"
        >
          ← Назад к CEO Dashboard
        </button>
      </div>

      {/* Информационный баннер */}
      <div className="bg-[#B8860B]/10 border border-[#B8860B]/20 p-4 rounded-xl">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-[#B8860B] flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-[#000052] mb-1">Демо-режим Oracle</h3>
            <p className="text-sm text-[#000052]/80">
              Эта панель имитирует работу блокчейн-оракула. Кнопки ниже симулируют бизнес-события, 
              которые автоматически меняют статусы потоков выплат и записывают события в журнал.
            </p>
          </div>
        </div>
      </div>

      {/* Табы */}
      <div className="border-b border-[#000052]/10">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('contracts')}
            className={`pb-3 px-2 text-sm font-semibold transition ${
              activeTab === 'contracts' 
                ? 'text-[#B8860B] border-b-2 border-[#B8860B]' 
                : 'text-[#000052]/60 hover:text-[#000052]'
            }`}
          >
            Контракты ({contracts.length})
          </button>
          <button
            onClick={() => setActiveTab('oracle')}
            className={`pb-3 px-2 text-sm font-semibold transition ${
              activeTab === 'oracle' 
                ? 'text-[#B8860B] border-b-2 border-[#B8860B]' 
                : 'text-[#000052]/60 hover:text-[#000052]'
            }`}
          >
            Oracle Events ({oracleEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('escrow')}
            className={`pb-3 px-2 text-sm font-semibold transition ${
              activeTab === 'escrow' 
                ? 'text-[#B8860B] border-b-2 border-[#B8860B]' 
                : 'text-[#000052]/60 hover:text-[#000052]'
            }`}
          >
            Escrow Events ({escrowEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('disputes')}
            className={`pb-3 px-2 text-sm font-semibold transition ${
              activeTab === 'disputes' 
                ? 'text-[#B8860B] border-b-2 border-[#B8860B]' 
                : 'text-[#000052]/60 hover:text-[#000052]'
            }`}
          >
            Споры ({disputes.length})
          </button>
        </div>
      </div>

      {/* Контент табов */}
      {activeTab === 'contracts' && (
        <div className="space-y-4">
          {contracts.length === 0 ? (
            <div className="text-center py-12 text-[#000052]/60">
              <FileText className="w-16 h-16 mx-auto mb-4 text-[#000052]/20" />
              <p>Контрактов пока нет</p>
            </div>
          ) : (
            <div className="space-y-4">
              {contracts.map((contract) => (
                <div key={contract.id} className="bg-white p-5 rounded-xl border border-[#000052]/10">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-[#000052] text-lg">{contract.title}</h3>
                      <p className="text-sm text-[#000052]/60 mt-1">
                        Эскроу: ${contract.escrow_amount?.toLocaleString() || 0} | 
                        Статус: {contract.status} | 
                        Oracle: {contract.oracle_status}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      contract.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                      contract.status === 'DISPUTED' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {contract.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <button
                      onClick={() => handleOracleEvent(contract.id, 'CLIENT_PAYMENT_CONFIRMED')}
                      className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Подтвердить оплату
                    </button>
                    <button
                      onClick={() => handleOracleEvent(contract.id, 'CLIENT_CHURNED_BEFORE_90_DAYS')}
                      className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition"
                    >
                      <Ban className="w-4 h-4" />
                      <span>
  {'Churn < 90 дней'}
</span>
                    </button>
                    <button
                      onClick={() => handleOracleEvent(contract.id, 'RETENTION_PERIOD_PASSED')}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition"
                    >
                      <Clock className="w-4 h-4" />
                      Retention пройден
                    </button>
                    <button
                      onClick={() => handleOracleEvent(contract.id, 'RENEWAL_CONFIRMED')}
                      className="flex items-center gap-2 px-3 py-2 bg-[#B8860B] hover:bg-[#9a7209] text-white rounded-lg text-xs font-semibold transition"
                    >
                      <Zap className="w-4 h-4" />
                      Продление
                    </button>
                    <button
                      onClick={() => handleOracleEvent(contract.id, 'CROSS_SELL_CONFIRMED')}
                      className="flex items-center gap-2 px-3 py-2 bg-[#000052] hover:bg-[#000052]/90 text-white rounded-lg text-xs font-semibold transition"
                    >
                      <DollarSign className="w-4 h-4" />
                      Кросс-продажа
                    </button>
                    <button
                      onClick={() => handleOracleEvent(contract.id, 'PLAN_ACHIEVED')}
                      className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition"
                    >
                      <CheckCircle className="w-4 h-4" />
                      План выполнен
                    </button>
                    <button
                      onClick={() => handleOracleEvent(contract.id, 'ANNUAL_BONUS_CONFIRMED')}
                      className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition"
                    >
                      <Zap className="w-4 h-4" />
                      Годовой бонус
                    </button>
                    <button
                      onClick={() => handleOpenDispute(contract.id)}
                      className="flex items-center gap-2 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold transition"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Открыть спор
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'oracle' && (
        <div className="bg-white rounded-xl border border-[#000052]/10 overflow-hidden">
          {oracleEvents.length === 0 ? (
            <div className="p-8 text-center text-[#000052]/60">
              <Zap className="w-16 h-16 mx-auto mb-4 text-[#000052]/20" />
              <p>Событий Oracle пока нет</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-[#000052]/5">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase">Дата</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase">Событие</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase">Источник</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase">Подпись</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#000052]/5">
                  {oracleEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-[#000052]/5">
                      <td className="py-3 px-4 text-sm text-[#000052]/70">
                        {new Date(event.created_at).toLocaleString('ru-RU')}
                      </td>
                      <td className="py-3 px-4 text-sm font-semibold text-[#000052]">
                        {event.event_type}
                      </td>
                      <td className="py-3 px-4 text-sm text-[#000052]/70">
                        {event.source || '—'}
                      </td>
                      <td className="py-3 px-4 text-xs text-[#000052]/60 font-mono">
                        {event.signature ? event.signature.substring(0, 20) + '...' : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'escrow' && (
        <div className="bg-white rounded-xl border border-[#000052]/10 overflow-hidden">
          {escrowEvents.length === 0 ? (
            <div className="p-8 text-center text-[#000052]/60">
              <DollarSign className="w-16 h-16 mx-auto mb-4 text-[#000052]/20" />
              <p>Событий эскроу пока нет</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-[#000052]/5">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase">Дата</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase">Событие</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase">Сумма</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase">Актор</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#000052]/5">
                  {escrowEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-[#000052]/5">
                      <td className="py-3 px-4 text-sm text-[#000052]/70">
                        {new Date(event.created_at).toLocaleString('ru-RU')}
                      </td>
                      <td className="py-3 px-4 text-sm font-semibold text-[#000052]">
                        {event.event_type}
                      </td>
                      <td className="py-3 px-4 text-sm text-[#000052]">
                        {event.amount ? `$${event.amount.toLocaleString()}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-sm text-[#000052]/70">
                        {event.actor_role || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'disputes' && (
        <div className="space-y-4">
          {disputes.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-[#000052]/10 text-center text-[#000052]/60">
              <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-[#000052]/20" />
              <p>Споров нет</p>
            </div>
          ) : (
            disputes.map((dispute) => (
              <div key={dispute.id} className="bg-white p-5 rounded-xl border border-[#000052]/10">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-[#000052]">Спор #{dispute.id.substring(0, 8)}</h3>
                    <p className="text-sm text-[#000052]/70 mt-1">{dispute.reason}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    dispute.status === 'OPEN' ? 'bg-red-100 text-red-700' :
                    dispute.status === 'RESOLVED' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {dispute.status}
                  </span>
                </div>
                <p className="text-xs text-[#000052]/60 mt-2">
                  Открыт: {new Date(dispute.created_at).toLocaleString('ru-RU')}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}