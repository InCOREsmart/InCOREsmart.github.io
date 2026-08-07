import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Building2, FileText, Download, DollarSign } from 'lucide-react';

export function CEOAccountingPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<any>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const loadCompany = async () => {
      try {
        const { data } = await supabase
          .from('companies')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        setCompany(data);
      } catch (err) {
        console.error('Ошибка:', err);
      } finally {
        setLoading(false);
      }
    };
    loadCompany();
  }, [user]);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#B8860B]"></div>
        <p className="mt-4 text-[#000052]">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#000052]">{t('accounting.title')}</h1>
        <p className="text-sm text-[#000052]/70 mt-1">{t('accounting.subtitle')}</p>
      </div>

      {/* Информация о компании */}
      <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
        <div className="flex items-center gap-3 mb-4">
          <Building2 className="w-6 h-6 text-[#B8860B]" />
          <h2 className="text-lg font-bold text-[#000052]">{t('accounting.companyInfo')}</h2>
        </div>
        {company ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-[#000052]/60">{t('company.companyName')}</div>
              <div className="font-semibold text-[#000052]">{company.company_name || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-[#000052]/60">{t('company.inn')}</div>
              <div className="font-semibold text-[#000052]">{company.inn || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-[#000052]/60">{t('company.companyType')}</div>
              <div className="font-semibold text-[#000052]">{company.company_type || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-[#000052]/60">{t('company.fullName')}</div>
              <div className="font-semibold text-[#000052]">{company.full_name || '—'}</div>
            </div>
          </div>
        ) : (
          <p className="text-[#000052]/60">Данные компании не заполнены. Перейдите в Настройки.</p>
        )}
      </div>

      {/* Документы */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
          <div className="flex items-center gap-3 mb-3">
            <FileText className="w-5 h-5 text-[#B8860B]" />
            <h3 className="font-bold text-[#000052]">{t('accounting.paymentRegistry')}</h3>
          </div>
          <p className="text-sm text-[#000052]/70 mb-4">{t('accounting.paymentRegistryDesc')}</p>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#B8860B] hover:bg-[#9a7209] text-white rounded-lg text-sm font-semibold transition">
            <Download className="w-4 h-4" />
            {t('accounting.downloadCsv')}
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
          <div className="flex items-center gap-3 mb-3">
            <FileText className="w-5 h-5 text-[#B8860B]" />
            <h3 className="font-bold text-[#000052]">{t('accounting.actsOfWork')}</h3>
          </div>
          <p className="text-sm text-[#000052]/70 mb-4">{t('accounting.actsOfWorkDesc')}</p>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#B8860B] hover:bg-[#9a7209] text-white rounded-lg text-sm font-semibold transition">
            <Download className="w-4 h-4" />
            {t('accounting.downloadXls')}
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
          <div className="flex items-center gap-3 mb-3">
            <DollarSign className="w-5 h-5 text-[#B8860B]" />
            <h3 className="font-bold text-[#000052]">{t('accounting.incomeStatements')}</h3>
          </div>
          <p className="text-sm text-[#000052]/70 mb-4">{t('accounting.incomeStatementsDesc')}</p>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#B8860B] hover:bg-[#9a7209] text-white rounded-lg text-sm font-semibold transition">
            <Download className="w-4 h-4" />
            {t('accounting.downloadCsv')}
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
          <div className="flex items-center gap-3 mb-3">
            <FileText className="w-5 h-5 text-[#B8860B]" />
            <h3 className="font-bold text-[#000052]">{t('accounting.fullPackage')}</h3>
          </div>
          <p className="text-sm text-[#000052]/70 mb-4">{t('accounting.fullPackageDesc')}</p>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#B8860B] hover:bg-[#9a7209] text-white rounded-lg text-sm font-semibold transition">
            <Download className="w-4 h-4" />
            {t('accounting.downloadPackage')}
          </button>
        </div>
      </div>
    </div>
  );
}