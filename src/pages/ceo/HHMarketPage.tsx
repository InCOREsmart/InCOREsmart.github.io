import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { HHMarketAnalyticsPanel } from '../../components/role/HHMarketAnalyticsPanel';
import { HHMarketCollectorPage } from './HHMarketCollectorPage';

export function HHMarketPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="space-y-6 min-w-0">
      <HHMarketAnalyticsPanel />
      <HHMarketCollectorPage />
      <div className="flex justify-end px-3 sm:px-4 md:px-0 pb-4">
        <button onClick={() => navigate('/ceo/candidates')} className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#000052] text-white font-semibold">
          {t('candidates.next')} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
