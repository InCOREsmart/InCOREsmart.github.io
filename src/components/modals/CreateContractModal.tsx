import React, { useState } from 'react';
import { X, FileText, DollarSign, Calendar, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CreateContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateContractModal: React.FC<CreateContractModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    revenue: '',
    deadline: '',
    agent_id: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const revenueNum = parseFloat(formData.revenue);
      const escrowAmount = revenueNum * 0.1;
      const agentPayout = revenueNum * 0.05;

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from('contracts').insert({
        title: formData.title,
        description: formData.description,
        revenue: revenueNum,
        escrow_amount: escrowAmount,
        agent_payouts_total: agentPayout,
        company_profit: revenueNum - escrowAmount - agentPayout,
        roi_percentage: 50,
        deadline: formData.deadline,
        agent_id: formData.agent_id || null,
        company_id: user?.id,
        status: 'PENDING_APPROVAL',
        reward_type: 'standard_b2b'
      });

      if (error) throw error;

      if (formData.agent_id) {
        await supabase.from('notifications').insert({
          user_id: formData.agent_id,
          type: 'contract_assigned',
          title: 'Новый контракт',
          message: `Вам назначен контракт: ${formData.title}`,
          is_read: false
        });
      }

      onSuccess();
    } catch (err) {
      console.error('Ошибка создания контракта:', err);
      alert('Не удалось создать контракт.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-[#000052] text-white">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#B8860B]" />
            Новый контракт
          </h2>
          <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#000052] mb-1">Название контракта</label>
            <input
              required
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B8860B] outline-none"
              placeholder="Например: Страхование имущества ООО 'Ромашка'"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#000052] mb-1">Описание</label>
            <textarea
              required
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B8860B] outline-none"
              placeholder="Краткое описание условий..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#000052] mb-1 flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-[#B8860B]" /> Выручка ($)
              </label>
              <input
                required
                type="number"
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B8860B] outline-none"
                placeholder="50000"
                value={formData.revenue}
                onChange={(e) => setFormData({ ...formData, revenue: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#000052] mb-1 flex items-center gap-1">
                <Calendar className="w-4 h-4 text-[#B8860B]" /> Дедлайн
              </label>
              <input
                required
                type="date"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B8860B] outline-none"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#000052] mb-1 flex items-center gap-1">
              <Users className="w-4 h-4 text-[#B8860B]" /> Назначить агента (ID)
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B8860B] outline-none"
              placeholder="Оставьте пустым для назначения позже"
              value={formData.agent_id}
              onChange={(e) => setFormData({ ...formData, agent_id: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-[#B8860B] text-white rounded-lg hover:bg-[#B8860B]/90 transition font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                'Создать и депонировать'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateContractModal;