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
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false); const [saving, setSaving] = useState(false); const [error, setError] = useState(false);
  const [validationError, setValidationError] = useState('');
  const submit = async (event: React.FormEvent) => { event.preventDefault(); const telegramValue = telegram.trim(); const emailValue = email.trim().toLowerCase(); if (saving) return; setValidationError(''); setError(false); if (!/^@[A-Za-z0-9_]{5,32}$/.test(telegramValue) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) { setValidationError(t('hrCalculator.lead.validation')); return; } const contact = `${telegramValue} | ${emailValue}`; setSaving(true); const locale = (i18n.resolvedLanguage || i18n.language || 'ru').split('-')[0]; const diagnosis = result ? diagnoseHrLoss(result) : null; const remainingLoss = scenarioRemainingLoss ?? result?.totalLoss ?? 0; const effect = result ? Math.max(0, result.totalLoss - remainingLoss) : 0; const { error: insertError } = await supabase.from('hr_calculator_leads').insert({ contact, contact_type: 'telegram', locale, total_loss: result?.totalLoss ?? 0, potential_effect: result ? effect : 0, source: 'hr-calculator', primary_driver: diagnosis?.primaryDriver ?? null, primary_driver_share: diagnosis?.primaryShare ?? 0, benchmark_ratio: benchmarkRatio, benchmark_status: benchmarkStatus, scenario_reduction_percent: scenarioReduction, scenario_remaining_loss: remainingLoss, inputs: input ?? {}, }); if (insertError) { setSaving(false); setError(true); return; } onSubmit?.(contact);
    try {
      await fetch('https://utsuzqmzawunqpiguuhk.supabase.co/functions/v1/hr-calculator-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact,
          telegram: telegramValue,
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
  return <section className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8"><div className="grid gap-7 lg:grid-cols-[1fr_420px] lg:items-center"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-300"><Mail size={14} /> {t('hrCalculator.lead.badge')}</div><h2 className="text-2xl font-black tracking-tight sm:text-3xl">{t('hrCalculator.lead.title')}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{t('hrCalculator.lead.subtitle')}</p><div className="mt-5 flex flex-wrap gap-3 text-sm"><span className="rounded-xl bg-white/10 px-3 py-2"><b>{totalLoss}</b> {t('hrCalculator.lead.lossLabel')}</span><span className="rounded-xl bg-indigo-500/30 px-3 py-2"><b>{potentialEffect}</b> {t('hrCalculator.lead.effectLabel')}</span></div></div><form onSubmit={submit} className="rounded-2xl bg-white p-5 text-slate-900"><label className="block text-sm font-bold" htmlFor="hr-report-telegram">{t('hrCalculator.lead.telegramLabel')}</label><p className="mt-1 text-xs leading-5 text-slate-500">{t('hrCalculator.lead.telegramHint')}</p><input id="hr-report-telegram" type="text" inputMode="text" autoComplete="off" value={telegram} onChange={(event) => setTelegram(event.target.value)} placeholder="@username" pattern="@[A-Za-z0-9_]{5,32}" className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" required /><label className="mt-4 block text-sm font-bold" htmlFor="hr-report-email">{t('hrCalculator.lead.emailLabel')}</label><input id="hr-report-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" required />{validationError && <p className="mt-2 text-xs font-semibold text-red-600">{validationError}</p>}{error && <p className="mt-2 text-xs font-semibold text-red-600">{t('hrCalculator.lead.error')}</p>}<button type="submit" disabled={saving} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? t('hrCalculator.lead.saving') : t('hrCalculator.lead.button')} <ArrowRight size={16} /></button><div className="mt-3 flex items-center gap-2 text-[11px] leading-4 text-slate-500"><Send size={13} /> {t('hrCalculator.lead.privacy')}</div></form></div></section>;
}
