import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';

export function CEODisputesPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);

  useEffect(() => { setLoading(false); }, []);

  if (loading) return <DashboardLayout><div className="p-8 text-[#000052]">{t('common.loading')}</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#000052]">{t('nav.disputes')}</h1>
        <p className="text-gray-600 mt-1">{t('ceo.disputesSubtitle') || 'Ручные подтверждения сбоев Оракула и споры с агентами'}</p>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold text-[#000052] mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#000052]" />
          {t('ceo.manualApprovals') || 'Требуют ручного подтверждения'} (0)
        </h2>
        <div className="card text-center py-12">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">{t('ceo.noManualApprovals') || 'Все системы Оракула работают штатно.'}</p>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-[#000052] mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-[#000052]" />
          {t('ceo.activeDisputes') || 'Активные споры'} (0)
        </h2>
        <div className="card text-center py-12">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <p className="text-gray-600">{t('ceo.noDisputes') || 'Споров нет. Экономика доверия работает.'}</p>
        </div>
      </div>
    </DashboardLayout>
  );
}