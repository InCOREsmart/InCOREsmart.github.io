import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, UserPlus, Mail, Phone, Briefcase } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface AddAgentModalProps { isOpen: boolean; onClose: () => void; onCreated?: () => void; }

export function AddAgentModal({ isOpen, onClose, onCreated }: AddAgentModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ full_name: '', email: '', phone: '', specialization: '', tax_status: 'self_employed', inn: '', snils: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const { data: companyData } = await supabase.from('companies').select('id').eq('user_id', user.id).maybeSingle();
      if (!companyData) { alert(t('contractModal.errorNoCompany')); setLoading(false); return; }
      const { error } = await supabase.from('agents').insert({ company_id: companyData.id, full_name: formData.full_name, email: formData.email, phone: formData.phone, specialization: formData.specialization, tax_status: formData.tax_status, inn: formData.inn, snils: formData.snils, status: 'ACTIVE' });
      if (error) throw error;
      alert('✅ Агент успешно добавлен в команду!');
      setFormData({ full_name: '', email: '', phone: '', specialization: '', tax_status: 'self_employed', inn: '', snils: '' });
      onCreated?.();
      onClose();
    } catch (err) {
      console.error('Ошибка добавления агента:', err);
      alert(t('common.error') + ': ' + (err as Error).message);
    } finally { setLoading(false); }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-3 sm:p-4 md:items-center">
      <div className="my-2 w-full max-w-2xl rounded-2xl border border-[#000052]/10 bg-white shadow-2xl md:my-0 max-h-[calc(100dvh-1.5rem)] overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#000052]/10 bg-white p-4 sm:p-6">
          <div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#B8860B]/10"><UserPlus className="h-5 w-5 text-[#B8860B]" /></div><h2 className="truncate text-xl sm:text-2xl font-bold text-[#000052]">{t('agent.addAgent')}</h2></div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-full p-2 hover:bg-[#000052]/5"><X className="h-5 w-5 text-[#000052]" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-4 sm:p-6">
          <div><label className="mb-1.5 block text-sm font-semibold text-[#000052]">{t('agent.fullName')} *</label><input type="text" name="full_name" value={formData.full_name} onChange={handleChange} className="w-full rounded-lg border border-[#000052]/20 bg-white px-4 py-2.5 text-[#000052] focus:border-[#B8860B] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" placeholder="Иванов Иван Иванович" required /></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div><label className="mb-1.5 flex items-center gap-1 text-sm font-semibold text-[#000052]"><Mail className="h-4 w-4" />Email *</label><input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full rounded-lg border border-[#000052]/20 bg-white px-4 py-2.5 text-[#000052] focus:border-[#B8860B] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" placeholder="agent@example.com" required /></div>
            <div><label className="mb-1.5 flex items-center gap-1 text-sm font-semibold text-[#000052]"><Phone className="h-4 w-4" />{t('agent.phone')} *</label><input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full rounded-lg border border-[#000052]/20 bg-white px-4 py-2.5 text-[#000052] focus:border-[#B8860B] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" placeholder="+7 900 123-45-67" required /></div>
          </div>
          <div><label className="mb-1.5 flex items-center gap-1 text-sm font-semibold text-[#000052]"><Briefcase className="h-4 w-4" />Специализация</label><input type="text" name="specialization" value={formData.specialization} onChange={handleChange} className="w-full rounded-lg border border-[#000052]/20 bg-white px-4 py-2.5 text-[#000052] focus:border-[#B8860B] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" placeholder="B2B Страхование, Корпоративные клиенты" /></div>
          <div className="rounded-lg border border-[#000052]/10 bg-[#000052]/5 p-4"><label className="mb-3 block text-sm font-semibold text-[#000052]">{t('agent.taxStatus')}</label><div className="flex flex-col gap-3 sm:flex-row"><label className="flex flex-1 items-center gap-2 rounded-lg border border-[#000052]/20 bg-white p-3"><input type="radio" name="tax_status" value="self_employed" checked={formData.tax_status === 'self_employed'} onChange={handleChange} className="text-[#B8860B]" /><span className="text-sm text-[#000052]">{t('agent.selfEmployed')}</span></label><label className="flex flex-1 items-center gap-2 rounded-lg border border-[#000052]/20 bg-white p-3"><input type="radio" name="tax_status" value="ip" checked={formData.tax_status === 'ip'} onChange={handleChange} className="text-[#B8860B]" /><span className="text-sm text-[#000052]">{t('agent.ip')}</span></label></div></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2"><div><label className="mb-1.5 block text-sm font-semibold text-[#000052]">{t('agent.inn')}</label><input type="text" name="inn" value={formData.inn} onChange={handleChange} className="w-full rounded-lg border border-[#000052]/20 bg-white px-4 py-2.5 text-[#000052] focus:border-[#B8860B] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" placeholder="12 цифр" /></div><div><label className="mb-1.5 block text-sm font-semibold text-[#000052]">{t('agent.snils')}</label><input type="text" name="snils" value={formData.snils} onChange={handleChange} className="w-full rounded-lg border border-[#000052]/20 bg-white px-4 py-2.5 text-[#000052] focus:border-[#B8860B] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" placeholder="XXX-XXX-XXX XX" /></div></div>
          <div className="flex flex-col-reverse gap-3 border-t border-[#000052]/10 pt-4 sm:flex-row"><button type="button" onClick={onClose} className="flex-1 rounded-lg bg-[#000052]/5 px-4 py-3 font-semibold text-[#000052] hover:bg-[#000052]/10">{t('common.cancel')}</button><button type="submit" disabled={loading} className="flex-1 rounded-lg bg-[#B8860B] px-4 py-3 font-semibold text-white hover:bg-[#9a7209] disabled:opacity-50">{loading ? t('common.loading') : t('agent.addAgent')}</button></div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
