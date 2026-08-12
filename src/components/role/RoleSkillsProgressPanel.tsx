import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Activity, Target } from 'lucide-react';
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

interface RoleSkillsProgressPanelProps {
  roleId?: string | null;
  contractId?: string | null;
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

export function RoleSkillsProgressPanel({ roleId, contractId }: RoleSkillsProgressPanelProps) {
  const { id: routeContractId } = useParams<{ id: string }>();
  const effectiveContractId = contractId || routeContractId || '';
  const [loading, setLoading] = useState(true);
  const [roleName, setRoleName] = useState('');
  const [skills, setSkills] = useState<SkillRow[]>([]);
  const [events, setEvents] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      if (!effectiveContractId) {
        setLoading(false);
        return;
      }

      try {
        let effectiveRoleId = roleId || null;
        let agentSpecialization = '';

        if (!effectiveRoleId) {
          const { data: contractData, error: contractError } = await supabase
            .from('contracts')
            .select('role_id, agent_id')
            .eq('id', effectiveContractId)
            .maybeSingle();

          if (contractError) {
            console.error('Не удалось определить роль контракта:', contractError);
            return;
          }

          effectiveRoleId = contractData?.role_id || null;

          if (!effectiveRoleId && contractData?.agent_id) {
            const { data: agentData } = await supabase
              .from('agents')
              .select('specialization')
              .eq('id', contractData.agent_id)
              .maybeSingle();
            agentSpecialization = (agentData?.specialization || '').trim().toLowerCase();
          }
        }

        const roleQuery = effectiveRoleId
          ? supabase
              .from('roles')
              .select('name, role_skills(weight, skills(name, description, verification_level, expected_outcomes, verification_criteria))')
              .eq('id', effectiveRoleId)
              .maybeSingle()
          : agentSpecialization.includes('страх') || agentSpecialization.includes('insurance')
            ? supabase
                .from('roles')
                .select('name, role_skills(weight, skills(name, description, verification_level, expected_outcomes, verification_criteria))')
                .eq('name', 'Страховой агент')
                .eq('is_active', true)
                .limit(1)
                .maybeSingle()
            : null;

        const [{ data: roleData, error: roleError }, { data: oracleData, error: oracleError }] = await Promise.all([
          roleQuery || Promise.resolve({ data: null, error: null }),
          supabase
            .from('oracle_events')
            .select('event_type')
            .eq('contract_id', effectiveContractId),
        ]);

        if (roleError || !roleData) {
          console.error('Не удалось загрузить роль для прогресса:', roleError);
          return;
        }

        if (oracleError) console.warn('Не удалось загрузить события Oracle:', oracleError);

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
      } catch (error) {
        console.error('Ошибка загрузки прогресса роли:', error);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [roleId, effectiveContractId]);

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
    <section className="w-full max-w-4xl mx-auto bg-white border border-gray-100 rounded-2xl shadow-sm px-4 py-4 md:px-5 md:py-5">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[#B8860B] text-xs font-semibold uppercase tracking-wide">
            <Target className="w-3.5 h-3.5" />
            Роль и прогресс
          </div>
          <h2 className="text-lg font-bold text-[#000052] mt-0.5 truncate">{roleName}</h2>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-xl font-bold text-[#000052] leading-none">{weightedProgress}%</div>
          <div className="text-[10px] text-gray-400 mt-1">общий прогресс</div>
        </div>
      </div>

      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
        <div className="h-full bg-[#B8860B] rounded-full transition-all" style={{ width: `${weightedProgress}%` }} />
      </div>

      <div className="divide-y divide-gray-100">
        {skills.map((item, index) => {
          const skill = item.skills;
          if (!skill) return null;
          const progress = progressForSkill(skill.name, events, overall);
          const weight = Number(item.weight || 0);
          const displayWeight = weight <= 1 ? weight * 100 : weight;

          return (
            <div key={`${skill.name}-${index}`} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="text-sm font-semibold text-[#000052] truncate">{skill.name}</span>
                    <span className="shrink-0 text-[11px] text-gray-400">{displayWeight}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#000052] rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <div className="w-12 shrink-0 flex items-center justify-end gap-1 text-xs font-bold text-[#000052]">
                  <Activity className="w-3.5 h-3.5 text-[#B8860B]" />
                  {progress}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
