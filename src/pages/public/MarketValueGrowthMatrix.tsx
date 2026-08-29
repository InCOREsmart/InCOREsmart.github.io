import { useMemo, useState } from 'react';

type Lang = 'ru' | 'en' | 'kk' | 'az';
type Category = 'sales' | 'marketing' | 'it' | 'hr' | 'finance';
type Skill = { name: string; level: number; criticality: number; evidence: string };

type Props = {
  lang: Lang;
  role: string;
  skills: Skill[];
  bottleneck?: Skill & { priority: number };
};

type Entry = { skill: string; why: string; action: string };

const DATA: Record<Category, { label: Record<Lang,string>; falling: Entry[]; rising: Entry[]; emerging: Entry[] }> = {
  sales: {
    label: { ru:'Продажи и работа с клиентами', en:'Sales and customer work', kk:'Сату және клиенттермен жұмыс', az:'Satış və müştərilərlə iş' },
    falling: [
      { skill:'Холодные звонки по скрипту, базовая квалификация лида, механическое заполнение CRM, шаблонные КП', why:'AI-ассистенты и чат-боты делают рутину быстрее и дешевле.', action:'Автоматизируй рутину и не конкурируй с AI в скорости.' }
    ],
    rising: [
      { skill:'Выявление скрытых экономических потребностей, сложные переговоры с несколькими ЛПР, удержание маржинальности', why:'Нужны контекст, доверие, переговоры и решения в серой зоне.', action:'Прокачивай финансовую грамотность, переговоры и фасилитацию.' }
    ],
    emerging: [
      { skill:'Управление гибридной воронкой человек + AI, персонализация КП, прогноз оттока по данным CRM', why:'Компании внедряют AI, но нужен человек, который связывает его с деньгами.', action:'Освой аналитику данных и постановку задач AI.' }
    ]
  },
  marketing: {
    label: { ru:'Маркетинг и реклама', en:'Marketing and advertising', kk:'Маркетинг және жарнама', az:'Marketinq və reklam' },
    falling: [
      { skill:'Ручной таргетинг, SEO-тексты для галочки, базовый дизайн баннеров, механический постинг', why:'Алгоритмы платформ и генеративный AI автоматизируют производство.', action:'Продавай стратегию, экономический эффект и решения, а не «руки».' }
    ],
    rising: [
      { skill:'Unit-экономика, CustDev, управление репутацией, связка продукта и маркетинга', why:'AI создаёт креатив, но не отвечает за экономику и стратегический контекст.', action:'Учись считать CAC, LTV, ROMI и связывать маркетинг с деньгами.' }
    ],
    emerging: [
      { skill:'Управление AI-агентами, first-party data, интерактивный контент', why:'Автоматизация и изменения в данных требуют новых способов персонализации.', action:'Освой данные и no-code/low-code автоматизацию.' }
    ]
  },
  it: {
    label: { ru:'IT, разработка и аналитика', en:'IT, development and analytics', kk:'IT, әзірлеу және аналитика', az:'IT, proqramlaşdırma və analitika' },
    falling: [
      { skill:'Boilerplate-код, ручное QA, базовая вёрстка, рутинный сбор данных и простые дашборды', why:'AI-копайлот быстро пишет, рефакторит и тестирует типовые решения.', action:'Переходи от написания строк к проектированию решений.' }
    ],
    rising: [
      { skill:'Системная архитектура, бизнес-домен, техдолг, кибербезопасность, сложная оптимизация', why:'AI генерирует код, но ответственность за систему и бизнес остаётся у человека.', action:'Углубляй бизнес-контекст, архитектуру и безопасность.' }
    ],
    emerging: [
      { skill:'AI-оркестрация, валидация AI-результатов, MLOps', why:'Компании внедряют AI хаотично и нуждаются в надёжных рабочих контурах.', action:'Экспериментируй с API моделей и векторными базами.' }
    ]
  },
  hr: {
    label: { ru:'HR и управление персоналом', en:'HR and people management', kk:'HR және персоналды басқару', az:'HR və insan resurslarının idarə edilməsi' },
    falling: [
      { skill:'Массовый скрининг резюме, первичные интервью, оформление документов, организация мероприятий', why:'ATS, чат-боты и автоматизация забирают повторяемую операционку.', action:'Переходи от кадровой операции к бизнес-партнёрству.' }
    ],
    rising: [
      { skill:'Диагностика производительной мощности команд, проектирование ролей, внутренняя мобильность, удержание ключевых талантов', why:'Бизнесу нужен не факт найма, а предсказуемый результат от людей.', action:'Изучай финансы, аналитику и Workforce Design.' }
    ],
    emerging: [
      { skill:'Алгоритмическая справедливость, предиктивная аналитика текучести, гибридные рабочие места человек + AI', why:'AI в HR создаёт новые риски ошибок и предвзятости.', action:'Учись аудировать алгоритмы и проектировать безопасные процессы.' }
    ]
  },
  finance: {
    label: { ru:'Финансы и управление', en:'Finance and management', kk:'Қаржы және басқару', az:'Maliyyə və idarəetmə' },
    falling: [
      { skill:'Ручной ввод документов, сведение таблиц, бюджетирование от достигнутого, контроль дебиторки по скрипту', why:'RPA и AI распознают документы, сверяют данные и формируют отчёты.', action:'Переходи от операционной обработки к анализу и прогнозированию.' }
    ],
    rising: [
      { skill:'Сценарное финансовое моделирование, управление cash flow, ROI человеческого капитала и технологий', why:'AI считает цифры, но стратегический выбор остаётся задачей человека.', action:'Развивай стратегическое мышление и финансовую коммуникацию.' }
    ],
    emerging: [
      { skill:'Аудит алгоритмических финансовых решений, новые цифровые активы, ESG-метрики', why:'Технологии и регулирование меняют понятия актива, риска и отчётности.', action:'Следи за FinTech-регулированием и новыми моделями данных.' }
    ]
  }
};

const copy: Record<Lang, Record<string,string>> = {
  ru: { title:'Матрица обесценивания и роста навыков 2026–2030', intro:'Рынок не стоит на месте. То, что кормило тебя вчера, завтра может стать базовой функцией, которую AI выполняет дешевле. Найди свою профессию и посмотри, что теряет цену, что растёт и что только появляется.', falling:'🔴 Падает в цене', rising:'🟢 Растёт в цене', emerging:'🔵 Появляется', why:'Почему это происходит', action:'Что делать', current:'Сверь с собой', selected:'Выбрано', plan:'Твой план на 90 дней', planIntro:'План строится из твоего текущего навыка, его уровня, критичности и рыночного направления. Не из воздуха.', noSkill:'Сначала добавь навык в чек-листе выше. Тогда план станет персональным.', choose:'Выбери навык роста', level:'Текущий уровень', priority:'Приоритет', days1:'Дни 1–30', days2:'Дни 31–60', days3:'Дни 61–90', d1:'Разобрать навык на конкретные действия, выбрать один реальный рабочий кейс и определить, какое доказательство результата можно получить.', d2:'Применить навык минимум в нескольких реальных задачах, измерить экономический эффект и зафиксировать Evidence of Work.', d3:'Собрать доказательства, показать результат руководителю или рынку и пересчитать свою рыночную мощность.', map:'Это не приговор. Это карта местности. Цель — не угадать профессию 2030 года, а вовремя переносить свою ценность из дешёвой рутины в дорогой результат.' },
  en: { title:'Skill devaluation and growth matrix 2026–2030', intro:'The market keeps moving. What paid well yesterday may become a basic function AI performs more cheaply tomorrow. Find your field and see what is losing value, what is growing and what is emerging.', falling:'🔴 Losing value', rising:'🟢 Growing in value', emerging:'🔵 Emerging', why:'Why it happens', action:'What to do', current:'Compare with yourself', selected:'Selected', plan:'Your 90-day plan', planIntro:'The plan is built from your current skill, level, criticality and market direction. Not from thin air.', noSkill:'Add a skill to the checklist above first. Then the plan can be personal.', choose:'Choose a growth skill', level:'Current level', priority:'Priority', days1:'Days 1–30', days2:'Days 31–60', days3:'Days 61–90', d1:'Break the skill into concrete actions, choose one real work case and define what evidence of results you can produce.', d2:'Apply the skill in several real tasks, measure economic impact and capture Evidence of Work.', d3:'Collect proof, show the result to a manager or the market and recalculate your market capacity.', map:'This is not a verdict. It is a map. The goal is not to guess the job market of 2030, but to move your value from cheap routine into valuable outcomes in time.' },
  kk: { title:'Дағдылардың құнсыздануы және өсу матрицасы 2026–2030', intro:'Нарық тоқтамайды. Кеше ақша әкелген нәрсе ертең AI орындайтын базалық функцияға айналуы мүмкін. Бағытыңды тауып, қайсысы арзандап, қайсысы өсіп, қайсысы енді пайда болып жатқанын көр.', falling:'🔴 Құны төмендейді', rising:'🟢 Құны өседі', emerging:'🔵 Пайда болады', why:'Неліктен', action:'Не істеу керек', current:'Өзіңмен салыстыр', selected:'Таңдалды', plan:'90 күндік жоспарың', planIntro:'Жоспар қазіргі дағдың, деңгейің, маңыздылығың және нарық бағыты негізінде құрылады. Ол ауадан пайда болмайды.', noSkill:'Алдымен жоғарыдағы чек-параққа дағды қос. Сонда жоспар жеке болады.', choose:'Өсу дағдысын таңда', level:'Қазіргі деңгей', priority:'Басымдық', days1:'1–30 күн', days2:'31–60 күн', days3:'61–90 күн', d1:'Дағдыны нақты әрекеттерге бөл, бір нақты жұмыс кейсін таңда және қандай нәтиже дәлелін алуға болатынын анықта.', d2:'Дағдыны нақты міндеттерде қолдан, экономикалық әсерді өлше және Evidence of Work жина.', d3:'Дәлелдерді жинақтап, нәтижені басшыға немесе нарыққа көрсетіп, нарықтық қуатыңды қайта есепте.', map:'Бұл үкім емес, карта. Мақсат — 2030 жылғы мамандықты болжау емес, құныңды арзан рутиналық жұмыстан қымбат нәтижеге уақытында ауыстыру.' },
  az: { title:'Bacarıqların dəyərdən düşməsi və artımı matrisi 2026–2030', intro:'Bazar dayanmayır. Dünən yaxşı qazandıran iş sabah AI-nin daha ucuz gördüyü baza funksiyasına çevrilə bilər. Sahəni tap və nəyin dəyər itirdiyini, nəyin artdığını və nəyin yeni yarandığını gör.', falling:'🔴 Dəyəri azalır', rising:'🟢 Dəyəri artır', emerging:'🔵 Yaranır', why:'Niyə baş verir', action:'Nə etməli', current:'Özünlə müqayisə et', selected:'Seçildi', plan:'90 günlük planın', planIntro:'Plan cari bacarığın, səviyyən, kritikliyın və bazar istiqaməti əsasında qurulur. Havadan yaranmır.', noSkill:'Əvvəlcə yuxarıdakı checklist-ə bacarıq əlavə et. Sonra plan fərdiləşəcək.', choose:'İnkişaf bacarığını seç', level:'Cari səviyyə', priority:'Prioritet', days1:'1–30-cu günlər', days2:'31–60-cı günlər', days3:'61–90-cı günlər', d1:'Bacarığı konkret hərəkətlərə böl, bir real iş nümunəsi seç və hansı nəticə sübutunu yarada biləcəyini müəyyən et.', d2:'Bacarığı real tapşırıqlarda tətbiq et, iqtisadi təsiri ölç və Evidence of Work topla.', d3:'Sübutları topla, nəticəni rəhbərə və ya bazara göstər və bazar gücünü yenidən hesabla.', map:'Bu hökm deyil, xəritədir. Məqsəd 2030-cu ilin peşəsini təxmin etmək deyil, dəyərini ucuz rutin işdən yüksək dəyərli nəticəyə vaxtında keçirməkdir.' }
};

export function MarketValueGrowthMatrix({ lang, role, skills, bottleneck }: Props) {
  const t = copy[lang];
  const [category, setCategory] = useState<Category>('sales');
  const [selectedSkill, setSelectedSkill] = useState<string>('');
  const categories = Object.keys(DATA) as Category[];
  const matrix = DATA[category];
  const candidate = useMemo(() => skills.find(s => s.name.trim() && (selectedSkill ? s.name === selectedSkill : false)) || bottleneck || skills.find(s => s.name.trim()), [skills, bottleneck, selectedSkill]);
  const growth = matrix.rising[0]?.skill || matrix.emerging[0]?.skill || '';
  const planSkill = candidate?.name || growth;
  const planLevel = candidate?.level || 5;
  const planPriority = candidate ? candidate.level * candidate.criticality : undefined;

  return <section className="mt-6 rounded-2xl border border-slate-200 p-5 sm:p-7" aria-labelledby="growth-matrix-title">
    <h2 id="growth-matrix-title" className="text-2xl font-bold">{t.title}</h2>
    <p className="mt-2 max-w-4xl leading-7 text-slate-600">{t.intro}</p>
    {role && <div className="mt-3 text-sm text-slate-500">{t.current}: <span className="font-semibold text-slate-800">{role}</span></div>}
    <div className="mt-5 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={t.current}>
      {categories.map(c => <button key={c} role="tab" aria-selected={category===c} onClick={()=>setCategory(c)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${category===c?'bg-[#000052] text-white':'border border-slate-300 bg-white text-slate-700'}`}>{DATA[c].label[lang]}</button>)}
    </div>
    <div className="mt-6 grid gap-4 md:grid-cols-3">
      {[['falling',matrix.falling,t.falling],['rising',matrix.rising,t.rising],['emerging',matrix.emerging,t.emerging]].map(([kind,items,title]) => <div key={String(kind)} className="rounded-2xl border border-slate-200 p-4 sm:p-5">
        <h3 className="font-bold">{title as string}</h3>
        {(items as Entry[]).map((e,i)=><div key={i} className="mt-4 first:mt-3"><div className="font-semibold leading-6">{e.skill}</div><div className="mt-2 text-sm leading-6 text-slate-600"><span className="font-semibold">{t.why}:</span> {e.why}</div><div className="mt-2 text-sm leading-6 text-slate-700"><span className="font-semibold">{t.action}:</span> {e.action}</div></div>)}
      </div>)}
    </div>
    <div className="mt-6 rounded-2xl bg-slate-50 p-5 sm:p-6">
      <h3 className="text-xl font-bold">{t.plan}</h3>
      <p className="mt-2 leading-7 text-slate-600">{t.planIntro}</p>
      {skills.filter(s=>s.name.trim()).length > 0 ? <>
        <label className="mt-5 block text-sm font-semibold">{t.choose}<select value={selectedSkill} onChange={e=>setSelectedSkill(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3"><option value="">{candidate?.name || growth}</option>{skills.filter(s=>s.name.trim()).map(s=><option key={s.name} value={s.name}>{s.name}</option>)}</select></label>
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4"><div className="text-lg font-bold">{planSkill}</div><div className="mt-1 text-sm text-slate-600">{t.level}: {planLevel}/10{planPriority ? ` · ${t.priority}: ${planPriority}` : ''}</div></div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <PlanCard title={t.days1} text={t.d1}/><PlanCard title={t.days2} text={t.d2}/><PlanCard title={t.days3} text={t.d3}/>
        </div>
      </> : <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm leading-6 text-slate-600">{t.noSkill}</div>}
      <p className="mt-5 text-sm leading-6 text-slate-600">{t.map}</p>
    </div>
  </section>;
}

function PlanCard({ title, text }: { title: string; text: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="font-bold">{title}</div><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></div>;
}
