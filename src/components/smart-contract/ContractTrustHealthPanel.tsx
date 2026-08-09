import { ShieldCheck, Activity, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getOracleTrustLevel } from '../../lib/smart-contract/oracleTrust';
import { checkContractHealth } from '../../lib/smart-contract/healthCheck';

type Props = { contract: any };

export function ContractTrustHealthPanel({ contract }: Props) {
  const { t } = useTranslation();
  const health = checkContractHealth({
    id: contract?.id || '',
    status: contract?.status,
    engineVersion: contract?.engine_version || '1.0',
    version: contract?.version ?? 1,
  });

  const latestOracle = Array.isArray(contract?.oracle_events)
    ? contract.oracle_events[contract.oracle_events.length - 1]
    : null;
  const trust = getOracleTrustLevel({
    confirmed: latestOracle ? latestOracle.event_type !== 'ORACLE_ERROR' : true,
    signatureValid: latestOracle?.signature_valid,
    duplicate: latestOracle?.duplicate === true,
    stale: latestOracle?.stale === true,
  });

  const healthy = health.healthy;
  const trustLabel = t(trust.labelKey, trust.level);

  return (
    <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-[#000052]/5 border border-[#000052]/10">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5 text-[#B8860B]" />
            <h3 className="font-bold text-[#000052]">{t('smartContract.oracleTrust', 'Oracle Trust')}</h3>
          </div>
          <span className="inline-flex px-3 py-1 rounded-full text-sm font-semibold bg-[#B8860B]/10 text-[#B8860B]">
            {trustLabel}
          </span>
        </div>
        <div className={`p-4 rounded-xl border ${healthy ? 'bg-[#000052]/5 border-[#000052]/10' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            {healthy ? <Activity className="w-5 h-5 text-[#000052]" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}
            <h3 className="font-bold text-[#000052]">{t('smartContract.health', 'Health Check')}</h3>
          </div>
          <span className="text-sm font-semibold">
            {healthy ? t('smartContract.healthy', 'Healthy') : t('smartContract.unhealthy', 'Attention required')}
          </span>
          {health.issues.length > 0 && <ul className="mt-2 text-xs text-red-600 space-y-1">{health.issues.map(issue => <li key={issue}>• {issue}</li>)}</ul>}
        </div>
      </div>
    </div>
  );
}
