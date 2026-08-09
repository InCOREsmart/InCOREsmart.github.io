import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Activity, AlertTriangle } from 'lucide-react';
import { getOracleTrustLevel } from '../../lib/smart-contract/oracleTrust';
import { checkContractHealth } from '../../lib/smart-contract/healthCheck';

type Props = { contract: any };

export function ContractTrustHealthPanel({ contract }: Props) {
  const { t } = useTranslation();
  const [trust, setTrust] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [trustResult, healthResult] = await Promise.all([
          getOracleTrustLevel(contract?.id),
          checkContractHealth(contract)
        ]);
        if (active) {
          setTrust(trustResult);
          setHealth(healthResult);
        }
      } catch (error) {
        console.error('Contract trust/health check failed:', error);
      }
    };
    if (contract?.id) load();
    return () => { active = false; };
  }, [contract]);

  const trustLabel = trust?.level ? String(trust.level) : t('common.loading');
  const healthy = health?.healthy !== false;

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
        </div>
      </div>
    </div>
  );
}
