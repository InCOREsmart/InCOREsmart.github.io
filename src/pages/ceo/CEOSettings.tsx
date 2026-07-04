import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Building, MapPin, Landmark, AlertCircle, CheckCircle } from 'lucide-react';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { supabase, Company, CompanyType } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface FormData {
  full_name: string;
  display_name: string;
  position: string;
  company_type: CompanyType;
  company_name: string;
  inn: string;
  kpp: string;
  ogrn: string;
  ogrnip: string;
  legal_address: string;
  phone: string;
  bank_name: string;
  bank_bik: string;
  bank_inn: string;
  bank_address: string;
  correspondent_account: string;
  settlement_account: string;
}

const initialFormData: FormData = {
  full_name: '',
  display_name: '',
  position: '',
  company_type: 'ООО',
  company_name: '',
  inn: '',
  kpp: '',
  ogrn: '',
  ogrnip: '',
  legal_address: '',
  phone: '',
  bank_name: '',
  bank_bik: '',
  bank_inn: '',
  bank_address: '',
  correspondent_account: '',
  settlement_account: '',
};

export function CEOSettings() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const isOOO = formData.company_type === 'ООО';
  const isIP = formData.company_type === 'ИП';

  useEffect(() => {
    const fetchCompany = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const { data } = await supabase
          .from('companies')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data) {
          setFormData({
            full_name: data.full_name || '',
            display_name: data.display_name || '',
            position: data.position || '',
            company_type: data.company_type || 'ООО',
            company_name: data.company_name || '',
            inn: data.inn || '',
            kpp: data.kpp || '',
            ogrn: data.ogrn || '',
            ogrnip: '',
            legal_address: data.legal_address || '',
            phone: data.phone || '',
            bank_name: data.bank_name || '',
            bank_bik: data.bank_bik || '',
            bank_inn: data.bank_inn || '',
            bank_address: data.bank_address || '',
            correspondent_account: data.correspondent_account || '',
            settlement_account: data.settlement_account || '',
          });
        }
      } catch (err) {
        console.error('Error fetching company:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCompany();
  }, [user]);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(false);
    setValidationErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Common validations
    if (!formData.full_name.trim()) {
      errors.full_name = t('common.required');
    }

    if (!formData.display_name.trim()) {
      errors.display_name = t('common.required');
    }

    if (isOOO && !formData.position.trim()) {
      errors.position = t('common.required');
    }

    if (isOOO && !formData.company_name.trim()) {
      errors.company_name = t('common.required');
    }

    // INN validation
    const innDigits = formData.inn.replace(/\D/g, '');
    if (isOOO) {
      if (innDigits.length !== 10 && innDigits.length !== 12) {
        errors.inn = t('validation.innLength');
      }
    } else if (isIP) {
      if (innDigits.length !== 12) {
        errors.inn = t('validation.innIP');
      }
    }

    // KPP - only for OOO
    if (isOOO) {
      const kppDigits = formData.kpp.replace(/\D/g, '');
      if (kppDigits.length !== 9) {
        errors.kpp = t('validation.kppLength');
      }
    }

    // OGRN - only for OOO (13 digits)
    if (isOOO) {
      const ogrnDigits = formData.ogrn.replace(/\D/g, '');
      if (ogrnDigits.length !== 13) {
        errors.ogrn = t('validation.ogrnLength');
      }
    }

    // OGRNIP - only for IP (15 digits)
    if (isIP) {
      const ogrnipDigits = formData.ogrnip.replace(/\D/g, '');
      if (ogrnipDigits.length !== 15) {
        errors.ogrnip = t('validation.ogrnipLength');
      }
    }

    if (!formData.legal_address.trim()) {
      errors.legal_address = t('common.required');
    }

    // Phone - required for IP and OOO
    if (!formData.phone.trim()) {
      errors.phone = t('common.required');
    }

    // Bank validations
    if (!formData.bank_name.trim()) {
      errors.bank_name = t('common.required');
    }

    const bikDigits = formData.bank_bik.replace(/\D/g, '');
    if (bikDigits.length !== 9) {
      errors.bank_bik = t('validation.bikLength');
    }

    const bankInnDigits = formData.bank_inn.replace(/\D/g, '');
    if (bankInnDigits.length !== 10 && bankInnDigits.length !== 12) {
      errors.bank_inn = t('validation.innLength');
    }

    if (!formData.bank_address.trim()) {
      errors.bank_address = t('common.required');
    }

    const corrDigits = formData.correspondent_account.replace(/\D/g, '');
    if (corrDigits.length !== 20) {
      errors.correspondent_account = t('validation.accountLength');
    }

    const settlDigits = formData.settlement_account.replace(/\D/g, '');
    if (settlDigits.length !== 20) {
      errors.settlement_account = t('validation.accountLength');
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();

      const dataToSave = {
        full_name: formData.full_name,
        display_name: formData.display_name,
        position: isOOO ? formData.position : null,
        company_type: formData.company_type,
        company_name: isOOO ? formData.company_name : formData.full_name,
        inn: formData.inn,
        kpp: isOOO ? formData.kpp : null,
        ogrn: isOOO ? formData.ogrn : formData.ogrnip,
        legal_address: formData.legal_address,
        phone: formData.phone,
        bank_name: formData.bank_name,
        bank_bik: formData.bank_bik,
        bank_inn: formData.bank_inn,
        bank_address: formData.bank_address,
        correspondent_account: formData.correspondent_account,
        settlement_account: formData.settlement_account,
      };

      let error;
      if (existingCompany) {
        ({ error } = await supabase
          .from('companies')
          .update(dataToSave)
          .eq('user_id', user!.id));
      } else {
        ({ error } = await supabase
          .from('companies')
          .insert({
            ...dataToSave,
            user_id: user!.id,
          }));
      }

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-text-secondary">{t('common.loading')}</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-text-primary">
          {t('company.title')}
        </h1>
        <p className="text-text-secondary mt-1">
          {t('company.subtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-4 bg-error/20 border border-error/30 rounded-lg text-error">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-4 bg-success/20 border border-success/30 rounded-lg text-success">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{t('common.success')}</span>
          </div>
        )}

        {/* CEO/Company Info */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gold/20 rounded-lg">
              <Building className="w-5 h-5 text-gold" />
            </div>
            <h2 className="text-lg font-display font-semibold text-text-primary">
              {isOOO ? t('company.ceoInfo') : t('company.ipInfo')}
            </h2>
          </div>

          {/* Company Type Selection */}
          <div className="mb-6">
            <label className="label">{t('company.companyType')} *</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleChange('company_type', 'ООО')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  isOOO
                    ? 'border-gold bg-gold/10 text-gold'
                    : 'border-text-secondary/20 text-text-secondary hover:border-gold/50'
                }`}
              >
                <Building className="w-5 h-5" />
                <span className="font-medium">ООО</span>
              </button>
              <button
                type="button"
                onClick={() => handleChange('company_type', 'ИП')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  isIP
                    ? 'border-gold bg-gold/10 text-gold'
                    : 'border-text-secondary/20 text-text-secondary hover:border-gold/50'
                }`}
              >
                <Building className="w-5 h-5" />
                <span className="font-medium">ИП</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="label">
                {isOOO ? t('company.fullName') : t('company.fullNameIP')} *
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => handleChange('full_name', e.target.value)}
                className={`input ${validationErrors.full_name ? 'border-error' : ''}`}
                placeholder={isOOO ? 'Иванов Иван Иванович' : 'ИП Иванов Иван Иванович'}
                required
              />
              {validationErrors.full_name && (
                <p className="text-error text-sm mt-1">{validationErrors.full_name}</p>
              )}
            </div>

            {/* Display Name - "Как к вам обращаться" */}
            <div>
              <label className="label">{t('company.displayName')} *</label>
              <input
                type="text"
                value={formData.display_name}
                onChange={(e) => handleChange('display_name', e.target.value)}
                className={`input ${validationErrors.display_name ? 'border-error' : ''}`}
                placeholder="Иван Иванович"
                required
              />
              {validationErrors.display_name && (
                <p className="text-error text-sm mt-1">{validationErrors.display_name}</p>
              )}
            </div>

            {/* Position - only for OOO */}
            {isOOO && (
              <div>
                <label className="label">{t('company.position')} *</label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => handleChange('position', e.target.value)}
                  className={`input ${validationErrors.position ? 'border-error' : ''}`}
                  placeholder="Генеральный директор"
                  required
                />
                {validationErrors.position && (
                  <p className="text-error text-sm mt-1">{validationErrors.position}</p>
                )}
              </div>
            )}

            {/* Phone - for OOO (company phone) */}
            {isOOO && (
              <div>
                <label className="label">{t('company.phone')} *</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className={`input ${validationErrors.phone ? 'border-error' : ''}`}
                  placeholder="+7 (999) 123-45-67"
                  required
                />
                {validationErrors.phone && (
                  <p className="text-error text-sm mt-1">{validationErrors.phone}</p>
                )}
              </div>
            )}

            {/* Company Name - only for OOO */}
            {isOOO && (
              <div>
                <label className="label">{t('company.companyName')} *</label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => handleChange('company_name', e.target.value)}
                  className={`input ${validationErrors.company_name ? 'border-error' : ''}`}
                  placeholder='ООО "Компания"'
                  required
                />
                {validationErrors.company_name && (
                  <p className="text-error text-sm mt-1">{validationErrors.company_name}</p>
                )}
              </div>
            )}

            {/* INN */}
            <div>
              <label className="label">
                {isOOO ? t('company.inn') : t('company.innIP')} *
              </label>
              <input
                type="text"
                value={formData.inn}
                onChange={(e) => handleChange('inn', e.target.value.replace(/\D/g, '').slice(0, 12))}
                className={`input ${validationErrors.inn ? 'border-error' : ''}`}
                placeholder={isOOO ? '1234567890' : '123456789012'}
                required
                maxLength={12}
              />
              {validationErrors.inn && (
                <p className="text-error text-sm mt-1">{validationErrors.inn}</p>
              )}
            </div>

            {/* KPP - only for OOO */}
            {isOOO && (
              <div>
                <label className="label">{t('company.kpp')} *</label>
                <input
                  type="text"
                  value={formData.kpp}
                  onChange={(e) => handleChange('kpp', e.target.value.replace(/\D/g, '').slice(0, 9))}
                  className={`input ${validationErrors.kpp ? 'border-error' : ''}`}
                  placeholder="123456789"
                  required
                  maxLength={9}
                />
                {validationErrors.kpp && (
                  <p className="text-error text-sm mt-1">{validationErrors.kpp}</p>
                )}
              </div>
            )}

            {/* OGRN - only for OOO */}
            {isOOO && (
              <div>
                <label className="label">{t('company.ogrn')} *</label>
                <input
                  type="text"
                  value={formData.ogrn}
                  onChange={(e) => handleChange('ogrn', e.target.value.replace(/\D/g, '').slice(0, 13))}
                  className={`input ${validationErrors.ogrn ? 'border-error' : ''}`}
                  placeholder="1234567890123"
                  required
                  maxLength={13}
                />
                {validationErrors.ogrn && (
                  <p className="text-error text-sm mt-1">{validationErrors.ogrn}</p>
                )}
              </div>
            )}

            {/* OGRNIP - only for IP - REMOVED FROM HERE, MOVED TO BANK DETAILS */}

            {/* Phone - only for IP (moved here from bank details) */}
            {isIP && (
              <div>
                <label className="label">{t('company.phone')} *</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className={`input ${validationErrors.phone ? 'border-error' : ''}`}
                  placeholder="+7 (999) 123-45-67"
                  required
                />
                {validationErrors.phone && (
                  <p className="text-error text-sm mt-1">{validationErrors.phone}</p>
                )}
              </div>
            )}

            {/* Legal Address */}
            <div className={isOOO ? '' : 'md:col-span-2'}>
              <label className="label">{t('company.legalAddress')} *</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-5 h-5 text-text-muted" />
                <input
                  type="text"
                  value={formData.legal_address}
                  onChange={(e) => handleChange('legal_address', e.target.value)}
                  className={`input pl-10 ${validationErrors.legal_address ? 'border-error' : ''}`}
                  placeholder="123456, г. Москва, ул. Примерная, д. 1"
                  required
                />
              </div>
              {validationErrors.legal_address && (
                <p className="text-error text-sm mt-1">{validationErrors.legal_address}</p>
              )}
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gold/20 rounded-lg">
              <Landmark className="w-5 h-5 text-gold" />
            </div>
            <h2 className="text-lg font-display font-semibold text-text-primary">
              {t('company.bankDetails')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bank Name */}
            <div className="md:col-span-2">
              <label className="label">{t('company.bankName')} *</label>
              <input
                type="text"
                value={formData.bank_name}
                onChange={(e) => handleChange('bank_name', e.target.value)}
                className={`input ${validationErrors.bank_name ? 'border-error' : ''}`}
                placeholder="ПАО Сбербанк"
                required
              />
              {validationErrors.bank_name && (
                <p className="text-error text-sm mt-1">{validationErrors.bank_name}</p>
              )}
            </div>

            {/* BIK */}
            <div>
              <label className="label">{t('company.bankBik')} *</label>
              <input
                type="text"
                value={formData.bank_bik}
                onChange={(e) => handleChange('bank_bik', e.target.value.replace(/\D/g, '').slice(0, 9))}
                className={`input ${validationErrors.bank_bik ? 'border-error' : ''}`}
                placeholder="044525225"
                required
                maxLength={9}
              />
              {validationErrors.bank_bik && (
                <p className="text-error text-sm mt-1">{validationErrors.bank_bik}</p>
              )}
            </div>

            {/* Bank INN */}
            <div>
              <label className="label">{t('company.bankInn')} *</label>
              <input
                type="text"
                value={formData.bank_inn}
                onChange={(e) => handleChange('bank_inn', e.target.value.replace(/\D/g, '').slice(0, 12))}
                className={`input ${validationErrors.bank_inn ? 'border-error' : ''}`}
                placeholder="7707083893"
                required
                maxLength={12}
              />
              {validationErrors.bank_inn && (
                <p className="text-error text-sm mt-1">{validationErrors.bank_inn}</p>
              )}
            </div>

            {/* OGRNIP - only for IP - MOVED HERE */}
            {isIP && (
              <div>
                <label className="label">{t('company.ogrnip')} *</label>
                <input
                  type="text"
                  value={formData.ogrnip}
                  onChange={(e) => handleChange('ogrnip', e.target.value.replace(/\D/g, '').slice(0, 15))}
                  className={`input ${validationErrors.ogrnip ? 'border-error' : ''}`}
                  placeholder="123456789012345"
                  required
                  maxLength={15}
                />
                {validationErrors.ogrnip && (
                  <p className="text-error text-sm mt-1">{validationErrors.ogrnip}</p>
                )}
              </div>
            )}

            {/* Correspondent Account */}
            <div>
              <label className="label">{t('company.correspondentAccount')} *</label>
              <input
                type="text"
                value={formData.correspondent_account}
                onChange={(e) => handleChange('correspondent_account', e.target.value.replace(/\D/g, '').slice(0, 20))}
                className={`input ${validationErrors.correspondent_account ? 'border-error' : ''}`}
                placeholder="30101810400000000225"
                required
                maxLength={20}
              />
              {validationErrors.correspondent_account && (
                <p className="text-error text-sm mt-1">{validationErrors.correspondent_account}</p>
              )}
            </div>

            {/* Settlement Account */}
            <div>
              <label className="label">{t('company.settlementAccount')} *</label>
              <input
                type="text"
                value={formData.settlement_account}
                onChange={(e) => handleChange('settlement_account', e.target.value.replace(/\D/g, '').slice(0, 20))}
                className={`input ${validationErrors.settlement_account ? 'border-error' : ''}`}
                placeholder="40702810500000001234"
                required
                maxLength={20}
              />
              {validationErrors.settlement_account && (
                <p className="text-error text-sm mt-1">{validationErrors.settlement_account}</p>
              )}
            </div>

            {/* Bank Address */}
            <div>
              <label className="label">{t('company.bankAddress')} *</label>
              <input
                type="text"
                value={formData.bank_address}
                onChange={(e) => handleChange('bank_address', e.target.value)}
                className={`input ${validationErrors.bank_address ? 'border-error' : ''}`}
                placeholder="г. Москва, ул. Вавилова, д. 19"
                required
              />
              {validationErrors.bank_address && (
                <p className="text-error text-sm mt-1">{validationErrors.bank_address}</p>
              )}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            {saving ? t('common.loading') : t('common.save')}
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
}
