import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Building2 } from 'lucide-react';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export function CompanySettings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_type: 'ООО',
    full_name: '',
    display_name: '',
    position: '',
    phone: '',
    company_name: '',
    inn: '',
    kpp: '',
    ogrn: '',
    legal_address: '',
    bank_name: '',
    bank_bik: '',
    bank_inn: '',
    correspondent_account: '',
    settlement_account: '',
    bank_address: '',
  });

  useEffect(() => {
    const fetchCompany = async () => {
      if (!user) return;
      const { data } = await supabase.from('companies').select('*').eq('user_id', user.id).maybeSingle();
      if (data) setFormData(prev => ({ ...prev, ...data }));
    };
    fetchCompany();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!user) return;
      const { data: existing } = await supabase.from('companies').select('id').eq('user_id', user.id).maybeSingle();
      
      if (existing) {
        await supabase.from('companies').update(formData).eq('user_id', user.id);
      } else {
        await supabase.from('companies').insert({ ...formData, user_id: user.id });
      }
      alert(t('common.success'));
    } catch (err) {
      console.error(err);
      alert(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#000052]">{t('company.title')}</h1>
        <p className="text-gray-600 mt-1">{t('company.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-8">
        {/* Основная информация */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <Building2 className="w-5 h-5 text-[#000052]" />
            <h2 className="text-lg font-semibold text-[#000052]">{t('company.title')}</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">{t('company.companyType')} *</label>
              <select name="company_type" value={formData.company_type} onChange={handleChange} className="input">
                <option value="ООО">ООО</option>
                <option value="ИП">ИП</option>
              </select>
            </div>
            <div>
              <label className="label">{t('company.fullName')} *</label>
              <input name="full_name" value={formData.full_name} onChange={handleChange} className="input" required />
            </div>
            <div>
              <label className="label">{t('company.displayName')} *</label>
              <input name="display_name" value={formData.display_name} onChange={handleChange} className="input" required />
            </div>
            <div>
              <label className="label">{t('company.position')} *</label>
              <input name="position" value={formData.position} onChange={handleChange} className="input" required />
            </div>
            <div>
              <label className="label">{t('company.phone')} *</label>
              <input name="phone" value={formData.phone} onChange={handleChange} className="input" required />
            </div>
            <div>
              <label className="label">{t('company.companyName')} *</label>
              <input name="company_name" value={formData.company_name} onChange={handleChange} className="input" required />
            </div>
            <div>
              <label className="label">{t('company.inn')} *</label>
              <input name="inn" value={formData.inn} onChange={handleChange} className="input" required />
            </div>
            <div>
              <label className="label">{t('company.kpp')} *</label>
              <input name="kpp" value={formData.kpp} onChange={handleChange} className="input" required />
            </div>
            <div>
              <label className="label">{t('company.ogrn')} *</label>
              <input name="ogrn" value={formData.ogrn} onChange={handleChange} className="input" required />
            </div>
            <div className="md:col-span-2">
              <label className="label">{t('company.legalAddress')} *</label>
              <input name="legal_address" value={formData.legal_address} onChange={handleChange} className="input" required />
            </div>
          </div>
        </div>

        {/* Банковские реквизиты */}
        <div className="card">
          <h2 className="text-lg font-semibold text-[#000052] mb-6 pb-4 border-b border-gray-100">{t('company.bankDetails')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">{t('company.bankName')} *</label>
              <input name="bank_name" value={formData.bank_name} onChange={handleChange} className="input" required />
            </div>
            <div>
              <label className="label">{t('company.bankBik')} *</label>
              <input name="bank_bik" value={formData.bank_bik} onChange={handleChange} className="input" required />
            </div>
            <div>
              <label className="label">{t('company.bankInn')} *</label>
              <input name="bank_inn" value={formData.bank_inn} onChange={handleChange} className="input" required />
            </div>
            <div>
              <label className="label">{t('company.correspondentAccount')} *</label>
              <input name="correspondent_account" value={formData.correspondent_account} onChange={handleChange} className="input" required />
            </div>
            <div>
              <label className="label">{t('company.settlementAccount')} *</label>
              <input name="settlement_account" value={formData.settlement_account} onChange={handleChange} className="input" required />
            </div>
            <div className="md:col-span-2">
              <label className="label">{t('company.bankAddress')} *</label>
              <input name="bank_address" value={formData.bank_address} onChange={handleChange} className="input" required />
            </div>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" /> {loading ? t('common.loading') : t('common.save')}
        </button>
      </form>
    </DashboardLayout>
  );
}