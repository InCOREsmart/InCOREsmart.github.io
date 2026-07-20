import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, AlertCircle, Calculator } from 'lucide-react';
import { supabase, Contract, DEFAULT_PAYMENT_STREAMS } from '../../lib/supabase';

interface CreateContractModalProps {
  companyId: string;
  onClose: () => void;
  onCreated: (contract: Contract) => void;
}

interface FormData {
  title: string;
  description: string;
  deadline: string;
  kpi_calls: number;
  kpi_meetings: number;
  kpi_proposals: number;
  kpi_revenue: number;
  min_check: number;
  target_conversion: number;
  avg_check: number;
  target_clients: number;
}

const initialFormData: FormData = {
  title: '',
  description: '',
  deadline: '',
  kpi_calls: 0,
  kpi_meetings: 0,
  kpi_proposals: 0,
  kpi_revenue: 0,
  min_check: 0,
  target_conversion: 20,
  avg_check: 0,
  target_clients: 0,
};

export function CreateContractModal({ companyId, onClose, onCreated }: CreateContractModalProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof FormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  // Calculate bonuses in real-time
  const newSalesBonus = Math.round(formData.kpi_revenue * 0.1);
  const renewalBonus = Math.round(formData.kpi_revenue * 0.03);
  const crossSellBonus = Math.round(formData.kpi_revenue * 0.05);
  const planBonus100 = 50000;
  const planBonus120 = 100000;
  const totalBonus100 = newSalesBonus + renewalBonus + crossSellBonus + planBonus100;
  const totalBonus120 = newSalesBonus + renewalBonus + crossSellBonus + planBonus120;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const contractData = {
        company_id: companyId,
        title: formData.title,
        description: formData.description,
        deadline: formData.deadline,
        status: 'DRAFT' as const,
        kpi_calls: formData.kpi_calls,
        kpi_meetings: formData.kpi_meetings,
        kpi_proposals: formData.kpi_proposals,
        kpi_revenue: formData.kpi_revenue,
        min_check: formData.min_check,
        target_conversion: formData.target_conversion,
        avg_check: formData.avg_check,
        target_clients: formData.target_clients,
        payment_streams: DEFAULT_PAYMENT_STREAMS,
        escrow_amount: 0,
        escrow_status: 'PENDING' as const,
      };

      const { data, error: insertError } = await supabase
        .from('contracts')
        .insert(contractData)
        .select()
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      if (data) {
        onCreated(data as Contract);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU').format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-primary border border-text-secondary/20 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-text-secondary/10">
          <h2 className="text-xl font-display font-semibold text-text-primary">
            {t('contract.createContract')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-4 bg-error/20 border border-error/30 rounded-lg text-error">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Form Fields */}
            <div className="space-y-4">
              {/* Task Info */}
              <div>
                <label className="label">{t('contract.title')} *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  className="input"
                  placeholder="Привлечение B2B-клиентов"
                  required
                />
              </div>

              <div>
                <label className="label">{t('contract.description')} *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  className="input min-h-[100px]"
                  placeholder="Описание задачи"
                  required
                />
              </div>

              <div>
                <label className="label">{t('contract.deadline')} *</label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => handleChange('deadline', e.target.value)}
                  className="input"
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* KPI Goals */}
              <div className="card bg-primary-light">
                <h3 className="text-sm font-medium text-text-primary mb-4">{t('kpi.title')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label text-xs">{t('kpi.calls')}</label>
                    <input
                      type="number"
                      value={formData.kpi_calls || ''}
                      onChange={(e) => handleChange('kpi_calls', parseInt(e.target.value) || 0)}
                      className="input"
                      placeholder="1000"
                      min={0}
                      required
                    />
                  </div>
                  <div>
                    <label className="label text-xs">{t('kpi.meetings')}</label>
                    <input
                      type="number"
                      value={formData.kpi_meetings || ''}
                      onChange={(e) => handleChange('kpi_meetings', parseInt(e.target.value) || 0)}
                      className="input"
                      placeholder="50"
                      min={0}
                      required
                    />
                  </div>
                  <div>
                    <label className="label text-xs">{t('kpi.proposals')}</label>
                    <input
                      type="number"
                      value={formData.kpi_proposals || ''}
                      onChange={(e) => handleChange('kpi_proposals', parseInt(e.target.value) || 0)}
                      className="input"
                      placeholder="100"
                      min={0}
                      required
                    />
                  </div>
                  <div>
                    <label className="label text-xs">{t('kpi.revenue')} ($)</label>
                    <input
                      type="number"
                      value={formData.kpi_revenue || ''}
                      onChange={(e) => handleChange('kpi_revenue', parseInt(e.target.value) || 0)}
                      className="input"
                      placeholder="5000000"
                      min={0}
                      required
                    />
                  </div>
                  <div>
                    <label className="label text-xs">{t('kpi.minCheck')} ($)</label>
                    <input
                      type="number"
                      value={formData.min_check || ''}
                      onChange={(e) => handleChange('min_check', parseInt(e.target.value) || 0)}
                      className="input"
                      placeholder="10000"
                      min={0}
                      required
                    />
                  </div>
                  <div>
                    <label className="label text-xs">{t('kpi.targetConversion')} (%)</label>
                    <input
                      type="number"
                      value={formData.target_conversion}
                      onChange={(e) => handleChange('target_conversion', parseInt(e.target.value) || 20)}
                      className="input"
                      placeholder="20"
                      min={1}
                      max={100}
                      required
                    />
                  </div>
                  <div>
                    <label className="label text-xs">{t('kpi.avgCheck')} ($)</label>
                    <input
                      type="number"
                      value={formData.avg_check || ''}
                      onChange={(e) => handleChange('avg_check', parseInt(e.target.value) || 0)}
                      className="input"
                      placeholder="50000"
                      min={0}
                      required
                    />
                  </div>
                  <div>
                    <label className="label text-xs">{t('kpi.targetClients')}</label>
                    <input
                      type="number"
                      value={formData.target_clients || ''}
                      onChange={(e) => handleChange('target_clients', parseInt(e.target.value) || 0)}
                      className="input"
                      placeholder="20"
                      min={0}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Bonus Calculation */}
            <div className="space-y-4">
              <div className="card bg-gold/10 border-gold/30">
                <div className="flex items-center gap-2 mb-4">
                  <Calculator className="w-5 h-5 text-gold" />
                  <h3 className="text-lg font-display font-semibold text-gold">
                    {t('bonus.title')}
                  </h3>
                </div>

                <div className="space-y-3">
                  {/* New Sales Bonus */}
                  <div className="flex justify-between items-center py-2 border-b border-text-secondary/10">
                    <span className="text-text-secondary">{t('bonus.newSales')}</span>
                    <span className="font-semibold text-success">${formatCurrency(newSalesBonus)}</span>
                  </div>

                  {/* Renewal Bonus */}
                  <div className="flex justify-between items-center py-2 border-b border-text-secondary/10">
                    <span className="text-text-secondary">{t('bonus.renewal')}</span>
                    <span className="font-semibold text-success">${formatCurrency(renewalBonus)}</span>
                  </div>

                  {/* Cross-sell Bonus */}
                  <div className="flex justify-between items-center py-2 border-b border-text-secondary/10">
                    <span className="text-text-secondary">{t('bonus.crossSell')}</span>
                    <span className="font-semibold text-success">${formatCurrency(crossSellBonus)}</span>
                  </div>

                  {/* Plan Bonus 100% */}
                  <div className="flex justify-between items-center py-2 border-b border-text-secondary/10">
                    <span className="text-text-secondary">{t('bonus.planBonus')} (100%)</span>
                    <span className="font-semibold text-success">${formatCurrency(planBonus100)}</span>
                  </div>

                  {/* Plan Bonus 120% */}
                  <div className="flex justify-between items-center py-2 border-b border-text-secondary/10">
                    <span className="text-text-secondary">{t('bonus.planBonus')} (120%)</span>
                    <span className="font-semibold text-success">${formatCurrency(planBonus120)}</span>
                  </div>

                  {/* Total */}
                  <div className="pt-4">
                    <div className="flex justify-between items-center py-2 bg-gold/20 rounded-lg px-3 mb-2">
                      <span className="font-medium text-gold">{t('bonus.planBonus100')}</span>
                      <span className="font-bold text-gold text-xl">${formatCurrency(totalBonus100)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 bg-success/20 rounded-lg px-3">
                      <span className="font-medium text-success">{t('bonus.planBonus120')}</span>
                      <span className="font-bold text-success text-xl">${formatCurrency(totalBonus120)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Streams Info */}
              <div className="card bg-primary-light">
                <h3 className="text-sm font-medium text-text-primary mb-3">{t('paymentStreams.title')}</h3>
                <ul className="space-y-2 text-sm">
                  {DEFAULT_PAYMENT_STREAMS.map((stream) => (
                    <li key={stream.id} className="flex justify-between text-text-secondary">
                      <span>{stream.name}</span>
                      <span className="text-gold">
                        {stream.percent ? `${stream.percent}%` : stream.amount ? `$${formatCurrency(stream.amount)}` : '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t border-text-secondary/10">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? t('common.loading') : t('contract.createContract')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
