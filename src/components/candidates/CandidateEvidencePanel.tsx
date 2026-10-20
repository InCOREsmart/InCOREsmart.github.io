import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileCheck2, Plus, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type {
  CandidateEvidenceSourceType,
  CandidateSkillEvidence,
} from '../../types/candidateEvidence';

type SkillOption = { id: string; name: string };
type VerifiedWorkHistoryItem = {
  id: string;
  contract_id: string;
  title: string;
  skill_id: string | null;
  verified_at: string | null;
  evidence: Record<string, unknown> | null;
};

type Props = {
  candidateId: string;
  skills: SkillOption[];
  onClose: () => void;
  onEvidenceChanged?: () => void;
  showWorkHistory?: boolean;
  additionalVerifiedSkillIds?: string[];
};

const sourceTypes: CandidateEvidenceSourceType[] = [
  'resume',
  'portfolio',
  'work_sample',
  'reference',
  'certificate',
  'other',
];

export function CandidateEvidencePanel({ candidateId, skills, onClose, onEvidenceChanged, showWorkHistory = true, additionalVerifiedSkillIds = [] }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [items, setItems] = useState<CandidateSkillEvidence[]>([]);
  const [workHistory, setWorkHistory] = useState<VerifiedWorkHistoryItem[]>([]);
  const [skillId, setSkillId] = useState(skills[0]?.id ?? '');
  const [sourceType, setSourceType] = useState<CandidateEvidenceSourceType>('work_sample');
  const [sourceUri, setSourceUri] = useState('');
  const [evidenceText, setEvidenceText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: queryError } = await supabase
      .from('candidate_skill_evidence')
      .select('id,candidate_id,skill_id,source_type,source_uri,evidence_text,evidence_metadata,verification_status,verified_by,verified_at,created_by,created_at')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false });
    if (queryError) setError(queryError.message);
    else setItems((data ?? []) as CandidateSkillEvidence[]);

    // Work history is derived only from outcomes already marked VERIFIED in the contract workflow.
    const { data: contractRows, error: contractError } = await supabase
      .from('contracts')
      .select('id,title,created_at')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false });
    if (!contractError && contractRows?.length) {
      const contractIds = contractRows.map(row => row.id);
      const { data: outcomeRows, error: outcomeError } = await supabase
        .from('contract_outcome_verifications')
        .select('id,contract_id,contract_skill_model_id,verified_at,evidence,contract_skill_models(skill_id)')
        .in('contract_id', contractIds)
        .eq('status', 'VERIFIED')
        .order('verified_at', { ascending: false });
      if (!outcomeError) {
        const titles = Object.fromEntries(contractRows.map(row => [row.id, row.title]));
        setWorkHistory((outcomeRows ?? []).map(row => {
          const model = row.contract_skill_models as unknown as { skill_id: string } | null;
          return {
            id: row.id,
            contract_id: row.contract_id,
            title: titles[row.contract_id] ?? t('candidateEvidence.unknownContract'),
            skill_id: model?.skill_id ?? null,
            verified_at: row.verified_at,
            evidence: row.evidence as Record<string, unknown> | null,
          };
        }));
      } else {
        setWorkHistory([]);
      }
    } else {
      setWorkHistory([]);
    }
    setLoading(false);
  }, [candidateId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!user || !skillId || (!sourceUri.trim() && !evidenceText.trim())) {
      setError(t('candidateEvidence.required'));
      return;
    }

    setSaving(true);
    setError('');
    const { error: insertError } = await supabase.from('candidate_skill_evidence').insert({
      candidate_id: candidateId,
      skill_id: skillId,
      source_type: sourceType,
      source_uri: sourceUri.trim() || null,
      evidence_text: evidenceText.trim() || null,
      created_by: user.id,
      verification_status: 'pending',
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setSourceUri('');
      setEvidenceText('');
      await load();
      onEvidenceChanged?.();
    }
    setSaving(false);
  };

  const sourceLabel = (value: CandidateEvidenceSourceType) =>
    t(`candidateEvidence.sources.${value}`);
  const verifiedSkillIds = [...new Set([
    ...items.filter(item => item.verification_status === 'verified').map(item => item.skill_id),
    ...workHistory.flatMap(item => item.skill_id ? [item.skill_id] : []),
    ...additionalVerifiedSkillIds,
  ])];

  return (
    <section className="mt-4 rounded-xl border border-[#000052]/15 bg-[#000052]/[0.02] p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-[#000052]">{t('candidateEvidence.title')}</h4>
          <p className="mt-1 text-xs text-gray-500">{t('candidateEvidence.hint')}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-100" aria-label={t('candidateEvidence.close')}>
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 break-words">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="font-medium">{t('candidateEvidence.skill')}</span>
          <select value={skillId} onChange={e => setSkillId(e.target.value)} className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2" disabled={!skills.length}>
            {skills.map(skill => <option key={skill.id} value={skill.id}>{skill.name}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium">{t('candidateEvidence.source')}</span>
          <select value={sourceType} onChange={e => setSourceType(e.target.value as CandidateEvidenceSourceType)} className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2">
            {sourceTypes.map(type => <option key={type} value={type}>{sourceLabel(type)}</option>)}
          </select>
        </label>
      </div>

      <label className="block text-sm">
        <span className="font-medium">{t('candidateEvidence.link')}</span>
        <input type="url" value={sourceUri} onChange={e => setSourceUri(e.target.value)} placeholder="https://" className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="font-medium">{t('candidateEvidence.description')}</span>
        <textarea value={evidenceText} onChange={e => setEvidenceText(e.target.value)} rows={2} className="mt-1.5 w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2" />
      </label>

      <button type="button" onClick={() => void save()} disabled={saving || !skills.length} className="inline-flex items-center gap-2 rounded-lg bg-[#000052] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        <Plus className="h-4 w-4" />{saving ? t('common.loading') : t('candidateEvidence.add')}
      </button>

      <div className="rounded-xl border border-[#B8860B]/25 bg-white p-3 sm:p-4 space-y-2">
        <h5 className="font-semibold text-[#000052]">{t('candidateEvidence.passportTitle')}</h5>
        <p className="text-xs text-gray-500">{t('candidateEvidence.passportHint')}</p>
        <div className="text-sm font-semibold text-[#B8860B]">{t('candidateEvidence.verifiedSkillsCount', { count: verifiedSkillIds.length })}</div>
        {verifiedSkillIds.length ? <div className="flex flex-wrap gap-2">{verifiedSkillIds.map(id => {
          const skill = skills.find(option => option.id === id);
          return <span key={id} className="rounded-full bg-[#000052]/5 px-3 py-1 text-xs text-[#000052]">{skill?.name ?? t('candidateEvidence.unknownSkill')}</span>;
        })}</div> : <p className="text-sm text-gray-500">{t('candidateEvidence.noVerifiedSkills')}</p>}
      </div>

      <div className="space-y-2">
        <h5 className="text-sm font-semibold text-[#000052]">{t('candidateEvidence.history')}</h5>
        {loading ? <p className="text-sm text-gray-500">{t('common.loading')}</p> : items.length === 0 ? (
          <p className="text-sm text-gray-500">{t('candidateEvidence.empty')}</p>
        ) : items.map(item => {
          const skill = skills.find(option => option.id === item.skill_id);
          return (
            <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex items-start gap-2">
                <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-[#B8860B]" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{skill?.name ?? t('candidateEvidence.unknownSkill')}</span>
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">{t(`candidateEvidence.status.${item.verification_status}`)}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{sourceLabel(item.source_type)}</p>
                  {item.evidence_text && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-700">{item.evidence_text}</p>}
                  {item.source_uri && /^https?:\/\//i.test(item.source_uri) && <a href={item.source_uri} target="_blank" rel="noreferrer" className="mt-2 block break-all text-sm text-blue-700 underline">{item.source_uri}</a>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showWorkHistory && <div className="space-y-2">
        <h5 className="text-sm font-semibold text-[#000052]">{t('candidateEvidence.workHistoryTitle')}</h5>
        {loading ? <p className="text-sm text-gray-500">{t('common.loading')}</p> : workHistory.length === 0 ? (
          <p className="text-sm text-gray-500">{t('candidateEvidence.workHistoryEmpty')}</p>
        ) : workHistory.map(item => {
          const skill = skills.find(option => option.id === item.skill_id);
          return <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-[#000052]">{skill?.name ?? t('candidateEvidence.unknownSkill')}</span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800">{t('candidateEvidence.status.verified')}</span>
            </div>
            <p className="mt-1 text-sm text-gray-700">{item.title}</p>
            {item.verified_at && <p className="mt-1 text-xs text-gray-500">{new Date(item.verified_at).toLocaleDateString()}</p>}
          </div>;
        })}
      </div>}
    </section>
  );
}
