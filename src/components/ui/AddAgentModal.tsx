import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Briefcase } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AddAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (agent: any) => void;
  agent?: any;
}

export const AddAgentModal: React.FC<AddAgentModalProps> = ({ isOpen, onClose, onSave, agent }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    specialization: '',
    tax_status: 'self_employed' as 'self_employed' | 'ip',
    inn: '',
    snils: '',
    bank_name: '',
    bank_bik: '',
    correspondent_account: '',
    settlement_account: ''
  });

  useEffect(() => {
    if (agent) {
      setFormData({
        full_name: agent.full_name || '',
        email: agent.email || '',
        phone: agent.phone || '',
        specialization: agent.specialization || '',
        tax_status: agent.tax_status || 'self_employed',
        inn: agent.inn || '',
        snils: agent.snils || '',
        bank_name: agent.bank_name || '',
        bank_bik: agent.bank_bik || '',
        correspondent_account: agent.correspondent_account || '',
        settlement_account: agent.settlement_account || ''
      });
    } else {
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        specialization: '',
        tax_status: 'self_employed',
        inn: '',
        snils: '',
        bank_name: '',
        bank_bik: '',
        correspondent_account: '',
        settlement_account: ''
      });
    }
  }, [agent, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      id: agent?.id || Date.now().toString(),
      status: 'ACTIVE',
      created_at: new Date().toISOString()
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-[#000052]">
            {agent ? t('common.edit', { defaultValue: 'Редактировать агента' }) : t('ceo.agents.addAgent', { defaultValue: 'Добавить агента' })}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('agent.fullName', { defaultValue: 'ФИО' })} *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#000052] focus:border-transparent outline-none transition-all"
                  placeholder="Иванов Иван Иванович"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('agent.phone', { defaultValue: 'Телефон' })} *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#000052] focus:border-transparent outline-none transition-all"
                  placeholder="+7 999 123-45-67"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.email', { defaultValue: 'Email' })} *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#000052] focus:border-transparent outline-none transition-all"
                  placeholder="agent@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('ceo.agents.specialization', { defaultValue: 'Специализация' })}
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#000052] focus:border-transparent outline-none transition-all"
                  placeholder="Страхование жизни"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('agent.taxStatus', { defaultValue: 'Налоговый статус' })} *
              </label>
              <select
                required
                value={formData.tax_status}
                onChange={(e) => setFormData({ ...formData, tax_status: e.target.value as 'self_employed' | 'ip' })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#000052] focus:border-transparent outline-none transition-all"
              >
                <option value="self_employed">{t('agent.selfEmployed', { defaultValue: 'Самозанятый (6%)' })}</option>
                <option value="ip">{t('agent.ip', { defaultValue: 'ИП' })}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('agent.inn', { defaultValue: 'ИНН' })} *
              </label>
              <input
                type="text"
                required
                value={formData.inn}
                onChange={(e) => setFormData({ ...formData, inn: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#000052] focus:border-transparent outline-none transition-all"
                placeholder="123456789012"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('agent.snils', { defaultValue: 'СНИЛС' })} *
              </label>
              <input
                type="text"
                required
                value={formData.snils}
                onChange={(e) => setFormData({ ...formData, snils: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#000052] focus:border-transparent outline-none transition-all"
                placeholder="123-456-789 00"
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-[#000052] mb-4">
              {t('agent.paymentDetails', { defaultValue: 'Реквизиты для выплат' })}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('agent.bankName', { defaultValue: 'Название банка' })} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#000052] focus:border-transparent outline-none transition-all"
                  placeholder="Сбербанк"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('agent.bik', { defaultValue: 'БИК' })} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.bank_bik}
                  onChange={(e) => setFormData({ ...formData, bank_bik: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#000052] focus:border-transparent outline-none transition-all"
                  placeholder="044525225"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('agent.correspondentAccount', { defaultValue: 'Корр. счет' })} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.correspondent_account}
                  onChange={(e) => setFormData({ ...formData, correspondent_account: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#000052] focus:border-transparent outline-none transition-all"
                  placeholder="30101810400000000225"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('agent.settlementAccount', { defaultValue: 'Расчетный счет' })} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.settlement_account}
                  onChange={(e) => setFormData({ ...formData, settlement_account: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#000052] focus:border-transparent outline-none transition-all"
                  placeholder="40802810838000000001"
                />
              </div>
            </div>
          </div>

          <div className="flex space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              {t('common.cancel', { defaultValue: 'Отмена' })}
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-[#000052] text-white rounded-lg hover:bg-[#000070] transition-colors font-medium"
            >
              {t('common.save', { defaultValue: 'Сохранить' })}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};