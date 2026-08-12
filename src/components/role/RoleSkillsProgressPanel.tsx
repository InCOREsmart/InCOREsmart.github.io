import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Activity, Target } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getDemoContractById } from '../../lib/demoData';
import { getCompletedDemoContractById } from '../../lib/demoCompletedContracts';
import { getActualContractRevenue } from '../../lib/contractFinance';

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

interface ContractProgress {
  status: string;
  actualClients: number;
  targetClients: number;
  actualCalls: number;
  targetCalls: number;
  actualMeetings: number;
  targetMeetings: number;
  actualProposals: number;
  targetProposals: number;
  actualRevenue: number;
  plannedRevenue: number;
  isDemo: boolean;
}

interface RoleSkillsProgressPanelProps {
  roleId?: string | null;
  contractId?: string | null;
}

const DEMO_SKILLS: SkillRow[] = [
  { weight: 0.5, skills: { name: 'Продажи корпоративного страхования', description: 'Привлечение корпоративных клиентов, подготовка предложения, заключение и активация договоров.' } },
  { weight: 0.15, skills: { name: 'Удержание клиентов', description: 'Сопровождение действующих корпоративных клиентов и своевременное продление договоров.' } },
  { weight: 0.1, skills: { name: 'Кросс-продажи', description: 'Выявление дополнительных потребностей действующих клиентов и продажа дополнительных страховых продуктов.' } },
  { weight: 0.1, skills: { name: 'Выполнение плана продаж', description: 'Выполнение установленного плана продаж и KPI.' } },
  { weight: 0.1, skills: { name: 'Удержание 90 дней', description: 'Стабилизация клиента после заключения договора и предотвращение досрочного расторжения.' } },
  { weight: 0.05, skills: { name: 'Долгосрочная результативность', description: 'Стабильное выполнение целей роли и поддержание результата в течение года.' } },
];

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function ratio(actual: number, target: number) {
  return target > 0 ? clamp((actual / target) * 100) : 0;
}

export function RoleSkillsProgressPanel({ roleId, contractId }: RoleSkillsProgressPanelProps) {
  const { id: routeContractId } = useParams<{ id: string }>();
  const effectiveContractId = contractId || routeContractId || '';
  const [loading, setLoading] = useState(true);
  const [roleName, setRoleName] = useState('');
  const [skills, setSkills] = useState<SkillRow[]>([]);
  const [events, setEvents] = useState<Set<string>>(new Set());
  const [contractProgress, setContractProgress] = useState<ContractProgress | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!effectiveContractId) {
        setLoading(false);
        return;
      }

      try {
        const demo = getDemoContractById(effectiveContractId) || getCompletedDemoContractById(effectiveContractId);

        if (demo) {
          const actualRevenue = getActualContractRevenue(demo);
          setRoleName('Страховой агент');
          setSkills(DEMO_SKILLS);
          setEvents(new Set((demo.oracle_events || []).map((event: any) => event.event_type)));
          setContractProgress({
            status: demo.status,
            actualClients: Number(demo.actual_clients || 0),
            targetClients: Number(demo.target_clients || 0),
            actualCalls: Number(demo.actual_calls || 0),
            targetCalls: Number(demo.kpi_calls || 0),
            actualMeetings: Number(demo.actual_meetings || 0),
            targetMeetings: Number(demo.kpi_meetings || 0),
            actualProposals: Number(demo.actual_proposals || 0),
            targetProposals: Number(demo.kpi_proposals || 0),
            actualRevenue,
            plannedRevenue: Number(demo.planned_revenue || demo.revenue || 0),
            isDemo: true,
          });
          return;
        }

        let effectiveRoleId = roleId || null;

        // IMPORTANT: use only columns that actually exist in the current contracts table.
        // Actual KPI counters are not stored in contracts in the current schema.
        const { data: contractData, error: contractError } = await supabase
          .from('contracts')
          .select('role_id, agent_id, status, target_clients_new, revenue, planned_revenue')
          .eq('id', effectiveContractId)
          .maybeSingle();

        if (contractError) {
          console.error('Не удалось загрузить прогресс контракта:', contractError);
          return;
        }

        if (!contractData) {
          console.warn('Контракт не найден:', effectiveContractId);
          return;
        }

        effectiveRoleId = effectiveRoleId || contractData.role_id || null;

        const actualRevenue = Number(contractData.revenue || 0);
        const plannedRevenue = Number(contractData.planned_revenue || 0);

        setContractProgress({
          status: contractData.status || '',
          actualClients: 0,
          targetClients: Number(contractData.target_clients_new || 0),
          actualCalls: 0,
          targetCalls: 0,
          actualMeetings: 0,
          targetMeetings: 0,
          actualProposals: 0,
          targetProposals: 0,
          actualRevenue,
          plannedRevenue,
          isDemo: false,
        });

        const [{ data: roleData, error: roleError }, { data: oracleData, error: oracleError }] = await Promise.all([
          effectiveRoleId
            ? supabase
                .from('roles')
                .select('name, role_skills(weight, skills(name, description, verification_level, expected_outcomes, verification_criteria))')
                .eq('id', effectiveRoleId)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          supabase
            .from('oracle_events')
            .select('event_type')
            .eq('contract_id', effectiveContractId),
        ]);

        if (oracleError) console.warn('Не удалось загрузить события Oracle:', oracleError);

        if (roleError || !roleData) {
          console.warn('Не удалось загрузить связанную роль, используется стандартная роль:', roleError);
          setRoleName('Страховой агент');
          setSkills(DEMO_SKILLS);
        } else {
          const normalizedSkills: SkillRow[] = (roleData.role_skills || []).flatMap((row: any) => {
            const relatedSkills = Array.isArray(row.skills) ? row.skills : [row.skills];
            return relatedSkills
              .filter(Boolean)
              .map((skill: Skill) => ({
                weight: Number(row.weight || 0),
                skills: skill,
              }));
          });

          setRoleName(roleData.name || 'Страховой агент');
          setSkills(normalizedSkills.length ? normalizedSkills : DEMO_SKILLS);
        }

        setEvents(new Set((oracleData || []).map((event: any) => event.event_type)));
      } catch (error) {
        console.error('Ошибка загрузки прогресса роли:', error);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [roleId, effectiveContractId]);

  useEffect(() => {
    const panels = Array.from(document.querySelectorAll<HTMLElement>('[data-role-progress-panel]'));
    panels.forEach((panel, index) => {
      panel.style.display = index === 0 ? '' : 'none';
    });
  });

  const salesProgress = useMemo(
    () => ratio(contractProgress?.actualClients || 0, contractProgress?.targetClients || 0),
    [contractProgress],
  );

  const planProgress = useMemo(
    () => ratio(contractProgress?.actualRevenue || 0, contractProgress?.plannedRevenue || 0),
    [contractProgress],
  );

  const operationalProgress = useMemo(() => {
    if (!contractProgress) return 0;

    const values = [
      ratio(contractProgress.actualCalls, contractProgress.targetCalls),
      ratio(contractProgress.actualMeetings, contractProgress.targetMeetings),
      ratio(contractProgress.actualProposals, contractProgress.targetProposals),
      salesProgress,
    ].filter((value) => value > 0);

    return values.length ? clamp(values.reduce((sum, value) => sum + value, 0) / values.length) : planProgress;
  }, [contractProgress, salesProgress, planProgress]);

  const progressForSkill = (skillName: string) => {
    const name = skillName.toLowerCase();

    if (name.includes('кросс') || name.includes('cross')) {
      return contractProgress?.isDemo
        ? contractProgress.actualClients >= Math.ceil(contractProgress.targetClients * 0.6) ? 100 : 0
        : events.has('CROSS_SELL_CONFIRMED') ? 100 : 0;
    }

    if (name.includes('продлен') || name.includes('renewal')) {
      return events.has('RENEWAL_CONFIRMED') ? 100 : 0;
    }

    if (name.includes('план') || name.includes('plan')) return planProgress;

    if (name.includes('удерж') && !name.includes('90')) {
      return events.has('RENEWAL_CONFIRMED') ? 100 : 0;
    }

    if (name.includes('90')) {
      return events.has('RETENTION_PERIOD_PASSED') ? 100 : 0;
    }

    if (name.includes('долгоср') || name.includes('long')) {
      return contractProgress?.status === 'COMPLETED' ? 100 : 0;
    }

    if (name.includes('продаж') || name.includes('sales') || name.includes('корпоратив')) {
      return contractProgress?.isDemo ? salesProgress : planProgress;
    }

    return operationalProgress;
  };

  const weightedProgress = useMemo(() => {
    if (!skills.length) return operationalProgress;

    const totalWeight = skills.reduce((sum, item) => sum + Number(item.weight || 0), 0);
    if (!totalWeight) return operationalProgress;

    return clamp(
      skills.reduce(
        (sum, item) => sum + progressForSkill(item.skills?.name || '') * Number(item.weight || 0),
        0,
      ) / totalWeight,
    );
  }, [skills, events, salesProgress, planProgress, operationalProgress, contractProgress]);

  if (loading || !roleName || !skills.length) return null;

  const accepted = contractProgress?.status === 'ACTIVE' || contractProgress?.status === 'IN_PROGRESS';
  const completed = contractProgress?.status === 'COMPLETED';
  const stageLabel = accepted ? 'Принят в работу' : completed ? 'Выполнен' : 'Подготовка';
  const stageProgress = accepted ? Math.max(weightedProgress, 5) : completed ? 100 : 0;

  return (
    <section
      data-role-progress-panel
      className="w-full max-w-4xl mx-auto bg-white border border-gray-100 rounded-2xl shadow-sm px-4 py-4 md:px-5 md:py-5"
    >
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
          <div className="text-[10px] text-gray-400 mt-1">фактический прогресс</div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between text-[11px] mb-1.5">
          <span className="font-semibold text-[#000052]">Этап контракта: {stageLabel}</span>
          <span className="text-gray-400">{completed ? '100%' : `${stageProgress}%`}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#B8860B] rounded-full transition-all"
            style={{ width: `${stageProgress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <div className="rounded-lg bg-[#000052]/5 px-3 py-2">
          <div className="text-[10px] text-gray-400">Договоры</div>
          <div className="text-sm font-bold text-[#000052]">
            ${Number(contractProgress?.actualRevenue || 0).toLocaleString()} / ${Number(contractProgress?.plannedRevenue || 0).toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg bg-[#000052]/5 px-3 py-2">
          <div className="text-[10px] text-gray-400">Клиенты</div>
          <div className="text-sm font-bold text-[#000052]">
            {contractProgress?.actualClients || 0}/{contractProgress?.targetClients || 0}
          </div>
        </div>
        <div className="rounded-lg bg-[#000052]/5 px-3 py-2">
          <div className="text-[10px] text-gray-400">План продаж</div>
          <div className="text-sm font-bold text-[#000052]">{planProgress}%</div>
        </div>
        <div className="rounded-lg bg-[#000052]/5 px-3 py-2">
          <div className="text-[10px] text-gray-400">Статус</div>
          <div className="text-sm font-bold text-[#000052]">{accepted ? 'В работе' : completed ? 'Выполнен' : 'Подготовка'}</div>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {skills.map((item, index) => {
          const skill = item.skills;
          if (!skill) return null;
          const progress = progressForSkill(skill.name);
          const weight = Number(item.weight || 0);
          const displayWeight = weight <= 1 ? weight * 100 : weight;

          return (
            <div key={`${skill.name}-${index}`} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="text-sm font-semibold text-[#000052] truncate">{skill.name}</span>
                    <span className="shrink-0 text-[11px] text-gray-400">Вес {displayWeight}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#000052] rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
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
