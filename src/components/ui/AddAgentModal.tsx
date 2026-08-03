import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, UserPlus, Mail, Phone, Briefcase } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface AddAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function AddAgentModal({ isOpen, onClose, onCreated }: AddAgentModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    specialization: '',
    tax_status: 'self_employed',
    inn: '',
    snils: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Получаем company_id текущего CEO
      const { data: companyData } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!companyData) {
        alert(t('contractModal.errorNoCompany'));
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
        tax_status: formData.tax_status,
        inn: formData.inn,
        snils: formData.snils,
        status: 'ACTIVE',
      });

      if (error) throw error;

      alert('✅ Агент успешно добавлен в команду!');
      
      // Очистка формы
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        specialization: '',
        tax_status: 'self_employed',
        inn: '',
        snils: '',
      });

      // Вызываем callback для обновления списка
      if (onCreated) {
        onCreated();
      }
      
      onClose();
    } catch (err) {
      console.error('Ошибка добавления агента:', err);
      alert(t('common.error') + ': ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-[#000052]/10">
        {/* Шапка */}
        <div className="flex items-center justify-between p-6 border-b border-[#000052]/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#B8860B]/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-[#B8860B]" />
            </div>
            <h2 className="text-2xl font-bold text-[#000052]">{t('agent.addAgent')}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#000052]/5 rounded-full transition-colors">
            <X className="w-5 h-5 text-[#000052]" />
          </button>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* ФИО */}
          <div>
            <label className="block text-sm font-semibold text-[#000052] mb-1.5">
              {t('agent.fullName')} *
            </label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30 focus:border-[#B8860B]"
              placeholder="Иванов Иван Иванович"
              required
            />
          </div>

          {/* Email и Телефон */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5 flex items-center gap-1">
                <Mail className="w-4 h-4" />
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30 focus:border-[#B8860B]"
                placeholder="agent@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5 flex items-center gap-1">
                <Phone className="w-4 h-4" />
                {t('agent.phone')} *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30 focus:border-[#B8860B]"
                placeholder="+7 900 123-45-67"
                required
              />
            </div>
          </div>

          {/* Специализация */}
          <div>
            <label className="block text-sm font-semibold text-[#000052] mb-1.5 flex items-center gap-1">
              <Briefcase className="w-4 h-4" />
              Специализация
            </label>
            <input
              type="text"
              name="specialization"
              value={formData.specialization}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30 focus:border-[#B8860B]"
              placeholder="B2B Страхование, Корпоративные клиенты"
            />
          </div>

          {/* Налоговый статус */}
          <div className="bg-[#000052]/5 p-4 rounded-lg border border-[#000052]/10">
            <label className="block text-sm font-semibold text-[#000052] mb-3">
              {t('agent.taxStatus')}
            </label>
            <div className="flex gap-3">
              <label className="flex-1 flex items-center gap-2 p-3 bg-white border border-[#000052]/20 rounded-lg cursor-pointer hover:border-[#B8860B] transition">
                <input
                  type="radio"
                  name="tax_status"
                  value="self_employed"
                  checked={formData.tax_status === 'self_employed'}
                  onChange={handleChange}
                  className="text-[#B8860B]"
                />
                <span className="text-sm text-[#000052]">{t('agent.selfEmployed')}</span>
              </label>
              <label className="flex-1 flex items-center gap-2 p-3 bg-white border border-[#000052]/20 rounded-lg cursor-pointer hover:border-[#B8860B] transition">
                <input
                  type="radio"
                  name="tax_status"
                  value="ip"
                  checked={formData.tax_status === 'ip'}
                  onChange={handleChange}
                  className="text-[#B8860B]"
                />
                <span className="text-sm text-[#000052]">{t('agent.ip')}</span>
              </label>
            </div>
          </div>

          {/* ИНН и СНИЛС */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">
                {t('agent.inn')}
              </label>
              <input
                type="text"
                name="inn"
                value={formData.inn}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30 focus:border-[#B8860B]"
                placeholder={formData.tax_status === 'self_employed' ? '12 цифр' : '12 цифр'}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">
                {t('agent.snils')}
              </label>
              <input
                type="text"
                name="snils"
                value={formData.snils}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30 focus:border-[#B8860B]"
                placeholder="XXX-XXX-XXX XX"
              />
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex gap-3 pt-4 border-t border-[#000052]/10">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-[#000052]/5 hover:bg-[#000052]/10 text-[#000052] rounded-lg font-semibold transition"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 bg-[#B8860B] hover:bg-[#9a7209] text-white rounded-lg font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <UserPlus className="w-5 h-5" />
              {loading ? t('common.loading') : t('agent.addAgent')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}