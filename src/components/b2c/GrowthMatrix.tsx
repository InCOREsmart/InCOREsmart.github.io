import React from 'react';

type Lang = 'ru' | 'en' | 'kk' | 'az';

type Props = { lang: Lang; role: string; bottleneck?: { name: string } };

const copy = {
  ru: { title: 'Матрица обесценивания и роста навыков 2026–2030', intro: 'Сравни свои навыки с теми, которые дешевеют, растут в цене и только появляются.', red: 'Падает в цене', green: 'Растёт в цене', blue: 'Появляется', plan: 'Твой план на 90 дней', empty: 'Заполни от 5 до 7 способностей, чтобы определить главное узкое место.', d1: 'Дни 1–30: определить критерий результата и получить первое доказательство.', d2: 'Дни 31–60: применить навык минимум в пяти реальных задачах и измерить изменение результата.', d3: 'Дни 61–90: собрать доказательства результата и повторить расчёт рыночной мощности.' },
  en: { title: 'Skill value and growth matrix 2026–2030', intro: 'Compare your skills with those losing value, gaining value and emerging.', red: 'Declining in value', green: 'Growing in value', blue: 'Emerging', plan: 'Your 90-day plan', empty: 'Complete 5–7 capabilities to identify your main bottleneck.', d1: 'Days 1–30: define the result criterion and obtain your first proof.', d2: 'Days 31–60: apply the skill in at least five real tasks and measure the change.', d3: 'Days 61–90: collect proof of results and recalculate your market capacity.' },
  kk: { title: 'Дағдылардың құнсыздануы мен өсу матрицасы 2026–2030', intro: 'Құны төмендейтін, өсетін және пайда болатын дағдыларыңды салыстыр.', red: 'Құны төмендейді', green: 'Құны өседі', blue: 'Пайда болады', plan: '90 күндік жоспарың', empty: 'Негізгі тар орныңды анықтау үшін 5–7 қабілет толтыр.', d1: '1–30 күн: нәтиже өлшемін анықтап, алғашқы дәлелді ал.', d2: '31–60 күн: дағдыны кемінде бес нақты міндетте қолданып, өзгерісті өлше.', d3: '61–90 күн: нәтиже дәлелдерін жинап, нарықтық қуатты қайта есепте.' },
  az: { title: 'Bacarıqların dəyər itirməsi və artımı matrisi 2026–2030', intro: 'Dəyəri azalan, artan və yeni yaranan bacarıqlarını müqayisə et.', red: 'Dəyəri azalır', green: 'Dəyəri artır', blue: 'Yaranır', plan: '90 günlük planın', empty: 'Əsas darboğazını müəyyən etmək üçün 5–7 bacarıq doldur.', d1: '1–30 gün: nəticə meyarını müəyyən et və ilk sübutunu əldə et.', d2: '31–60 gün: bacarığı ən azı beş real tapşırıqda tətbiq et və dəyişikliyi ölç.', d3: '61–90 gün: nəticə sübutlarını topla və bazar gücünü yenidən hesabla.' }
};

const matrix = {
  sales: {
    red: { ru: 'Холодные звонки по скрипту, базовая квалификация лида, механическое заполнение CRM.', en: 'Scripted cold calls, basic lead qualification and mechanical CRM entry.', kk: 'Скрипт бойынша суық қоңыраулар, бастапқы лид біліктілігі және CRM-ді механикалық толтыру.', az: 'Skript üzrə soyuq zənglər, ilkin lead kvalifikasiyası və CRM-in mexaniki doldurulması.' },
    green: { ru: 'Сложные переговоры, защита маржинальности, выявление скрытых потребностей и удержание.', en: 'Complex negotiations, margin protection, hidden economic needs and retention.', kk: 'Күрделі келіссөздер, маржаны қорғау, жасырын экономикалық қажеттіліктерді анықтау және ұстап қалу.', az: 'Mürəkkəb danışıqlar, marjanın qorunması, gizli iqtisadi ehtiyacların aşkarlanması və müştəri saxlanması.' },
    blue: { ru: 'AI-персонализация предложений, прогноз оттока и гибридные воронки человек + AI.', en: 'AI-personalized proposals, churn prediction and human + AI sales funnels.', kk: 'AI арқылы дербестендірілген ұсыныстар, кетуді болжау және адам + AI сату воронкалары.', az: 'AI ilə fərdiləşdirilmiş təkliflər, itki proqnozu və insan + AI satış huniləri.' }
  },
  marketing: {
    red: { ru: 'Ручной таргетинг, SEO-тексты «для галочки», базовый дизайн и механический постинг.', en: 'Manual broad targeting, checkbox SEO copy, basic design and mechanical posting.', kk: 'Қолмен таргеттеу, формалды SEO мәтіндері, базалық дизайн және механикалық жариялау.', az: 'Manual geniş hədəfləmə, formal SEO mətnləri, əsas dizayn və mexaniki paylaşım.' },
    green: { ru: 'Юнит-экономика, глубокие интервью с клиентами, репутация и кросс-функциональная стратегия.', en: 'Unit economics, deep customer research, reputation and cross-functional strategy.', kk: 'Unit-экономика, терең клиенттік зерттеу, бедел және кросс-функционалды стратегия.', az: 'Unit iqtisadiyyatı, dərin müştəri araşdırması, reputasiya və funksiyalararası strategiya.' },
    blue: { ru: 'Управление AI-агентами, first-party данные и интерактивный контент.', en: 'AI-agent orchestration, first-party data and interactive content.', kk: 'AI-агенттерін басқару, first-party деректері және интерактивті контент.', az: 'AI agentlərinin idarə edilməsi, first-party məlumatları və interaktiv kontent.' }
  },
  it: {
    red: { ru: 'Шаблонный код, ручное тестирование, базовая вёрстка и простые дашборды.', en: 'Boilerplate code, manual QA, basic layouts and simple dashboards.', kk: 'Шаблондық код, қолмен тестілеу, базалық беттеу және қарапайым дашбордтар.', az: 'Şablon kod, manual QA, əsas layout və sadə dashboardlar.' },
    green: { ru: 'Архитектура, понимание бизнес-домена, безопасность, производительность и техдолг.', en: 'Architecture, business-domain expertise, security, performance and technical debt.', kk: 'Архитектура, бизнес-доменді түсіну, қауіпсіздік, өнімділік және техникалық қарыз.', az: 'Arxitektura, biznes domeni, təhlükəsizlik, performans və texniki borc.' },
    blue: { ru: 'AI-оркестрация, проверка AI-результатов и MLOps.', en: 'AI orchestration, AI-output validation and MLOps.', kk: 'AI-оркестрациясы, AI нәтижелерін тексеру және MLOps.', az: 'AI orkestrasiya, AI nəticələrinin yoxlanması və MLOps.' }
  },
  hr: {
    red: { ru: 'Массовый скрининг резюме, первичные интервью, документы и рутинная координация.', en: 'Mass CV screening, first interviews, paperwork and routine coordination.', kk: 'Резюмелерді жаппай скринингтеу, алғашқы сұхбаттар, құжаттар және күнделікті үйлестіру.', az: 'Kütləvi CV skrininqi, ilkin müsahibələr, sənədləşmə və rutin koordinasiya.' },
    green: { ru: 'Проектирование ролей, производительная мощность команд, внутренняя мобильность и удержание.', en: 'Role design, productive team capacity, internal mobility and retention.', kk: 'Рөлдерді жобалау, команданың өндірістік қуаты, ішкі мобильдік және ұстап қалу.', az: 'Rolların dizaynı, komandanın məhsuldar gücü, daxili mobillik və saxlanma.' },
    blue: { ru: 'Алгоритмическая справедливость, предиктивная аналитика текучести и рабочие места человек + AI.', en: 'Algorithmic fairness, predictive attrition analytics and human + AI job design.', kk: 'Алгоритмдік әділдік, кетуді болжау аналитикасы және адам + AI жұмыс орындарын жобалау.', az: 'Alqoritmik ədalət, işçi dövriyyəsinin proqnoz analitikası və insan + AI iş yerləri.' }
  },
  finance: {
    red: { ru: 'Ручной ввод документов, сведение таблиц и бюджетирование «от достигнутого».', en: 'Manual document entry, spreadsheet consolidation and incremental budgeting.', kk: 'Құжаттарды қолмен енгізу, кестелерді біріктіру және өткенге сүйенген бюджеттеу.', az: 'Sənədlərin əl ilə daxil edilməsi, cədvəllərin birləşdirilməsi və keçmişə əsaslanan büdcələmə.' },
    green: { ru: 'Сценарное моделирование, управление денежным потоком и ROI людей и технологий.', en: 'Scenario modelling, cash-flow decisions and ROI of people and technology.', kk: 'Сценарийлік модельдеу, ақша ағынын басқару және адамдар мен технологиялардың ROI.', az: 'Ssenari modelləşdirməsi, pul axınının idarəsi və insan və texnologiyaların ROI-si.' },
    blue: { ru: 'Аудит алгоритмических финансовых решений, токенизированные активы и ESG.', en: 'Algorithmic finance audit, tokenized assets and ESG-finance integration.', kk: 'Алгоритмдік қаржылық шешімдер аудиті, токенделген активтер және ESG.', az: 'Alqoritmik maliyyə qərarlarının auditi, tokenləşdirilmiş aktivlər və ESG.' }
  }
} as const;

function MatrixCard({label,text}:{label:string;text:string}) { return <div className="rounded-xl border border-slate-200 p-4"><div className="text-sm font-bold">{label}</div><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></div>; }

export default function GrowthMatrix({lang,role,bottleneck}:Props) {
  const t=copy[lang];
  const r=role.toLowerCase();
  const key:'sales'|'marketing'|'it'|'hr'|'finance'=r.match(/продаж|sales|сату|satış/) ? 'sales' : r.match(/маркет|market/) ? 'marketing' : r.match(/разраб|developer|it|әзір|inkişaf/) ? 'it' : r.match(/hr|персон|адам|insan/) ? 'hr' : r.match(/финанс|finance|қаржы|maliyy/) ? 'finance' : 'sales';
  const m=matrix[key];
  return <section className="mt-6 rounded-2xl border border-slate-200 p-5 sm:p-7"><h2 className="text-2xl font-bold">{t.title}</h2><p className="mt-2 leading-7 text-slate-600">{t.intro}</p><div className="mt-5 grid gap-3 md:grid-cols-3"><MatrixCard label={t.red} text={m.red[lang]}/><MatrixCard label={t.green} text={m.green[lang]}/><MatrixCard label={t.blue} text={m.blue[lang]}/></div><div className="mt-5 rounded-xl bg-slate-50 p-5"><div className="font-semibold">{t.plan}</div>{bottleneck?<><div className="mt-2 font-bold">{bottleneck.name}</div><ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700"><li>{t.d1}</li><li>{t.d2}</li><li>{t.d3}</li></ol></>:<p className="mt-2 text-sm text-slate-600">{t.empty}</p>}</div></section>;
}
