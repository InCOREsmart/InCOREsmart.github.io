import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  DollarSign, 
  Shield, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  FileText,
  Zap,
  Lock,
  Unlock,
  Ban
} from 'lucide-react';
import { 
  getContractFullData, 
  simulateOracleEvent, 
  openDispute, 
  releasePayment,
  PayoutStream,
  OracleEvent,
  EscrowEvent
} from '../../lib/smartContractLogic';

export function CEOContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contractData, setContractData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'streams' | 'escrow' | 'oracle' | 'disputes'>('streams');

  useEffect(() => {
    if (!user || !id) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const data = await getContractFullData(id);
        setContractData(data);
      } catch (err) {
        console.error('Ошибка загрузки данных контракта:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, id]);

  const handleOracleEvent = async (eventType: OracleEvent['event_type']) => {
    if (!id || !user) return;
    
    const confirmed = window.confirm(`Симулировать событие Oracle: ${eventType}?`);
    if (!confirmed) return;

    try {
      const result = await simulateOracleEvent(id, eventType, user.id);
      if (result.success) {
        alert('Событие Oracle успешно симулировано');
        // Перезагружаем данные
        const data = await getContractFullData(id);
        setContractData(data);
      } else {
        alert('Ошибка: ' + result.error);
      }
    } catch (err) {
      console.error('Ошибка симуляции Oracle:', err);
    }
  };

  const handleOpenDispute = async () => {
    if (!id || !user) return;
    
    const reason = prompt('Причина открытия спора:');
    if (!reason) return;

    try {
      const result = await openDispute(id, user.id, reason);
      if (result.success) {
        alert('Спор открыт');
        const data = await getContractFullData(id);
        setContractData(data);
      } else {
        alert('Ошибка: ' + result.error);
      }
    } catch (err) {
      console.error('Ошибка открытия спора:', err);
    }
  };

  const handleReleasePayment = async (streamId: string) => {
    if (!id || !user) return;
    
    const confirmed = window.confirm('Разблокировать выплату агенту?');
    if (!confirmed) return;

    try {
      const result = await releasePayment(id, streamId, user.id);
      if (result.success) {
        alert('Выплата разблокирована');
        const data = await getContractFullData(id);
        setContractData(data);
      } else {
        alert('Ошибка: ' + result.error);
      }
    } catch (err) {
      console.error('Ошибка разблокировки:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#B8860B]"></div>
        <p className="mt-4 text-[#000052]">Загрузка данных контракта...</p>
      </div>
    );
  }

  if (!contractData) {
    return (
      <div className="p-8 text-center">
        <XCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
        <p className="text-lg text-[#000052]">Контракт не найден</p>
        <button 
          onClick={() => navigate('/ceo/contracts')}
          className="mt-4 px-6 py-2 bg-[#000052] text-white rounded-lg hover:bg-[#000052]/90 transition"
        >
          Вернуться к списку контрактов
        </button>
      </div>
    );
  }

  const { contract, streams, escrowEvents, oracleEvents, disputes, agent, financials } = contractData;

  const getStreamStatusIcon = (status: string) => {
    switch (status) {
      case 'LOCKED': return <Lock className="w-5 h-5 text-gray-500" />;
      case 'UNLOCKED': return <Unlock className="w-5 h-5 text-green-500" />;
      case 'PAYABLE': return <Zap className="w-5 h-5 text-blue-500" />;
      case 'PAID': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'CLAWED_BACK': return <Ban className="w-5 h-5 text-red-600" />;
      default: return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStreamStatusColor = (status: string) => {
    switch (status) {
      case 'LOCKED': return 'bg-gray-100 text-gray-700';
      case 'UNLOCKED': return 'bg-green-100 text-green-700';
      case 'PAYABLE': return 'bg-blue-100 text-blue-700';
      case 'PAID': return 'bg-green-200 text-green-800';
      case 'CLAWED_BACK': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <button 
            onClick={() => navigate('/ceo/contracts')}
            className="text-sm text-[#000052]/60 hover:text-[#000052] mb-2"
          >
            ← Назад к контрактам
          </button>
          <h1 className="text-3xl font-bold text-[#000052]">{contract.title}</h1>
          <p className="text-sm text-[#000052]/60 mt-1">
            Агент: {agent?.full_name || 'Не назначен'} | Статус: {contract.status}
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => handleOracleEvent('CLIENT_PAYMENT_CONFIRMED')}
            className="px-4 py-2 bg-[#B8860B] text-white rounded-lg hover:bg-[#B8860B]/90 transition text-sm font-semibold"
          >
            [DEMO] Подтвердить оплату
          </button>
          <button 
            onClick={handleOpenDispute}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-semibold"
          >
            Открыть спор
          </button>
        </div>
      </div>

      {/* Финансовые метрики */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#000052] text-white p-5 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5" />
            <span className="text-sm opacity-80">Плановая выручка</span>
          </div>
          <p className="text-2xl font-bold">${financials.plannedRevenue.toLocaleString()}</p>
        </div>

        <div className="bg-[#B8860B] text-white p-5 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5" />
            <span className="text-sm opacity-80">Эскроу</span>
          </div>
          <p className="text-2xl font-bold">${financials.totalEscrow.toLocaleString()}</p>
          <p className="text-xs opacity-70 mt-1">
            Заблокировано: ${financials.totalLocked.toLocaleString()}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#000052]/10">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-[#B8860B]" />
            <span className="text-sm text-[#000052]/70">Прибыль компании</span>
          </div>
          <p className="text-2xl font-bold text-[#000052]">${financials.companyProfit.toLocaleString()}</p>
          <p className="text-xs text-[#000052]/60 mt-1">
            Комиссия: ${financials.platformFee.toLocaleString()}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#000052]/10">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm text-[#000052]/70">Выплачено агенту</span>
          </div>
          <p className="text-2xl font-bold text-[#000052]">${financials.totalUnlocked.toLocaleString()}</p>
          <p className="text-xs text-[#000052]/60 mt-1">
            Из ${financials.totalEscrow.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Табы */}
      <div className="border-b border-[#000052]/10">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('streams')}
            className={`pb-3 px-2 text-sm font-semibold transition ${
              activeTab === 'streams' 
                ? 'text-[#B8860B] border-b-2 border-[#B8860B]' 
                : 'text-[#000052]/60 hover:text-[#000052]'
            }`}
          >
            Потоки выплат ({streams.length})
          </button>
          <button
            onClick={() => setActiveTab('escrow')}
            className={`pb-3 px-2 text-sm font-semibold transition ${
              activeTab === 'escrow' 
                ? 'text-[#B8860B] border-b-2 border-[#B8860B]' 
                : 'text-[#000052]/60 hover:text-[#000052]'
            }`}
          >
            Журнал эскроу ({escrowEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('oracle')}
            className={`pb-3 px-2 text-sm font-semibold transition ${
              activeTab === 'oracle' 
                ? 'text-[#B8860B] border-b-2 border-[#B8860B]' 
                : 'text-[#000052]/60 hover:text-[#000052]'
            }`}
          >
            События Oracle ({oracleEvents.length})
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
      {activeTab === 'streams' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[#000052]">6 потоков выплат</h2>
          <div className="grid grid-cols-1 gap-4">
            {streams.map((stream: PayoutStream) => (
              <div 
                key={stream.id} 
                className="bg-white p-5 rounded-xl border border-[#000052]/10 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getStreamStatusIcon(stream.status)}
                    <div>
                      <h3 className="font-bold text-[#000052]">{stream.title}</h3>
                      <p className="text-xs text-[#000052]/60 mt-1">
                        {stream.unlock_condition || 'Условие не указано'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#000052]">${stream.amount.toLocaleString()}</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-1 ${getStreamStatusColor(stream.status)}`}>
                      {stream.status}
                    </span>
                  </div>
                </div>

                {stream.status === 'UNLOCKED' && (
                  <button
                    onClick={() => handleReleasePayment(stream.id)}
                    className="w-full mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold"
                  >
                    Разблокировать выплату агенту
                  </button>
                )}

                {stream.status === 'CLAWED_BACK' && stream.clawback_reason && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">
                      <AlertTriangle className="w-4 h-4 inline mr-1" />
                      {stream.clawback_reason}
                    </p>
                  </div>
                )}

                {stream.unlocked_at && (
                  <p className="text-xs text-[#000052]/60 mt-2">
                    Разблокировано: {new Date(stream.unlocked_at).toLocaleString('ru-RU')}
                  </p>
                )}

                {stream.paid_at && (
                  <p className="text-xs text-green-600 mt-1">
                    Выплачено: {new Date(stream.paid_at).toLocaleString('ru-RU')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'escrow' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[#000052]">Журнал событий эскроу</h2>
          {escrowEvents.length === 0 ? (
            <p className="text-[#000052]/60">Событий пока нет</p>
          ) : (
            <div className="bg-white rounded-xl border border-[#000052]/10 overflow-hidden">
              <table className="w-full">
                <thead className="bg-[#000052]/5">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase">Дата</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase">Событие</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase">Сумма</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase">Актор</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#000052]/5">
                  {escrowEvents.map((event: EscrowEvent) => (
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

      {activeTab === 'oracle' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[#000052]">События Oracle</h2>
          <div className="bg-[#B8860B]/10 p-4 rounded-lg border border-[#B8860B]/20 mb-4">
            <p className="text-sm text-[#000052]">
              <Zap className="w-4 h-4 inline mr-1 text-[#B8860B]" />
              <strong>Демо-режим:</strong> Используйте кнопки выше для симуляции событий Oracle. Все события записываются в журнал и меняют статусы потоков выплат.
            </p>
          </div>
          {oracleEvents.length === 0 ? (
            <p className="text-[#000052]/60">Событий пока нет</p>
          ) : (
            <div className="bg-white rounded-xl border border-[#000052]/10 overflow-hidden">
              <table className="w-full">
                <thead className="bg-[#000052]/5">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase">Дата</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase">Событие</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase">Источник</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase">Подпись</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#000052]/5">
                  {oracleEvents.map((event: OracleEvent) => (
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

      {activeTab === 'disputes' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[#000052]">Споры</h2>
          {disputes.length === 0 ? (
            <p className="text-[#000052]/60">Споров нет</p>
          ) : (
            <div className="space-y-3">
              {disputes.map((dispute: any) => (
                <div 
                  key={dispute.id} 
                  className="bg-white p-5 rounded-xl border border-[#000052]/10"
                >
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
                  {dispute.resolved_at && (
                    <p className="text-xs text-green-600 mt-1">
                      Закрыт: {new Date(dispute.resolved_at).toLocaleString('ru-RU')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}