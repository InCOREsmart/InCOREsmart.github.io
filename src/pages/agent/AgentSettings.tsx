import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, User, Banknote } from 'lucide-react';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export function AgentSettings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    tax_status: 'self_employed',
    inn: '',
    snils: '',
    bank_name: '',
    bank_bik: '',
    correspondent_account: '',
    settlement_account: '',
  });

  useEffect(() => {
    const fetchAgent = async () => {
      if (!user) return;
      const { data } = await supabase.from('agents').select('*').eq('user_id', user.id).maybeSingle();
      if (data) setFormData(prev => ({ ...prev, ...data }));
    };
    fetchAgent();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!user) return;
      const { data: existing } = await supabase.from('agents').select('id').eq('user_id', user.id).maybeSingle();
      if (existing) {
        await supabase.from('agents').update(formData).eq('user_id', user.id);
      } else {
        await supabase.from('agents').insert({ ...formData, user_id: user.id });
      }
      alert(t('common.success'));
    } catch (err) { console.error(err); alert(t('common.error')); } finally { setLoading(false); }
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#000052]">{t('agent.title')}</h1>
        <p className="text-gray-600 mt-1">{t('agent.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-8">
        <div className="card">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <User className="w-5 h-5 text-[#000052]" />
            <h2 className="text-lg font-semibold text-[#000052]">Личные данные</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="label">ФИО *</label><input name="full_name" value={formData.full_name} onChange={handleChange} className="input" required /></div>
            <div><label className="label">Телефон *</label><input name="phone" value={formData.phone} onChange={handleChange} className="input" required /></div>
            <div>
              <label className="label">Налоговый статус *</label>
              <select name="tax_status" value={formData.tax_status} onChange={handleChange} className="input">
                <option value="self_employed">Самозанятый (6%)</option>
                <option value="ip">ИП (6%)</option>
              </select>
            </div>
            <div><label className="label">ИНН *</label><input name="inn" value={formData.inn} onChange={handleChange} className="input" required /></div>
            <div><label className="label">СНИЛС *</label><input name="snils" value={formData.snils} onChange={handleChange} className="input" required /></div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <Banknote className="w-5 h-5 text-[#B8860B]" />
            <h2 className="text-lg font-semibold text-[#000052]">Реквизиты для выплат</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="label">Название банка *</label><input name="bank_name" value={formData.bank_name} onChange={handleChange} className="input" required /></div>
            <div><label className="label">БИК *</label><input name="bank_bik" value={formData.bank_bik} onChange={handleChange} className="input" required /></div>
            <div><label className="label">Корр. счет *</label><input name="correspondent_account" value={formData.correspondent_account} onChange={handleChange} className="input" required /></div>
            <div className="md:col-span-2"><label className="label">Расчетный счет *</label><input name="settlement_account" value={formData.settlement_account} onChange={handleChange} className="input" required /></div>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" /> {loading ? t('common.loading') : t('common.save')}
        </button>
      </form>
    </DashboardLayout>
  );
}