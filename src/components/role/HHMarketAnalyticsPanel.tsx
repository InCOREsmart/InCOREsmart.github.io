import { useEffect, useMemo, useState } from 'react';
import { Activity, Briefcase, Users, TrendingDown, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { insuranceAgentDecomposition } from '../../data/insuranceAgentDecomposition';

type SkillRow = {
  canonical_skill: string;
  demand_share: number;
  supply_share: number;
  skill_gap: number;
  hiring_difficulty_score: number;
  difficulty_level: string;
  sample_resumes: number;
  sample_vacancies: number;
};

type MarketState = {
  vacancyCount: number;
  resumeCount: number;
  vacancyMedian: number | null;
  resumeMedian: number | null;
  updatedAt: string | null;
  skills: SkillRow[];
};

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function formatMoney(value: number | null, locale: string) {
  if (value === null) return '—';
  return `${new Intl.NumberFormat(locale).format(Math.round(value))} ₽`;
}

function difficultyKey(level: string) {
  if (level === 'very_high') return 'veryHigh';
  if (level === 'high') return 'high';
  if (level === 'medium') return 'medium';
  return 'low';
}

export function HHMarketAnalyticsPanel() {
  const { t, i18n } = useTranslation();
  const [state, setState] = useState<MarketState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      // The automated HH import stores the canonical market data in these tables.
      // Do not use market_profiles here: that table contains only manually uploaded samples.
      const [vacancyResult, resumeResult, skillResult] = await Promise.all([
        supabase
          .from('hh_vacancies')
          .select('id,salary_from,salary_to,fetched_at')
          .eq('role_key', 'insurance_agent')
          .eq('country', 'RU'),
        supabase
          .from('hh_market_resumes')
          .select('hh_id,salary,created_at')
          .eq('role_key', 'insurance_agent')
          .eq('country', 'RU')
          .limit(5000),
        supabase
          .from('hh_skill_hiring_difficulty')
          .select('canonical_skill,demand_share,supply_share,skill_gap,hiring_difficulty_score,difficulty_level,sample_resumes,sample_vacancies')
          .eq('role_key', 'insurance_agent')
          .eq('country', 'RU')
          .order('hiring_difficulty_score', { ascending: false })
          .limit(12),
      ]);

      if (vacancyResult.error) throw vacancyResult.error;
      if (resumeResult.error) throw resumeResult.error;
      if (skillResult.error) throw skillResult.error;

      const vacancySalaries = (vacancyResult.data ?? [])
        .map(row => {
          const from = row.salary_from == null ? null : Number(row.salary_from);
          const to = row.salary_to == null ? null : Number(row.salary_to);
          if (from !== null && to !== null) return (from + to) / 2;
          return from ?? to;
        })
        .filter((value): value is number => value !== null && Number.isFinite(value));

      const resumeSalaries = (resumeResult.data ?? [])
        .map(row => row.salary == null ? null : Number(row.salary))
        .filter((value): value is number => value !== null && Number.isFinite(value));

      const updatedAt = [
        ...(vacancyResult.data ?? []).map(row => row.fetched_at ? new Date(row.fetched_at).getTime() : 0),
        ...(resumeResult.data ?? []).map(row => row.created_at ? new Date(row.created_at).getTime() : 0),
      ].filter(Boolean).sort((a, b) => b - a)[0];

      setState({
        vacancyCount: vacancyResult.data?.length ?? 0,
        resumeCount: resumeResult.data?.length ?? 0,
        vacancyMedian: median(vacancySalaries),
        resumeMedian: median(resumeSalaries),
        updatedAt: updatedAt ? new Date(updatedAt).toISOString() : null,
        skills: (skillResult.data ?? []).map(row => ({
          canonical_skill: row.canonical_skill,
          demand_share: Number(row.demand_share ?? 0),
          supply_share: Number(row.supply_share ?? 0),
          skill_gap: Number(row.skill_gap ?? 0),
          hiring_difficulty_score: Number(row.hiring_difficulty_score ?? 0),
          difficulty_level: row.difficulty_level ?? 'low',
          sample_resumes: Number(row.sample_resumes ?? 0),
          sample_vacancies: Number(row.sample_vacancies ?? 0),
        })),
      });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Market data error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const locale = i18n.language === 'ru' ? 'ru-RU' : i18n.language === 'az' ? 'az-AZ' : i18n.language === 'en' ? 'en-US' : 'kk-KZ';
  const roleSkills = insuranceAgentDecomposition.skills;
  const hasResumeEvidence = Boolean(state && state.resumeCount > 0 && state.skills.some(skill => skill.sample_resumes > 0));
  const roleSkillMatches = roleSkills.map(roleSkill => {
    const name = roleSkill.name.toLowerCase();
    const aliases: Record<string, string[]> = {
      'продажи корпоративного страхования': ['страхован', 'корпоративн', 'продаж'],
      'удержание клиентов': ['удержан', 'продлен', 'retention'],
      'кросс-продажи': ['кросс', 'cross-sell', 'допродаж'],
      'выполнение плана продаж': ['план продаж', 'выполнени', 'kpi'],
      'долгосрочная результативность': ['долгосроч', 'годовой результат', 'результатив'],
    };
    const terms = aliases[name] ?? [name];
    const match = state?.skills.find(skill => terms.some(term => skill.canonical_skill.toLowerCase().includes(term)));
    return { ...roleSkill, match: match ?? null };
  });
  const matchedRoleSkills = roleSkillMatches.filter(item => item.match).length;
  const executiveConclusion = !state || (state.vacancyCount === 0 && state.resumeCount === 0)
    ? 'Пока нет достаточной рыночной выборки, чтобы делать выводы о спросе и доступности кандидатов. Загрузите данные HH.ru, затем сравнение обновится.'
    : state.resumeCount === 0
      ? `В базе ${state.vacancyCount.toLocaleString(locale)} вакансий по роли, но нет резюме в сопоставимой выборке. Спрос можно оценивать, а дефицит кандидатов пока нельзя.`
      : `Сопоставлено ${state.vacancyCount.toLocaleString(locale)} вакансий и ${state.resumeCount.toLocaleString(locale)} резюме. ${matchedRoleSkills} из ${roleSkills.length} навыков InCORE сопоставлены с рыночными данными. Выводы о дефиците ограничены размером и качеством выборки.`;

  const updatedLabel = useMemo(() => {
    if (!state?.updatedAt) return null;
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(state.updatedAt));
  }, [state?.updatedAt, locale]);

  if (loading) {
    return <section className="bg-white rounded-2xl border border-[#000052]/10 shadow-sm p-6 text-sm text-[#000052]/60">{t('hhMarket.loading')}</section>;
  }

  if (error) {
    return <section className="bg-white rounded-2xl border border-red-200 p-6 text-sm text-red-700">{error}</section>;
  }

  if (!state) return null;

  const difficultyText = (level: string) => t(`hhMarket.${difficultyKey(level)}`);

  return (
    <section className="space-y-4 md:space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#000052]/5 text-[#000052] text-xs font-semibold">
              {t('hhMarket.role')}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#B8860B]/10 text-[#8A6500] text-xs font-semibold">
              {t('hhMarket.country')}
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-[#000052]">{t('hhMarket.title')}</h2>
          <p className="text-sm text-[#000052]/60 mt-1 max-w-2xl">{t('hhMarket.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#000052]/55">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>{state.updatedAt ? `${t('hhMarket.fresh')} · ${t('hhMarket.updated')}: ${updatedLabel}` : t('hhMarket.stale')}</span>
          <button onClick={() => void load()} className="p-2 rounded-lg hover:bg-[#000052]/5 text-[#000052]" title={t('common.refresh', 'Refresh')}>
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_1fr] gap-4">
        <div className="rounded-2xl bg-white border border-[#000052]/10 p-5 md:p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div><div className="text-xs font-semibold uppercase tracking-wide text-[#B8860B]">Вывод для руководителя</div><h3 className="mt-1 text-lg font-bold text-[#000052]">Что происходит на рынке</h3></div>
            <span className="rounded-full bg-[#000052]/5 px-3 py-1.5 text-xs font-semibold text-[#000052]">Страховой агент</span>
          </div>
          <p className="text-sm leading-6 text-[#333b56]">{executiveConclusion}</p>
          <div className="mt-5 border-t border-gray-100 pt-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Skill Scarcity</div>
            {hasResumeEvidence ? <div className="mt-2 text-sm font-semibold text-[#000052]">Оценка построена по имеющимся резюме. Это оценка выборки, а не всего рынка.</div> : <div className="mt-2 flex items-start gap-3 rounded-xl bg-amber-50 p-3.5 text-sm text-amber-900"><span className="mt-0.5 font-bold">!</span><span><strong>Недостаточно данных.</strong> Дефицит навыков не рассчитывается до загрузки резюме по этой роли.</span></div>}
          </div>
        </div>
        <div className="rounded-2xl bg-[#000038] p-5 md:p-6 text-white border-b-4 border-[#B8860B]">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#D4A017]">InCORE · карта роли</div>
          <h3 className="mt-1 text-lg font-bold text-white">Роль против рынка</h3>
          <p className="mt-2 text-sm leading-6 text-white/75">Результат роли определяется пятью навыками с весами. Рыночные данные показывают, какие из них встречаются в вакансиях и резюме, но не подменяют проверку реального результата.</p>
          <div className="mt-5 flex items-end gap-2"><span className="text-3xl font-bold">{matchedRoleSkills}/{roleSkills.length}</span><span className="pb-1 text-sm text-white/65">навыков сопоставлено</span></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#D4A017]" style={{ width: (roleSkills.length ? matchedRoleSkills / roleSkills.length * 100 : 0) + '%' }} /></div>
          <div className="mt-4 text-xs text-white/60">Вес роли: {Math.round(roleSkills.reduce((sum, skill) => sum + skill.weight, 0) * 100)}% суммарно</div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-[#000052]/10 p-5 md:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-4"><div><h3 className="text-lg font-bold text-[#000052]">Сопоставление с моделью InCORE</h3><p className="mt-1 text-sm text-gray-500">Вес навыка задан в карте роли. Рыночный дефицит показывается только при наличии сопоставимых данных.</p></div><span className="text-xs text-gray-400">Источник: HH.ru + карта роли InCORE</span></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[680px]">
          <thead><tr className="border-b border-gray-100 text-left text-xs text-gray-400"><th className="py-3 pr-4 font-medium">Навык роли</th><th className="py-3 px-3 text-right font-medium">Вес InCORE</th><th className="py-3 px-3 text-right font-medium">Вакансии</th><th className="py-3 px-3 text-right font-medium">Резюме</th><th className="py-3 pl-3 text-right font-medium">Оценка дефицита</th></tr></thead>
          <tbody>{roleSkillMatches.map(item => {
            const match = item.match;
            const scarcityKnown = Boolean(hasResumeEvidence && match && match.sample_resumes > 0);
            return <tr key={item.name} className="border-b border-gray-50 last:border-0">
              <td className="py-3 pr-4"><div className="font-semibold text-sm text-[#000052]">{item.name}</div><div className="mt-1 text-xs text-gray-400">{item.is_required ? 'Обязательный навык' : 'Дополнительный навык'}</div></td>
              <td className="px-3 py-3 text-right font-semibold text-[#000052]">{Math.round(item.weight * 100)}%</td>
              <td className="px-3 py-3 text-right tabular-nums">{match ? match.sample_vacancies.toLocaleString(locale) : '—'}</td>
              <td className="px-3 py-3 text-right tabular-nums">{match ? match.sample_resumes.toLocaleString(locale) : '—'}</td>
              <td className="pl-3 py-3 text-right">{scarcityKnown ? <span className={match!.skill_gap < 0 ? 'font-semibold text-red-700' : 'font-semibold text-emerald-700'}>{match!.skill_gap < 0 ? 'Возможный дефицит' : 'Дефицит не подтверждён'}</span> : <span className="text-xs text-gray-400">Недостаточно данных</span>}</td>
            </tr>;
          })}</tbody>
        </table></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-2xl border border-[#000052]/10 p-5 shadow-sm">
          <div className="flex items-center justify-between"><span className="text-xs text-[#000052]/55">{t('hhMarket.vacancies')}</span><Briefcase className="w-5 h-5 text-[#B8860B]" /></div>
          <div className="text-2xl md:text-3xl font-bold text-[#000052] mt-2">{state.vacancyCount.toLocaleString(locale)}</div>
        </div>
        <div className="bg-white rounded-2xl border border-[#000052]/10 p-5 shadow-sm">
          <div className="flex items-center justify-between"><span className="text-xs text-[#000052]/55">{t('hhMarket.resumes')}</span><Users className="w-5 h-5 text-[#B8860B]" /></div>
          <div className="text-2xl md:text-3xl font-bold text-[#000052] mt-2">{state.resumeCount.toLocaleString(locale)}</div>
        </div>
        <div className="bg-white rounded-2xl border border-[#000052]/10 p-5 shadow-sm">
          <div className="text-xs text-[#000052]/55">{t('hhMarket.medianVacancySalary')}</div>
          <div className="text-xl md:text-2xl font-bold text-[#000052] mt-2 break-words">{formatMoney(state.vacancyMedian, locale)}</div>
        </div>
        <div className="bg-white rounded-2xl border border-[#000052]/10 p-5 shadow-sm">
          <div className="text-xs text-[#000052]/55">{t('hhMarket.medianResumeSalary')}</div>
          <div className="text-xl md:text-2xl font-bold text-[#000052] mt-2 break-words">{formatMoney(state.resumeMedian, locale)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-5">
        <div className="bg-white rounded-2xl border border-[#000052]/10 p-5 md:p-6 shadow-sm min-w-0">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-[#000052]/5 flex items-center justify-center"><TrendingDown className="w-5 h-5 text-[#000052]" /></div>
            <div><h3 className="font-bold text-[#000052]">Спрос и предложение навыков</h3><p className="text-xs text-[#000052]/50">{t('hhMarket.demandShare')} · {t('hhMarket.supplyShare')}</p></div>
          </div>
          <div className="space-y-3">
            {state.skills.slice(0, 8).map(skill => {
              const shortage = skill.skill_gap > 0;
              const gapAbs = Math.abs(skill.skill_gap);
              return (
                <div key={skill.canonical_skill} className="rounded-xl bg-[#000052]/[0.035] p-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="font-semibold text-sm text-[#000052] break-words">{skill.canonical_skill}</div>
                    <span className={`self-start sm:self-auto px-2.5 py-1 rounded-full text-xs font-semibold ${shortage ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {shortage ? 'Дефицит предложения' : skill.skill_gap < 0 ? 'Избыток предложения' : 'Баланс'} · {gapAbs.toFixed(2)} {t('hhMarket.ppts')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                    <div><span className="text-[#000052]/45">{t('hhMarket.demandShare')}</span><div className="font-bold text-[#000052] mt-0.5">{skill.demand_share.toFixed(2)}%</div></div>
                    <div><span className="text-[#000052]/45">{t('hhMarket.supplyShare')}</span><div className="font-bold text-[#000052] mt-0.5">{skill.supply_share.toFixed(2)}%</div></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#000052]/10 p-5 md:p-6 shadow-sm min-w-0">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-[#B8860B]/10 flex items-center justify-center"><Activity className="w-5 h-5 text-[#B8860B]" /></div>
            <div><h3 className="font-bold text-[#000052]">{t('hhMarket.difficulty')}</h3><p className="text-xs text-[#000052]/50">{t('hhMarket.difficultyScore')}</p></div>
          </div>
          <div className="space-y-3">
            {state.skills.slice(0, 8).map(skill => (
              <div key={skill.canonical_skill} className="p-3.5 rounded-xl border border-[#000052]/8">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-[#000052] break-words min-w-0">{skill.canonical_skill}</span>
                  <span className="text-sm font-bold text-[#B8860B] whitespace-nowrap">{Math.round(skill.hiring_difficulty_score)}/100</span>
                </div>
                <div className="h-2 bg-[#000052]/5 rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-[#B8860B] rounded-full" style={{ width: `${Math.min(100, Math.max(0, skill.hiring_difficulty_score))}%` }} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 mt-2 text-xs text-[#000052]/55">
                  <span>{difficultyText(skill.difficulty_level)}</span>
                  <span>{skill.sample_vacancies.toLocaleString(locale)} {t('hhMarket.vacancyCount')} · {skill.sample_resumes.toLocaleString(locale)} {t('hhMarket.resumeCount')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1 text-xs text-[#000052]/45">
        <span>{t('hhMarket.source')}</span>
        <span>{t('hhMarket.nextUpdate')}</span>
      </div>
    </section>
  );
}
