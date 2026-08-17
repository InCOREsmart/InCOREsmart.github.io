import { useEffect, useMemo, useState } from 'react';
import { Activity, BriefcaseBusiness, Users, TrendingDown, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';

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
      const [vacancyResult, resumeResult, skillResult] = await Promise.all([
        supabase
          .from('hh_vacancies')
          .select('id,salary_from,salary_to,fetched_at')
          .eq('role_key', 'insurance_agent')
          .eq('country', 'RU'),
        supabase
          .from('hh_market_resumes')
          .select('hh_id,salary,created_at')
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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-2xl border border-[#000052]/10 p-5 shadow-sm">
          <div className="flex items-center justify-between"><span className="text-xs text-[#000052]/55">{t('hhMarket.vacancies')}</span><BriefcaseBusiness className="w-5 h-5 text-[#B8860B]" /></div>
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
            <div><h3 className="font-bold text-[#000052]">{t('hhMarket.skillGap')}</h3><p className="text-xs text-[#000052]/50">{t('hhMarket.demandShare')} · {t('hhMarket.supplyShare')}</p></div>
          </div>
          <div className="space-y-3">
            {state.skills.slice(0, 8).map(skill => {
              const shortage = skill.skill_gap < 0;
              const gapAbs = Math.abs(skill.skill_gap);
              return (
                <div key={skill.canonical_skill} className="rounded-xl bg-[#000052]/[0.035] p-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="font-semibold text-sm text-[#000052] break-words">{skill.canonical_skill}</div>
                    <span className={`self-start sm:self-auto px-2.5 py-1 rounded-full text-xs font-semibold ${shortage ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {shortage ? t('hhMarket.deficit') : t('hhMarket.balance')} · {gapAbs.toFixed(2)} {t('hhMarket.ppts')}
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
