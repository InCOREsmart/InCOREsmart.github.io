import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { X, Save } from 'lucide-react';

export function EditAgentModal({ agent, isOpen, onClose, onSaved }: { agent: any; isOpen: boolean; onClose: () => void; onSaved: (agent: any) => void }) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', specialization: '', country: '', status: '' });
  useEffect(() => {
    if (agent) setForm({ full_name: agent.full_name || '', email: agent.email || '', phone: agent.phone || '', specialization: agent.specialization || '', country: agent.country || 'RU', status: agent.status || 'ACTIVE' });
  }, [agent]);
  if (!isOpen || !agent) return null;
  const set = (name: string, value: string) => setForm(prev => ({ ...prev, [name]: value }));
  const save = async () => {
    if (!form.full_name.trim()) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from('agents').update({ ...form, full_name: form.full_name.trim() }).eq('id', agent.id).select('*').single();
      if (error) throw error;
      onSaved(data); onClose();
    } catch (error) { console.error(error); alert(t('common.error')); }
    finally { setSaving(false); }
  };
  const field = (name: keyof typeof form, label: string, type = 'text') => <label className="text-sm font-semibold text-[#000052]">{label}<input type={type} value={form[name]} onChange={e => set(name, e.target.value)} className="mt-1 w-full px-4 py-2.5 border border-[#000052]/15 rounded-lg" /></label>;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6"><div className="flex items-center justify-between mb-5"><h2 className="text-xl font-bold text-[#000052]">{t('agent.title')}</h2><button onClick={onClose}><X className="w-5 h-5" /></button></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{field('full_name', `${t('ui.fullName')} *`)}{field('email', 'Email','email')}{field('phone', t('ui.phone'))}{field('specialization', t('ui.specialization'))}{field('country', t('ui.country'))}<label className="text-sm font-semibold text-[#000052]">{t('ui.status')}<select value={form.status} onChange={e => set('status', e.target.value)} className="mt-1 w-full px-4 py-2.5 border border-[#000052]/15 rounded-lg"><option value="ACTIVE">{t('contract.statuses.ACTIVE')}</option><option value="INACTIVE">{t('contract.statuses.CANCELLED')}</option></select></label></div><div className="flex gap-3 mt-6"><button onClick={onClose} className="flex-1 py-3 bg-[#000052]/5 rounded-lg font-semibold">{t('common.cancel')}</button><button onClick={save} disabled={saving || !form.full_name.trim()} className="flex-1 py-3 bg-[#B8860B] text-white rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2"><Save className="w-4 h-4" />{saving ? t('common.loading') : t('common.save')}</button></div></div></div>;
}
