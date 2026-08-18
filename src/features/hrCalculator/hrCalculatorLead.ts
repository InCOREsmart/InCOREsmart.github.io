import { supabase } from '../../lib/supabase';

export type HrCalculatorLead = {
  contact: string;
  contactType?: 'email' | 'telegram' | 'other';
  locale: string;
  totalLoss: number;
  potentialEffect: number;
  primaryDriver?: 'turnover' | 'productivity' | 'mixed';
  primaryDriverShare?: number;
  benchmarkRatio?: number;
  benchmarkStatus?: string;
  scenarioReductionPercent?: number;
  scenarioRemainingLoss?: number;
  inputs?: Record<string, unknown>;
};

export async function saveHrCalculatorLead(lead: HrCalculatorLead) {
  const { error } = await supabase.from('hr_calculator_leads').insert({
    contact: lead.contact.trim(),
    contact_type: lead.contactType || (lead.contact.includes('@') ? 'email' : 'telegram'),
    locale: lead.locale,
    total_loss: Math.max(0, lead.totalLoss),
    potential_effect: Math.max(0, lead.potentialEffect),
    source: 'hr-calculator',
    primary_driver: lead.primaryDriver || null,
    primary_driver_share: lead.primaryDriverShare || 0,
    benchmark_ratio: lead.benchmarkRatio || 0,
    benchmark_status: lead.benchmarkStatus || null,
    scenario_reduction_percent: lead.scenarioReductionPercent || 0,
    scenario_remaining_loss: lead.scenarioRemainingLoss || 0,
    inputs: lead.inputs || {},
  });

  if (error) throw error;
}
