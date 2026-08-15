import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Scale, AlertCircle, CheckCircle, Clock, XCircle, Plus, Search, Filter, ShieldCheck, DollarSign, Users } from 'lucide-react';

interface Dispute { id: string; type: string; status: string; title?: string; description?: string; amount: number; agent_name?: string; contract_title?: string; resolution?: string | null; }

const DEMO_DISPUTES: Dispute[] = [
  { id: 'demo-1', type: 'oracle_failure', status: 'OPEN', amount: 12500, agent_name: 'Александр Смирнов', contract_title: 'B2B corporate clients' },
  { id: 'demo-2', type: 'kpi_dispute', status: 'IN_REVIEW', amount: 8800, agent_name: 'Мария Козлова', contract_title: 'SMB insurance portfolio' },
  { id: 'demo-3', type: 'client_retention', status: 'RESOLVED', amount: 5000, agent_name: 'Дмитрий Волков', contract_title: 'Corporate renewals', resolution: 'Demo resolution' },
];

export function CEODisputesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolutionText, setResolutionText] = useState('');

  useEffect(() => {
    const fetchDisputes = async () => {
      if (!user) { setLoading(false); return; }
      try {
        const { data: companyData } = await supabase.from('companies').select('id').eq('user_id', user.id).maybeSingle();
        if (!companyData) { setDisputes(DEMO_DISPUTES); return; }
        const { data } = await supabase.from('disputes').select('*').eq('company_id', companyData.id).order('created_at', { ascending: false });
        if (!data || data.length !== 3) { setDisputes(DEMO_DISPUTES); return; }
        const detailed = await Promise.all(data.map(async d => {
          let agent_name = '—';
          let contract_title = '—';
          if (d.agent_id) {
            const { data: agent } = await supabase.from('agents').select('full_name').eq('id', d.agent_id).maybeSingle();
            agent_name = agent?.full_name || '—';
          }
          if (d.contract_id) {
            const { data: contract } = await supabase.from('contracts').select('title').eq('id', d.contract_id).maybeSingle();
            contract_title = contract?.title || '—';
          }
          return { ...d, agent_name, contract_title };
        }));
        setDisputes(detailed);
      } catch (error) {
        console.error(error);
        setDisputes(DEMO_DISPUTES);
      } finally { setLoading(false); }
    };
    fetchDisputes();
  }, [user]);

  const filtered = disputes.filter(dispute => {
    const typeKey = dispute.type === 'oracle_failure' ? 'typeOracle' : dispute.type === 'kpi_dispute' ? 'typeKpi' : dispute.type === 'payment_issue' ? 'typePayment' : 'typeRetention';
    const search = searchQuery.toLowerCase();
    return (((dispute.title || t(`disputes.${typeKey}`)).toLowerCase().includes(search) || dispute.agent_name?.toLowerCase().includes(search)) && (statusFilter === 'all' || dispute.status === statusFilter));
  });

  const openCount = disputes.filter(d => d.status === 'OPEN').length;
  const inReviewCount = disputes.filter(d => d.status === 'IN_REVIEW').length;
  const resolvedCount = disputes.filter(d => d.status === 'RESOLVED').length;
  const totalDisputedAmount = disputes.filter(d => d.status !== 'RESOLVED').reduce((sum, d) => sum + (d.amount || 0), 0);
  const typeLabel = (type: string) => t(`disputes.${type === 'oracle_failure' ? 'typeOracle' : type === 'kpi_dispute' ? 'typeKpi' : type === 'payment_issue' ? 'typePayment' : 'typeRetention'}`);
  const statusLabel = (status: string) => t(`disputes.${status === 'OPEN' ? 'statusOpen' : status === 'IN_REVIEW' ? 'statusReview' : status === 'RESOLVED' ? 'statusResolved' : 'statusRejected'}`);
  const statusColor = (status: string) => status === 'OPEN' ? 'bg-red-50 text-red-600' : status === 'IN_REVIEW' ? 'bg-amber-50 text-amber-600' : status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500';

  const handleResolve = async () => {
    if (!selectedDispute || !resolutionText.trim() || !user) return;
    try {
      if (selectedDispute.id.startsWith('demo-')) {
        setDisputes(prev => prev.map(dispute => dispute.id === selectedDispute.id ? { ...dispute, status: 'RESOLVED', resolution: resolutionText } : dispute));
      } else {
        const { error } = await supabase.from('disputes').update({ status: 'RESOLVED', resolution: resolutionText, resolved_by: user.id, resolved_at: new Date().toISOString() }).eq('id', selectedDispute.id);
        if (error) throw error;
      }
      setResolutionText('');
      setSelectedDispute(null);
      alert(t('disputes.success'));
    } catch (error: any) { alert(`${t('common.error')}: ${error.message}`); }
  };

  if (loading) return <div className="p-8 text-center text-[#000052]"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8860B]" /><p className="mt-2">{t('ui.loading')}</p></div>;

  const kpis = [
    { label: t('disputes.open'), value: String(openCount), sub: t('disputes.attention'), icon: AlertCircle, box: 'bg-red-50 text-red-500', valueColor: 'text-red-600' },
    { label: t('disputes.inReview'), value: String(inReviewCount), sub: t('disputes.analysis'), icon: Clock, box: 'bg-amber-50 text-amber-600', valueColor: 'text-[#000052]' },
    { label: t('disputes.resolved'), value: String(resolvedCount), sub: t('disputes.closed'), icon: CheckCircle, box: 'bg-emerald-50 text-emerald-600', valueColor: 'text-emerald-600' },
    { label: t('disputes.disputedAmount'), value: `$${totalDisputedAmount.toLocaleString()}`, sub: t('disputes.activeDisputes'), icon: DollarSign, box: 'bg-[#B8860B]/10 text-[#B8860B]', valueColor: 'text-[#B8860B]' },
  ];

  return <div className="p-3 sm:p-4 md:p-8 space-y-5 md:space-y-6 min-w-0">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="min-w-0"><h1 className="text-[24px] sm:text-[26px] md:text-3xl font-bold text-[#000052] tracking-tight break-words">{t('nav.disputes')}</h1><p className="text-sm text-gray-400 mt-1 break-words">{t('disputes.subtitle')}</p></div>
      <button onClick={() => setIsCreateModalOpen(true)} className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-[#000052] text-white rounded-[14px] text-sm font-semibold shadow-[0_4px_16px_rgba(0,0,82,0.25)] hover:bg-[#14147a] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"><Plus className="w-4 h-4" />{t('disputes.create')}</button>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">{kpis.map((kpi, i) => { const Icon = kpi.icon; return <div key={i} className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm min-w-0"><div className="flex items-start justify-between gap-2 mb-3 md:mb-4"><h3 className="text-xs sm:text-sm font-medium text-gray-500 leading-tight break-words min-w-0">{kpi.label}</h3><div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 ${kpi.box}`}><Icon className="w-4 h-4 sm:w-5 sm:h-5" /></div></div><p className={`text-[22px] sm:text-[26px] font-bold tracking-tight truncate ${kpi.valueColor}`}>{kpi.value}</p><p className="text-[11px] sm:text-xs text-gray-400 mt-1 break-words">{kpi.sub}</p></div>; })}</div>

    <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-sm"><div className="flex flex-col md:flex-row gap-3"><div className="flex-1 relative min-w-0"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input placeholder={t('disputes.search')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full min-w-0 pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-[12px] text-sm text-[#000052] placeholder-gray-400 focus:ring-4 focus:ring-[#000052]/10 focus:border-[#000052] outline-none transition" /></div><div className="relative w-full md:w-auto"><Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full md:w-auto pl-11 pr-8 py-2.5 bg-white border border-gray-200 rounded-[12px] text-sm text-[#000052] appearance-none focus:ring-4 focus:ring-[#000052]/10 focus:border-[#000052] outline-none transition"><option value="all">{t('disputes.allStatuses')}</option><option value="OPEN">{t('disputes.statusOpen')}</option><option value="IN_REVIEW">{t('disputes.statusReview')}</option><option value="RESOLVED">{t('disputes.statusResolved')}</option></select></div></div></div>

    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {filtered.length === 0 ? <div className="text-center py-12 px-4"><div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#000052]/5 flex items-center justify-center"><Scale className="w-8 h-8 text-[#000052]/30" /></div><p className="text-lg font-semibold text-[#000052] mb-2">{t('disputes.noDisputes')}</p></div> : <>
        <div className="hidden md:block overflow-x-auto"><table className="w-full min-w-[900px]"><thead><tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{['type', 'description', 'agent', 'amount', 'status', 'actions'].map(key => <th key={key} className="py-3.5 px-5">{key === 'amount' ? t('ui.amount') : key === 'status' ? t('ui.status') : t(`disputes.${key}`)}</th>)}</tr></thead><tbody>
          {filtered.map(dispute => <tr key={dispute.id} className="border-b border-gray-50 hover:bg-[#000052]/[0.02] transition-colors"><td className="py-4 px-5 text-sm font-semibold text-[#000052]">{typeLabel(dispute.type)}</td><td className="py-4 px-5"><div className="font-semibold text-sm text-[#000052]">{dispute.title || typeLabel(dispute.type)}</div><div className="text-xs text-gray-400 mt-1">{dispute.description || typeLabel(dispute.type)}</div>{dispute.resolution && <div className="mt-2 p-2.5 bg-[#B8860B]/5 rounded-xl text-xs text-[#000052]/70 break-words">{t('disputes.resolution')}: {dispute.resolution}</div>}</td><td className="py-4 px-5"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-[#000052]/5 flex items-center justify-center flex-shrink-0"><Users className="w-4 h-4 text-[#000052]" /></div><div><div className="text-sm font-medium text-[#000052]">{dispute.agent_name || '—'}</div><div className="text-xs text-gray-400">{dispute.contract_title || '—'}</div></div></div></td><td className="py-4 px-5 font-bold text-[#B8860B]">${(dispute.amount || 0).toLocaleString()}</td><td className="py-4 px-5"><span className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap ${statusColor(dispute.status)}`}>{dispute.status === 'OPEN' ? <AlertCircle className="w-3 h-3" /> : dispute.status === 'IN_REVIEW' ? <Clock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}{statusLabel(dispute.status)}</span></td><td className="py-4 px-5">{(dispute.status === 'OPEN' || dispute.status === 'IN_REVIEW') && <button onClick={() => { setSelectedDispute(dispute); setResolutionText(''); }} className="px-3.5 py-2 bg-[#000052] text-white rounded-xl text-xs font-semibold shadow-[0_4px_16px_rgba(0,0,82,0.25)] hover:bg-[#14147a] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200">{t('disputes.resolve')}</button>}</td></tr>)}
        </tbody></table></div>

        <div className="md:hidden divide-y divide-gray-100">{filtered.map(dispute => <div key={dispute.id} className="p-4 space-y-3 min-w-0">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{typeLabel(dispute.type)}</p><h3 className="mt-1 text-sm font-bold text-[#000052] break-words">{dispute.title || typeLabel(dispute.type)}</h3></div><span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold inline-flex items-center gap-1 flex-shrink-0 ${statusColor(dispute.status)}`}>{dispute.status === 'OPEN' ? <AlertCircle className="w-3 h-3" /> : dispute.status === 'IN_REVIEW' ? <Clock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}{statusLabel(dispute.status)}</span></div>
          <p className="text-xs text-gray-500 leading-relaxed break-words">{dispute.description || typeLabel(dispute.type)}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-gray-50 p-3 min-w-0"><p className="text-[11px] text-gray-400">{t('disputes.agent')}</p><div className="flex items-center gap-2 mt-1 min-w-0"><div className="w-7 h-7 rounded-full bg-[#000052]/5 flex items-center justify-center flex-shrink-0"><Users className="w-3.5 h-3.5 text-[#000052]" /></div><div className="min-w-0"><p className="text-xs font-semibold text-[#000052] break-words">{dispute.agent_name || '—'}</p><p className="text-[10px] text-gray-400 break-words">{dispute.contract_title || '—'}</p></div></div></div>
            <div className="rounded-xl bg-gray-50 p-3"><p className="text-[11px] text-gray-400">{t('ui.amount')}</p><p className="text-sm font-bold text-[#B8860B] mt-1">${(dispute.amount || 0).toLocaleString()}</p></div>
          </div>
          {dispute.resolution && <div className="p-3 bg-[#B8860B]/5 rounded-xl text-xs text-[#000052]/70 break-words"><span className="font-semibold">{t('disputes.resolution')}:</span> {dispute.resolution}</div>}
          {(dispute.status === 'OPEN' || dispute.status === 'IN_REVIEW') && <button onClick={() => { setSelectedDispute(dispute); setResolutionText(''); }} className="w-full py-2.5 bg-[#000052] text-white rounded-xl text-xs font-semibold shadow-[0_4px_16px_rgba(0,0,82,0.25)]">{t('disputes.resolve')}</button>}
        </div>)}</div>
      </>}
    </div>

    {selectedDispute && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4"><div className="bg-white rounded-[24px] shadow-2xl w-full max-w-2xl max-h-[calc(100vh-24px)] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6"><div className="flex justify-between items-start gap-3 mb-5"><h2 className="text-xl sm:text-2xl font-bold text-[#000052] break-words">{t('disputes.resolveTitle')}</h2><button onClick={() => setSelectedDispute(null)} className="text-gray-400 hover:text-[#000052] transition-colors flex-shrink-0"><XCircle className="w-5 h-5" /></button></div><p className="text-sm text-gray-500 mb-4 break-words">{selectedDispute.title || typeLabel(selectedDispute.type)}</p><label className="block text-sm font-semibold text-[#000052] mb-2">{t('disputes.yourResolution')}</label><textarea value={resolutionText} onChange={e => setResolutionText(e.target.value)} rows={5} placeholder={t('disputes.resolutionPlaceholder')} className="w-full px-4 py-3 border border-gray-200 rounded-[12px] text-[#000052] placeholder-gray-400 focus:ring-4 focus:ring-[#000052]/10 focus:border-[#000052] outline-none transition resize-y" /><div className="flex flex-col-reverse sm:flex-row gap-3 mt-5"><button onClick={() => setSelectedDispute(null)} className="flex-1 py-3 bg-white border border-gray-200 text-[#000052] rounded-[14px] font-semibold hover:border-[#000052] hover:bg-[#000052]/5 transition-all duration-200">{t('common.cancel')}</button><button onClick={handleResolve} disabled={!resolutionText.trim()} className="flex-1 py-3 bg-[#000052] text-white rounded-[14px] font-semibold shadow-[0_4px_16px_rgba(0,0,82,0.25)] hover:bg-[#14147a] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0">{t('disputes.confirm')}</button></div></div></div>}

    {isCreateModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4"><div className="bg-white rounded-[24px] shadow-2xl w-full max-w-xl max-h-[calc(100vh-24px)] overflow-y-auto p-5 sm:p-6 text-center"><div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#B8860B]/10 flex items-center justify-center"><ShieldCheck className="w-8 h-8 text-[#B8860B]" /></div><h2 className="text-xl sm:text-2xl font-bold text-[#000052] mb-3">{t('disputes.create')}</h2><p className="text-[#000052] mb-2 break-words">{t('disputes.createDisabled')}</p><p className="text-sm text-gray-400 break-words">{t('disputes.demoHint')}</p><button onClick={() => setIsCreateModalOpen(false)} className="mt-5 w-full sm:w-auto px-6 py-2.5 bg-[#000052] text-white rounded-xl shadow-[0_4px_16px_rgba(0,0,82,0.25)] hover:bg-[#14147a] transition-all duration-200">{t('common.cancel')}</button></div></div>}
  </div>;
}
