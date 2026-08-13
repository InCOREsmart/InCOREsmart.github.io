import { useEffect, useMemo, useState } from 'react';
import { BarChart3, ExternalLink, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { SkillDefinition } from '../../types/decomposition';

type MarketProfile = {
  source_type: 'vacancy' | 'resume';
  text: string;
  salary: number | null;
  skills: string[] | null;
};

type MarketSkillStat = {
  skill: SkillDefinition;
  vacancies: number;
  resumes: number;
  vacancyShare: number | null;
  resumeShare: number | null;
  skillGap: number | null;
  weightedGap: number | null;
  vacancySalaryMedian: number | null;
  candidateSalaryMedian: number | null;
};

const ROLE_MARKET_MATCHES: Record<string, { skillNames: string[]; patterns: string[] }> = {
  'Продажи корпоративного страхования': { skillNames: ['Корпоративные продажи', 'Страхование', 'Продажи'], patterns: ['корпоративн', 'b2b', 'страхован', 'страховой', 'продаж'] },
  'Удержание клиентов': { skillNames: ['Работа с клиентами', 'Развитие клиентской базы', 'Продление договоров'], patterns: ['удержан', 'продлен', 'пролонгац', 'клиентск', 'развитие клиентской', 'клиентами'] },
  'Кросс-продажи': { skillNames: ['Кросс-продажи'], patterns: ['кросс-продаж', 'cross-sell', 'cross sell', 'crosssell', 'допродаж'] },
  'Выполнение плана продаж': { skillNames: ['План продаж', 'Продажи'], patterns: ['план продаж', 'выполнения плана', 'выполнение плана', 'kpi'] },
  'Удержание 90 дней': { skillNames: [], patterns: ['удержание 90', '90 дней', '90-day retention', 'retention 90', 'retention'] },
  'Долгосрочная результативность': { skillNames: ['План продаж'], patterns: ['годовой результат', 'долгосрочн', 'стабильное выполнение', 'годовых целей', 'kpi'] },
};

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function formatMoney(value: number | null) {
  return value === null ? '—' : `${new Intl.NumberFormat('ru-RU').format(Math.round(value))} ₽`;
}

function matches(profile: MarketProfile, mapping: { skillNames: string[]; patterns: string[] }) {
  const text = (profile.text ?? '').toLowerCase();
  const skillNames = Array.isArray(profile.skills) ? profile.skills : [];
  return mapping.skillNames.some(name => skillNames.includes(name)) || mapping.patterns.some(pattern => text.includes(pattern));
}

function gapLabel(gap: number | null) {
  if (gap === null) return { label: 'Нет данных', className: 'bg-gray-100 text-gray-500' };
  if (gap >= 20) return { label: 'Дефицит', className: 'bg-red-50 text-red-700' };
  if (gap <= -20) return { label: 'Профицит', className: 'bg-blue-50 text-blue-700' };
  return { label: 'Баланс', className: 'bg-amber-50 text-amber-700' };
}

export function RoleMarketAnalysis({ skills }: { skills: SkillDefinition[] }) {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<MarketProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMarket = async () => {
    setLoading(true);
    setError('');
    const { data, error: queryError } = await supabase.from('market_profiles').select('source_type, text, salary, skills').order('created_at', { ascending: false });
    if (queryError) {
      setError(`Не удалось загрузить рынок HH: ${queryError.message}`);
      setProfiles([]);
    } else {
      setProfiles((data ?? []) as MarketProfile[]);
    }
    setLoading(false);
  };

  useEffect(() => { void loadMarket(); }, []);

  const stats = useMemo<MarketSkillStat[]>(() => {
    const vacancies = profiles.filter(profile => profile.source_type === 'vacancy');
    const resumes = profiles.filter(profile => profile.source_type === 'resume');
    return skills.map(skill => {
      const mapping = ROLE_MARKET_MATCHES[skill.name] ?? { skillNames: [], patterns: [skill.name.toLowerCase()] };
      const matchingVacancies = vacancies.filter(profile => matches(profile, mapping));
      const matchingResumes = resumes.filter(profile => matches(profile, mapping));
      const vacancyShare = vacancies.length ? matchingVacancies.length / vacancies.length * 100 : null;
      const resumeShare = resumes.length ? matchingResumes.length / resumes.length * 100 : null;
      const skillGap = vacancyShare !== null && resumeShare !== null ? vacancyShare - resumeShare : null;
      const vacancySalaries = matchingVacancies.map(row => row.salary).filter((value): value is number => value !== null);
      const candidateSalaries = matchingResumes.map(row => row.salary).filter((value): value is number => value !== null);
      return { skill, vacancies: matchingVacancies.length, resumes: matchingResumes.length, vacancyShare, resumeShare, skillGap, weightedGap: skillGap === null ? null : skillGap * skill.weight, vacancySalaryMedian: median(vacancySalaries), candidateSalaryMedian: median(candidateSalaries) };
    });
  }, [profiles, skills]);

  const chartStats = useMemo(() => [...stats].sort((a, b) => (b.skillGap ?? -Infinity) - (a.skillGap ?? -Infinity)), [stats]);
  const maxGap = Math.max(20, ...chartStats.map(stat => Math.abs(stat.skillGap ?? 0)));
  const critical = stats.filter(stat => (stat.skillGap ?? -Infinity) >= 20).sort((a, b) => (b.weightedGap ?? 0) - (a.weightedGap ?? 0));
  const surplus = stats.filter(stat => (stat.skillGap ?? Infinity) <= -20).sort((a, b) => (a.skillGap ?? 0) - (b.skillGap ?? 0));
  const topDemand = [...stats].sort((a, b) => b.vacancies - a.vacancies)[0] ?? null;
  const topSalary = [...stats].filter(stat => stat.vacancySalaryMedian !== null).sort((a, b) => (b.vacancySalaryMedian ?? 0) - (a.vacancySalaryMedian ?? 0))[0] ?? null;
  const noData = stats.filter(stat => stat.skillGap === null);

  return (
    <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="p-5 md:p-6 border-b border-gray-100">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#B8860B]/10 flex items-center justify-center flex-shrink-0"><BarChart3 className="w-5 h-5 text-[#B8860B]" /></div>
            <div><h3 className="font-bold text-[#000052] text-lg">Карта рынка навыков</h3><p className="text-sm text-gray-500 mt-1">Реальные вручную загруженные данные HH сопоставляются с требованиями роли.</p></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void loadMarket()} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-[#000052] text-sm font-semibold"><RefreshCw className="w-4 h-4" /> Обновить</button>
            <button onClick={() => navigate('/ceo/roles/market')} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#000052] text-white text-sm font-semibold"><ExternalLink className="w-4 h-4" /> Загрузить HH</button>
          </div>
        </div>
        <div className="mt-4 p-3 rounded-xl bg-blue-50 text-blue-800 text-xs leading-relaxed"><b>Как считается Skill Gap:</b> доля вакансий с навыком минус доля резюме с навыком. Положительное значение означает относительный дефицит предложения, отрицательное — относительный профицит. Это рыночный индикатор, а не абсолютное количество недостающих специалистов.</div>
      </div>

      {loading ? <div className="p-10 text-center text-sm text-gray-400">Загружаем данные HH…</div> : error ? <div className="p-6"><div className="p-4 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div></div> : !profiles.length ? (
        <div className="p-8 text-center"><div className="text-sm font-semibold text-[#000052]">Данных HH пока нет</div><div className="text-sm text-gray-500 mt-1">Загрузите реальные вакансии и резюме HTML / HTM / TXT, чтобы InCORE рассчитал Skill Gap.</div><button onClick={() => navigate('/ceo/roles/market')} className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#000052] text-white text-sm font-semibold">Загрузить данные HH</button></div>
      ) : (
        <>
          <div className="p-5 md:p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-7">
              <div className="p-4 rounded-xl bg-gray-50"><div className="text-xs text-gray-400 uppercase">Вакансий</div><div className="text-2xl font-bold text-[#000052] mt-1">{profiles.filter(row => row.source_type === 'vacancy').length}</div></div>
              <div className="p-4 rounded-xl bg-gray-50"><div className="text-xs text-gray-400 uppercase">Резюме</div><div className="text-2xl font-bold text-[#000052] mt-1">{profiles.filter(row => row.source_type === 'resume').length}</div></div>
              <div className="p-4 rounded-xl bg-red-50"><div className="text-xs text-red-500 uppercase">Дефицитных навыков</div><div className="text-2xl font-bold text-red-700 mt-1">{critical.length}</div></div>
              <div className="p-4 rounded-xl bg-blue-50"><div className="text-xs text-blue-500 uppercase">Профицитных навыков</div><div className="text-2xl font-bold text-blue-700 mt-1">{surplus.length}</div></div>
            </div>

            <div className="flex items-end justify-between gap-3 mb-3"><div><h4 className="font-bold text-[#000052]">Рыночный разрыв Skill Gap</h4><p className="text-xs text-gray-400 mt-1">Процентные пункты. 0 = относительный баланс спроса и предложения.</p></div><div className="hidden md:flex gap-3 text-xs text-gray-500"><span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> дефицит</span><span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#B8860B]" /> баланс</span><span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#46618C]" /> профицит</span></div></div>

            <div className="overflow-x-auto pb-3"><div className="min-w-[760px]"><div className="relative h-[320px] border-b border-gray-200">
              <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-gray-300" />
              <div className="absolute left-0 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 bg-white pr-1">0</div>
              <div className="absolute left-0 top-2 text-[10px] text-gray-400">+{Math.round(maxGap)} п.п.</div>
              <div className="absolute left-0 bottom-2 text-[10px] text-gray-400">-{Math.round(maxGap)} п.п.</div>
              <div className="absolute inset-0 pl-8 pr-2 grid grid-cols-6 gap-3">
                {chartStats.map(stat => {
                  const gap = stat.skillGap ?? 0;
                  const positive = gap >= 0;
                  const height = Math.min(44, Math.abs(gap) / maxGap * 44);
                  const color = stat.skillGap === null ? 'bg-gray-300' : gap >= 20 ? 'bg-red-500' : gap <= -20 ? 'bg-[#46618C]' : 'bg-[#B8860B]';
                  return <div key={stat.skill.name} className="relative flex flex-col items-center h-full">
                    <div className="absolute inset-x-0 top-0 h-1/2 flex items-end justify-center pb-1">{positive && <div className={`${color} w-12 max-w-full rounded-t-lg`} style={{ height: `${height * 2.8}px` }} title={`${stat.skill.name}: ${stat.skillGap === null ? 'нет данных' : `${gap.toFixed(1)} п.п.`}`} />}</div>
                    <div className="absolute inset-x-0 top-1/2 h-1/2 flex items-start justify-center pt-1">{!positive && <div className={`${color} w-12 max-w-full rounded-b-lg`} style={{ height: `${height * 2.8}px` }} title={`${stat.skill.name}: ${stat.skillGap === null ? 'нет данных' : `${gap.toFixed(1)} п.п.`}`} />}</div>
                    <div className="absolute top-1/2 mt-3 left-0 right-0 text-center text-[11px] font-semibold text-[#000052] leading-tight px-1">{stat.skill.name}</div>
                  </div>;
                })}
              </div>
            </div></div></div>

            <div className="mt-8 overflow-x-auto"><table className="w-full min-w-[950px]"><thead><tr className="bg-gray-50 text-xs text-gray-500 uppercase"><th className="text-left p-3">Навык</th><th className="text-left p-3">Вес роли</th><th className="text-left p-3">Вакансии</th><th className="text-left p-3">Резюме</th><th className="text-left p-3">Skill Gap</th><th className="text-left p-3">Зарплата HH</th><th className="text-left p-3">Статус</th></tr></thead><tbody className="divide-y divide-gray-100">
              {chartStats.map(stat => { const status = gapLabel(stat.skillGap); return <tr key={`market-${stat.skill.name}`} className="align-top"><td className="p-3"><div className="font-semibold text-[#000052]">{stat.skill.name}</div></td><td className="p-3 font-semibold text-[#B8860B]">{Math.round(stat.skill.weight * 100)}%</td><td className="p-3 text-sm text-gray-600">{stat.vacancies} <span className="text-xs text-gray-400">({stat.vacancyShare === null ? '—' : `${stat.vacancyShare.toFixed(1)}%`})</span></td><td className="p-3 text-sm text-gray-600">{stat.resumes} <span className="text-xs text-gray-400">({stat.resumeShare === null ? '—' : `${stat.resumeShare.toFixed(1)}%`})</span></td><td className="p-3 font-bold text-[#000052]">{stat.skillGap === null ? '—' : `${stat.skillGap > 0 ? '+' : ''}${stat.skillGap.toFixed(1)} п.п.`}</td><td className="p-3 text-sm text-gray-600">{formatMoney(stat.vacancySalaryMedian)}</td><td className="p-3"><span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${status.className}`}>{status.label}</span></td></tr>; })}
            </tbody></table></div>
          </div>

          <div className="p-5 md:p-6 border-t border-gray-100"><h4 className="font-bold text-[#000052]">Выводы рынка для CEO</h4><div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            <div className="p-4 rounded-xl bg-gray-50"><div className="text-xs text-gray-400 uppercase">Максимальный спрос</div><div className="mt-1 font-semibold text-[#000052]">{topDemand ? topDemand.skill.name : '—'}</div><div className="text-sm text-gray-500 mt-1">{topDemand ? `${topDemand.vacancies} вакансий` : 'Нет данных'}</div></div>
            <div className="p-4 rounded-xl bg-red-50"><div className="text-xs text-red-500 uppercase">Главный дефицит</div><div className="mt-1 font-semibold text-red-800">{critical[0] ? critical[0].skill.name : 'Не выявлен'}</div><div className="text-sm text-red-700 mt-1">{critical[0]?.skillGap === null || !critical[0] ? 'Недостаточно данных' : `Skill Gap +${critical[0].skillGap.toFixed(1)} п.п.`}</div></div>
            <div className="p-4 rounded-xl bg-blue-50"><div className="text-xs text-blue-500 uppercase">Профицит</div><div className="mt-1 font-semibold text-blue-800">{surplus[0] ? surplus[0].skill.name : 'Не выявлен'}</div><div className="text-sm text-blue-700 mt-1">{surplus[0]?.skillGap === null || !surplus[0] ? 'Недостаточно данных' : `Skill Gap ${surplus[0].skillGap.toFixed(1)} п.п.`}</div></div>
            <div className="p-4 rounded-xl bg-gray-50"><div className="text-xs text-gray-400 uppercase">Самая высокая зарплата</div><div className="mt-1 font-semibold text-[#000052]">{topSalary ? topSalary.skill.name : '—'}</div><div className="text-sm text-gray-500 mt-1">{topSalary ? formatMoney(topSalary.vacancySalaryMedian) : 'Нет данных'}</div></div>
          </div>
          {critical.length > 0 && <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-100"><div className="font-semibold text-red-800">Что делать с дефицитом</div><div className="text-sm text-red-700 mt-1">Дефицитные навыки с большим весом роли становятся приоритетом найма: их стоит отдельно проверять на входе и закладывать в план обучения. В первую очередь: {critical.slice(0, 3).map(item => item.skill.name).join(', ')}.</div></div>}
          {noData.length > 0 && <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-100"><div className="font-semibold text-amber-800">Где рынок пока не измерен</div><div className="text-sm text-amber-700 mt-1">Для {noData.map(item => item.skill.name).join(', ')} недостаточно вакансий и/или резюме, чтобы считать Skill Gap. Это не нулевой дефицит, а отсутствие измерения.</div></div>}
          </div>
        </>
      )}
    </section>
  );
}
