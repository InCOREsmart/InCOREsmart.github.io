import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, User, CreditCard, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { Button } from '../../components/ui';
import { supabase, Agent, TaxStatus } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const initialFormData: Omit<Agent, 'id' | 'user_id' | 'created_at'> = {
  full_name: '',
  phone: '',
  passport_series: '',
  passport_number: '',
  passport_issued_by: '',
  passport_issue_date: '',
  passport_department_code: '',
  inn_personal: '',
  snils: '',
  tax_status: 'self_employed',
  bank_name: '',
  bank_bik: '',
  correspondent_account: '',
  settlement_account: '',
};

export function AgentSettings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
          setFormData({ ...initialFormData, ...data });
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAgent();
  }, [user]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const { data: existing } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();
      
      let err;
      if (existing) {
        ({ error: err } = await supabase
          .from('agents')
          .update(formData)
          .eq('user_id', user!.id));
      } else {
        ({ error: err } = await supabase
          .from('agents')
          .insert({ ...formData, user_id: user!.id }));
      }
      
      if (err) {
        setError(err.message);
        return;
      }
      setSuccess(true);
    } catch (err) {
      setError(t('common.error'));
    } finally {
      setSaving(false);
    }
  };
    if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-text-secondary">
            {t('common.loading')}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-text-primary">
          {t('agent.title')}
        </h1>
        <p className="text-text-secondary mt-1">
          {t('agent.subtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-4 bg-error/20 border border-error/30 rounded-lg text-error">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 p-4 bg-success/20 border border-success/30 rounded-lg text-success">
            <CheckCircle className="w-5 h-5" />
            <span>{t('common.success')}</span>
          </div>
        )}

        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gold/20 rounded-lg">
              <User className="w-5 h-5 text-gold" />
            </div>
            <h2 className="text-lg font-display font-semibold text-text-primary">
              {t('agent.personalInformation')}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">{t('agent.fullName')} *</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => handleChange('full_name', e.target.value)}
                className="input"
                placeholder="Иванов Иван Иванович"
                required
              />
            </div>
            <div>
              <label className="label">{t('agent.phone')} *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="input"
                placeholder="+7 (999) 123-45-67"
                required
              />
            </div>
            <div>
              <label className="label">{t('agent.taxStatus')} *</label>
              <select
                value={formData.tax_status}
                onChange={(e) => handleChange('tax_status', e.target.value as TaxStatus)}
                className="input"
                required
              >
                <option value="self_employed">
                  {t('agent.selfEmployed')}
                </option>
                <option value="ip">{t('agent.ip')}</option>
              </select>
            </div>
          </div>
        </div>
                <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gold/20 rounded-lg">
              <FileText className="w-5 h-5 text-gold" />
            </div>
            <h2 className="text-lg font-display font-semibold text-text-primary">
              {t('agent.passportDetails')}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">{t('agent.passportSeries')} *</label>
              <input
                type="text"
                value={formData.passport_series}
                onChange={(e) => handleChange('passport_series', e.target.value.toUpperCase())}
                className="input"
                placeholder="1234"
                required
                maxLength={4}
              />
            </div>
            <div>
              <label className="label">{t('agent.passportNumber')} *</label>
              <input
                type="text"
                value={formData.passport_number}
                onChange={(e) => handleChange('passport_number', e.target.value)}
                className="input"
                placeholder="567890"
                required
                maxLength={6}
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">{t('agent.passportIssuedBy')} *</label>
              <input
                type="text"
                value={formData.passport_issued_by}
                onChange={(e) => handleChange('passport_issued_by', e.target.value)}
                className="input"
                placeholder="УФМС России по г. Москве"
                required
              />
            </div>
            <div>
              <label className="label">{t('agent.passportIssueDate')} *</label>
              <input
                type="date"
                value={formData.passport_issue_date}
                onChange={(e) => handleChange('passport_issue_date', e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">{t('agent.passportDepartmentCode')} *</label>
              <input
                type="text"
                value={formData.passport_department_code}
                onChange={(e) => handleChange('passport_department_code', e.target.value)}
                className="input"
                placeholder="123-456"
                required
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gold/20 rounded-lg">
              <FileText className="w-5 h-5 text-gold" />
            </div>
            <h2 className="text-lg font-display font-semibold text-text-primary">
              {t('agent.taxInformation')}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">{t('agent.innPersonal')} *</label>
              <input
                type="text"
                value={formData.inn_personal}
                onChange={(e) => handleChange('inn_personal', e.target.value)}
                className="input"
                placeholder="123456789012"
                required
                maxLength={12}
              />
            </div>
            <div>
              <label className="label">{t('agent.snils')} *</label>
              <input
                type="text"
                value={formData.snils}
                onChange={(e) => handleChange('snils', e.target.value)}
                className="input"
                placeholder="123-456-789 00"
                required
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gold/20 rounded-lg">
              <CreditCard className="w-5 h-5 text-gold" />
            </div>
            <h2 className="text-lg font-display font-semibold text-text-primary">
              {t('agent.bankDetails')}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">{t('agent.bankName')} *</label>
              <input
                type="text"
                value={formData.bank_name}
                onChange={(e) => handleChange('bank_name', e.target.value)}
                className="input"
                placeholder="Сбербанк"
                required
              />
            </div>
            <div>
              <label className="label">{t('agent.bankBik')} *</label>
              <input
                type="text"
                value={formData.bank_bik}
                onChange={(e) => handleChange('bank_bik', e.target.value)}
                className="input"
                placeholder="044525225"
                required
                maxLength={9}
              />
            </div>
            <div>
              <label className="label">{t('agent.correspondentAccount')} *</label>
              <input
                type="text"
                value={formData.correspondent_account}
                onChange={(e) => handleChange('correspondent_account', e.target.value)}
                className="input"
                placeholder="30101810400000000225"
                required
                maxLength={20}
              />
            </div>
            <div>
              <label className="label">{t('agent.settlementAccount')} *</label>
              <input
                type="text"
                value={formData.settlement_account}
                onChange={(e) => handleChange('settlement_account', e.target.value)}
                className="input"
                placeholder="40702810500000001234"
                required
                maxLength={20}
              />
            </div>
          </div>
        </div>

                <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            disabled={saving}
            icon={<Save className="w-5 h-5" />}
            className="px-6 py-3"
          >
            {saving ? t('common.loading') : t('common.save')}
          </Button>
        </div>
      </form>
    </DashboardLayout>
  );
}