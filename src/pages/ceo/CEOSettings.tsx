import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Save, Building2, User, Landmark } from 'lucide-react';

export function CEOSettings() {
  const { t } = useTranslation(); const { user } = useAuth(); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [companyId, setCompanyId] = useState<string | null>(null); const hasFetched = useRef(false);
  const [formData, setFormData] = useState({ company_type: 'ИП', full_name: '', display_name: '', position: '', phone: '', company_name: '', inn: '', kpp: '', ogrn: '', legal_address: '', bank_name: '', bank_bik: '', bank_inn: '', correspondent_account: '', settlement_account: '', bank_address: '' });
  useEffect(() => { if (hasFetched.current || !user) { setLoading(false); return; } hasFetched.current = true; (async () => { try { const { data } = await supabase.from('companies').select('*').eq('user_id', user.id).maybeSingle(); if (data) { setCompanyId(data.id); setFormData(prev => ({ ...prev, ...Object.fromEntries(Object.keys(prev).map(key => [key, data[key as keyof typeof data] ?? prev[key as keyof typeof prev]])) })); } } catch (err) { console.error(err); } finally { setLoading(false); } })(); }, [user]);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleSave = async (e: React.FormEvent) => { e.preventDefault(); if (!user) return; setSaving(true); try { if (companyId) { const { error } = await supabase.from('companies').update(formData).eq('id', companyId); if (error) throw error; } else { const { data, error } = await supabase.from('companies').insert({ ...formData, user_id: user.id }).select().single(); if (error) throw error; if (data) setCompanyId(data.id); } alert(t('common.success')); } catch (err: any) { console.error(err); alert(`${t('common.error')}: ${err.message}`); } finally { setSaving(false); } };
  if (loading) return <div className="p-8 text-center text-[#000052]"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8860B]" /><p className="mt-2">{t('common.loading')}</p></div>;
  const field = (name: keyof typeof formData, label: string, required = false, type = 'text') => <div><label className="block text-sm font-medium text-[#000052] mb-2">{label}{required ? ' *' : ''}</label><input name={name} type={type} value={formData[name]} onChange={handleChange} required={required} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-[12px] text-[#000052] placeholder-gray-400 focus:ring-4 focus:ring-[#000052]/10 focus:border-[#000052] outline-none transition" /></div>;
  return <div className="p-4 md:p-8 space-y-6 max-w-4xl">
    <div>
      <h1 className="text-[26px] md:text-3xl font-bold text-[#000052] tracking-tight">{t('company.title')}</h1>
      <p className="text-sm text-gray-400 mt-1">{t('company.companyDataDescription')}</p>
    </div>

    <form onSubmit={handleSave} className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <h2 className="text-lg font-bold text-[#000052] mb-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-[12px] bg-[#B8860B]/10 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-[#B8860B]" />
          </div>
          {t('company.companyType')}
        </h2>
        <div className="flex gap-3">
          <label className={`flex-1 flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200 ${formData.company_type === 'ИП' ? 'border-[#000052] bg-[#000052]/5' : 'border-gray-200 hover:border-[#000052]/40'}`}>
            <input type="radio" name="company_type" value="ИП" checked={formData.company_type === 'ИП'} onChange={handleChange} className="accent-[#000052]" />
            <span className="font-semibold text-[#000052]">ИП</span>
          </label>
          <label className={`flex-1 flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200 ${formData.company_type === 'ООО' ? 'border-[#000052] bg-[#000052]/5' : 'border-gray-200 hover:border-[#000052]/40'}`}>
            <input type="radio" name="company_type" value="ООО" checked={formData.company_type === 'ООО'} onChange={handleChange} className="accent-[#000052]" />
            <span className="font-semibold text-[#000052]">ООО</span>
          </label>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <h2 className="text-lg font-bold text-[#000052] mb-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-[12px] bg-[#B8860B]/10 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-[#B8860B]" />
          </div>
          {t('company.personalData')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field('full_name', t('company.fullName'), true)}
          {field('display_name', t('company.displayName'), true)}
          {field('position', t('company.position'))}
          {field('phone', t('company.phone'), true)}
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <h2 className="text-lg font-bold text-[#000052] mb-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-[12px] bg-[#B8860B]/10 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-[#B8860B]" />
          </div>
          {t('company.companyData')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {formData.company_type === 'ООО' && field('company_name', t('company.companyName'), true)}
          {field('inn', formData.company_type === 'ООО' ? t('company.companyInn') : t('company.inn'), true)}
          {formData.company_type === 'ООО' && field('kpp', t('company.kpp'), true)}
          {field('ogrn', formData.company_type === 'ООО' ? t('company.ogrn') : t('company.ogrnip'), true)}
          {formData.company_type === 'ООО' && <div className="md:col-span-2">{field('legal_address', t('company.legalAddress'), true)}</div>}
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <h2 className="text-lg font-bold text-[#000052] mb-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-[12px] bg-[#B8860B]/10 flex items-center justify-center flex-shrink-0">
            <Landmark className="w-5 h-5 text-[#B8860B]" />
          </div>
          {t('company.bankDetails')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field('bank_name', t('company.bankName'), true)}
          {field('bank_bik', t('company.bankBik'), true)}
          {field('bank_inn', t('company.bankInn'))}
          {field('correspondent_account', t('company.correspondentAccount'), true)}
          {field('settlement_account', t('company.settlementAccount'), true)}
          <div className="md:col-span-2">{field('bank_address', t('company.bankAddress'))}</div>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full py-3.5 px-4 bg-[#000052] text-white rounded-[14px] font-semibold shadow-[0_4px_16px_rgba(0,0,82,0.25)] hover:bg-[#14147a] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
      >
        <Save className="w-5 h-5" />
        {saving ? t('common.loading') : t('common.save')}
      </button>
    </form>
  </div>;
}