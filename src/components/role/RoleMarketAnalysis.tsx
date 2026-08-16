import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Lightbulb, RefreshCw, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { SkillDefinition } from '../../types/decomposition';

type MarketProfile = {
  source_type: 'vacancy' | 'resume';
  text: string;
  salary: number | null;
  skills: string[] | null;
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

const MATCHES: Record<string, { names: string[]; patterns: string[] }> = {
  'Продажи корпоративного страхования': { names: ['Корпоративные продажи', 'Страхование', 'Продажи'], patterns: ['корпоративн', 'b2b', 'страхован', 'страховой', 'продаж'] },
  'Удержание клиентов': { names: ['Работа с клиентами', 'Развитие клиентской базы', 'Продление договоров'], patterns: ['удержан', 'продлен', 'пролонгац', 'клиентск'] },
  'Кросс-продажи': { names: ['Кросс-продажи'], patterns: ['кросс-продаж', 'cross-sell', 'cross sell', 'допродаж'] },
  'Выполнение плана продаж': { names: ['План продаж', 'Продажи'], patterns: ['план продаж', 'выполнения плана', 'выполнение плана', 'kpi'] },
  'Удержание 90 дней': { names: [], patterns: ['удержание 90', '90 дней', 'retention'] },
  'Долгосрочная результативность': { names: ['План продаж'], patterns: ['годовой результат', 'долгосрочн', 'годовых целей', 'kpi'] },
};

const COPY = {
  ru: { title: 'Карта рынка навыков', subtitle: 'Рыночные данные сопоставлены с требованиями этой роли.', refresh: 'Обновить данные рынка', loading: 'Загружаем данные рынка…', empty: 'Данные рынка пока не загружены.', error: 'Не удалось загрузить данные рынка', deficit: 'Дефицитных навыков', balance: 'Баланс рынка', surplus: 'Профицитных навыков', gap: 'Рыночный разрыв Skill Gap', gapHelp: 'Положительное значение = дефицит навыка на рынке. Отрицательное = профицит.', skill: 'Навык', weight: 'Вес роли', vacancies: 'Вакансии', resumes: 'Резюме', salary: 'Зарплата', actions: 'Что делать по результатам рынка', actionsHelp: 'Рекомендации учитывают Skill Gap и вес навыка в этой роли.', priority: 'Главный приоритет', critical: 'Критический', high: 'Высокий', moderate: 'Средний', low: 'Низкий', noCritical: 'Критического дефицита навыков не выявлено.', deficitSummary: 'Рынок показывает дефицит навыков. В первую очередь стоит усиливать поиск и проверку кандидатов по навыкам с максимальным разрывом и весом роли.', balanceSummary: 'Рынок и предложение кандидатов находятся в относительном балансе. Основной резерв улучшения сейчас не в расширении поиска, а в качестве оценки кандидатов.', surplusSummary: 'Критического дефицита нет. Рынок кандидатов в целом покрывает требования роли, поэтому можно повышать точность отбора по наиболее важным для результата навыкам.', addScreening: 'Добавить навык в обязательный скрининг и отдельное практическое задание: рынок требует его, а подходящих резюме пока нет.', strengthen: 'Усилить скрининг и оценку навыка: сравнивать кандидатов по реальным кейсам, а не только по наличию навыка в резюме.', moderateAction: 'Оставить навык в фокусе отбора, но не завышать порог: дефицит умеренный.', surplusAction: 'Не делать навык главным фильтром: кандидатов с ним больше, чем вакансий. Использовать его как дополнительный критерий.', enoughAction: 'Навык доступен на рынке в достаточном количестве. Использовать как дополнительный критерий при равных кандидатах.' },
  en: { title: 'Skills market map', subtitle: 'Market data is matched against the requirements of this role.', refresh: 'Refresh market data', loading: 'Loading market data…', empty: 'Market data has not been uploaded yet.', error: 'Failed to load market data', deficit: 'Skills in shortage', balance: 'Market balance', surplus: 'Skills in surplus', gap: 'Market gap Skill Gap', gapHelp: 'Positive value = skill shortage. Negative value = surplus.', skill: 'Skill', weight: 'Role weight', vacancies: 'Vacancies', resumes: 'Resumes', salary: 'Salary', actions: 'What to do based on the market', actionsHelp: 'Recommendations consider Skill Gap and the skill weight in this role.', priority: 'Top priority', critical: 'Critical', high: 'High', moderate: 'Medium', low: 'Low', noCritical: 'No critical skill shortage was identified.', deficitSummary: 'The market shows a skills shortage. First strengthen search and candidate assessment for skills with the largest gap and role weight.', balanceSummary: 'Market demand and candidate supply are relatively balanced. The main improvement opportunity is better candidate assessment.', surplusSummary: 'There is no critical shortage. The candidate market generally covers the role requirements, so selection accuracy can be improved around the most important skills.', addScreening: 'Add the skill to mandatory screening and a separate practical task: the market requires it, while matching resumes are not yet available.', strengthen: 'Strengthen screening and skill assessment: compare candidates using real cases, not only skill presence in a resume.', moderateAction: 'Keep the skill in focus during selection, but do not raise the threshold excessively: the shortage is moderate.', surplusAction: 'Do not make the skill the main filter: there are more candidates with it than vacancies. Use it as an additional criterion.', enoughAction: 'The skill is sufficiently available on the market. Use it as an additional criterion when candidates are otherwise equal.' },
  kk: { title: 'Дағдылар нарығының картасы', subtitle: 'Нарық деректері осы рөлдің талаптарымен салыстырылды.', refresh: 'Нарық деректерін жаңарту', loading: 'Нарық деректері жүктелуде…', empty: 'Нарық деректері әлі жүктелмеген.', error: 'Нарық деректерін жүктеу мүмкін болмады', deficit: 'Тапшы дағдылар', balance: 'Нарық теңгерімі', surplus: 'Артық дағдылар', gap: 'Нарықтық алшақтық Skill Gap', gapHelp: 'Оң мән = дағды тапшылығы. Теріс мән = артық ұсыныс.', skill: 'Дағды', weight: 'Рөл салмағы', vacancies: 'Вакансиялар', resumes: 'Түйіндемелер', salary: 'Жалақы', actions: 'Нарық нәтижелері бойынша не істеу керек', actionsHelp: 'Ұсынымдар Skill Gap пен рөлдегі дағды салмағын ескереді.', priority: 'Негізгі басымдық', critical: 'Критикалық', high: 'Жоғары', moderate: 'Орташа', low: 'Төмен', noCritical: 'Критикалық дағды тапшылығы анықталған жоқ.', deficitSummary: 'Нарықта дағдылар тапшылығы бар. Алдымен ең үлкен алшақтық пен рөл салмағы бар дағдылар бойынша іздеу мен бағалауды күшейткен жөн.', balanceSummary: 'Нарық сұранысы мен кандидаттар ұсынысы салыстырмалы түрде теңгерілген. Негізгі мүмкіндік кандидаттарды бағалау сапасында.', surplusSummary: 'Критикалық тапшылық жоқ. Кандидаттар нарығы рөл талаптарын жалпы жабады, сондықтан маңызды дағдылар бойынша іріктеу дәлдігін арттыруға болады.', addScreening: 'Дағдыны міндетті скринингке және жеке практикалық тапсырмаға қосыңыз: нарыққа бұл дағды қажет, ал сәйкес түйіндемелер әзірге жоқ.', strengthen: 'Скрининг пен дағдыны бағалауды күшейтіңіз: кандидаттарды нақты кейстерге қарай салыстырыңыз.', moderateAction: 'Дағдыны іріктеу фокусында қалдырыңыз, бірақ шекті тым көтермеңіз: тапшылық орташа.', surplusAction: 'Дағдыны негізгі сүзгі етпеңіз: оны меңгерген кандидаттар вакансиялардан көп. Қосымша критерий ретінде қолданыңыз.', enoughAction: 'Дағды нарықта жеткілікті. Қосымша критерий ретінде пайдаланыңыз.' },
  az: { title: 'Bacarıqlar bazarı xəritəsi', subtitle: 'Bazar məlumatları bu rolun tələbləri ilə müqayisə edilir.', refresh: 'Bazar məlumatlarını yenilə', loading: 'Bazar məlumatları yüklənir…', empty: 'Bazar məlumatları hələ yüklənməyib.', error: 'Bazar məlumatlarını yükləmək mümkün olmadı', deficit: 'Çatışmayan bacarıqlar', balance: 'Bazar balansı', surplus: 'Artıq bacarıqlar', gap: 'Bazar fərqi Skill Gap', gapHelp: 'Müsbət dəyər = bacarıq çatışmazlığı. Mənfi dəyər = artıqlıq.', skill: 'Bacarıq', weight: 'Rol çəkisi', vacancies: 'Vakansiyalar', resumes: 'CV-lər', salary: 'Maaş', actions: 'Bazar nəticələrinə əsasən nə etməli', actionsHelp: 'Tövsiyələr Skill Gap-i və bacarığın roldakı çəkisini nəzərə alır.', priority: 'Əsas prioritet', critical: 'Kritik', high: 'Yüksək', moderate: 'Orta', low: 'Aşağı', noCritical: 'Kritik bacarıq çatışmazlığı müəyyən edilmədi.', deficitSummary: 'Bazar bacarıq çatışmazlığını göstərir. İlk növbədə ən böyük fərqə və rol çəkisinə malik bacarıqlar üzrə axtarışı və qiymətləndirməni gücləndirmək lazımdır.', balanceSummary: 'Bazar tələbi və namizəd təklifi nisbətən balanslıdır. Əsas inkişaf imkanı namizədlərin qiymətləndirilməsinin keyfiyyətindədir.', surplusSummary: 'Kritik çatışmazlıq yoxdur. Namizəd bazarı ümumilikdə rol tələblərini qarşılayır, buna görə vacib bacarıqlar üzrə seçim dəqiqliyini artırmaq olar.', addScreening: 'Bacarığı məcburi skrininqə və ayrıca praktiki tapşırığa əlavə edin: bazarda bu bacarığa tələb var, uyğun CV-lər isə hələ yoxdur.', strengthen: 'Skrininqi və bacarıq qiymətləndirməsini gücləndirin: namizədləri real кейslər üzrə müqayisə edin.', moderateAction: 'Bacarığı seçim fokusunda saxlayın, lakin həddi həddən artıq yüksəltməyin: çatışmazlıq orta səviyyədədir.', surplusAction: 'Bacarığı əsas filtr etməyin: bu bacarığa sahib namizədlər vakansiyalardan çoxdur. Əlavə meyar kimi istifadə edin.', enoughAction: 'Bacarıq bazarda kifayət qədər mövcuddur. Əlavə meyar kimi istifadə edin.' },
} as const;

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function matches(profile: MarketProfile, mapping: { names: string[]; patterns: string[] }) {
  const body = (profile.text || '').toLowerCase();
  const skills = Array.isArray(profile.skills) ? profile.skills : [];
  return mapping.names.some(name => skills.includes(name)) || mapping.patterns.some(pattern => body.includes(pattern));
}

export function RoleMarketAnalysis({ skills }: { skills: SkillDefinition[] }) {
  const { i18n } = useTranslation();
  const detected = (i18n.resolvedLanguage || i18n.language || 'ru').split('-')[0];
  const lang = (detected === 'kz' ? 'kk' : detected) as keyof typeof COPY;
  const copy = COPY[lang] || COPY.ru;
  const [profiles, setProfiles] = useState<MarketProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    const { data, error: queryError } = await supabase
      .from('market_profiles')
      .select('source_type, text, salary, skills')
      .order('created_at', { ascending: false });
    if (queryError) {
      setError(`${copy.error}: ${queryError.message}`);
      setProfiles([]);
    } else {
      setProfiles((data ?? []) as MarketProfile[]);
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const stats = useMemo<Stat[]>(() => {
    const vacancies = profiles.filter(profile => profile.source_type === 'vacancy');
    const resumes = profiles.filter(profile => profile.source_type === 'resume');
    return skills.map(skill => {
      const mapping = MATCHES[skill.name] ?? { names: [skill.name], patterns: [skill.name.toLowerCase()] };
      const mv = vacancies.filter(profile => matches(profile, mapping));
      const mr = resumes.filter(profile => matches(profile, mapping));
      const vacancyShare = vacancies.length ? mv.length / vacancies.length * 100 : null;
      const resumeShare = resumes.length ? mr.length / resumes.length * 100 : null;
      const gap = vacancyShare !== null && resumeShare !== null ? vacancyShare - resumeShare : null;
      const salaries = mv.map(profile => profile.salary).filter((value): value is number => value !== null);
      return { skill, vacancies: mv.length, resumes: mr.length, vacancyShare, resumeShare, gap, salary: median(salaries) };
    });
  }, [profiles, skills]);

  const ordered = useMemo(() => [...stats].sort((a, b) => (b.gap ?? -Infinity) - (a.gap ?? -Infinity)), [stats]);
  const critical = ordered.filter(stat => (stat.gap ?? -Infinity) >= 20);
  const surplus = ordered.filter(stat => (stat.gap ?? Infinity) <= -20);
  const balance = ordered.filter(stat => stat.gap !== null && stat.gap > -20 && stat.gap < 20);

  const marketSummary = critical.length ? copy.deficitSummary : surplus.length ? copy.surplusSummary : copy.balanceSummary;

  const formatMoney = (value: number | null) => {
    if (value === null) return '—';
    const locale = lang === 'ru' ? 'ru-RU' : lang === 'kk' ? 'kk-KZ' : lang === 'az' ? 'az-AZ' : 'en-US';
    const currency = lang === 'ru' ? '₽' : lang === 'kk' ? '₸' : lang === 'az' ? '₼' : '$';
    return `${new Intl.NumberFormat(locale).format(Math.round(value))} ${currency}`;
  };

  const recommendation = (stat: Stat) => {
    const gap = stat.gap ?? 0;
    if (gap >= 20) return stat.resumes === 0 ? copy.addScreening : copy.strengthen;
    if (gap > 0) return copy.moderateAction;
    if (gap <= -20) return copy.surplusAction;
    return copy.enoughAction;
  };

  return (
    <section className="w-full min-w-0 overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="border-b border-gray-100 p-5 md:p-6">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#B8860B]/10"><BarChart3 className="h-5 w-5 text-[#B8860B]" /></div>
            <div className="min-w-0"><h3 className="break-words text-lg font-bold text-[#000052]">{copy.title}</h3><p className="mt-1 break-words text-sm text-gray-500">{copy.subtitle}</p></div>
          </div>
          <button type="button" onClick={() => void load()} aria-label={copy.refresh} title={copy.refresh} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-[#000052] transition-colors hover:border-[#000052] hover:bg-[#000052]/5"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
      </div>

      {loading ? <div className="p-10 text-center text-sm text-gray-400">{copy.loading}</div> : error ? <div className="border-t border-[#000052]/10 bg-[#f0f0fa] p-5 text-sm text-[#000052]">{error}</div> : !profiles.length ? <div className="p-8 text-center text-sm text-gray-500">{copy.empty}</div> : (
        <div className="min-w-0 p-5 md:p-6">
          <div className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MarketStat label={copy.deficit} value={critical.length} tone="navy" />
            <MarketStat label={copy.balance} value={balance.length} tone="gold" />
            <MarketStat label={copy.surplus} value={surplus.length} tone="steel" />
          </div>

          <div className="mb-4 min-w-0"><h4 className="break-words font-bold text-[#000052]">{copy.gap}</h4><p className="mt-1 break-words text-xs text-gray-400">{copy.gapHelp}</p></div>

          <div className="min-w-0 space-y-3">
            {ordered.map(stat => {
              const gap = stat.gap;
              const width = Math.min(100, Math.abs(gap ?? 0));
              const bar = gap === null ? 'bg-gray-300' : gap >= 20 ? 'bg-[#000052]' : gap <= -20 ? 'bg-[#46618C]' : 'bg-[#B8860B]';
              return <div key={stat.skill.name} className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(70px,2fr)_auto] items-center gap-3">
                <div className="min-w-0 break-words text-sm font-semibold text-[#000052]">{stat.skill.name}</div>
                <div className="h-7 min-w-0 overflow-hidden rounded-lg bg-gray-100"><div className={`${bar} h-full rounded-lg`} style={{ width: `${width}%` }} /></div>
                <div className="whitespace-nowrap text-right text-sm font-bold tabular-nums text-[#000052]">{gap === null ? '—' : `${gap > 0 ? '+' : ''}${gap.toFixed(1)} п.п.`}</div>
              </div>;
            })}
          </div>

          <div className="mt-7 min-w-0">
            <div className="hidden overflow-hidden rounded-xl border border-gray-100 md:block">
              <table className="w-full table-fixed">
                <thead><tr className="bg-gray-50 text-xs text-gray-500">
                  <th className="w-[28%] p-3 text-left font-medium">{copy.skill}</th><th className="w-[13%] p-3 text-right font-medium">{copy.weight}</th><th className="w-[14%] p-3 text-right font-medium">{copy.vacancies}</th><th className="w-[14%] p-3 text-right font-medium">{copy.resumes}</th><th className="w-[15%] p-3 text-right font-medium">Skill Gap</th><th className="w-[16%] p-3 text-right font-medium">{copy.salary}</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">{ordered.map(stat => <tr key={stat.skill.name}>
                  <td className="break-words p-3 font-semibold text-[#000052]">{stat.skill.name}</td><td className="p-3 text-right font-semibold tabular-nums text-[#B8860B]">{Math.round(stat.skill.weight * 100)}%</td><td className="p-3 text-right text-sm tabular-nums">{stat.vacancies} <span className="text-xs text-gray-400">({stat.vacancyShare === null ? '—' : `${stat.vacancyShare.toFixed(1)}%`})</span></td><td className="p-3 text-right text-sm tabular-nums">{stat.resumes} <span className="text-xs text-gray-400">({stat.resumeShare === null ? '—' : `${stat.resumeShare.toFixed(1)}%`})</span></td>
                  <td className={`p-3 text-right font-bold tabular-nums ${stat.gap !== null && stat.gap >= 20 ? 'text-[#000052]' : stat.gap !== null && stat.gap <= -20 ? 'text-[#1E3A5F]' : 'text-[#8A6508]'}`}>{stat.gap === null ? '—' : `${stat.gap > 0 ? '+' : ''}${stat.gap.toFixed(1)} п.п.`}</td><td className="p-3 text-right text-sm tabular-nums">{formatMoney(stat.salary)}</td>
                </tr>)}</tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">{ordered.map(stat => <div key={stat.skill.name} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0 break-words font-semibold text-[#000052]">{stat.skill.name}</div><span className="shrink-0 rounded-full bg-[#B8860B]/10 px-2.5 py-1 text-xs font-bold tabular-nums text-[#8A6508]">{Math.round(stat.skill.weight * 100)}%</span></div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div><div className="text-xs text-gray-400">{copy.vacancies}</div><div className="mt-1 font-semibold tabular-nums text-[#000052]">{stat.vacancies} <span className="font-normal text-gray-400">({stat.vacancyShare === null ? '—' : `${stat.vacancyShare.toFixed(1)}%`})</span></div></div>
                <div><div className="text-xs text-gray-400">{copy.resumes}</div><div className="mt-1 font-semibold tabular-nums text-[#000052]">{stat.resumes} <span className="font-normal text-gray-400">({stat.resumeShare === null ? '—' : `${stat.resumeShare.toFixed(1)}%`})</span></div></div>
                <div><div className="text-xs text-gray-400">Skill Gap</div><div className={`mt-1 font-bold tabular-nums ${stat.gap !== null && stat.gap >= 20 ? 'text-[#000052]' : stat.gap !== null && stat.gap <= -20 ? 'text-[#1E3A5F]' : 'text-[#8A6508]'}`}>{stat.gap === null ? '—' : `${stat.gap > 0 ? '+' : ''}${stat.gap.toFixed(1)} п.п.`}</div></div>
                <div><div className="text-xs text-gray-400">{copy.salary}</div><div className="mt-1 font-semibold tabular-nums text-[#000052]">{formatMoney(stat.salary)}</div></div>
              </div>
            </div>)}</div>
          </div>

          <div className="mt-7 overflow-hidden rounded-2xl border border-[#B8860B]/20 bg-gradient-to-br from-[#fffaf0] to-white">
            <div className="border-b border-[#B8860B]/10 p-5"><div className="flex min-w-0 items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#B8860B]/10"><Lightbulb className="h-5 w-5 text-[#B8860B]" /></div><div className="min-w-0"><h4 className="break-words text-lg font-bold text-[#000052]">{copy.actions}</h4><p className="mt-1 break-words text-sm text-gray-600">{copy.actionsHelp}</p></div></div></div>
            <div className="p-5"><div className="mb-5 flex min-w-0 items-start gap-3"><Target className="mt-0.5 h-5 w-5 shrink-0 text-[#000052]" /><div className="min-w-0"><div className="font-semibold text-[#000052]">{copy.priority}</div><div className="mt-1 break-words text-sm text-gray-600">{profiles.length ? marketSummary : copy.noCritical}</div></div></div>
              {critical.length > 0 && <div className="space-y-3">{critical.map((stat, index) => <div key={stat.skill.name} className="rounded-xl border border-gray-100 bg-white/80 p-4"><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0 break-words font-semibold text-[#000052]">{index + 1}. {stat.skill.name}</div><span className="shrink-0 rounded-full bg-[#000052]/5 px-2.5 py-1 text-xs font-semibold text-[#000052]">{(stat.gap ?? 0) >= 20 && stat.skill.weight >= 0.2 ? copy.critical : copy.high}</span></div><p className="mt-2 break-words text-sm leading-6 text-gray-600">{recommendation(stat)}</p></div>)}</div>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function MarketStat({ label, value, tone }: { label: string; value: number; tone: 'navy' | 'gold' | 'steel' }) {
  const styles = { navy: 'border-[#000052]/10 bg-[#f0f0fa] text-[#000052]', gold: 'border-[#B8860B]/20 bg-[#faf3e0] text-[#8A6508]', steel: 'border-[#46618C]/15 bg-[#eef2f6] text-[#1E3A5F]' }[tone];
  return <div className={`flex min-h-[104px] min-w-0 flex-col justify-between rounded-xl border p-4 ${styles}`}><div className="break-words text-xs font-semibold">{label}</div><div className="mt-2 text-3xl font-bold leading-none tabular-nums">{value}</div></div>;
}
