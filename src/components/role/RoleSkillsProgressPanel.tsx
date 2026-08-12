import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Activity, CheckCircle, Target } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SkillRow {
  weight: number;
  skills: {
    name: string;
    description?: string | null;
    verification_level?: string | null;
    expected_outcomes?: string[] | null;
    verification_criteria?: string[] | null;
  } | null;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getSkillProgress(skillName: string, contract: any, overall: number) {
  const name = skillName.toLowerCase();
  if (name.includes('удерж') || name.includes('retention')) {
    return contract.retention_days && contract.retention_started_at ? clamp(Number(contract.retention_days) >= 90 ? 100 : (Number(contract.retention_days) / 90) * 100) : overall;
  }
  if (name.includes('кросс') || name.includes('cross')) {
    return contract.target_clients_cross_sell ? clamp((Number(contract.actual_clients_cross_sell || 0) / Number(contract.target_clients_cross_sell)) * 100) : overall;
  }
  if (name.includes('план') || name.includes('plan')) {
    return overall;
  }
  if (name.includes('продаж') || name.includes('sales') || name.includes('корпоратив')) {
    const target = Number(contract.target_clients_new || 0);
    return target > 0 ? clamp((Number(contract.actual_clients_new || contract.actual_clients || 0) / target) * 100) : overall;
  }
  return overall;
}

export function RoleSkillsProgressPanel() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<any>(null);
  const [roleName, setRoleName] = useState('');
  const [skills, setSkills] = useState<SkillRow[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const { data: contractData, error: contractError } = await supabase
          .from('contracts')
          .select('role_id, target_clients_new, target_clients_cross_sell, actual_clients_new, actual_clients_cross_sell, actual_clients, target_clients, kpi_calls, actual_calls, kpi_meetings, actual_meetings, kpi_proposals, actual_proposals, retention_days, retention_started_at')
          .eq('id', id)
          .maybeSingle();
        if (contractError || !contractData?.role_id) return;
        setContract(contractData);

        const { data: roleData, error: roleError } = await supabase
          .from('roles')
          .select('name, role_skills(weight, skills(name, description, verification_level, expected_outcomes, verification_criteria))')
          .eq('id', contractData.role_id)
          .maybeSingle();
        if (roleError || !roleData) return;
        setRoleName(roleData.name || '');
        setSkills((roleData.role_skills || []) as SkillRow[]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  const overall = useMemo(() => {
    if (!contract) return 0;
    const values = [
      Number(contract.kpi_calls) > 0 ? Number(contract.actual_calls || 0) / Number(contract.kpi_calls) : null,
      Number(contract.kpi_meetings) > 0 ? Number(contract.actual_meetings || 0) / Number(contract.kpi_meetings) : null,
      Number(contract.kpi_proposals) > 0 ? Number(contract.actual_proposals || 0) / Number(contract.kpi_proposals) : null,
      Number(contract.target_clients || contract.target_clients_new) > 0 ? Number(contract.actual_clients || contract.actual_clients_new || 0) / Number(contract.target_clients || contract.target_clients_new) : null,
    ].filter((value): value is number => value !== null);
    return values.length ? clamp((values.reduce((a, b) => a + b, 0) / values.length) * 100) : 0;
  }, [contract]);

  const weightedProgress = useMemo(() => {
    if (!skills.length) return overall;
    const totalWeight = skills.reduce((sum, item) => sum + Number(item.weight || 0), 0);
    if (!totalWeight) return overall;
    return clamp(skills.reduce((sum, item) => sum + getSkillProgress(item.skills?.name || '', contract, overall) * Number(item.weight || 0), 0) / totalWeight);
  }, [skills, contract, overall]);

  if (loading || !contract || !roleName || !skills.length) return null;

  return (
    <section className="bg-white rounded-2xl shadow-sm p-5 md:p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#B8860B] text-sm font-semibold"><Target className="w-4 h-4" />Роль и прогресс</div>
          <h2 className="text-xl font-bold text-[#000052] mt-1">{roleName}</h2>
          <p className="text-sm text-gray-400 mt-1">Прогресс рассчитывается по фактическим KPI контракта с учётом весов навыков.</p>
        </div>
        <div className="text-right shrink-0"><div className="text-2xl font-bold text-[#000052]">{weightedProgress}%</div><div className="text-xs text-gray-400">общий прогресс</div></div>
      </div>

      <div className="h-3 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-[#B8860B] rounded-full transition-all" style={{ width: `${weightedProgress}%` }} /></div>

      <div className="space-y-4">
        {skills.map((item, index) => {
          const skill = item.skills;
          if (!skill) return null;
          const progress = getSkillProgress(skill.name, contract, overall);
          const weight = Number(item.weight || 0);
          return (
            <div key={`${skill.name}-${index}`} className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0"><div className="font-semibold text-[#000052]">{skill.name}</div><div className="text-xs text-gray-400 mt-1">Вес {weight}%{skill.verification_level ? ` · ${skill.verification_level}` : ''}</div></div>
                <div className="flex items-center gap-2 text-sm font-bold text-[#000052]"><Activity className="w-4 h-4 text-[#B8860B]" />{progress}%</div>
              </div>
              <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-[#000052] rounded-full" style={{ width: `${progress}%` }} /></div>
              {skill.description && <p className="text-xs text-gray-500 mt-2">{skill.description}</p>}
              {skill.verification_criteria?.length ? <div className="mt-3 text-xs text-gray-500"><span className="font-semibold text-[#000052]">Критерии:</span> {skill.verification_criteria.join(' · ')}</div> : null}
              {progress >= 100 && <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><CheckCircle className="w-3.5 h-3.5" />Целевой уровень достигнут</div>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
