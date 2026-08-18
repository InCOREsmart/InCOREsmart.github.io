import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Lightbulb, RefreshCw, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { SkillDefinition } from '../../types/decomposition';

type MarketRow = {
  canonical_skill: string;
  demand_count: number;
  demand_share: number;
  supply_count: number;
  supply_share: number;
  skill_gap: number;
};

type Stat = {
  skill: SkillDefinition;
  vacancies: number;
  resumes: number;
  vacancyShare: number | null;
  resumeShare: number | null;
  gap: number | null;
  salary: number | null;
};

const MATCHES: Record<string, string[]> = {
  'Продажи корпоративного страхования': ['продажа страховых продуктов', 'страхование', 'корпоративное страхование', 'активные продажи', 'прямые продажи', 'поиск и привлечение клиентов', 'b2b'],
  'Удержание клиентов': ['удержание клиентов', 'развитие клиентской базы', 'продление договоров', 'пролонгация договоров', 'работа с клиентами', 'клиентоориентированность', 'удержание 90', '90 дней', 'retention'],
  'Кросс-продажи': ['кросс-продажи', 'кросс продажи', 'допродажи', 'cross-sell'],
  'Выполнение плана продаж': ['план продаж', 'выполнение плана', 'kpi', 'ориентация на результат', 'навыки продаж', 'развитие продаж'],
  'Долгосрочная результативность': ['ориентация на результат', 'нацеленность на результат', 'работа на результат', 'долгосрочная результативность', 'годовой результат'],
};

const COPY = {
  ru: { title: 'Карта рынка навыков', subtitle: 'Реальные данные HH.ru сопоставлены с требованиями этой роли.', refresh: 'Обновить данные рынка', loading: 'Загружаем данные HH.ru…', empty: 'Для этой роли пока нет сопоставленных рыночных данных HH.ru.', error: 'Не удалось загрузить данные рынка', deficit: 'Дефицитных навыков', balance: 'Баланс рынка', surplus: 'Профицитных навыков', gap: 'Рыночный разрыв Skill Gap', gapHelp: 'Положительное значение = дефицит навыка на рынке. Отрицательное = профицит.', skill: 'Навык', weight: 'Вес роли', vacancies: 'Вакансии', resumes: 'Резюме', salary: 'Зарплата', actions: 'Что делать по результатам рынка', actionsHelp: 'Рекомендации учитывают реальный Skill Gap и вес навыка в этой роли.', priority: 'Главный приоритет', critical: 'Критический', high: 'Высокий', moderate: 'Средний', noCritical: 'Критического дефицита навыков не выявлено.', noDirectData: 'Прямого рыночного сопоставления пока нет.', deficitSummary: 'Рынок показывает дефицит навыков. В первую очередь усиливайте поиск и проверку кандидатов по навыкам с максимальным разрывом и весом роли.', balanceSummary: 'Спрос и предложение находятся в относительном балансе. Основной резерв улучшения сейчас в качестве оценки кандидатов.', surplusSummary: 'Критического дефицита нет. Используйте рыночные данные для повышения точности отбора.', addScreening: 'Добавьте навык в обязательный скрининг и практическое задание: спрос на рынке существенно выше доступного предложения.', strengthen: 'Усильте скрининг и оценку навыка: сравнивайте кандидатов по реальным кейсам.', moderateAction: 'Оставьте навык в фокусе отбора, но не завышайте порог: дефицит умеренный.', surplusAction: 'Не делайте навык главным фильтром: предложение превышает спрос.', enoughAction: 'Навык доступен на рынке в достаточном объёме. Используйте его как дополнительный критерий.', ppts: 'п.п.' },
  en: { title: 'Skills market map', subtitle: 'Real HH.ru data is matched against the requirements of this role.', refresh: 'Refresh market data', loading: 'Loading HH.ru data…', empty: 'No matched HH.ru market data is available for this role yet.', error: 'Failed to load market data', deficit: 'Skills in shortage', balance: 'Market balance', surplus: 'Skills in surplus', gap: 'Market Skill Gap', gapHelp: 'Positive value = skill shortage. Negative value = surplus.', skill: 'Skill', weight: 'Role weight', vacancies: 'Vacancies', resumes: 'Resumes', salary: 'Salary', actions: 'What to do based on the market', actionsHelp: 'Recommendations use the real Skill Gap and role skill weight.', priority: 'Top priority', critical: 'Critical', high: 'High', moderate: 'Medium', noCritical: 'No critical skill shortage was identified.', noDirectData: 'There is no direct market match yet.', deficitSummary: 'The market shows a skill shortage. Prioritize search and candidate assessment for skills with the largest gap and role weight.', balanceSummary: 'Demand and supply are relatively balanced. The main improvement opportunity is candidate assessment quality.', surplusSummary: 'There is no critical shortage. Use market data to improve selection accuracy.', addScreening: 'Add the skill to mandatory screening and a practical task: market demand is substantially higher than available supply.', strengthen: 'Strengthen screening and skill assessment using real candidate cases.', moderateAction: 'Keep the skill in selection focus, but do not raise the threshold excessively: the shortage is moderate.', surplusAction: 'Do not make the skill the main filter: supply exceeds demand.', enoughAction: 'The skill is sufficiently available on the market. Use it as an additional criterion.', ppts: 'pp.' },
  kk: { title: 'Дағдылар нарығының картасы', subtitle: 'Нақты HH.ru деректері осы рөлдің талаптарымен салыстырылды.', refresh: 'Нарық деректерін жаңарту', loading: 'HH.ru деректері жүктелуде…', empty: 'Бұл рөл үшін сәйкестендірілген HH.ru нарық деректері әлі жоқ.', error: 'Нарық деректерін жүктеу мүмкін болмады', deficit: 'Тапшы дағдылар', balance: 'Нарық теңгерімі', surplus: 'Артық дағдылар', gap: 'Нарықтық Skill Gap', gapHelp: 'Оң мән = дағды тапшылығы. Теріс мән = артық ұсыныс.', skill: 'Дағды', weight: 'Рөл салмағы', vacancies: 'Вакансиялар', resumes: 'Түйіндемелер', salary: 'Жалақы', actions: 'Нарық нәтижелері бойынша не істеу керек', actionsHelp: 'Ұсынымдар нақты Skill Gap пен рөлдегі дағды салмағын ескереді.', priority: 'Негізгі басымдық', critical: 'Критикалық', high: 'Жоғары', moderate: 'Орташа', noCritical: 'Критикалық дағды тапшылығы анықталған жоқ.', noDirectData: 'Тікелей нарықтық сәйкестік әлі жоқ.', deficitSummary: 'Нарықта дағдылар тапшылығы бар. Ең үлкен алшақтық пен рөл салмағы бар дағдылар бойынша іздеу мен бағалауды күшейтіңіз.', balanceSummary: 'Сұраныс пен ұсыныс салыстырмалы түрде теңгерілген. Негізгі мүмкіндік кандидаттарды бағалау сапасында.', surplusSummary: 'Критикалық тапшылық жоқ. Іріктеу дәлдігін арттыру үшін нарық деректерін пайдаланыңыз.', addScreening: 'Дағдыны міндетті скринингке және практикалық тапсырмаға қосыңыз: нарық сұранысы ұсыныстан айтарлықтай жоғары.', strengthen: 'Нақты кандидат кейстері арқылы скрининг пен дағды бағалауын күшейтіңіз.', moderateAction: 'Дағдыны іріктеу фокусында қалдырыңыз, бірақ шекті тым көтермеңіз: тапшылық орташа.', surplusAction: 'Дағдыны негізгі сүзгі етпеңіз: ұсыныс сұраныстан жоғары.', enoughAction: 'Дағды нарықта жеткілікті. Оны қосымша критерий ретінде пайдаланыңыз.', ppts: 'п.п.' },
  az: { title: 'Bacarıqlar bazarı xəritəsi', subtitle: 'Real HH.ru məlumatları bu rolun tələbləri ilə müqayisə edilir.', refresh: 'Bazar məlumatlarını yenilə', loading: 'HH.ru məlumatları yüklənir…', empty: 'Bu rol üçün uyğunlaşdırılmış HH.ru bazar məlumatı hələ yoxdur.', error: 'Bazar məlumatlarını yükləmək mümkün olmadı', deficit: 'Çatışmayan bacarıqlar', balance: 'Bazar balansı', surplus: 'Artıq bacarıqlar', gap: 'Bazar Skill Gap', gapHelp: 'Müsbət dəyər = bacarıq çatışmazlığı. Mənfi dəyər = artıq təklif.', skill: 'Bacarıq', weight: 'Rol çəkisi', vacancies: 'Vakansiyalar', resumes: 'CV-lər', salary: 'Maaş', actions: 'Bazar nəticələrinə əsasən nə etməli', actionsHelp: 'Tövsiyələr real Skill Gap-i və bacarığın rol çəkisini nəzərə alır.', priority: 'Əsas prioritet', critical: 'Kritik', high: 'Yüksək', moderate: 'Orta', noCritical: 'Kritik bacarıq çatışmazlığı müəyyən edilmədi.', noDirectData: 'Birbaşa bazar uyğunluğu hələ yoxdur.', deficitSummary: 'Bazar bacarıq çatışmazlığını göstərir. Ən böyük fərqə və rol çəkisinə malik bacarıqlar üzrə axtarışı və qiymətləndirməni gücləndirin.', balanceSummary: 'Tələb və təklif nisbətən balanslıdır. Əsas imkan namizədlərin qiymətləndirilməsi keyfiyyətindədir.', surplusSummary: 'Kritik çatışmazlıq yoxdur. Seçim dəqiqliyini artırmaq üçün bazar məlumatlarından istifadə edin.', addScreening: 'Bacarığı məcburi skrininqə və praktiki tapşırığa əlavə edin: bazar tələbi mövcud təklifdən xeyli yüksəkdir.', strengthen: 'Real namizəd кейsləri ilə skrininqi və bacarıq qiymətləndirməsini gücləndirin.', moderateAction: 'Bacarığı seçim fokusunda saxlayın, lakin həddi həddən artıq yüksəltməyin: çatışmazlıq orta səviyyədədir.', surplusAction: 'Bacarığı əsas filtr etməyin: təklif tələbdən yüksəkdir.', enoughAction: 'Bacarıq bazarda kifayət qədər mövcuddur. Əlavə meyar kimi istifadə edin.', ppts: 'f.b.' },
} as const;

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/ё/g, 'е');
}

function rowMatches(row: MarketRow, terms: string[]) {
  const name = normalize(row.canonical_skill);
  return terms.some(term => name.includes(normalize(term)));
}

export function RoleMarketAnalysis({ skills }: { skills: SkillDefinition[] }) {
  const { i18n } = useTranslation();
  const detected = (i18n.resolvedLanguage || i18n.language || 'ru').split('-')[0];
  const lang = (detected === 'kz' ? 'kk' : detected) as keyof typeof COPY;
  const copy = COPY[lang] || COPY.ru;
  const [rows, setRows] = useState<MarketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    const { data, error: queryError } = await supabase
      .from('hh_skill_market_gap')
      .select('canonical_skill,demand_count,demand_share,supply_count,supply_share,skill_gap')
      .eq('role_key', 'insurance_agent')
      .eq('country', 'RU');
    if (queryError) {
      setError(`${copy.error}: ${queryError.message}`);
      setRows([]);
    } else {
      setRows((data ?? []).map(row => ({
        canonical_skill: String(row.canonical_skill ?? ''),
        demand_count: Number(row.demand_count ?? 0),
        demand_share: Number(row.demand_share ?? 0),
        supply_count: Number(row.supply_count ?? 0),
        supply_share: Number(row.supply_share ?? 0),
        skill_gap: Number(row.skill_gap ?? 0),
      })));
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const stats = useMemo<Stat[]>(() => skills.map(skill => {
    const terms = MATCHES[skill.name] ?? [skill.name];
    const matched = rows.filter(row => rowMatches(row, terms));
    if (!matched.length) return { skill, vacancies: 0, resumes: 0, vacancyShare: null, resumeShare: null, gap: null, salary: null };
    const vacancyShare = Math.max(...matched.map(row => row.demand_share));
    const resumeShare = Math.max(...matched.map(row => row.supply_share));
    return {
      skill,
      vacancies: Math.max(...matched.map(row => row.demand_count)),
      resumes: Math.max(...matched.map(row => row.supply_count)),
      vacancyShare,
      resumeShare,
      gap: vacancyShare - resumeShare,
      salary: null,
    };
  }), [rows, skills]);

  const ordered = useMemo(() => [...stats].sort((a, b) => (b.gap ?? -Infinity) - (a.gap ?? -Infinity)), [stats]);
  const deficit = ordered.filter(stat => stat.gap !== null && stat.gap > 0);
  const surplus = ordered.filter(stat => stat.gap !== null && stat.gap < 0);
  const balance = ordered.filter(stat => stat.gap === 0);
  const priority = deficit.slice(0, 3);
  const matchedCount = ordered.filter(stat => stat.gap !== null).length;
  const marketSummary = deficit.length ? copy.deficitSummary : surplus.length ? copy.surplusSummary : copy.balanceSummary;

  const recommendation = (stat: Stat) => {
    const gap = stat.gap ?? 0;
    if (gap >= 5) return stat.resumes === 0 ? copy.addScreening : copy.strengthen;
    if (gap > 0) return copy.moderateAction;
    if (gap < 0) return copy.surplusAction;
    return copy.enoughAction;
  };

  const priorityLabel = (stat: Stat) => {
    const gap = stat.gap ?? 0;
    if (gap >= 10 && stat.skill.weight >= 0.2) return copy.critical;
    if (gap >= 5) return copy.high;
    return copy.moderate;
  };

  return (
    <section className="w-full min-w-0 overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="border-b border-gray-100 p-5 md:p-6">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#B8860B]/10"><BarChart3 className="h-5 w-5 text-[#B8860B]" /></div><div className="min-w-0"><h3 className="break-words text-lg font-bold text-[#000052]">{copy.title}</h3><p className="mt-1 break-words text-sm text-gray-500">{copy.subtitle}</p></div></div>
          <button type="button" onClick={() => void load()} aria-label={copy.refresh} title={copy.refresh} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-[#000052] hover:border-[#000052] hover:bg-[#000052]/5"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
      </div>

      {loading ? <div className="p-10 text-center text-sm text-gray-400">{copy.loading}</div> : error ? <div className="border-t border-[#000052]/10 bg-[#f0f0fa] p-5 text-sm text-[#000052]">{error}</div> : !rows.length ? <div className="p-8 text-center text-sm text-gray-500">{copy.empty}</div> : (
        <div className="min-w-0 p-5 md:p-6">
          <div className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-3"><MarketStat label={copy.deficit} value={deficit.length} tone="navy" /><MarketStat label={copy.balance} value={balance.length} tone="gold" /><MarketStat label={copy.surplus} value={surplus.length} tone="steel" /></div>
          <div className="mb-4 min-w-0"><h4 className="break-words font-bold text-[#000052]">{copy.gap}</h4><p className="mt-1 break-words text-xs text-gray-400">{copy.gapHelp}</p><p className="mt-2 text-xs text-gray-400">{matchedCount} / {skills.length} {lang === 'ru' ? 'навыков роли сопоставлены с HH.ru' : lang === 'en' ? 'role skills matched with HH.ru' : lang === 'kk' ? 'рөл дағдысы HH.ru деректерімен сәйкестендірілді' : 'rol bacarığı HH.ru ilə uyğunlaşdırılıb'}</p></div>
          <div className="min-w-0 space-y-3">{ordered.map(stat => { const gap = stat.gap; const width = Math.min(100, Math.abs(gap ?? 0)); const bar = gap === null ? 'bg-gray-300' : gap > 0 ? 'bg-[#000052]' : gap < 0 ? 'bg-[#46618C]' : 'bg-[#B8860B]'; return <div key={stat.skill.name} className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(70px,2fr)_auto] items-center gap-3"><div className="min-w-0 break-words text-sm font-semibold text-[#000052]">{stat.skill.name}</div><div className="h-7 min-w-0 overflow-hidden rounded-lg bg-gray-100"><div className={`${bar} h-full rounded-lg`} style={{ width: `${width}%` }} /></div><div className="whitespace-nowrap text-right text-sm font-bold tabular-nums text-[#000052]">{gap === null ? '—' : `${gap > 0 ? '+' : ''}${gap.toFixed(1)} ${copy.ppts}`}</div></div>; })}</div>

          <div className="mt-7 min-w-0"><div className="hidden overflow-hidden rounded-xl border border-gray-100 md:block"><table className="w-full table-fixed"><thead><tr className="bg-gray-50 text-xs text-gray-500"><th className="w-[28%] p-3 text-left font-medium">{copy.skill}</th><th className="w-[13%] p-3 text-right font-medium">{copy.weight}</th><th className="w-[14%] p-3 text-right font-medium">{copy.vacancies}</th><th className="w-[14%] p-3 text-right font-medium">{copy.resumes}</th><th className="w-[15%] p-3 text-right font-medium">Skill Gap</th><th className="w-[16%] p-3 text-right font-medium">{copy.salary}</th></tr></thead><tbody className="divide-y divide-gray-100">{ordered.map(stat => <tr key={stat.skill.name}><td className="break-words p-3 font-semibold text-[#000052]">{stat.skill.name}</td><td className="p-3 text-right font-semibold tabular-nums text-[#B8860B]">{Math.round(stat.skill.weight * 100)}%</td><td className="p-3 text-right text-sm tabular-nums">{stat.vacancies} <span className="text-xs text-gray-400">({stat.vacancyShare === null ? '—' : `${stat.vacancyShare.toFixed(1)}%`})</span></td><td className="p-3 text-right text-sm tabular-nums">{stat.resumes} <span className="text-xs text-gray-400">({stat.resumeShare === null ? '—' : `${stat.resumeShare.toFixed(1)}%`})</span></td><td className={`p-3 text-right font-bold tabular-nums ${stat.gap !== null && stat.gap > 0 ? 'text-[#000052]' : stat.gap !== null && stat.gap < 0 ? 'text-[#1E3A5F]' : 'text-[#8A6508]'}`}>{stat.gap === null ? '—' : `${stat.gap > 0 ? '+' : ''}${stat.gap.toFixed(1)} ${copy.ppts}`}</td><td className="p-3 text-right text-sm tabular-nums">—</td></tr>)}</tbody></table></div>
            <div className="space-y-3 md:hidden">{ordered.map(stat => <div key={stat.skill.name} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0 break-words font-semibold text-[#000052]">{stat.skill.name}</div><span className="shrink-0 rounded-full bg-[#B8860B]/10 px-2.5 py-1 text-xs font-bold tabular-nums text-[#8A6508]">{Math.round(stat.skill.weight * 100)}%</span></div><div className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><div className="text-xs text-gray-400">{copy.vacancies}</div><div className="mt-1 font-semibold tabular-nums text-[#000052]">{stat.vacancies} <span className="font-normal text-gray-400">({stat.vacancyShare === null ? '—' : `${stat.vacancyShare.toFixed(1)}%`})</span></div></div><div><div className="text-xs text-gray-400">{copy.resumes}</div><div className="mt-1 font-semibold tabular-nums text-[#000052]">{stat.resumes} <span className="font-normal text-gray-400">({stat.resumeShare === null ? '—' : `${stat.resumeShare.toFixed(1)}%`})</span></div></div><div><div className="text-xs text-gray-400">Skill Gap</div><div className={`mt-1 font-bold tabular-nums ${stat.gap !== null && stat.gap > 0 ? 'text-[#000052]' : stat.gap !== null && stat.gap < 0 ? 'text-[#1E3A5F]' : 'text-[#8A6508]'}`}>{stat.gap === null ? '—' : `${stat.gap > 0 ? '+' : ''}${stat.gap.toFixed(1)} ${copy.ppts}`}</div></div><div><div className="text-xs text-gray-400">{copy.salary}</div><div className="mt-1 font-semibold tabular-nums text-[#000052]">—</div></div></div></div>)}</div>
          </div>

          <div className="mt-7 overflow-hidden rounded-2xl border border-[#B8860B]/20 bg-gradient-to-br from-[#fffaf0] to-white"><div className="border-b border-[#B8860B]/10 p-5"><div className="flex min-w-0 items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#B8860B]/10"><Lightbulb className="h-5 w-5 text-[#B8860B]" /></div><div className="min-w-0"><h4 className="break-words text-lg font-bold text-[#000052]">{copy.actions}</h4><p className="mt-1 break-words text-sm text-gray-600">{copy.actionsHelp}</p></div></div></div><div className="p-5"><div className="mb-5 flex min-w-0 items-start gap-3"><Target className="mt-0.5 h-5 w-5 shrink-0 text-[#000052]" /><div className="min-w-0"><div className="font-semibold text-[#000052]">{copy.priority}</div><div className="mt-1 break-words text-sm text-gray-600">{matchedCount ? marketSummary : copy.noDirectData}</div></div></div>{priority.length > 0 && <div className="space-y-3">{priority.map((stat, index) => <div key={stat.skill.name} className="rounded-xl border border-gray-100 bg-white/80 p-4"><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0 break-words font-semibold text-[#000052]">{index + 1}. {stat.skill.name}</div><span className="shrink-0 rounded-full bg-[#000052]/5 px-2.5 py-1 text-xs font-semibold text-[#000052]">{priorityLabel(stat)}</span></div><p className="mt-2 break-words text-sm leading-6 text-gray-600">{recommendation(stat)}</p></div>)}</div>}</div></div>
        </div>
      )}
    </section>
  );
}

function MarketStat({ label, value, tone }: { label: string; value: number; tone: 'navy' | 'gold' | 'steel' }) {
  const styles = { navy: 'border-[#000052]/10 bg-[#f0f0fa] text-[#000052]', gold: 'border-[#B8860B]/20 bg-[#faf3e0] text-[#8A6508]', steel: 'border-[#46618C]/15 bg-[#eef2f6] text-[#1E3A5F]' }[tone];
  return <div className={`flex min-h-[104px] min-w-0 flex-col justify-between rounded-xl border p-4 ${styles}`}><div className="break-words text-xs font-semibold">{label}</div><div className="mt-2 text-3xl font-bold leading-none tabular-nums">{value}</div></div>;
}
