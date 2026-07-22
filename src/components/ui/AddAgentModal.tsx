import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, UserPlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface AddAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAgentAdded: () => void;
}

export function AddAgentModal({ isOpen, onClose, onAgentAdded }: AddAgentModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    specialization: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Получаем company_id
      const { data: companyData } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!companyData) {
        alert('Сначала заполните данные компании в настройках');
        setLoading(false);
        return;
      }

      // Создаем агента
      const { error } = await supabase.from('agents').insert({
        company_id: companyData.id,
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        specialization: formData.specialization,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      // Создаем уведомление
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'AGENT_ADDED',
        title: 'Агент добавлен',
        message: `Агент ${formData.full_name} успешно добавлен в систему`,
        is_read: false,
        created_at: new Date().toISOString(),
      });

      onAgentAdded();
      onClose();
      setFormData({ full_name: '', email: '', phone: '', specialization: '' });
    } catch (err) {
      console.error('Error adding agent:', err);
      alert(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-[#000052] flex items-center gap-2">
            <UserPlus className="w-6 h-6" />
            {t('agent.addAgent')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">{t('agent.fullName')} *</label>
            <input
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              className="input"
              placeholder="Иванов Иван Иванович"
              required
            />
          </div>

          <div>
            <label className="label">Email *</label>
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="input"
              placeholder="agent@example.com"
              required
            />
          </div>

          <div>
            <label className="label">Телефон *</label>
            <input
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="input"
              placeholder="+7 (999) 123-45-67"
              required
            />
          </div>

          <div>
            <label className="label">Специализация *</label>
            <select
              name="specialization"
              value={formData.specialization}
              onChange={handleChange}
              className="input"
              required
            >
              <option value="">Выберите специализацию</option>
              <option value="insurance_b2b">Страхование B2B</option>
              <option value="insurance_b2c">Страхование B2C</option>
              <option value="life_insurance">Страхование жизни</option>
              <option value="property_insurance">Страхование имущества</option>
              <option value="health_insurance">Медицинское страхование</option>
            </select>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {t('common.cancel') || 'Отмена'}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              {loading ? t('common.loading') : t('agent.addAgent')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}