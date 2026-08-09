import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Search, Filter, DollarSign, Users, ShieldCheck, FileText } from 'lucide-react';
import { CreateContractModal } from '../../components/ui/CreateContractModal';
import { DEMO_AGENTS } from '../../lib/demoData';

const isActiveContract = (contract: any) => contract.status === 'ACTIVE' || contract.status === 'IN_PROGRESS';

export function CEOContractsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchContracts = async () => {
      if (!user) { setLoading(false); return; }
      try {
        const demoContracts = DEMO_AGENTS.flatMap(agent => agent.contracts.map(contract => ({ ...contract, agent_name: agent.full_name, agent_id: agent.id, is_demo: true })));
        const { data: companyData } = await supabase.from('companies').select('id').eq('user_id', user.id).maybeSingle();
        let realContracts: any[] = [];
        if (companyData) {
          const { data } = await supabase.from('contracts').select('*').eq('company_id', companyData.id).order('created_at', { ascending: false });
          realContracts = data || [];
          const agentIds = [...new Set(realContracts.map(c => c.agent_id).filter(Boolean))];
          if (agentIds.length) {
            const { data: agentsData } = await supabase.from('agents').select('id, full_name').in('id', agentIds);
            const agentsMap = new Map((agentsData || []).map(a => [a.id, a.full_name]));
            realContracts = realContracts.map(c => ({ ...c, agent_name: agentsMap.get(c.agent_id) || null, is_demo: false }));
          }
        }
        const byId = new Map<string, any>();
        [...demoContracts, ...realContracts].forEach(contract => byId.set(contract.id, contract));
        setContracts(Array.from(byId.values()));
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchContracts();
  }, [user]);

  const filteredContracts = contracts.filter(c => {
    const q = searchQuery.toLowerCase();
    return (c.title || '').toLowerCase().includes(q) && (statusFilter === 'all' || c.status === statusFilter) || (c.agent_name || '').toLowerCase().includes(q) && (statusFilter === 'all' || c.status === statusFilter);
  });
  const totalGMV = contracts.reduce((sum, c) => sum + Number(c.revenue || c.planned_revenue || 0), 0);
  const totalEscrow = contracts.reduce((sum, c) => sum + Number(c.escrow_amount || 0), 0);
  const activeCount = contracts.filter(isActiveContract).length;
  const locale = i18n.language === 'ru' ? 'ru-RU' : i18n.language === 'az' ? 'az-AZ' : i18n.language === 'kk' || i18n.language === 'kz' ? 'kk-KZ' : 'en-US';
  const formatDate = (value: string | null) => value ? new Date(value).toLocaleDateString(locale) : '—';

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      ACTIVE: { bg: 'bg-[#B8860B]/10', text: 'text-[#B8860B]', label: t('contract.statuses.ACTIVE') },
      IN_PROGRESS: { bg: 'bg-[#000052]/10', text: 'text-[#000052]', label: t('contract.statuses.IN_PROGRESS') },
      PENDING_APPROVAL: { bg: 'bg-[#000052]/5', text: 'text-[#000052]/70', label: t('contract.statuses.PENDING_APPROVAL') },
      COMPLETED: { bg: 'bg-[#B8860B]/20', text: 'text-[#B8860B]', label: t('contract.statuses.COMPLETED') },
      DRAFT: { bg: 'bg-[#000052]/5', text: 'text-[#000052]/60', label: t('contract.statuses.DRAFT') },
      DISPUTED: { bg: 'bg-[#000052]/10', text: 'text-[#000052]', label: t('contract.statuses.DISPUTED') },
      PENDING_PAYMENT: { bg: 'bg-[#B8860B]/10', text: 'text-[#B8860B]', label: t('contract.statuses.PENDING_PAYMENT') },
    };
    const badge = badges[status] || badges.DRAFT;
    return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>{badge.label}</span>;
  };

  if (loading) return <div className="p-8 text-center text-[#000052]"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8860B]" /><p className="mt-2">{t('common.loading')}</p></div>;

  return <div className="p-4 md:p-6 space-y-6">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4"><div><h1 className="text-2xl md:text-3xl font-bold text-[#000052]">{t('contract.title')}</h1><p className="text-sm text-[#000052]/70 mt-1">{t('contract.subtitle', { defaultValue: t('layout.contracts') })}</p></div><button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-[#B8860B] text-white rounded-lg text-sm font-semibold"><Plus className="w-4 h-4" />{t('contract.createNew')}</button></div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-[#000052] text-white p-5 rounded-xl"><div className="flex items-center justify-between mb-3"><h3 className="text-sm font-medium opacity-80">{t('ui.totalGMV')}</h3><DollarSign className="w-5 h-5 opacity-80" /></div><p className="text-2xl font-bold">${totalGMV.toLocaleString()}</p><p className="text-xs opacity-70 mt-1">{contracts.length} {t('layout.contracts').toLowerCase()}</p></div>
      <div className="bg-[#B8860B] text-white p-5 rounded-xl"><div className="flex items-center justify-between mb-3"><h3 className="text-sm font-medium opacity-80">{t('ui.escrowFrozen')}</h3><ShieldCheck className="w-5 h-5 opacity-80" /></div><p className="text-2xl font-bold">${totalEscrow.toLocaleString()}</p><p className="text-xs opacity-70 mt-1">{t('ui.riskProtection')}</p></div>
      <div className="bg-white text-[#000052] p-5 rounded-xl border border-[#000052]/10"><div className="flex items-center justify-between mb-3"><h3 className="text-sm font-medium text-[#000052]/70">{t('ui.activeContracts')}</h3><Users className="w-5 h-5 text-[#B8860B]" /></div><p className="text-2xl font-bold">{activeCount}</p><p className="text-xs text-[#000052]/60 mt-1">{t('ui.activeContractsWork')}</p></div>
    </div>
    <div className="bg-white p-4 rounded-xl border border-[#000052]/10"><div className="flex flex-col md:flex-row gap-3"><div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#000052]/40" /><input type="text" placeholder={t('ui.searchContracts')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-[#000052]/5 border border-[#000052]/10 rounded-lg text-sm" /></div><div className="relative"><Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#000052]/40" /><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="pl-10 pr-8 py-2 bg-[#000052]/5 border border-[#000052]/10 rounded-lg text-sm appearance-none"><option value="all">{t('ui.allStatuses')}</option>{Object.keys({ ACTIVE: 1, IN_PROGRESS: 1, PENDING_APPROVAL: 1, COMPLETED: 1, DRAFT: 1 }).map(status => <option key={status} value={status}>{t(`contract.statuses.${status}`)}</option>)}</select></div></div></div>
    <div className="bg-white rounded-xl border border-[#000052]/10 overflow-hidden">{filteredContracts.length === 0 ? <div className="text-center py-12 text-[#000052]/60"><FileText className="w-16 h-16 mx-auto mb-4 text-[#000052]/20" /><p className="text-lg font-medium mb-2">{t('contract.noContracts')}</p><p className="text-sm">{t('contract.createFirst')}</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[800px]"><thead className="bg-[#000052]/5"><tr>{['contractName','agent','gmv','escrow','deadline','status'].map(key => <th key={key} className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">{key === 'escrow' ? t('ui.escrow') : key === 'deadline' ? t('ui.deadline') : key === 'status' ? t('ui.status') : t(`ui.${key}`)}</th>)}</tr></thead><tbody className="divide-y divide-[#000052]/5">{filteredContracts.map(contract => <tr key={contract.id} onClick={() => navigate(`/ceo/contracts/${contract.id}`)} className="hover:bg-[#000052]/5 cursor-pointer transition"><td className="py-4 px-4"><div className="font-semibold text-[#000052] text-sm">{contract.title}</div><div className="text-xs text-[#000052]/60 mt-1">{t('ui.created')}: {formatDate(contract.start_date || contract.created_at)}</div></td><td className="py-4 px-4"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-[#B8860B]/10 flex items-center justify-center"><Users className="w-4 h-4 text-[#B8860B]" /></div><span className="text-sm text-[#000052]">{contract.agent_name || t('ui.notAssigned')}</span></div></td><td className="py-4 px-4"><div className="text-sm font-bold">${Number(contract.revenue || contract.planned_revenue || 0).toLocaleString()}</div></td><td className="py-4 px-4"><div className="text-sm font-bold text-[#B8860B]">${Number(contract.escrow_amount || 0).toLocaleString()}</div><div className="text-xs text-[#000052]/60">{t('ui.locked')}</div></td><td className="py-4 px-4"><div className="text-sm">{formatDate(contract.deadline)}</div></td><td className="py-4 px-4">{getStatusBadge(contract.status)}</td></tr>)}</tbody></table></div>}</div>
    <CreateContractModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onCreated={() => window.location.reload()} />
  </div>;
}
