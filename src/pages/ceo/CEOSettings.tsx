import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Save, Building2, User, MapPin, Landmark } from 'lucide-react';

export function CEOSettings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const hasFetched = useRef(false);
  
  const [formData, setFormData] = useState({
    company_type: 'ИП',
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
    if (hasFetched.current || !user) {
      setLoading(false);
      return;
    }
    hasFetched.current = true;

    const fetchCompany = async () => {
      try {
        const { data } = await supabase
          .from('companies')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data) {
          setCompanyId(data.id);
          setFormData(prev => ({
            ...prev,
            company_type: data.company_type || 'ИП',
            full_name: data.full_name || '',
            display_name: data.display_name || '',
            position: data.position || '',
            phone: data.phone || '',
            company_name: data.company_name || '',
            inn: data.inn || '',
            kpp: data.kpp || '',
            ogrn: data.ogrn || '',
            legal_address: data.legal_address || '',
            bank_name: data.bank_name || '',
            bank_bik: data.bank_bik || '',
            bank_inn: data.bank_inn || '',
            correspondent_account: data.correspondent_account || '',
            settlement_account: data.settlement_account || '',
            bank_address: data.bank_address || '',
          }));
        }
      } catch (err) {
        console.error('Ошибка загрузки:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCompany();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      if (companyId) {
        const { error } = await supabase.from('companies').update(formData).eq('id', companyId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('companies').insert({ ...formData, user_id: user.id }).select().single();
        if (error) throw error;
        if (data) setCompanyId(data.id);
      }
      alert(t('common.success') || 'Успешно сохранено');
    } catch (err) {
      console.error('Ошибка сохранения:', err);
      alert(t('common.error') + ': ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-[#000052]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8860B]"></div>
        <p className="mt-2">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#000052]">{t('company.title')}</h1>
        <p className="text-sm text-[#000052]/70 mt-1">Данные вашей компании и банковские реквизиты</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
          <h2 className="text-lg font-bold text-[#000052] mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#B8860B]" />
            {t('company.companyType')}
          </h2>
          <div className="flex gap-3">
            <label className="flex-1 flex items-center gap-2 p-3 bg-white border border-[#000052]/20 rounded-lg cursor-pointer hover:border-[#B8860B] transition">
              <input type="radio" name="company_type" value="ИП" checked={formData.company_type === 'ИП'} onChange={handleChange} className="text-[#B8860B]" />
              <span className="text-sm text-[#000052]">ИП</span>
            </label>
            <label className="flex-1 flex items-center gap-2 p-3 bg-white border border-[#000052]/20 rounded-lg cursor-pointer hover:border-[#B8860B] transition">
              <input type="radio" name="company_type" value="ООО" checked={formData.company_type === 'ООО'} onChange={handleChange} className="text-[#B8860B]" />
              <span className="text-sm text-[#000052]">ООО</span>
            </label>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
          <h2 className="text-lg font-bold text-[#000052] mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-[#B8860B]" />
            Личные данные
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">ФИО *</label>
              <input name="full_name" value={formData.full_name} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">Отображаемое имя *</label>
              <input name="display_name" value={formData.display_name} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">Должность</label>
              <input name="position" value={formData.position} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">Телефон *</label>
              <input name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" required />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
          <h2 className="text-lg font-bold text-[#000052] mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#B8860B]" />
            Данные компании
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formData.company_type === 'ООО' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-[#000052] mb-1.5">Название компании *</label>
                <input name="company_name" value={formData.company_name} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" required={formData.company_type === 'ООО'} />
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">{formData.company_type === 'ООО' ? 'ИНН компании' : 'ИНН'} *</label>
              <input name="inn" value={formData.inn} onChange={handleChange} maxLength={formData.company_type === 'ООО' ? 10 : 12} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" required />
            </div>
            {formData.company_type === 'ООО' && (
              <div>
                <label className="block text-sm font-semibold text-[#000052] mb-1.5">КПП *</label>
                <input name="kpp" value={formData.kpp} onChange={handleChange} maxLength={9} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" required />
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">{formData.company_type === 'ООО' ? 'ОГРН' : 'ОГРНИП'} *</label>
              <input name="ogrn" value={formData.ogrn} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" required />
            </div>
            {formData.company_type === 'ООО' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-[#000052] mb-1.5 flex items-center gap-1"><MapPin className="w-4 h-4" />Юридический адрес *</label>
                <input name="legal_address" value={formData.legal_address} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" required />
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
          <h2 className="text-lg font-bold text-[#000052] mb-4 flex items-center gap-2">
            <Landmark className="w-5 h-5 text-[#B8860B]" />
            {t('company.bankDetails')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('company.bankName')} *</label>
              <input name="bank_name" value={formData.bank_name} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('company.bankBik')} *</label>
              <input name="bank_bik" value={formData.bank_bik} onChange={handleChange} maxLength={9} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">ИНН банка</label>
              <input name="bank_inn" value={formData.bank_inn} onChange={handleChange} maxLength={10} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('company.correspondentAccount')} *</label>
              <input name="correspondent_account" value={formData.correspondent_account} onChange={handleChange} maxLength={20} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('company.settlementAccount')} *</label>
              <input name="settlement_account" value={formData.settlement_account} onChange={handleChange} maxLength={20} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">Адрес банка</label>
              <input name="bank_address" value={formData.bank_address} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" />
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} className="w-full py-3 px-4 bg-[#B8860B] hover:bg-[#9a7209] text-white rounded-lg font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50">
          <Save className="w-5 h-5" />
          {saving ? t('common.loading') : t('common.save')}
        </button>
      </form>
    </div>
  );
}