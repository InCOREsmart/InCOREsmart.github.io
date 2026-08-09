import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Save, Upload, CheckCircle, AlertCircle, FileText, ShieldCheck, User } from 'lucide-react';

export function AgentSettings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '', phone: '', email: '', tax_status: 'self_employed', inn: '', snils: '',
    bank_name: '', bik: '', correspondent_account: '', settlement_account: '', country: 'RU',
  });
  const [documents, setDocuments] = useState({
    passport: { uploaded: false, name: '', verified: false },
    tax_doc: { uploaded: false, name: '', verified: false },
    snils_doc: { uploaded: false, name: '', verified: false },
  });

  useEffect(() => {
    const fetchAgent = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data } = await supabase.from('agents').select('*').eq('user_id', user.id).maybeSingle();
        if (data) {
          setFormData(prev => ({ ...prev, full_name: data.full_name || '', phone: data.phone || '', email: data.email || '', tax_status: data.tax_status || 'self_employed', inn: data.inn || '', snils: data.snils || '', bank_name: data.bank_name || '', bik: data.bik || '', correspondent_account: data.correspondent_account || '', settlement_account: data.settlement_account || '', country: data.country || 'RU' }));
          setDocuments({
            passport: { uploaded: !!data.passport_uploaded, name: data.passport_file_name || '', verified: !!data.passport_verified },
            tax_doc: { uploaded: !!data.tax_doc_uploaded, name: data.tax_doc_file_name || '', verified: !!data.tax_doc_verified },
            snils_doc: { uploaded: !!data.snils_uploaded, name: data.snils_file_name || '', verified: !!data.snils_verified },
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAgent();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const { data: existing } = await supabase.from('agents').select('id').eq('user_id', user.id).maybeSingle();
      if (existing) await supabase.from('agents').update(formData).eq('user_id', user.id);
      else await supabase.from('agents').insert({ ...formData, user_id: user.id, status: 'ACTIVE' });
      alert(t('common.success'));
    } catch (err) {
      console.error(err);
      alert(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = (docType: 'passport' | 'tax_doc' | 'snils_doc') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setDocuments(prev => ({ ...prev, [docType]: { uploaded: true, name: file.name, verified: false } }));
      alert(t('common.success'));
    };
    input.click();
  };

  const getCountryRequirements = () => {
    switch (formData.country) {
      case 'KZ':
        return { passport: t('ui.passportKz'), tax: t('ui.taxDocKz'), extra: 'ИИН', options: [{ value: 'self_employed', label: t('ui.selfEmployedKz') }, { value: 'ip', label: t('ui.ipKz') }] };
      case 'AZ':
        return { passport: t('ui.passportAz'), tax: t('ui.taxDocAz'), extra: 'VÖEN', options: [{ value: 'self_employed', label: t('ui.selfEmployedAz') }, { value: 'ip', label: t('ui.ipAz') }] };
      default:
        return { passport: t('ui.passportRu'), tax: t('ui.taxDocRu'), extra: t('ui.snils'), options: [{ value: 'self_employed', label: t('ui.selfEmployedRu') }, { value: 'ip', label: t('ui.ipRu') }] };
    }
  };

  const req = getCountryRequirements();

  if (loading) {
    return <div className="p-8 text-center text-[#000052]"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8860B]" /><p className="mt-2">{t('common.loading')}</p></div>;
  }

  const documentRow = (type: 'passport' | 'tax_doc' | 'snils_doc', label: string) => {
    const doc = documents[type];
    return (
      <div className="flex items-center justify-between p-4 bg-[#000052]/5 rounded-lg border border-[#000052]/10">
        <div className="flex items-center gap-3"><FileText className="w-5 h-5 text-[#000052]" /><div><p className="text-sm font-semibold text-[#000052]">{label}</p>{doc.uploaded && <p className="text-xs text-[#000052]/60 mt-1">{doc.name}</p>}</div></div>
        <div className="flex items-center gap-3">
          {doc.verified ? <span className="px-3 py-1 bg-[#B8860B]/10 text-[#B8860B] rounded-full text-xs font-semibold flex items-center gap-1"><CheckCircle className="w-3 h-3" />{t('ui.completed')}</span> : doc.uploaded ? <span className="px-3 py-1 bg-[#000052]/10 text-[#000052] rounded-full text-xs font-semibold flex items-center gap-1"><AlertCircle className="w-3 h-3" />{t('ui.pendingVerificationStatus')}</span> : null}
          <button type="button" onClick={() => handleFileUpload(type)} className="px-4 py-2 bg-[#000052] text-white rounded-lg text-xs font-semibold hover:bg-[#000052]/90 transition flex items-center gap-1"><Upload className="w-3 h-3" />{t('ui.upload')}</button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl">
      <div><h1 className="text-2xl md:text-3xl font-bold text-[#000052]">{t('agent.title')}</h1><p className="text-sm text-[#000052]/70 mt-1">{t('agent.subtitle')}</p></div>
      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
          <h2 className="text-lg font-bold text-[#000052] mb-4 flex items-center gap-2"><User className="w-5 h-5 text-[#B8860B]" />{t('ui.personalData')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('ui.fullName')} *</label><input name="full_name" value={formData.full_name} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052]" required /></div>
            <div><label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('ui.phone')} *</label><input name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052]" required /></div>
            <div><label className="block text-sm font-semibold text-[#000052] mb-1.5">Email *</label><input name="email" type="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052]" required /></div>
            <div><label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('ui.country')} *</label><select name="country" value={formData.country} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052]"><option value="RU">{t('layout.language') === 'Language' ? 'Russia' : 'Россия'}</option><option value="KZ">{t('layout.language') === 'Language' ? 'Kazakhstan' : 'Казахстан'}</option><option value="AZ">{t('layout.language') === 'Language' ? 'Azerbaijan' : 'Азербайджан'}</option></select></div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
          <h2 className="text-lg font-bold text-[#000052] mb-4">{t('ui.taxStatus')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('ui.taxStatus')}</label><select name="tax_status" value={formData.tax_status} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052]">{req.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
            <div><label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('ui.inn')}</label><input name="inn" value={formData.inn} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052]" /></div>
            <div><label className="block text-sm font-semibold text-[#000052] mb-1.5">{req.extra}</label><input name="snils" value={formData.snils} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052]" /></div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
          <h2 className="text-lg font-bold text-[#000052] mb-4 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-[#B8860B]" />{t('ui.documentVerification')}</h2>
          <p className="text-sm text-[#000052]/70 mb-4">{t('ui.documentVerificationDescription')}</p>
          <div className="space-y-4">{documentRow('passport', req.passport)}{documentRow('tax_doc', req.tax)}{documentRow('snils_doc', req.extra)}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
          <h2 className="text-lg font-bold text-[#000052] mb-4">{t('ui.paymentDetails')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('ui.bankName')}</label><input name="bank_name" value={formData.bank_name} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052]" /></div>
            <div><label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('ui.bik')}</label><input name="bik" value={formData.bik} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052]" /></div>
            <div><label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('ui.correspondentAccount')}</label><input name="correspondent_account" value={formData.correspondent_account} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052]" /></div>
            <div><label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('ui.settlementAccount')}</label><input name="settlement_account" value={formData.settlement_account} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052]" /></div>
          </div>
        </div>
        <button type="submit" disabled={saving} className="w-full py-3 px-4 bg-[#B8860B] text-white rounded-lg font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"><Save className="w-5 h-5" />{saving ? t('common.loading') : t('common.save')}</button>
      </form>
    </div>
  );
}
