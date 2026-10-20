import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, FileCheck2, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CandidateEvidencePanel } from '../../components/candidates/CandidateEvidencePanel';

type CandidateProfile = { id: string; full_name: string; email: string | null; role_id: string };
type RoleSkill = { weight: number; skills: { id: string; name: string } | null };
type VerifiedOutcome = { contract_title: string; skill_name: string; skill_id: string; verified_at: string | null; evidence: Record<string, unknown> | null };

export function CandidateSkillsPage() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [roleName, setRoleName] = useState('');
  const [skills, setSkills] = useState<RoleSkill[]>([]);
  const [history, setHistory] = useState<VerifiedOutcome[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEvidence, setShowEvidence] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      const { data: claimed, error: claimError } = await supabase.rpc('claim_candidate_profile');
      if (claimError || !claimed?.id || !claimed?.role_id) {
        if (alive) {
          setError(claimError ? t('candidatePortal.claimError') : t('candidatePortal.noProfile'));
          setLoading(false);
        }
        return;
      }
      const candidate = claimed as CandidateProfile;
      const { data: role, error: roleError } = await supabase
        .from('roles')
        .select('id,name')
        .eq('id', candidate.role_id)
        .maybeSingle();
      if (roleError) {
        if (alive) { setError(roleError.message); setLoading(false); }
        return;
      }
      const { data: roleSkills, error: skillsError } = await supabase
        .from('role_skills')
        .select('weight,skills(id,name)')
        .eq('role_id', candidate.role_id)
        .order('weight', { ascending: false });
      if (skillsError) {
        if (alive) { setError(skillsError.message); setLoading(false); }
        return;
      }
      const { data: verifiedHistory, error: historyError } = await supabase.rpc('get_candidate_verified_work_history');
      if (alive) {
        setProfile(candidate);
        setRoleName(role?.name ?? '');
        setSkills((roleSkills ?? []) as unknown as RoleSkill[]);
        setHistory(historyError ? [] : (verifiedHistory ?? []) as VerifiedOutcome[]);
        if (historyError) setError(historyError.message);
        setLoading(false);
      }
    };
    void load();
    return () => { alive = false; };
  }, [user, t]);

  if (loading) return <div className="p-6 text-center text-[#000052]">{t('common.loading')}</div>;

  if (error && !profile) {
    return <main className="mx-auto max-w-xl p-4 sm:p-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
        <h1 className="text-xl font-bold text-[#000052]">{t('candidatePortal.title')}</h1>
        <p className="mt-3 text-sm text-gray-600 break-words">{error}</p>
        <p className="mt-3 text-sm text-gray-500">{t('candidatePortal.noProfileHint')}</p>
        <button type="button" onClick={() => void signOut().then(() => navigate('/login', { replace: true }))} className="mt-5 inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-[#000052]">
          <LogOut className="h-4 w-4" />{t('layout.logout')}
        </button>
      </div>
    </main>;
  }

  if (!profile) return null;

  return <main className="mx-auto w-full max-w-4xl space-y-5 p-4 sm:p-6 md:p-8">
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#B8860B]">{t('candidatePortal.eyebrow')}</p>
        <h1 className="mt-1 text-2xl font-bold text-[#000052]">{t('candidatePortal.title')}</h1>
        <p className="mt-2 text-sm text-gray-500">{t('candidatePortal.subtitle')}</p>
      </div>
      <button type="button" onClick={() => void signOut().then(() => navigate('/login', { replace: true }))} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#000052]">
        <LogOut className="h-4 w-4" /><span className="hidden sm:inline">{t('layout.logout')}</span>
      </button>
    </header>

    {error && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 break-words">{error}</p>}

    <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-[#000052]/5 p-3"><FileCheck2 className="h-6 w-6 text-[#000052]" /></div>
        <div className="min-w-0">
          <h2 className="font-semibold text-[#000052]">{profile.full_name}</h2>
          <p className="mt-1 break-all text-sm text-gray-500">{profile.email}</p>
          <p className="mt-2 text-sm text-[#B8860B]">{roleName}</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-gray-600">{t('candidatePortal.profileHint')}</p>
    </section>

    <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#B8860B]" />
        <div>
          <h2 className="font-semibold text-[#000052]">{t('candidatePortal.verifiedWork')}</h2>
          <p className="mt-1 text-xs text-gray-500">{t('candidatePortal.verifiedWorkHint')}</p>
        </div>
      </div>
      {history.length === 0 ? <p className="mt-4 text-sm text-gray-500">{t('candidatePortal.noWorkHistory')}</p> : <div className="mt-4 space-y-3">
        {history.map((item, index) => <article key={`${item.contract_title}-${item.skill_name}-${index}`} className="rounded-xl border border-gray-100 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-[#000052]">{item.skill_name}</span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800">{t('candidateEvidence.status.verified')}</span>
          </div>
          <p className="mt-1 text-sm text-gray-700">{item.contract_title}</p>
          {item.verified_at && <p className="mt-1 text-xs text-gray-500">{new Date(item.verified_at).toLocaleDateString()}</p>}
        </article>)}
      </div>}
    </section>

    <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-[#000052]">{t('candidatePortal.evidenceTitle')}</h2>
          <p className="mt-1 text-sm text-gray-500">{t('candidatePortal.evidenceHint')}</p>
        </div>
        <button type="button" onClick={() => setShowEvidence(value => !value)} className="shrink-0 rounded-lg border border-[#000052]/20 px-3 py-2 text-sm font-semibold text-[#000052]">
          {showEvidence ? t('candidateEvidence.hide') : t('candidateEvidence.open')}
        </button>
      </div>
      {showEvidence && <CandidateEvidencePanel
        candidateId={profile.id}
        skills={skills.flatMap(item => item.skills ? [item.skills] : [])}
        onClose={() => setShowEvidence(false)}
        showWorkHistory={false}
        additionalVerifiedSkillIds={history.map(item => item.skill_id)}
      />}
    </section>
  </main>;
}
