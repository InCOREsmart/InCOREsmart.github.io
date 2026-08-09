import { useTranslation } from 'react-i18next';
import { ContractTrustHealthPanel } from './ContractTrustHealthPanel';

export function ContractTechnicalPanel({ contract }: { contract: any }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <ContractTrustHealthPanel contract={contract} />
      <div className="bg-white p-5 rounded-xl border border-[#000052]/10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-[#000052]/60 mb-1">{t('smartContract.engineVersion', 'Engine version')}</p>
            <p className="font-semibold text-[#000052]">{contract?.engine_version || '1.0'}</p>
          </div>
          <div>
            <p className="text-xs text-[#000052]/60 mb-1">{t('smartContract.contractVersion', 'Contract version')}</p>
            <p className="font-semibold text-[#000052]">{contract?.version || '1.0'}</p>
          </div>
          <div>
            <p className="text-xs text-[#000052]/60 mb-1">{t('smartContract.termsLockedAt', 'Terms locked')}</p>
            <p className="font-semibold text-[#000052]">{contract?.terms_locked_at ? new Date(contract.terms_locked_at).toLocaleString() : '—'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
