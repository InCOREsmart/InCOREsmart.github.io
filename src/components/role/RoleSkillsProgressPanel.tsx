import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Activity, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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

type SupportedLanguage = 'ru' | 'en' | 'kk' | 'az';

const DEMO_SKILLS: SkillRow[] = [
  {
    weight: 0.5,
    skills: {
      name: 'Продажи корпоративного страхования',
      description:
        'Привлечение корпоративных клиентов, подготовка предложения, заключение и активация договоров.',
    },
  },
  {
    weight: 0.15,
    skills: {
      name: 'Удержание клиентов',
      description:
        'Сопровождение действующих корпоративных клиентов и своевременное продление договоров.',
    },
  },
  {
    weight: 0.1,
    skills: {
      name: 'Кросс-продажи',
      description:
        'Выявление дополнительных потребностей действующих клиентов и продажа дополнительных страховых продуктов.',
    },
  },
  {
    weight: 0.1,
    skills: {
      name: 'Выполнение плана продаж',
      description: 'Выполнение установленного плана продаж и KPI.',
    },
  },
  {
    weight: 0.1,
    skills: {
      name: 'Удержание 90 дней',
      description:
        'Стабилизация клиента после заключения договора и предотвращение досрочного расторжения.',
    },
  },
  {
    weight: 0.05,
    skills: {
      name: 'Долгосрочная результативность',
      description:
        'Стабильное выполнение целей роли и поддержание результата в течение года.',
    },
  },
];

const TEXT_TRANSLATIONS: Record<
  string,
  Record<SupportedLanguage, string>
> = {
  'Страховой агент': {
    ru: 'Страховой агент',
    en: 'Insurance agent',
    kk: 'Сақтандыру агенті',
    az: 'Sığorta agenti',
  },

  'Продажи корпоративного страхования': {
    ru: 'Продажи корпоративного страхования',
    en: 'Corporate insurance sales',
    kk: 'Корпоративтік сақтандыру өнімдерін сату',
    az: 'Korporativ sığorta satışı',
  },

  'Удержание клиентов': {
    ru: 'Удержание клиентов',
    en: 'Client retention',
    kk: 'Клиенттерді ұстап қалу',
    az: 'Müştərilərin saxlanılması',
  },

  'Кросс-продажи': {
    ru: 'Кросс-продажи',
    en: 'Cross-sales',
    kk: 'Кросс-сатылымдар',
    az: 'Çarpaz satışlar',
  },

  'Выполнение плана продаж': {
    ru: 'Выполнение плана продаж',
    en: 'Sales plan achievement',
    kk: 'Сату жоспарын орындау',
    az: 'Satış planının yerinə yetirilməsi',
  },

  'Удержание 90 дней': {
    ru: 'Удержание 90 дней',
    en: '90-day retention',
    kk: '90 күндік ұстап қалу',
    az: '90 günlük saxlanma',
  },

  'Долгосрочная результативность': {
    ru: 'Долгосрочная результативность',
    en: 'Long-term performance',
    kk: 'Ұзақ мерзімді нәтижелілік',
    az: 'Uzunmüddətli nəticəlilik',
  },

  'Привлечение корпоративных клиентов, подготовка предложения, заключение и активация договоров.': {
    ru: 'Привлечение корпоративных клиентов, подготовка предложения, заключение и активация договоров.',
    en: 'Acquisition of corporate clients, preparation of proposals, conclusion and activation of insurance contracts.',
    kk: 'Корпоративтік клиенттерді тарту, ұсыныс дайындау, сақтандыру шарттарын жасасу және белсендіру.',
    az: 'Korporativ müştərilərin cəlb edilməsi, təklifin hazırlanması, sığorta müqavilələrinin bağlanması və aktivləşdirilməsi.',
  },

  'Сопровождение действующих корпоративных клиентов и своевременное продление договоров.': {
    ru: 'Сопровождение действующих корпоративных клиентов и своевременное продление договоров.',
    en: 'Support of existing corporate clients and timely renewal of contracts.',
    kk: 'Қолданыстағы корпоративтік клиенттерді сүйемелдеу және шарттарды уақытында ұзарту.',
    az: 'Mövcud korporativ müştərilərin müşayiəti və müqavilələrin vaxtında yenilənməsi.',
  },

  'Выявление дополнительных потребностей действующих клиентов и продажа дополнительных страховых продуктов.': {
    ru: 'Выявление дополнительных потребностей действующих клиентов и продажа дополнительных страховых продуктов.',
    en: 'Identifying additional needs of existing clients and selling additional insurance products.',
    kk: 'Қолданыстағы клиенттердің қосымша қажеттіліктерін анықтау және қосымша сақтандыру өнімдерін сату.',
    az: 'Mövcud müştərilərin əlavə ehtiyaclarının müəyyən edilməsi və əlavə sığorta məhsullarının satışı.',
  },

  'Выполнение установленного плана продаж и KPI.': {
    ru: 'Выполнение установленного плана продаж и KPI.',
    en: 'Achievement of the established sales plan and KPIs.',
    kk: 'Белгіленген сату жоспары мен KPI көрсеткіштерін орындау.',
    az: 'Müəyyən edilmiş satış planının və KPI göstəricilərinin yerinə yetirilməsi.',
  },

  'Стабилизация клиента после заключения договора и предотвращение досрочного расторжения.': {
    ru: 'Стабилизация клиента после заключения договора и предотвращение досрочного расторжения.',
    en: 'Stabilizing the client after contract conclusion and preventing early termination.',
    kk: 'Шарт жасалғаннан кейін клиенттің тұрақтылығын қамтамасыз ету және мерзімінен бұрын бұзылудың алдын алу.',
    az: 'Müqavilə bağlandıqdan sonra müştərinin sabit saxlanılması və vaxtından əvvəl xitamın qarşısının alınması.',
  },

  'Стабильное выполнение целей роли и поддержание результата в течение года.': {
    ru: 'Стабильное выполнение целей роли и поддержание результата в течение года.',
    en: 'Consistent achievement of role objectives and maintenance of results throughout the year.',
    kk: 'Рөл мақсаттарын тұрақты орындау және жыл бойы нәтижені сақтау.',
    az: 'Rol məqsədlərinin sabit şəkildə yerinə yetirilməsi və nəticənin il ərzində qorunması.',
  },

  'Критерии': {
    ru: 'Критерии',
    en: 'Criteria',
    kk: 'Критерийлер',
    az: 'Meyarlar',
  },

  'Роль и прогресс': {
    ru: 'Роль и прогресс',
    en: 'Role and progress',
    kk: 'Рөл және прогресс',
    az: 'Rol və irəliləyiş',
  },

  'фактический прогресс': {
    ru: 'фактический прогресс',
    en: 'actual progress',
    kk: 'нақты прогресс',
    az: 'faktiki irəliləyiş',
  },

  'Этап контракта': {
    ru: 'Этап контракта',
    en: 'Contract stage',
    kk: 'Келісімшарт кезеңі',
    az: 'Müqavilə mərhələsi',
  },

  'Принят в работу': {
    ru: 'Принят в работу',
    en: 'In progress',
    kk: 'Жұмысқа қабылданды',
    az: 'İşə qəbul edilib',
  },

  'Выполнен': {
    ru: 'Выполнен',
    en: 'Completed',
    kk: 'Орындалды',
    az: 'Tamamlandı',
  },

  'Подготовка': {
    ru: 'Подготовка',
    en: 'Preparation',
    kk: 'Дайындық',
    az: 'Hazırlıq',
  },

  'Договоры': {
    ru: 'Договоры',
    en: 'Contracts',
    kk: 'Шарттар',
    az: 'Müqavilələr',
  },

  'Клиенты': {
    ru: 'Клиенты',
    en: 'Clients',
    kk: 'Клиенттер',
    az: 'Müştərilər',
  },

  'План продаж': {
    ru: 'План продаж',
    en: 'Sales plan',
    kk: 'Сату жоспары',
    az: 'Satış planı',
  },

  'Статус': {
    ru: 'Статус',
    en: 'Status',
    kk: 'Мәртебе',
    az: 'Status',
  },

  'В работе': {
    ru: 'В работе',
    en: 'In progress',
    kk: 'Жұмыста',
    az: 'İşdədir',
  },

  'Вес': {
    ru: 'Вес',
    en: 'Weight',
    kk: 'Салмақ',
    az: 'Çəki',
  },

  'KPI контракта': {
    ru: 'KPI контракта',
    en: 'Contract KPIs',
    kk: 'Келісімшарт KPI',
    az: 'Müqavilə KPI-ları',
  },

  'Звонки': {
    ru: 'Звонки',
    en: 'Calls',
    kk: 'Қоңыраулар',
    az: 'Zənglər',
  },

  'Встречи': {
    ru: 'Встречи',
    en: 'Meetings',
    kk: 'Кездесулер',
    az: 'Görüşlər',
  },

  'КП': {
    ru: 'КП',
    en: 'Proposals',
    kk: 'Ұсыныстар',
    az: 'Təkliflər',
  },

  'Привлечение корпоративных клиентов': {
    ru: 'Привлечение корпоративных клиентов',
    en: 'Corporate client acquisition',
    kk: 'Корпоративтік клиенттерді тарту',
    az: 'Korporativ müştərilərin cəlb edilməsi',
  },

  'Договор создан и активирован.': {
    ru: 'Договор создан и активирован.',
    en: 'The contract has been created and activated.',
    kk: 'Шарт жасалып, белсендірілді.',
    az: 'Müqavilə yaradılıb və aktivləşdirilib.',
  },

  'Есть подтвержденное продление договора.': {
    ru: 'Есть подтвержденное продление договора.',
    en: 'The contract renewal has been confirmed.',
    kk: 'Шарттың ұзартылғаны расталды.',
    az: 'Müqavilənin yenilənməsi təsdiqlənib.',
  },

  'Дополнительный договор или продукт активирован и оплачен.': {
    ru: 'Дополнительный договор или продукт активирован и оплачен.',
    en: 'The additional contract or product has been activated and paid for.',
    kk: 'Қосымша шарт немесе өнім белсендіріліп, төленді.',
    az: 'Əlavə müqavilə və ya məhsul aktivləşdirilib və ödənilib.',
  },

  'Фактический результат подтвержден данными системы учета.': {
    ru: 'Фактический результат подтвержден данными системы учета.',
    en: 'The actual result is confirmed by accounting system data.',
    kk: 'Нақты нәтиже есеп жүйесінің деректерімен расталды.',
    az: 'Faktiki nəticə uçot sistemi məlumatları ilə təsdiqlənir.',
  },

  'Клиент сохраняется не менее 90 дней после заключения договора.': {
    ru: 'Клиент сохраняется не менее 90 дней после заключения договора.',
    en: 'The client remains active for at least 90 days after contract conclusion.',
    kk: 'Клиент шарт жасалғаннан кейін кемінде 90 күн сақталады.',
    az: 'Müştəri müqavilə bağlandıqdan sonra ən azı 90 gün saxlanılır.',
  },

  'Нет досрочного расторжения, возврата или отмены в течение 90 дней.': {
    ru: 'Нет досрочного расторжения, возврата или отмены в течение 90 дней.',
    en: 'There is no early termination, refund or cancellation within 90 days.',
    kk: '90 күн ішінде мерзімінен бұрын бұзу, қайтару немесе жою болмайды.',
    az: '90 gün ərzində vaxtından əvvəl xitam, geri qaytarma və ya ləğv yoxdur.',
  },

  'Годовые условия результативности выполнены.': {
    ru: 'Годовые условия результативности выполнены.',
    en: 'Annual performance conditions have been met.',
    kk: 'Жылдық нәтижелілік шарттары орындалды.',
    az: 'İllik nəticəlilik şərtləri yerinə yetirilib.',
  },

  'Накопленный результат и годовые KPI подтверждены системой.': {
    ru: 'Накопленный результат и годовые KPI подтверждены системой.',
    en: 'Accumulated results and annual KPIs are confirmed by the system.',
    kk: 'Жинақталған нәтиже мен жылдық KPI жүйемен расталды.',
    az: 'Toplanmış nəticə və illik KPI-lar sistem tərəfindən təsdiqlənib.',
  },
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function ratio(actual: number, target: number) {
  return target > 0 ? clamp((actual / target) * 100) : 0;
}

function numberFromPayload(payload: unknown, keys: string[]) {
  if (!payload || typeof payload !== 'object') return 0;

  const source = payload as Record<string, unknown>;

  for (const key of keys) {
    const value = Number(source[key]);

    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  return 0;
}

export function RoleSkillsProgressPanel({
  roleId,
  contractId,
}: RoleSkillsProgressPanelProps) {
  const { t, i18n } = useTranslation();

  const currentLanguage: SupportedLanguage =
    i18n.resolvedLanguage === 'en' ||
    i18n.resolvedLanguage === 'kk' ||
    i18n.resolvedLanguage === 'az'
      ? i18n.resolvedLanguage
      : 'ru';

  const translateText = (value: string | null | undefined) => {
    if (!value) return '';

    const translation = TEXT_TRANSLATIONS[value];

    if (translation) {
      return translation[currentLanguage];
    }

    return value;
  };

  const translateSkillName = (name: string) => {
    return translateText(name);
  };

  const translateSkillDescription = (description: string | null | undefined) => {
    return translateText(description);
  };

  const translateCriteria = (criteria: string) => {
    return translateText(criteria);
  };

  const translateRoleName = (name: string) => {
    return translateText(name);
  };

  const effectiveContractId =
    contractId || useParams<{ id: string }>().id || '';

  const [loading, setLoading] = useState(true);
  const [roleName, setRoleName] = useState('');
  const [skills, setSkills] = useState<SkillRow[]>([]);
  const [events, setEvents] = useState<Set<string>>(new Set());
  const [contractProgress, setContractProgress] =
    useState<ContractProgress | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!effectiveContractId) {
        setLoading(false);
        return;
      }

      try {
        const demo =
          getDemoContractById(effectiveContractId) ||
          getCompletedDemoContractById(effectiveContractId);

        if (demo) {
          const actualRevenue = getActualContractRevenue(demo);

          setRoleName('Страховой агент');
          setSkills(DEMO_SKILLS);

          setEvents(
            new Set(
              (demo.oracle_events || []).map(
                (event: any) => event.event_type,
              ),
            ),
          );

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
            plannedRevenue: Number(
              demo.planned_revenue || demo.revenue || 0,
            ),
            isDemo: true,
          });

          return;
        }

        const {
          data: contractData,
          error: contractError,
        } = await supabase
          .from('contracts')
          .select(
            'role_id, status, target_clients_new, revenue, planned_revenue',
          )
          .eq('id', effectiveContractId)
          .maybeSingle();

        if (contractError) throw contractError;
        if (!contractData) return;

        const effectiveRoleId = roleId || contractData.role_id || null;

        const [
          { data: roleData, error: roleError },
          { data: oracleData, error: oracleError },
        ] = await Promise.all([
          effectiveRoleId
            ? supabase
                .from('roles')
                .select(
                  'name, role_skills(weight, skills(name, description, verification_level, expected_outcomes, verification_criteria))',
                )
                .eq('id', effectiveRoleId)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),

          supabase
            .from('oracle_events')
            .select('event_type, payload')
            .eq('contract_id', effectiveContractId),
        ]);

        if (roleError || !roleData) {
          setRoleName('Страховой агент');
          setSkills(DEMO_SKILLS);
        } else {
          const normalizedSkills: SkillRow[] = (
            roleData.role_skills || []
          ).flatMap((row: any) => {
            const relatedSkills = Array.isArray(row.skills)
              ? row.skills
              : [row.skills];

            return relatedSkills
              .filter(Boolean)
              .map((skill: Skill) => ({
                weight: Number(row.weight || 0),
                skills: skill,
              }));
          });

          setRoleName(roleData.name || 'Страховой агент');
          setSkills(
            normalizedSkills.length ? normalizedSkills : DEMO_SKILLS,
          );
        }

        if (oracleError) {
          console.warn(
            'Не удалось загрузить события Oracle:',
            oracleError,
          );
        }

        const oracleEvents = oracleData || [];

        const actualClients = oracleEvents.reduce(
          (max, event: any) =>
            Math.max(
              max,
              numberFromPayload(event.payload, [
                'actual_clients',
                'clients',
                'actualClients',
              ]),
            ),
          0,
        );

        const actualRevenue = oracleEvents.reduce(
          (max, event: any) =>
            Math.max(
              max,
              numberFromPayload(event.payload, [
                'actual_contract_revenue',
                'actual_revenue',
                'contract_revenue',
                'revenue',
                'amount',
              ]),
            ),
          0,
        );

        setEvents(
          new Set(
            oracleEvents.map((event: any) => event.event_type),
          ),
        );

        setContractProgress({
          status: contractData.status || '',
          actualClients,
          targetClients: Number(contractData.target_clients_new || 0),
          actualCalls: 0,
          targetCalls: 0,
          actualMeetings: 0,
          targetMeetings: 0,
          actualProposals: 0,
          targetProposals: 0,
          actualRevenue,
          plannedRevenue: Number(
            contractData.planned_revenue || contractData.revenue || 0,
          ),
          isDemo: false,
        });
      } catch (error) {
        console.error(
          'Ошибка загрузки прогресса роли:',
          error,
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [roleId, effectiveContractId]);

  useEffect(() => {
    const panels = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-role-progress-panel]',
      ),
    );

    panels.forEach((panel, index) => {
      panel.style.display = index === 0 ? '' : 'none';
    });
  });

  const salesProgress = useMemo(
    () =>
      ratio(
        contractProgress?.actualClients || 0,
        contractProgress?.targetClients || 0,
      ),
    [contractProgress],
  );

  const planProgress = useMemo(
    () =>
      ratio(
        contractProgress?.actualRevenue || 0,
        contractProgress?.plannedRevenue || 0,
      ),
    [contractProgress],
  );

  const operationalProgress = useMemo(() => {
    if (!contractProgress) return 0;

    const values = [
      ratio(
        contractProgress.actualCalls,
        contractProgress.targetCalls,
      ),
      ratio(
        contractProgress.actualMeetings,
        contractProgress.targetMeetings,
      ),
      ratio(
        contractProgress.actualProposals,
        contractProgress.targetProposals,
      ),
      salesProgress,
    ].filter((value) => value > 0);

    return values.length
      ? clamp(
          values.reduce((sum, value) => sum + value, 0) /
            values.length,
        )
      : 0;
  }, [contractProgress, salesProgress]);

  const progressForSkill = (skillName: string) => {
    const name = skillName.toLowerCase();

    if (
      name.includes('кросс') ||
      name.includes('cross')
    ) {
      return events.has('CROSS_SELL_CONFIRMED') ? 100 : 0;
    }

    if (
      name.includes('продлен') ||
      name.includes('renewal')
    ) {
      return events.has('RENEWAL_CONFIRMED') ? 100 : 0;
    }

    if (
      name.includes('план') ||
      name.includes('plan')
    ) {
      return events.has('PLAN_ACHIEVED')
        ? 100
        : planProgress;
    }

    if (
      name.includes('удерж') &&
      !name.includes('90')
    ) {
      return events.has('RENEWAL_CONFIRMED') ? 100 : 0;
    }

    if (name.includes('90')) {
      return events.has('RETENTION_PERIOD_PASSED')
        ? 100
        : 0;
    }

    if (
      name.includes('долгоср') ||
      name.includes('long')
    ) {
      return contractProgress?.status === 'COMPLETED'
        ? 100
        : 0;
    }

    if (
      name.includes('продаж') ||
      name.includes('sales') ||
      name.includes('корпоратив')
    ) {
      return salesProgress;
    }

    return operationalProgress;
  };

  const weightedProgress = useMemo(() => {
    if (!skills.length) return operationalProgress;

    const totalWeight = skills.reduce(
      (sum, item) => sum + Number(item.weight || 0),
      0,
    );

    if (!totalWeight) return operationalProgress;

    return clamp(
      skills.reduce(
        (sum, item) =>
          sum +
          progressForSkill(item.skills?.name || '') *
            Number(item.weight || 0),
        0,
      ) / totalWeight,
    );
  }, [
    skills,
    events,
    salesProgress,
    planProgress,
    operationalProgress,
    contractProgress,
  ]);

  if (loading || !roleName || !skills.length) {
    return null;
  }

  const accepted =
    contractProgress?.status === 'ACTIVE' ||
    contractProgress?.status === 'IN_PROGRESS';

  const completed =
    contractProgress?.status === 'COMPLETED';

  const stageLabel = accepted
    ? 'Принят в работу'
    : completed
      ? 'Выполнен'
      : 'Подготовка';

  const stageProgress = completed
    ? 100
    : weightedProgress;

  return (
    <section
      data-role-progress-panel
      className="w-full max-w-4xl mx-auto bg-white border border-gray-100 rounded-2xl shadow-sm px-4 py-4 md:px-5 md:py-5"
    >
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[#B8860B] text-xs font-semibold uppercase tracking-wide">
            <Target className="w-3.5 h-3.5" />

            {t('roleProgress.roleAndProgress', {
              defaultValue: translateText('Роль и прогресс'),
            })}
          </div>

          <h2 className="text-lg font-bold text-[#000052] mt-0.5 truncate">
            {translateRoleName(roleName)}
          </h2>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-xl font-bold text-[#000052] leading-none">
            {weightedProgress}%
          </div>

          <div className="text-[10px] text-gray-400 mt-1">
            {t('roleProgress.actualProgress', {
              defaultValue: translateText(
                'фактический прогресс',
              ),
            })}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between text-[11px] mb-1.5">
          <span className="font-semibold text-[#000052]">
            {t('roleProgress.contractStage', {
              defaultValue: translateText(
                'Этап контракта',
              ),
            })}
            :{' '}
            {translateText(stageLabel)}
          </span>

          <span className="text-gray-400">
            {stageProgress}%
          </span>
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
          <div className="text-[10px] text-gray-400">
            {translateText('Договоры')}
          </div>

          <div className="text-sm font-bold text-[#000052]">
            $
            {Number(
              contractProgress?.actualRevenue || 0,
            ).toLocaleString()}{' '}
            / $
            {Number(
              contractProgress?.plannedRevenue || 0,
            ).toLocaleString()}
          </div>
        </div>

        <div className="rounded-lg bg-[#000052]/5 px-3 py-2">
          <div className="text-[10px] text-gray-400">
            {translateText('Клиенты')}
          </div>

          <div className="text-sm font-bold text-[#000052]">
            {contractProgress?.actualClients || 0}/
            {contractProgress?.targetClients || 0}
          </div>
        </div>

        <div className="rounded-lg bg-[#000052]/5 px-3 py-2">
          <div className="text-[10px] text-gray-400">
            {translateText('План продаж')}
          </div>

          <div className="text-sm font-bold text-[#000052]">
            {planProgress}%
          </div>
        </div>

        <div className="rounded-lg bg-[#000052]/5 px-3 py-2">
          <div className="text-[10px] text-gray-400">
            {translateText('Статус')}
          </div>

          <div className="text-sm font-bold text-[#000052]">
            {accepted
              ? translateText('В работе')
              : completed
                ? translateText('Выполнен')
                : translateText('Подготовка')}
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {skills.map((item, index) => {
          const skill = item.skills;

          if (!skill) return null;

          const progress = progressForSkill(
            skill.name,
          );

          const weight = Number(item.weight || 0);

          const displayWeight =
            weight <= 1 ? weight * 100 : weight;

          return (
            <div
              key={`${skill.name}-${index}`}
              className="py-2.5 first:pt-0 last:pb-0"
            >
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className="text-sm font-semibold text-[#000052] truncate">
                  {translateSkillName(skill.name)}
                </span>

                <span className="shrink-0 text-[11px] text-gray-400">
                  {translateText('Вес')} {displayWeight}% ·{' '}
                  {progress}%
                </span>
              </div>

              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#B8860B] rounded-full transition-all"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>

              {skill.description && (
                <p className="text-[11px] text-gray-500 mt-1">
                  {translateSkillDescription(
                    skill.description,
                  )}
                </p>
              )}

              {skill.expected_outcomes?.length ? (
                <p className="text-[10px] text-gray-400 mt-0.5">
                  <span className="font-semibold">
                    {t('roleProgress.expectedOutcome', {
                      defaultValue: 'Expected outcome',
                    })}
                    :
                  </span>{' '}
                  {skill.expected_outcomes
                    .map((outcome) =>
                      translateText(outcome),
                    )
                    .join(' · ')}
                </p>
              ) : null}

              {skill.verification_criteria?.length ? (
                <p className="text-[10px] text-gray-400 mt-0.5">
                  <span className="font-semibold">
                    {translateText('Критерии')}:
                  </span>{' '}
                  {skill.verification_criteria
                    .map((criterion) =>
                      translateCriteria(criterion),
                    )
                    .join(' · ')}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#000052] mb-2">
          <Activity className="w-3.5 h-3.5 text-[#B8860B]" />

          {translateText('KPI контракта')}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="rounded-lg bg-gray-50 px-3 py-2">
            <div className="text-[10px] text-gray-400">
              {translateText('Звонки')}
            </div>

            <div className="text-sm font-bold text-[#000052]">
              {contractProgress?.actualCalls || 0}/
              {contractProgress?.targetCalls || 0}
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 px-3 py-2">
            <div className="text-[10px] text-gray-400">
              {translateText('Встречи')}
            </div>

            <div className="text-sm font-bold text-[#000052]">
              {contractProgress?.actualMeetings || 0}/
              {contractProgress?.targetMeetings || 0}
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 px-3 py-2">
            <div className="text-[10px] text-gray-400">
              {translateText('КП')}
            </div>

            <div className="text-sm font-bold text-[#000052]">
              {contractProgress?.actualProposals || 0}/
              {contractProgress?.targetProposals || 0}
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 px-3 py-2">
            <div className="text-[10px] text-gray-400">
              {translateText('Клиенты')}
            </div>

            <div className="text-sm font-bold text-[#000052]">
              {contractProgress?.actualClients || 0}/
              {contractProgress?.targetClients || 0}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
