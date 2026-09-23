import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Mail, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import type { HrCalculatorInput, HrCalculatorResult } from './hrCalculator';
import { diagnoseHrLoss } from './diagnoseHrLoss';

type Props = { t: (key: string) => string; totalLoss: string; potentialEffect: string; onSubmit?: (contact: string) => void; input?: HrCalculatorInput; result?: HrCalculatorResult; scenarioReduction?: number; scenarioRemainingLoss?: number; benchmarkRatio?: number; benchmarkStatus?: string };

export function HrReportLeadCapture({ t, input, result, scenarioReduction = 0, scenarioRemainingLoss, totalLoss, potentialEffect, benchmarkRatio = 0, benchmarkStatus = 'unknown', onSubmit }: Props) {
  const { i18n } = useTranslation();
  const [telegram, setTelegram] = useState('');
  const [phone, setPhone] = useState('');
  const [contactType, setContactType] = useState<'telegram' | 'phone'>('telegram');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false); const [saving, setSaving] = useState(false); const [error, setError] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [consentTos, setConsentTos] = useState(false); const [consentPrivacy, setConsentPrivacy] = useState(false); const [consentPd, setConsentPd] = useState(false);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); const telegramValue = telegram.trim(); const phoneValue = phone.replace(/[\s().-]/g, ''); const emailValue = email.trim().toLowerCase(); if (saving) return; setValidationError(''); setError(false); if (!emailValue || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) { setValidationError(t('hrCalculator.lead.validation')); return; } if (contactType === 'telegram' && !/^@[A-Za-z0-9_]{5,32}$/.test(telegramValue)) { setValidationError(t('hrCalculator.lead.telegramInvalid')); return; } if (contactType === 'phone' && !/^\+[1-9]\d{6,14}$/.test(phoneValue)) { setValidationError(t('hrCalculator.lead.phoneInvalid')); return; } if (!consentTos || !consentPrivacy || !consentPd) { setValidationError(t('auth.consentRequired')); return; } const contact = `${contactType === 'telegram' ? telegramValue : phoneValue} | ${emailValue}`; setSaving(true); const locale = (i18n.resolvedLanguage || i18n.language || 'ru').split('-')[0]; const diagnosis = result ? diagnoseHrLoss(result) : null; const remainingLoss = scenarioRemainingLoss ?? result?.totalLoss ?? 0; const effect = result ? Math.max(0, result.totalLoss - remainingLoss) : 0; const { error: insertError } = await supabase.from('hr_calculator_leads').insert({ contact, contact_type: contactType, locale, total_loss: result?.totalLoss ?? 0, potential_effect: result ? effect : 0, source: 'hr-calculator', primary_driver: diagnosis?.primaryDriver ?? null, primary_driver_share: diagnosis?.primaryShare ?? 0, benchmark_ratio: benchmarkRatio, benchmark_status: benchmarkStatus, scenario_reduction_percent: scenarioReduction, scenario_remaining_loss: remainingLoss, inputs: { ...(input ?? {}), consent_tos: consentTos, consent_privacy: consentPrivacy, consent_pd: consentPd }, }); if (insertError) { setSaving(false); setError(true); return; } onSubmit?.(contact);
    try {
      await fetch('https://utsuzqmzawunqpiguuhk.supabase.co/functions/v1/hr-calculator-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact,
          telegram: contactType === 'telegram' ? telegramValue : null,
          phone: contactType === 'phone' ? phoneValue : null,
          email: emailValue,
          contact_type: 'telegram',
          locale,
          total_loss: result?.totalLoss ?? 0,
          potential_effect: result ? effect : 0,
          scenario_reduction_percent: scenarioReduction,
          scenario_remaining_loss: remainingLoss,
          primary_driver: diagnosis?.primaryDriver ?? null,
          primary_driver_share: diagnosis?.primaryShare ?? 0,
          benchmark_ratio: benchmarkRatio,
          benchmark_status: benchmarkStatus,
          inputs: input ?? {},
        }),
      });
    } catch {
      // The lead is already saved. Notification failure must not block the client flow.
    }
    setSubmitted(true); setSaving(false); };
  if (submitted) return <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm sm:p-8"><div className="flex items-start gap-4"><div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700"><CheckCircle2 size={22} /></div><div><h2 className="text-xl font-black text-slate-900">{t('hrCalculator.lead.successTitle')}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{t('hrCalculator.lead.successText')}</p></div></div></section>;
  return <section className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8"><div className="grid gap-7 lg:grid-cols-[1fr_420px] lg:items-center"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-300"><Mail size={14} /> {t('hrCalculator.lead.badge')}</div><h2 className="text-2xl font-black tracking-tight sm:text-3xl">{t('hrCalculator.lead.title')}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{t('hrCalculator.lead.subtitle')}</p><div className="mt-5 flex flex-wrap gap-3 text-sm"><span className="rounded-xl bg-white/10 px-3 py-2"><b>{totalLoss}</b> {t('hrCalculator.lead.lossLabel')}</span><span className="rounded-xl bg-indigo-500/30 px-3 py-2"><b>{potentialEffect}</b> {t('hrCalculator.lead.effectLabel')}</span></div></div><form onSubmit={submit} className="rounded-2xl bg-white p-5 text-slate-900"><div className="flex gap-2 mb-3">
          <button type="button" onClick={() => setContactType('telegram')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${contactType === 'telegram' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{t('hrCalculator.lead.telegramLabel')}</button>
          <button type="button" onClick={() => setContactType('phone')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${contactType === 'phone' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{t('hrCalculator.lead.phoneLabel')}</button>
        </div>
        {contactType === 'telegram' ? (
          <>
            <label className="block text-sm font-bold" htmlFor="hr-report-telegram">{t('hrCalculator.lead.telegramLabel')}</label>
            <input id="hr-report-telegram" type="text" inputMode="text" autoComplete="off" value={telegram} onChange={(event) => { const v = event.target.value; setTelegram(v ? (v.startsWith('@') ? v : '@' + v) : ''); }} placeholder="@username" pattern="@[A-Za-z0-9_]{5,32}" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" required />
          </>
        ) : (
          <>
            <label className="block text-sm font-bold" htmlFor="hr-report-phone">{t('hrCalculator.lead.phoneLabel')}</label>
            <input id="hr-report-phone" type="tel" autoComplete="tel" value={phone} onChange={(event) => { let v = event.target.value.replace(/[^0-9+\s().-]/g, ''); if (v && !v.startsWith('+')) v = '+' + v; setPhone(v); }} placeholder="+7 999 123-45-67" pattern="\+[1-9][0-9\s().-]{6,20}" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" required />
          </>
        )}
        <label className="mt-4 block text-sm font-bold" htmlFor="hr-report-email">{t('hrCalculator.lead.emailLabel')}</label>
        <input id="hr-report-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" required />
        <div className="mt-4 rounded-xl bg-slate-50 p-4 space-y-3"><div className="text-sm font-bold text-slate-900">{t('auth.consentTitle')}</div><label className="flex items-start gap-3 text-xs leading-5 text-slate-600"><input type="checkbox" required checked={consentTos} onChange={e=>setConsentTos(e.target.checked)} className="mt-1 w-4 h-4"/><span>{t('auth.consentTos')} <a href={`/docs/${i18n.language}/tos_v1.0.pdf`} target="_blank" rel="noopener noreferrer" className="text-indigo-600">{t('auth.viewDocument')}</a> <b className="text-red-500">*</b></span></label><label className="flex items-start gap-3 text-xs leading-5 text-slate-600"><input type="checkbox" required checked={consentPrivacy} onChange={e=>setConsentPrivacy(e.target.checked)} className="mt-1 w-4 h-4"/><span>{t('auth.consentPrivacy')} <a href={`/docs/${i18n.language}/privacy_v1.0.pdf`} target="_blank" rel="noopener noreferrer" className="text-indigo-600">{t('auth.viewDocument')}</a> <b className="text-red-500">*</b></span></label><label className="flex items-start gap-3 text-xs leading-5 text-slate-600"><input type="checkbox" required checked={consentPd} onChange={e=>setConsentPd(e.target.checked)} className="mt-1 w-4 h-4"/><span>{t('auth.consentPd')} <a href={`/docs/${i18n.language}/consent_pd_v1.0.pdf`} target="_blank" rel="noopener noreferrer" className="text-indigo-600">{t('auth.viewDocument')}</a> <b className="text-red-500">*</b></span></label></div>{validationError && <p className="mt-2 text-xs font-semibold text-red-600">{validationError}</p>}{error && <p className="mt-2 text-xs font-semibold text-red-600">{t('hrCalculator.lead.error')}</p>}<button type="submit" disabled={saving || !consentTos || !consentPrivacy || !consentPd} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? t('hrCalculator.lead.saving') : t('hrCalculator.lead.button')} <ArrowRight size={16} /></button><div className="mt-3 flex items-center gap-2 text-[11px] leading-4 text-slate-500"><Send size={13} /> {t('hrCalculator.lead.privacy')}</div></form></div></section>;
}
