import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle, XCircle, Copy, RefreshCw, AlertCircle, Globe } from 'lucide-react';

interface WebhookLog {
  id: string;
  deal_id: string;
  stage_id: string;
  title: string;
  payload: any;
  created_at: string;
}

export function CEOIntegrationsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [contractsCount, setContractsCount] = useState(0);
  const [linkedContractsCount, setLinkedContractsCount] = useState(0);
  const [copied, setCopied] = useState(false);

  const webhookUrl = 'https://utsuzqmzawunqpiguuhk.supabase.co/functions/v1/bitrix-webhook';

  useEffect(() => {
    const fetchData = async () => {
      if (!user) { setLoading(false); return; }
      try {
        const { data: companyData } = await supabase.from('companies').select('id').eq('user_id', user.id).maybeSingle();
        if (companyData) {
          const { count: totalContracts } = await supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('company_id', companyData.id);
          const { count: linkedContracts } = await supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('company_id', companyData.id).not('bitrix_deal_id', 'is', null);
          setContractsCount(totalContracts || 0);
          setLinkedContractsCount(linkedContracts || 0);
        }
        const { data: logsData } = await supabase.from('bitrix_webhooks_log').select('*').order('created_at', { ascending: false }).limit(10);
        setLogs(logsData || []);
      } catch (err) {
        console.error('Ошибка:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="p-8 text-center text-[#000052]"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8860B]"></div><p className="mt-2">{t('common.loading')}</p></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#000052]">{t('integrations.title')}</h1>
          <p className="text-gray-600 mt-1">{t('integrations.subtitle')}</p>
        </div>
        <button onClick={() => window.location.reload()} className="flex items-center gap-2 px-4 py-2 bg-[#000052]/5 hover:bg-[#000052]/10 text-[#000052] rounded-lg transition">
          <RefreshCw className="w-4 h-4" />
          {t('integrations.refresh')}
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-[#000052]/10">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#000052]/5 rounded-xl flex items-center justify-center">
              <Globe className="w-8 h-8 text-[#000052]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#000052]">{t('integrations.bitrixTitle')}</h2>
              <p className="text-gray-600">{t('integrations.bitrixDescription')}</p>
              <div className="flex items-center gap-2 mt-2">
                <CheckCircle className="w-5 h-5 text-[#B8860B]" />
                <span className="text-sm font-semibold text-[#B8860B]">{t('integrations.edgeFunctionDeployed')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#000052]/5 p-4 rounded-lg border border-[#000052]/10">
            <p className="text-xs text-[#000052]/60 mb-1">{t('integrations.totalContracts')}</p>
            <p className="text-2xl font-bold text-[#000052]">{contractsCount}</p>
          </div>
          <div className="bg-[#B8860B]/10 p-4 rounded-lg border border-[#B8860B]/20">
            <p className="text-xs text-[#B8860B]/70 mb-1">{t('integrations.linkedToBitrix')}</p>
            <p className="text-2xl font-bold text-[#B8860B]">{linkedContractsCount}</p>
          </div>
          <div className="bg-[#000052]/5 p-4 rounded-lg border border-[#000052]/10">
            <p className="text-xs text-[#000052]/60 mb-1">{t('integrations.receivedWebhooks')}</p>
            <p className="text-2xl font-bold text-[#000052]">{logs.length}</p>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-[#000052] mb-2">{t('integrations.webhookUrl')}</label>
          <div className="flex items-center gap-2">
            <input type="text" value={webhookUrl} readOnly className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#000052] font-mono" />
            <button onClick={handleCopyUrl} className="flex items-center gap-2 px-4 py-2.5 bg-[#B8860B] hover:bg-[#9a7209] text-white rounded-lg transition">
              <Copy className="w-4 h-4" />
              {copied ? t('integrations.copied') : t('integrations.copy')}
            </button>
          </div>
        </div>

        <div className="bg-[#000052]/5 border border-[#000052]/10 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-[#000052] mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-[#B8860B]" />
            {t('integrations.howToSetup')}
          </h3>
          <ol className="space-y-2 text-sm text-[#000052]/80">
            <li>1. {t('integrations.step1')}</li>
            <li>2. {t('integrations.step2')}: <code className="bg-white px-2 py-0.5 rounded border border-gray-200">InCORE KPI Sync</code></li>
            <li>3. {t('integrations.step3')}</li>
            <li>4. {t('integrations.step4')}</li>
            <li>5. {t('integrations.step5')}</li>
          </ol>
        </div>

        <div className="bg-[#B8860B]/5 border border-[#B8860B]/10 rounded-lg p-4">
          <h3 className="font-semibold text-[#000052] mb-3">{t('integrations.howKpiWork')}</h3>
          <div className="space-y-2 text-sm text-[#000052]/80">
            <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-[#B8860B]"></div><span>{t('integrations.kpiCall')}</span></div>
            <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-[#000052]"></div><span>{t('integrations.kpiMeeting')}</span></div>
            <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-[#B8860B]"></div><span>{t('integrations.kpiWon')}</span></div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-[#000052]/10">
        <h2 className="text-xl font-bold text-[#000052] mb-4">{t('integrations.recentWebhooks')}</h2>
        {logs.length === 0 ? (
          <div className="text-center py-12 text-[#000052]/60">
            <XCircle className="w-16 h-16 mx-auto mb-4 text-[#000052]/20" />
            <p className="text-lg font-medium mb-2">{t('integrations.noWebhooks')}</p>
            <p className="text-sm">{t('integrations.noWebhooksHint')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="p-4 bg-[#000052]/5 rounded-lg border border-[#000052]/10">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-[#000052]">{t('integrations.deal')} #{log.deal_id}</p>
                    <p className="text-sm text-[#000052]/70">{log.title || t('integrations.noTitle')}</p>
                  </div>
                  <p className="text-xs text-[#000052]/50">{new Date(log.created_at).toLocaleString('ru-RU')}</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 bg-[#B8860B]/10 text-[#B8860B] rounded">{t('integrations.stage')}: {log.stage_id}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}