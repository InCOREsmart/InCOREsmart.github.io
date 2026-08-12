import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Search, Filter, DollarSign, Users, ShieldCheck, FileText } from 'lucide-react';
import { CreateContractModal } from '../../components/ui/CreateContractModal';
import { DEMO_AGENTS } from '../../lib/demoData';
import { COMPLETED_DEMO_CONTRACTS } from '../../lib/demoCompletedContracts';
import { getActualContractRevenue } from '../../lib/contractFinance';
import { getLockedAmount, getPaidAmount } from '../../lib/annualBonus';

const isActiveContract = (contract: any) => contract.status === 'ACTIVE' || contract.status === 'IN_PROGRESS';

const getCurrentLockedAmount = (contract: any): number => {
  if (contract.status === 'COMPLETED') return 0;
  if (Array.isArray(contract.payout_streams)) return getLockedAmount(contract.payout_streams);
  if (Number.isFinite(Number(contract.total_locked))) return Number(contract.total_locked);
  return Number(contract.escrow_amount || 0);
};

const getCurrentPaidAmount = (contract: any): number => {
  if (Array.isArray(contract.payout_streams)) {
    const paidFromStreams = getPaidAmount(contract.payout_streams);
    if (paidFromStreams > 0) return paidFromStreams;
  }
  if (Number.isFinite(Number(contract.total_paid)) && Number(contract.total_paid) > 0) return Number(contract.total_paid);
  if (contract.status === 'COMPLETED') return Number(contract.agent_payouts_total || contract.escrow_amount || 0);
  return 0;
};

export function CEOContractsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleIdFromUrl = searchParams.get('roleId') || '';
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(Boolean(roleIdFromUrl));
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchContracts = async () => {
      if (!user) { setLoading(false); return; }
      try {
        const demoContracts = [
          ...DEMO_AGENTS.flatMap(agent => agent.contracts.map(contract => ({ ...contract, agent_name: agent.full_name, agent_id: agent.id, is_demo: true }))),
          ...COMPLETED_DEMO_CONTRACTS.map(contract => {
            const agentId = contract.id.split('-').slice(2, 4).join('-');
            return { ...contract, agent_name: DEMO_AGENTS.find(agent => agent.id === agentId)?.full_name || null, agent_id: agentId, is_demo: true };
          }),
        ];
        const demoNames = new Set(DEMO_AGENTS.map(agent => agent.full_name.trim().toLowerCase()));
        const { data: companyData } = await supabase.from('companies').select('id').eq('user_id', user.id).maybeSingle();
        let realContracts: any[] = [];
        if (companyData) {
          const { data } = await supabase.from('contracts').select('*').eq('company_id', companyData.id).order('created_at', { ascending: false });
          const rawContracts = data || [];
          const { data: agentsData } = await supabase.from('agents').select('id, full_name').eq('company_id', companyData.id);
          const agentsMap = new Map((agentsData || []).map(a => [a.id, (a.full_name || '').trim().toLowerCase()]));
          const displayAgents = new Map((agentsData || []).map(a => [a.id, a.full_name]));
          realContracts = rawContracts
            .filter(contract => !demoNames.has(agentsMap.get(contract.agent_id) || ''))
            .map(c => ({ ...c, agent_name: displayAgents.get(c.agent_id) || null, is_demo: false }));
        }
        setContracts([...demoContracts, ...realContracts]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchContracts();
  }, [user]);

  const filteredContracts = contracts.filter(c => {
    const q = searchQuery.toLowerCase();
    const matchesQuery = (c.title || '').toLowerCase().includes(q) || (c.agent_name || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all'
      || (statusFilter === 'ACTIVE' && isActiveContract(c))
      || c.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const totalGMV = contracts.reduce((sum, c) => sum + getActualContractRevenue(c), 0);
  const totalEscrow = contracts.reduce((sum, c) => sum + getCurrentLockedAmount(c), 0);
  const activeCount = contracts.filter(isActiveContract).length;
  const locale = i18n.language === 'ru' ? 'ru-RU' : i18n.language === 'az' ? 'az-AZ' : i18n.language === 'kk' || i18n.language === 'kz' ? 'kk-KZ' : 'en-US';
  const formatDate = (value: string | null) => value ? new Date(value).toLocaleDateString(locale) : '—';
  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      ACTIVE: { bg: 'bg-[#000052]/5', text: 'text-[#000052]', label: t('contract.statuses.IN_PROGRESS') },
      IN_PROGRESS: { bg: 'bg-[#000052]/5', text: 'text-[#000052]', label: t('contract.statuses.IN_PROGRESS') },
      PENDING_APPROVAL: { bg: 'bg-[#B8860B]/10', text: 'text-[#B8860B]', label: t('contract.statuses.PENDING_APPROVAL') },
      COMPLETED: { bg: 'bg-emerald-50', text: 'text-emerald-600', label: t('contract.statuses.COMPLETED') },
      DRAFT: { bg: 'bg-gray-100', text: 'text-gray-500', label: t('contract.statuses.DRAFT') },
      DISPUTED: { bg: 'bg-red-50', text: 'text-red-600', label: t('contract.statuses.DISPUTED') },
      PENDING_PAYMENT: { bg: 'bg-amber-50', text: 'text-amber-600', label: t('contract.statuses.PENDING_PAYMENT') },
    };
    const badge = badges[status] || badges.DRAFT;
    return <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${badge.bg} ${badge.text}`}>{badge.label}</span>;
  };

  if (loading) return <div className="p-8 text-center text-[#000052]"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8860B]" /><p className="mt-2">{t('common.loading')}</p></div>;

  const kpis = [
    { label: t('ui.totalGMV'), value: `$${totalGMV.toLocaleString()}`, sub: `${contracts.length} ${t('layout.contracts').toLowerCase()}`, icon: DollarSign, box: 'bg-[#B8860B]/10 text-[#B8860B]', valueColor: totalGMV > 0 ? 'text-[#000052]' : 'text-[#64748B]' },
    { label: t('ui.escrowFrozen'), value: `$${totalEscrow.toLocaleString()}`, sub: t('ui.riskProtection'), icon: ShieldCheck, box: 'bg-[#B8860B]/10 text-[#B8860B]', valueColor: totalEscrow > 0 ? 'text-[#B8860B]' : 'text-[#64748B]' },
    { label: t('ui.activeContracts'), value: String(activeCount), sub: t('ui.activeContractsWork'), icon: Users, box: 'bg-[#000052]/5 text-[#000052]', valueColor: activeCount > 0 ? 'text-[#000052]' : 'text-[#64748B]' },
  ];

  return <div className="p-4 md:p-8 space-y-6">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div><h1 className="text-[26px] md:text-3xl font-bold text-[#000052] tracking-tight">{t('contract.title')}</h1><p className="text-sm text-gray-400 mt-1">{t('contract.subtitle', { defaultValue: t('layout.contracts') })}</p></div>
      <div className="flex gap-2">
        <button onClick={() => navigate('/ceo/roles/decompose')} className="flex items-center gap-2 px-5 py-3 bg-white border border-[#000052]/15 text-[#000052] rounded-[14px] text-sm font-semibold hover:bg-[#000052]/5 transition"><span>AI</span> Декомпозиция роли</button>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-5 py-3 bg-[#000052] text-white rounded-[14px] text-sm font-semibold shadow-[0_4px_16px_rgba(0,0,82,0.25)] hover:bg-[#14147a] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"><Plus className="w-4 h-4" />{t('contract.createNew')}</button>
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">{kpis.map((kpi, i) => { const Icon = kpi.icon; return <div key={i} className="bg-white p-5 rounded-2xl shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,82,0.12)]"><div className="flex items-start justify-between mb-4"><h3 className="text-sm font-medium text-gray-500 leading-tight">{kpi.label}</h3><div className={`w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 ${kpi.box}`}><Icon className="w-5 h-5" /></div></div><p className={`text-[26px] font-bold tracking-tight ${kpi.valueColor}`}>{kpi.value}</p><p className="text-xs text-gray-400 mt-1">{kpi.sub}</p></div>; })}</div>

    <div className="bg-white p-4 rounded-2xl shadow-sm"><div className="flex flex-col md:flex-row gap-3"><div className="flex-1 relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" placeholder={t('ui.searchContracts')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-[12px] text-sm text-[#000052] placeholder-gray-400 focus:ring-4 focus:ring-[#000052]/10 focus:border-[#000052] outline-none transition" /></div><div className="relative"><Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="pl-11 pr-8 py-2.5 bg-white border border-gray-200 rounded-[12px] text-sm text-[#000052] appearance-none focus:ring-4 focus:ring-[#000052]/10 focus:border-[#000052] outline-none transition"><option value="all">{t('ui.allStatuses')}</option><option value="ACTIVE">{t('contract.statuses.IN_PROGRESS')}</option>{['PENDING_APPROVAL', 'COMPLETED', 'DRAFT'].map(status => <option key={status} value={status}>{t(`contract.statuses.${status}`)}</option>)}</select></div></div></div>

    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">{filteredContracts.length === 0 ? <div className="text-center py-12"><div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#000052]/5 flex items-center justify-center"><FileText className="w-8 h-8 text-[#000052]/30" /></div><p className="text-lg font-semibold text-[#000052] mb-2">{t('contract.noContracts')}</p><p className="text-sm text-gray-400">{t('contract.createFirst')}</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[800px]"><thead><tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{['contractName', 'agent', 'gmv', 'escrow', 'deadline', 'status'].map(key => <th key={key} className={`py-3.5 px-5 ${key === 'gmv' || key === 'escrow' ? 'text-right' : ''}`}>{key === 'escrow' ? t('ui.escrow') : key === 'deadline' ? t('ui.deadline') : key === 'status' ? t('ui.status') : t(`ui.${key}`)}</th>)}</tr></thead><tbody className="divide-y divide-gray-50">{filteredContracts.map(contract => { const currentLocked = getCurrentLockedAmount(contract); const currentPaid = getCurrentPaidAmount(contract); const completed = contract.status === 'COMPLETED'; return <tr key={contract.id} onClick={() => navigate(`/ceo/contracts/${contract.id}`)} className="hover:bg-[#000052]/[0.02] cursor-pointer transition-colors"><td className="py-4 px-5"><div className="font-semibold text-[#000052] text-sm">{contract.title}</div><div className="text-xs text-gray-500 mt-1">{t('ui.created')}: {formatDate(contract.start_date || contract.created_at)}</div></td><td className="py-4 px-5"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-[#000052]/5 flex items-center justify-center flex-shrink-0"><Users className="w-4 h-4 text-[#000052]" /></div><span className="text-sm text-[#000052]">{contract.agent_name || t('ui.notAssigned')}</span></div></td><td className="py-4 px-5 text-right"><div className={`text-sm font-bold tabular-nums ${getActualContractRevenue(contract) > 0 ? 'text-[#000052]' : 'text-[#64748B]'}`}>${getActualContractRevenue(contract).toLocaleString()}</div></td><td className="py-4 px-5 text-right"><div className={`text-sm font-bold tabular-nums ${completed ? 'text-emerald-600' : currentLocked > 0 ? 'text-[#B8860B]' : 'text-[#64748B]'}`}>${completed ? currentPaid.toLocaleString() : currentLocked.toLocaleString()}</div><div className="text-xs text-gray-500">{completed ? 'Выплачено' : currentLocked > 0 ? t('ui.locked') : 'Нет замороженных средств'}</div></td><td className="py-4 px-5"><div className="text-sm text-gray-500">{formatDate(contract.deadline)}</div></td><td className="py-4 px-5">{getStatusBadge(contract.status)}</td></tr>; })}</tbody></table></div>}</div>

    <CreateContractModal isOpen={isModalOpen} initialRoleId={roleIdFromUrl} onClose={() => { setIsModalOpen(false); if (roleIdFromUrl) navigate('/ceo/contracts', { replace: true }); }} onCreated={() => window.location.reload()} />
  </div>;
}
