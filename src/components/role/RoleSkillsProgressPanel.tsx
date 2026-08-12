import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Activity, CheckCircle, Target } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Skill {
  name: string;
  description?: string | null;
  verification_level?: string | null;
  expected_outcomes?: string[] | null;
  verification_criteria?: string[] | null;
}

interface SkillRow {
  weight: number;
  skills: Skill | null;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function progressForSkill(skillName: string, events: Set<string>, overall: number) {
  const name = skillName.toLowerCase();
  if (name.includes('удерж') || name.includes('retention')) return events.has('RETENTION_PERIOD_PASSED') ? 100 : 0;
  if (name.includes('кросс') || name.includes('cross')) return events.has('CROSS_SELL_CONFIRMED') ? 100 : 0;
  if (name.includes('продаж') || name.includes('sales') || name.includes('корпоратив')) return events.has('CLIENT_PAYMENT_CONFIRMED') ? 100 : 0;
  if (name.includes('продлен') || name.includes('renewal')) return events.has('RENEWAL_CONFIRMED') ? 100 : 0;
  if (name.includes('план') || name.includes('plan')) return events.has('PLAN_ACHIEVED') ? 100 : 0;
  return overall;
}

export function RoleSkillsProgressPanel() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [roleName, setRoleName] = useState('');
  const [skills, setSkills] = useState<SkillRow[]>([]);
  const [events, setEvents] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const { data: contractData, error: contractError } = await supabase
          .from('contracts')
          .select('role_id')
          .eq('id', id)
          .maybeSingle();
        if (contractError || !contractData?.role_id) return;

        const [{ data: roleData, error: roleError }, { data: oracleData }] = await Promise.all([
          supabase
            .from('roles')
            .select('name, role_skills(weight, skills(name, description, verification_level, expected_outcomes, verification_criteria))')
            .eq('id', contractData.role_id)
            .maybeSingle(),
          supabase
            .from('oracle_events')
            .select('event_type')
            .eq('contract_id', id),
        ]);

        if (roleError || !roleData) return;
        setRoleName(roleData.name || '');

        const normalizedSkills: SkillRow[] = (roleData.role_skills || []).flatMap((row: any) => {
          const relatedSkills = Array.isArray(row.skills) ? row.skills : [row.skills];
          return relatedSkills
            .filter(Boolean)
            .map((skill: Skill) => ({
              weight: Number(row.weight || 0),
              skills: skill,
            }));
        });

        setSkills(normalizedSkills);
        setEvents(new Set((oracleData || []).map(event => event.event_type)));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  const overall = useMemo(() => {
    const milestones = ['CLIENT_PAYMENT_CONFIRMED', 'RENEWAL_CONFIRMED', 'CROSS_SELL_CONFIRMED', 'RETENTION_PERIOD_PASSED', 'PLAN_ACHIEVED'];
    return clamp((milestones.filter(event => events.has(event)).length / milestones.length) * 100);
  }, [events]);

  const weightedProgress = useMemo(() => {
    if (!skills.length) return overall;
    const totalWeight = skills.reduce((sum, item) => sum + Number(item.weight || 0), 0);
    if (!totalWeight) return overall;
    return clamp(skills.reduce((sum, item) => sum + progressForSkill(item.skills?.name || '', events, overall) * Number(item.weight || 0), 0) / totalWeight);
  }, [skills, events, overall]);

  if (loading || !roleName || !skills.length) return null;

  return (
    <section className="bg-white rounded-2xl shadow-sm p-5 md:p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#B8860B] text-sm font-semibold"><Target className="w-4 h-4" />Роль и прогресс</div>
          <h2 className="text-xl font-bold text-[#000052] mt-1">{roleName}</h2>
          <p className="text-sm text-gray-400 mt-1">Прогресс формируется по подтверждённым событиям Oracle и весам навыков.</p>
        </div>
        <div className="text-right shrink-0"><div className="text-2xl font-bold text-[#000052]">{weightedProgress}%</div><div className="text-xs text-gray-400">общий прогресс</div></div>
      </div>

      <div className="h-3 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-[#B8860B] rounded-full transition-all" style={{ width: `${weightedProgress}%` }} /></div>

      <div className="space-y-4">
        {skills.map((item, index) => {
          const skill = item.skills;
          if (!skill) return null;
          const progress = progressForSkill(skill.name, events, overall);
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
