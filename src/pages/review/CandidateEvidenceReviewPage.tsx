import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ClipboardCheck, LogOut, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { CandidateEvidenceSourceType, CandidateEvidenceVerificationStatus } from '../../types/candidateEvidence';

type EvidenceRow = {
  id: string;
  candidate_id: string;
  skill_id: string;
  source_type: CandidateEvidenceSourceType;
  source_uri: string | null;
  evidence_text: string | null;
  verification_status: CandidateEvidenceVerificationStatus;
  created_at: string;
};

type SkillRow = { id: string; name: string };

export function CandidateEvidenceReviewPage() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const role = String(user?.app_metadata?.role ?? '');
  const [databaseAdmin, setDatabaseAdmin] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);
  const authorized = role === 'admin' || role === 'reviewer' || databaseAdmin;

  useEffect(() => {
    let alive = true;
    if (!user) {
      setRoleChecked(true);
      return () => { alive = false; };
    }
    if (role === 'admin' || role === 'reviewer') {
      setRoleChecked(true);
      return () => { alive = false; };
    }
    supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        setDatabaseAdmin(String(data?.role ?? '').toUpperCase() === 'ADMIN');
        setRoleChecked(true);
      });
    return () => { alive = false; };
  }, [user, role]);
  const [items, setItems] = useState<EvidenceRow[]>([]);
  const [skills, setSkills] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!roleChecked) return;
    if (!roleChecked || loading) {
    return <div className="p-6 text-sm text-gray-500">{t('common.loading')}</div>;
  }

  if (!authorized) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const { data, error: queryError } = await supabase
      .from('candidate_skill_evidence')
      .select('id,candidate_id,skill_id,source_type,source_uri,evidence_text,verification_status,created_at')
      .eq('verification_status', 'pending')
      .order('created_at', { ascending: true });
    if (queryError) {
      setError(queryError.message);
      setItems([]);
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as EvidenceRow[];
    setItems(rows);
    const skillIds = [...new Set(rows.map(row => row.skill_id))];
    if (skillIds.length) {
      const { data: skillData, error: skillError } = await supabase
        .from('skills')
        .select('id,name')
        .in('id', skillIds);
      if (skillError) setError(skillError.message);
      else setSkills(Object.fromEntries(((skillData ?? []) as SkillRow[]).map(skill => [skill.id, skill.name])));
    } else {
      setSkills({});
    }
    setLoading(false);
  }, [authorized, roleChecked]);

  useEffect(() => { void load(); }, [load]);

  const review = async (item: EvidenceRow, status: 'verified' | 'rejected') => {
    setBusyId(item.id);
    setError('');
    setNotice('');
    const { error: reviewError } = await supabase.rpc('review_candidate_skill_evidence', {
      p_evidence_id: item.id,
      p_status: status,
    });
    if (reviewError) {
      setError(reviewError.message);
    } else {
      setNotice(t(status === 'verified' ? 'evidenceReview.verifiedNotice' : 'evidenceReview.rejectedNotice'));
      setItems(current => current.filter(row => row.id !== item.id));
    }
    setBusyId(null);
  };

  if (!authorized) {
    return <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-xl font-bold text-[#000052]">{t('evidenceReview.forbiddenTitle')}</h1>
      <p className="mt-2 text-sm text-gray-600">{t('evidenceReview.forbiddenText')}</p>
      <button onClick={() => navigate('/ceo/candidates')} className="mt-4 rounded-lg bg-[#000052] px-4 py-2 text-white">{t('evidenceReview.back')}</button>
    </div>;
  }

  return <main className="mx-auto w-full max-w-5xl space-y-5 p-4 sm:p-6 md:p-8">
    <header className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className="rounded-xl bg-[#000052]/5 p-3"><ClipboardCheck className="h-6 w-6 text-[#000052]" /></div>
        <div>
          <h1 className="text-2xl font-bold text-[#000052]">{t('evidenceReview.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('evidenceReview.subtitle')}</p>
        </div>
      </div>
      <button type="button" onClick={() => void signOut().then(() => navigate('/login', { replace: true }))} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#000052] hover:bg-gray-50">
        <LogOut className="h-4 w-4" /><span className="hidden sm:inline">{t('layout.logout')}</span>
      </button>
    </header>
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 break-words">{error}</p>}
    {notice && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
    {loading ? <p className="text-sm text-gray-500">{t('common.loading')}</p> : items.length === 0 ? (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <ClipboardCheck className="mx-auto h-9 w-9 text-gray-300" />
        <p className="mt-3 font-medium text-[#000052]">{t('evidenceReview.empty')}</p>
      </div>
    ) : <div className="space-y-4">
      {items.map(item => <article key={item.id} className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-semibold text-[#000052]">{skills[item.skill_id] ?? t('candidateEvidence.unknownSkill')}</h2>
            <p className="mt-1 break-all text-xs text-gray-500">{t('evidenceReview.candidateId')}: {item.candidate_id}</p>
            <p className="mt-1 text-xs text-gray-500">{t(`candidateEvidence.sources.${item.source_type}`)} · {new Date(item.created_at).toLocaleString()}</p>
          </div>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-800">{t('candidateEvidence.status.pending')}</span>
        </div>
        {item.evidence_text && <p className="mt-4 whitespace-pre-wrap break-words text-sm text-gray-700">{item.evidence_text}</p>}
        {item.source_uri && /^https?:\/\//i.test(item.source_uri) && <a href={item.source_uri} target="_blank" rel="noreferrer" className="mt-3 block break-all text-sm text-blue-700 underline">{item.source_uri}</a>}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button type="button" disabled={busyId === item.id} onClick={() => void review(item, 'verified')} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#000052] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />{t('evidenceReview.verify')}</button>
          <button type="button" disabled={busyId === item.id} onClick={() => void review(item, 'rejected')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-50"><XCircle className="h-4 w-4" />{t('evidenceReview.reject')}</button>
        </div>
      </article>)}
    </div>}
  </main>;
}
