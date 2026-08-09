import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Scale, AlertCircle, CheckCircle, Clock, XCircle, Plus, Search, Filter, ShieldCheck, DollarSign, Users } from 'lucide-react';

const DEMO_DISPUTES: Dispute[] = [
  { id: 'demo-1', type: 'oracle_failure', status: 'OPEN', amount: 12500, agent_name: 'Александр Смирнов', contract_title: 'B2B corporate clients' },
  { id: 'demo-2', type: 'kpi_dispute', status: 'IN_REVIEW', amount: 8800, agent_name: 'Мария Козлова', contract_title: 'SMB insurance portfolio' },
  { id: 'demo-3', type: 'client_retention', status: 'RESOLVED', amount: 5000, agent_name: 'Дмитрий Волков', contract_title: 'Corporate renewals', resolution: 'Demo resolution' },
];

interface Dispute {
  id: string;
  type: string;
  status: string;
  title?: string;
  description?: string;
  amount: number;
  agent_name?: string;
  contract_title?: string;
  resolution?: string | null;
}

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
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [manualPayoutReference, setManualPayoutReference] = useState('');
  const [manualPayoutAmount, setManualPayoutAmount] = useState('');
  const [manualPayoutDescription, setManualPayoutDescription] = useState('');

  const loadDisputes = async () => {
    if (!user) return;
    try {
      const { data: companyData } = await supabase.from('companies').select('id').eq('user_id', user.id).maybeSingle();
      if (!companyData) {
        setDisputes(DEMO_DISPUTES);
        return;
      }
      setCompanyId(companyData.id);
      const { data } = await supabase.from('disputes').select('*').eq('company_id', companyData.id).order('created_at', { ascending: false });
      if (!data?.length || !data[0].title) {
        setDisputes(DEMO_DISPUTES);
        return;
      }
      const detailed = await Promise.all(data.map(async d => {
        let agent_name = '—';
        let contract_title = '—';
        if (d.agent_id) {
          const { data: a } = await supabase.from('agents').select('full_name').eq('id', d.agent_id).maybeSingle();
          agent_name = a?.full_name || '—';
        }
        if (d.contract_id) {
          const { data: c } = await supabase.from('contracts').select('title').eq('id', d.contract_id).maybeSingle();
          contract_title = c?.title || '—';
        }
        return { ...d, agent_name, contract_title };
      }));
      setDisputes(detailed);
    } catch (err) {
      console.error(err);
      setDisputes(DEMO_DISPUTES);
    }
  };

  useEffect(() => {
    const fetchDisputes = async () => {
      if (!user) { setLoading(false); return; }
      await loadDisputes();
      setLoading(false);
    };
    fetchDisputes();
  }, [user]);

  const filtered = disputes.filter(d =>
    ((d.title || t(`disputes.type${d.type === 'oracle_failure' ? 'Oracle' : d.type === 'kpi_dispute' ? 'Kpi' : d.type === 'payment_issue' ? 'Payment' : 'Retention'}`)).toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.agent_name?.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (statusFilter === 'all' || d.status === statusFilter)
  );

  const openCount = disputes.filter(d => d.status === 'OPEN').length;
  const inReviewCount = disputes.filter(d => d.status === 'IN_REVIEW').length;
  const resolvedCount = disputes.filter(d => d.status === 'RESOLVED').length;
  const totalDisputedAmount = disputes.filter(d => d.status !== 'RESOLVED').reduce((sum, d) => sum + (d.amount || 0), 0);
  const typeLabel = (type: string) => t(`disputes.${type === 'oracle_failure' ? 'typeOracle' : type === 'kpi_dispute' ? 'typeKpi' : type === 'payment_issue' ? 'typePayment' : 'typeRetention'}`);
  const statusLabel = (status: string) => t(`disputes.${status === 'OPEN' ? 'statusOpen' : status === 'IN_REVIEW' ? 'statusReview' : status === 'RESOLVED' ? 'statusResolved' : 'statusRejected'}`);

  const resetCreateForm = () => {
    setManualPayoutReference('');
    setManualPayoutAmount('');
    setManualPayoutDescription('');
  };

  const handleCreateManualPayoutDispute = async () => {
    if (!user || !companyId || !manualPayoutReference.trim() || !manualPayoutAmount.trim() || !manualPayoutDescription.trim()) return;
    const amount = Number(manualPayoutAmount.replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) return;
    setCreating(true);
    try {
      const title = `${t('disputes.typePayment')} #${manualPayoutReference.trim()}`;
      const description = `${manualPayoutDescription.trim()}\n\n${t('ui.reference')}: ${manualPayoutReference.trim()}`;
      const { data, error } = await supabase.from('disputes').insert({
        company_id: companyId,
        type: 'payment_issue',
        status: 'OPEN',
        amount,
        title,
        description,
      }).select('*').single();
      if (error) throw error;
      setDisputes(prev => [{ ...data, agent_name: '—', contract_title: '—' }, ...prev]);
      resetCreateForm();
      setIsCreateModalOpen(false);
      alert(t('disputes.success'));
    } catch (err: any) {
      alert(`${t('common.error')}: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedDispute || !resolutionText.trim() || !user) return;
    try {
      if (selectedDispute.id.startsWith('demo-')) {
        setDisputes(prev => prev.map(d => d.id === selectedDispute.id ? { ...d, status: 'RESOLVED', resolution: resolutionText } : d));
      } else {
        const { error } = await supabase.from('disputes').update({ status: 'RESOLVED', resolution: resolutionText, resolved_by: user.id, resolved_at: new Date().toISOString() }).eq('id', selectedDispute.id);
        if (error) throw error;
      }
      setResolutionText('');
      setSelectedDispute(null);
      alert(t('disputes.success'));
    } catch (err: any) {
      alert(`${t('common.error')}: ${err.message}`);
    }
  };

  if (loading) return <div className="p-8 text-center text-[#000052]"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8860B]" /><p className="mt-2">{t('ui.loading')}</p></div>;

  return <div className="p-4 md:p-6 space-y-6">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div><h1 className="text-2xl md:text-3xl font-bold text-[#000052]">{t('nav.disputes')}</h1><p className="text-sm text-[#000052]/70 mt-1">{t('disputes.subtitle')}</p></div>
      <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-[#B8860B] text-white rounded-lg text-sm font-semibold"><Plus className="w-4 h-4" />{t('disputes.create')}</button>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-[#B8860B] text-white p-5 rounded-xl"><div className="flex justify-between mb-3"><span className="text-sm opacity-80">{t('disputes.open')}</span><AlertCircle className="w-5 h-5" /></div><p className="text-2xl font-bold">{openCount}</p><p className="text-xs opacity-70 mt-1">{t('disputes.attention')}</p></div>
      <div className="bg-[#000052] text-white p-5 rounded-xl"><div className="flex justify-between mb-3"><span className="text-sm opacity-80">{t('disputes.inReview')}</span><Clock className="w-5 h-5" /></div><p className="text-2xl font-bold">{inReviewCount}</p><p className="text-xs opacity-70 mt-1">{t('disputes.analysis')}</p></div>
      <div className="bg-white p-5 rounded-xl border border-[#000052]/10"><div className="flex justify-between mb-3"><span className="text-sm text-[#000052]/70">{t('disputes.resolved')}</span><CheckCircle className="w-5 h-5 text-[#B8860B]" /></div><p className="text-2xl font-bold">{resolvedCount}</p><p className="text-xs text-[#000052]/60 mt-1">{t('disputes.closed')}</p></div>
      <div className="bg-white p-5 rounded-xl border border-[#000052]/10"><div className="flex justify-between mb-3"><span className="text-sm text-[#000052]/70">{t('disputes.disputedAmount')}</span><DollarSign className="w-5 h-5 text-[#B8860B]" /></div><p className="text-2xl font-bold">${totalDisputedAmount.toLocaleString()}</p><p className="text-xs text-[#000052]/60 mt-1">{t('disputes.activeDisputes')}</p></div>
    </div>

    <div className="bg-white p-4 rounded-xl border border-[#000052]/10"><div className="flex flex-col md:flex-row gap-3"><div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#000052]/40" /><input placeholder={t('disputes.search')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-[#000052]/5 border border-[#000052]/10 rounded-lg text-sm" /></div><div className="relative"><Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" /><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="pl-10 pr-8 py-2 bg-[#000052]/5 border rounded-lg text-sm"><option value="all">{t('disputes.allStatuses')}</option><option value="OPEN">{t('disputes.statusOpen')}</option><option value="IN_REVIEW">{t('disputes.statusReview')}</option><option value="RESOLVED">{t('disputes.statusResolved')}</option></select></div></div></div>

    <div className="bg-white rounded-xl border border-[#000052]/10 overflow-hidden">{filtered.length === 0 ? <div className="text-center py-12 text-[#000052]/60"><Scale className="w-16 h-16 mx-auto mb-4 text-[#000052]/20" /><p className="text-lg font-medium mb-2">{t('disputes.noDisputes')}</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[900px]"><thead className="bg-[#000052]/5"><tr>{['type','description','agent','amount','status','actions'].map(k => <th key={k} className="text-left py-3 px-4 text-xs font-bold uppercase">{k === 'amount' ? t('ui.amount') : k === 'status' ? t('ui.status') : t(`disputes.${k}`)}</th>)}</tr></thead><tbody>{filtered.map(d => <tr key={d.id} className="border-b hover:bg-[#000052]/5"><td className="py-4 px-4">{typeLabel(d.type)}</td><td className="py-4 px-4"><div className="font-semibold text-sm">{d.title || typeLabel(d.type)}</div><div className="text-xs text-[#000052]/60 mt-1">{d.description || typeLabel(d.type)}</div>{d.resolution && <div className="mt-2 p-2 bg-[#B8860B]/5 rounded text-xs">{t('disputes.resolution')}: {d.resolution}</div>}</td><td className="py-4 px-4"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-[#B8860B]/10 flex items-center justify-center"><Users className="w-4 h-4 text-[#B8860B]" /></div><div><div className="text-sm font-medium">{d.agent_name || '—'}</div><div className="text-xs text-[#000052]/60">{d.contract_title || '—'}</div></div></div></td><td className="py-4 px-4 font-bold text-[#B8860B]">${(d.amount || 0).toLocaleString()}</td><td className="py-4 px-4"><span className="px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1">{d.status === 'OPEN' ? <AlertCircle className="w-3 h-3" /> : d.status === 'IN_REVIEW' ? <Clock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}{statusLabel(d.status)}</span></td><td className="py-4 px-4">{(d.status === 'OPEN' || d.status === 'IN_REVIEW') && <button onClick={() => { setSelectedDispute(d); setResolutionText(''); }} className="px-3 py-1.5 bg-[#000052] text-white rounded-lg text-xs font-semibold">{t('disputes.resolve')}</button>}</td></tr>)}</tbody></table></div>}</div>

    {selectedDispute && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6"><div className="flex justify-between items-center mb-5"><h2 className="text-2xl font-bold text-[#000052]">{t('disputes.resolveTitle')}</h2><button onClick={() => setSelectedDispute(null)}><XCircle className="w-5 h-5" /></button></div><p className="text-sm text-[#000052]/70 mb-4">{selectedDispute.title || typeLabel(selectedDispute.type)}</p><label className="block text-sm font-semibold mb-2">{t('disputes.yourResolution')}</label><textarea value={resolutionText} onChange={e => setResolutionText(e.target.value)} rows={5} placeholder={t('disputes.resolutionPlaceholder')} className="w-full px-4 py-3 border rounded-lg" /><div className="flex gap-3 mt-5"><button onClick={() => setSelectedDispute(null)} className="flex-1 py-3 bg-[#000052]/5 rounded-lg font-semibold">{t('common.cancel')}</button><button onClick={handleResolve} disabled={!resolutionText.trim()} className="flex-1 py-3 bg-[#B8860B] text-white rounded-lg font-semibold disabled:opacity-50">{t('disputes.confirm')}</button></div></div></div>}

    {isCreateModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6">
      <div className="flex justify-between items-center mb-5"><div><h2 className="text-2xl font-bold text-[#000052]">{t('disputes.create')}</h2><p className="text-sm text-[#000052]/60 mt-1">{t('disputes.typePayment')}</p></div><button onClick={() => { setIsCreateModalOpen(false); resetCreateForm(); }}><XCircle className="w-5 h-5" /></button></div>
      <div className="space-y-4">
        <div><label className="block text-sm font-semibold mb-2">{t('ui.reference')}</label><input value={manualPayoutReference} onChange={e => setManualPayoutReference(e.target.value)} placeholder="Payout ID / reference" className="w-full px-4 py-3 border rounded-lg" /></div>
        <div><label className="block text-sm font-semibold mb-2">{t('ui.amount')}</label><input value={manualPayoutAmount} onChange={e => setManualPayoutAmount(e.target.value)} inputMode="decimal" placeholder="0.00" className="w-full px-4 py-3 border rounded-lg" /></div>
        <div><label className="block text-sm font-semibold mb-2">{t('disputes.description')}</label><textarea value={manualPayoutDescription} onChange={e => setManualPayoutDescription(e.target.value)} rows={5} placeholder={t('disputes.resolutionPlaceholder')} className="w-full px-4 py-3 border rounded-lg" /></div>
      </div>
      <div className="flex gap-3 mt-5"><button onClick={() => { setIsCreateModalOpen(false); resetCreateForm(); }} className="flex-1 py-3 bg-[#000052]/5 rounded-lg font-semibold">{t('common.cancel')}</button><button onClick={handleCreateManualPayoutDispute} disabled={creating || !manualPayoutReference.trim() || !manualPayoutAmount.trim() || !manualPayoutDescription.trim()} className="flex-1 py-3 bg-[#B8860B] text-white rounded-lg font-semibold disabled:opacity-50">{creating ? '...' : t('disputes.confirm')}</button></div>
    </div></div>}
  </div>;
}
