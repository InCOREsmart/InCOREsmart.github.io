import { HHMarketAnalyticsPanel } from '../../components/role/HHMarketAnalyticsPanel';
import { HHMarketCollectorPage } from './HHMarketCollectorPage';

export function HHMarketPage() {
  return (
    <div className="space-y-6">
      <HHMarketAnalyticsPanel />
      <HHMarketCollectorPage />
    </div>
  );
}
