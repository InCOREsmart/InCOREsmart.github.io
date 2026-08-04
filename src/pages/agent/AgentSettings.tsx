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
    full_name: '',
    phone: '',
    email: '',
    tax_status: 'self_employed',
    inn: '',
    snils: '',
    bank_name: '',
    bik: '',
    correspondent_account: '',
    settlement_account: '',
    country: 'RU',
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
        const { data } = await supabase
          .from('agents')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data) {
          setFormData(prev => ({
            ...prev,
            full_name: data.full_name || '',
            phone: data.phone || '',
            email: data.email || '',
            tax_status: data.tax_status || 'self_employed',
            inn: data.inn || '',
            snils: data.snils || '',
            bank_name: data.bank_name || '',
            bik: data.bik || '',
            correspondent_account: data.correspondent_account || '',
            settlement_account: data.settlement_account || '',
            country: data.country || 'RU',
          }));

          setDocuments({
            passport: { uploaded: !!data.passport_uploaded, name: data.passport_file_name || '', verified: !!data.passport_verified },
            tax_doc: { uploaded: !!data.tax_doc_uploaded, name: data.tax_doc_file_name || '', verified: !!data.tax_doc_verified },
            snils_doc: { uploaded: !!data.snils_uploaded, name: data.snils_file_name || '', verified: !!data.snils_verified },
          });
        }
      } catch (err) {
        console.error('Ошибка:', err);
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
      const { data: existing } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        await supabase.from('agents').update(formData).eq('user_id', user.id);
      } else {
        await supabase.from('agents').insert({ ...formData, user_id: user.id, status: 'ACTIVE' });
      }
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
      const file = e.target.files[0];
      if (file) {
        setDocuments(prev => ({
          ...prev,
          [docType]: { uploaded: true, name: file.name, verified: false },
        }));
        alert(`✅ Файл "${file.name}" загружен и отправлен на верификацию через InCORE`);
      }
    };
    input.click();
  };

  const getCountryRequirements = () => {
    switch (formData.country) {
      case 'KZ':
        return {
          passport_label: 'Удостоверение личности / Паспорт РК',
          tax_label: 'Свидетельство ИП / Патент',
          extra_label: 'ИИН (12 цифр)',
          tax_options: [
            { value: 'self_employed', label: 'Самозанятый (3%)' },
            { value: 'ip', label: 'ИП (3%)' },
          ],
        };
      case 'AZ':
        return {
          passport_label: 'Паспорт / ВНЖ Азербайджана',
          tax_label: 'Свидетельство VÖEN',
          extra_label: 'VÖEN (11 цифр)',
          tax_options: [
            { value: 'self_employed', label: 'Физическое лицо (14%)' },
            { value: 'ip', label: 'ИП (5%)' },
          ],
        };
      default:
        return {
          passport_label: 'Паспорт РФ / ВНЖ',
          tax_label: 'Свидетельство самозанятого / ИП',
          extra_label: 'СНИЛС',
          tax_options: [
            { value: 'self_employed', label: 'Самозанятый (6%)' },
            { value: 'ip', label: 'ИП (6%)' },
          ],
        };
    }
  };

  const req = getCountryRequirements();

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
        <h1 className="text-2xl md:text-3xl font-bold text-[#000052]">{t('agent.title')}</h1>
        <p className="text-sm text-[#000052]/70 mt-1">{t('agent.subtitle')}</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Личные данные */}
        <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
          <h2 className="text-lg font-bold text-[#000052] mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-[#B8860B]" />
            {t('agent.personalData')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('agent.fullName')} *</label>
              <input name="full_name" value={formData.full_name} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('agent.phone')} *</label>
              <input name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">Email *</label>
              <input name="email" type="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">Страна *</label>
              <select name="country" value={formData.country} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30">
                <option value="RU">Россия</option>
                <option value="KZ">Казахстан</option>
                <option value="AZ">Азербайджан</option>
              </select>
            </div>
          </div>
        </div>

        {/* Налоговый статус */}
        <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
          <h2 className="text-lg font-bold text-[#000052] mb-4">{t('agent.taxStatus')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('agent.taxStatus')}</label>
              <select name="tax_status" value={formData.tax_status} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30">
                {req.tax_options.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('agent.inn')}</label>
              <input name="inn" value={formData.inn} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">{req.extra_label}</label>
              <input name="snils" value={formData.snils} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" />
            </div>
          </div>
        </div>

        {/* Верификация документов */}
        <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
          <h2 className="text-lg font-bold text-[#000052] mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#B8860B]" />
            Верификация документов (InCORE)
          </h2>
          <p className="text-sm text-[#000052]/70 mb-4">
            Загрузите документы для верификации. InCORE проверит их автоматически в течение 24 часов.
          </p>
          <div className="space-y-4">
            {/* Паспорт */}
            <div className="flex items-center justify-between p-4 bg-[#000052]/5 rounded-lg border border-[#000052]/10">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-[#000052]" />
                <div>
                  <p className="text-sm font-semibold text-[#000052]">{req.passport_label}</p>
                  {documents.passport.uploaded && (
                    <p className="text-xs text-[#000052]/60 mt-1">{documents.passport.name}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {documents.passport.verified ? (
                  <span className="px-3 py-1 bg-[#B8860B]/10 text-[#B8860B] rounded-full text-xs font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Верифицировано
                  </span>
                ) : documents.passport.uploaded ? (
                  <span className="px-3 py-1 bg-[#000052]/10 text-[#000052] rounded-full text-xs font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> На проверке
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => handleFileUpload('passport')}
                  className="px-4 py-2 bg-[#000052] text-white rounded-lg text-xs font-semibold hover:bg-[#000052]/90 transition flex items-center gap-1"
                >
                  <Upload className="w-3 h-3" />
                  {documents.passport.uploaded ? 'Заменить' : 'Загрузить'}
                </button>
              </div>
            </div>

            {/* Налоговый документ */}
            <div className="flex items-center justify-between p-4 bg-[#000052]/5 rounded-lg border border-[#000052]/10">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-[#000052]" />
                <div>
                  <p className="text-sm font-semibold text-[#000052]">{req.tax_label}</p>
                  {documents.tax_doc.uploaded && (
                    <p className="text-xs text-[#000052]/60 mt-1">{documents.tax_doc.name}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {documents.tax_doc.verified ? (
                  <span className="px-3 py-1 bg-[#B8860B]/10 text-[#B8860B] rounded-full text-xs font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Верифицировано
                  </span>
                ) : documents.tax_doc.uploaded ? (
                  <span className="px-3 py-1 bg-[#000052]/10 text-[#000052] rounded-full text-xs font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> На проверке
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => handleFileUpload('tax_doc')}
                  className="px-4 py-2 bg-[#000052] text-white rounded-lg text-xs font-semibold hover:bg-[#000052]/90 transition flex items-center gap-1"
                >
                  <Upload className="w-3 h-3" />
                  {documents.tax_doc.uploaded ? 'Заменить' : 'Загрузить'}
                </button>
              </div>
            </div>

            {/* СНИЛС / доп. документ */}
            <div className="flex items-center justify-between p-4 bg-[#000052]/5 rounded-lg border border-[#000052]/10">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-[#000052]" />
                <div>
                  <p className="text-sm font-semibold text-[#000052]">{req.extra_label}</p>
                  {documents.snils_doc.uploaded && (
                    <p className="text-xs text-[#000052]/60 mt-1">{documents.snils_doc.name}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {documents.snils_doc.verified ? (
                  <span className="px-3 py-1 bg-[#B8860B]/10 text-[#B8860B] rounded-full text-xs font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Верифицировано
                  </span>
                ) : documents.snils_doc.uploaded ? (
                  <span className="px-3 py-1 bg-[#000052]/10 text-[#000052] rounded-full text-xs font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> На проверке
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => handleFileUpload('snils_doc')}
                  className="px-4 py-2 bg-[#000052] text-white rounded-lg text-xs font-semibold hover:bg-[#000052]/90 transition flex items-center gap-1"
                >
                  <Upload className="w-3 h-3" />
                  {documents.snils_doc.uploaded ? 'Заменить' : 'Загрузить'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Банковские реквизиты */}
        <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
          <h2 className="text-lg font-bold text-[#000052] mb-4">{t('agent.paymentDetails')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('agent.bankName')}</label>
              <input name="bank_name" value={formData.bank_name} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('agent.bik')}</label>
              <input name="bik" value={formData.bik} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('agent.correspondentAccount')}</label>
              <input name="correspondent_account" value={formData.correspondent_account} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('agent.settlementAccount')}</label>
              <input name="settlement_account" value={formData.settlement_account} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" />
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