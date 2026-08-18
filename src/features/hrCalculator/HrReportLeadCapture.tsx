import { useState } from 'react';
import { ArrowRight, CheckCircle2, Mail, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Props = {
  t: (key: string) => string;
  totalLoss: string;
  potentialEffect: string;
  locale?: string;
  onSubmit?: (contact: string) => void;
};

const detectContactType = (value: string): 'email' | 'telegram' | 'other' => {
  if (value.includes('@')) return 'email';
  if (/^(https?:\/\/)?(t\.me\/|telegram\.me\/|@)/i.test(value)) return 'telegram';
  return 'other';
};

export function HrReportLeadCapture({ t, totalLoss, potentialEffect, locale = 'ru', onSubmit }: Props) {
  const [contact, setContact] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = contact.trim();
    if (!value || saving) return;

    setSaving(true);
    setError(false);

    const rawLoss = Number(totalLoss.replace(/[^0-9,.-]/g, '').replace(/\s/g, '').replace(',', '.')) || 0;
    const rawEffect = Number(potentialEffect.replace(/[^0-9,.-]/g, '').replace(/\s/g, '').replace(',', '.')) || 0;

    const { error: insertError } = await supabase.from('hr_calculator_leads').insert({
      contact: value,
      contact_type: detectContactType(value),
      locale: locale.split('-')[0],
      total_loss: rawLoss,
      potential_effect: rawEffect,
      source: 'hr-calculator',
    });

    if (insertError) {
      setSaving(false);
      setError(true);
      return;
    }

    onSubmit?.(value);
    setSubmitted(true);
    setSaving(false);
  };

  if (submitted) {
    return <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm sm:p-8"><div className="flex items-start gap-4"><div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700"><CheckCircle2 size={22} /></div><div><h2 className="text-xl font-black text-slate-900">{t('hrCalculator.lead.successTitle')}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{t('hrCalculator.lead.successText')}</p></div></div></section>;
  }

  return <section className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8"><div className="grid gap-7 lg:grid-cols-[1fr_420px] lg:items-center"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-300"><Mail size={14} /> {t('hrCalculator.lead.badge')}</div><h2 className="text-2xl font-black tracking-tight sm:text-3xl">{t('hrCalculator.lead.title')}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{t('hrCalculator.lead.subtitle')}</p><div className="mt-5 flex flex-wrap gap-3 text-sm"><span className="rounded-xl bg-white/10 px-3 py-2"><b>{totalLoss}</b> {t('hrCalculator.lead.lossLabel')}</span><span className="rounded-xl bg-indigo-500/30 px-3 py-2"><b>{potentialEffect}</b> {t('hrCalculator.lead.effectLabel')}</span></div></div><form onSubmit={submit} className="rounded-2xl bg-white p-5 text-slate-900"><label className="block text-sm font-bold" htmlFor="hr-report-contact">{t('hrCalculator.lead.contactLabel')}</label><p className="mt-1 text-xs leading-5 text-slate-500">{t('hrCalculator.lead.contactHint')}</p><input id="hr-report-contact" type="text" inputMode="email" autoComplete="email" value={contact} onChange={(event) => setContact(event.target.value)} placeholder={t('hrCalculator.lead.placeholder')} className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" required />{error && <p className="mt-2 text-xs font-semibold text-red-600">{t('hrCalculator.lead.error')}</p>}<button type="submit" disabled={saving} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? t('hrCalculator.lead.saving') : t('hrCalculator.lead.button')} <ArrowRight size={16} /></button><div className="mt-3 flex items-center gap-2 text-[11px] leading-4 text-slate-500"><Send size={13} /> {t('hrCalculator.lead.privacy')}</div></form></div></section>;
}
