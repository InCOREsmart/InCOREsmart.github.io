export const hrCalculatorTranslations = {
  ru: {
    hrCalculator: {
      badge: 'InCORE · Диагностика кадрового разрыва',
      title: 'Сколько бизнес теряет из-за текучести и долгого выхода сотрудников на результат?',
      subtitle: 'За 5 минут рассчитайте стоимость найма, адаптации и недополученной выручки. Затем увидите, сколько производительной мощности бизнеса теряется каждый год.',
      reset: 'Сбросить',
      company: { title: 'Данные компании', subtitle: '7 показателей, чтобы перевести кадровый разрыв в деньги и производительную мощность' },
      fields: {
        averageSalary: { label: 'Средняя зарплата сотрудника', hint: 'рублей в месяц' },
        departures: { label: 'Уволенных за год', hint: 'человек' },
        rampMonths: { label: 'Срок выхода на результат', hint: 'месяцев до полной продуктивности' },
        revenue: { label: 'Выручка на сотрудника', hint: 'валовая выручка в месяц' },
        hrCount: { label: 'Количество HR-специалистов', hint: 'человек' },
        hrSalary: { label: 'Стоимость HR-специалиста', hint: 'рублей в месяц' },
        hiresCapacity: { label: 'Наймов в месяц на 1 HR', hint: 'закрытий вакансий' }
      },
      result: { label: 'Стоимость кадрового разрыва', year: 'в год', perDeparture: 'на одну замену', lostRevenue: 'Недополученная выручка', costPerHire: 'Стоимость одного найма' },
      loss: { title: 'Из чего складывается кадровый разрыв', subtitle: 'Три понятных CEO компонента: стоимость найма, время до продуктивности и результат, который роль не создала.', recruitment: { title: 'Стоимость найма', detail: 'за один найм', totalDetail: 'всего за {{count}} замены' }, adaptation: { title: 'Стоимость периода адаптации', detail: 'ФОТ сотрудников за период до полной продуктивности' }, revenue: { title: 'Недополученная выручка', detail: 'Допущение: в период адаптации сотрудник даёт 50% выручки', productivityRate: '50% продуктивности' } },
      metrics: { lossPercent: 'Стоимость замены / годовая зарплата', productivityShareDetail: 'доля потерь из-за неполной продуктивности', productivityLoss: 'Потеря производительной мощности', productivityLossDetail: 'суммарное время выхода замен на результат', revenueRisk: 'Выручка под риском', revenueRiskDetail: 'среднее значение в месяц', hrCapacity: 'Годовая HR-мощность', hrCostYearSuffix: 'стоимость HR в год', adaptationCost: 'ФОТ периода адаптации', adaptationDetail: 'зарплата сотрудников за период до полной продуктивности', recruitmentCost: 'Стоимость найма', recruitmentDetail: 'стоимость HR-ресурса на все замещения за год', revenueGap: 'Теоретический разрыв выручки', revenueGapDetail: 'теоретический максимум при 0% продуктивности; итоговый расчёт использует 50% продуктивности', lossPerDeparture: 'Стоимость одной замены', hrCost: 'Стоимость HR / год', turnoverCostEmployee: 'Стоимость потери одного сотрудника' },
      scenario: { badge: 'Сценарий возврата мощности', title: 'Если текучесть снизится на {{value}}%', description: 'Посмотрите, сколько денег и производительной мощности возвращается бизнесу при снижении числа замен.', slider: 'Снижение текучести', saving: 'Возвращаемый эффект в год', remaining: 'Останется замен' },
      next: { badge: 'Следующий уровень', title: 'От стоимости кадрового разрыва — к производительной мощности', description: 'InCORE связывает бизнес-цель, роли, компетенции, производительную мощность, результат, KPI, контракт и деньги.', items: { resultCost: 'Стоимость результата', roleCost: 'Стоимость роли', contractRoi: 'ROI контракта', financialForecast: 'Прогноз финансового эффекта' }, cta: 'Узнать, где компания теряет деньги' },
      report: { title: 'Ваш финансовый срез', description: 'Расчёт показывает, сколько мощности и результата бизнес теряет из-за кадрового разрыва.', close: 'Закрыть', loss: 'Стоимость разрыва', saving25: 'Эффект при -25% текучести', saving40: 'Эффект при -40% текучести', ramp: 'Суммарное время до результата' },
      footer: 'InCORE · инфраструктура выполнения бизнес-плана через человеческий капитал',
      units: { months: 'мес.', hires: 'наймов', currency: '₽' }
    }
  },
  en: {
    hrCalculator: {
      badge: 'InCORE · Workforce gap diagnosis',
      title: 'How much does your business lose to turnover and slow time-to-productivity?',
      subtitle: 'In 5 minutes, calculate hiring cost, ramp-up cost and lost revenue. Then see how much productive capacity your business loses each year.',
      reset: 'Reset',
      company: { title: 'Company data', subtitle: '7 indicators to translate the people gap into money and productive capacity' },
      fields: { averageSalary: { label: 'Average employee salary', hint: 'per month' }, departures: { label: 'Employees leaving per year', hint: 'people' }, rampMonths: { label: 'Time to productive output', hint: 'months to full productivity' }, revenue: { label: 'Revenue per employee', hint: 'gross revenue per month' }, hrCount: { label: 'HR specialists', hint: 'people' }, hrSalary: { label: 'HR specialist cost', hint: 'per month' }, hiresCapacity: { label: 'Hires per month per HR', hint: 'closed vacancies' } },
      result: { label: 'Cost of the workforce gap', year: 'per year', perDeparture: 'per replacement', lostRevenue: 'Lost revenue', costPerHire: 'Cost per hire' },
      loss: { title: 'What creates the workforce gap', subtitle: 'Three CEO-friendly components: hiring cost, time to productivity and output the role did not create.', recruitment: { title: 'Hiring cost', detail: 'per hire', totalDetail: 'total for {{count}} replacements' }, adaptation: { title: 'Time-to-productivity cost', detail: 'Salary paid before the employee reaches full productivity' }, revenue: { title: 'Lost revenue', detail: 'Assumption: employee generates 50% of full revenue during ramp-up', productivityRate: '50% productivity' } },
      metrics: { lossPercent: 'Replacement cost / annual salary', productivityShareDetail: 'share of loss from incomplete productivity', productivityLoss: 'Productive capacity lost', productivityLossDetail: 'total time for replacements to reach output', revenueRisk: 'Revenue at risk', revenueRiskDetail: 'average monthly value', hrCapacity: 'Annual HR capacity', hrCostYearSuffix: 'annual HR cost', adaptationCost: 'Ramp-up payroll', adaptationDetail: 'employee salary during ramp-up', recruitmentCost: 'Hiring cost', recruitmentDetail: 'HR capacity cost for all replacements during the year', revenueGap: 'Theoretical revenue gap', revenueGapDetail: 'theoretical maximum at 0% productivity; total loss uses 50% productivity', lossPerDeparture: 'Cost per replacement', hrCost: 'HR cost / year', turnoverCostEmployee: 'Cost of losing one employee' },
      scenario: { badge: 'Capacity recovery scenario', title: 'If turnover falls by {{value}}%', description: 'See how much money and productive capacity return to the business when fewer replacements are needed.', slider: 'Turnover reduction', saving: 'Annual recoverable effect', remaining: 'Replacements remaining' },
      next: { badge: 'Next level', title: 'From workforce gap cost to productive capacity', description: 'InCORE connects the business goal, roles, skills, productive capacity, outcome, KPI, contract and money.', items: { resultCost: 'Cost of outcome', roleCost: 'Cost of role', contractRoi: 'Contract ROI', financialForecast: 'Financial impact forecast' }, cta: 'Find where your company is losing money' },
      report: { title: 'Your financial snapshot', description: 'The calculation shows how much capacity and output the business loses because of the workforce gap.', close: 'Close', loss: 'Gap cost', saving25: 'Effect at -25% turnover', saving40: 'Effect at -40% turnover', ramp: 'Total time to output' },
      footer: 'InCORE · infrastructure for executing the business plan through human capital',
      units: { months: 'mo.', hires: 'hires', currency: 'RUB' }
    }
  },
  kk: {
    hrCalculator: {
      badge: 'InCORE · Кадрлық алшақтық диагностикасы',
      title: 'Компания кадр ауысымы мен нәтижеге баяу шығудан қанша жоғалтады?',
      subtitle: '5 минутта найм, бейімделу және алынбаған түсім құнын есептеңіз. Содан кейін бизнес жыл сайын қанша өндірістік қуат жоғалтатынын көріңіз.',
      reset: 'Қалпына келтіру',
      company: { title: 'Компания деректері', subtitle: 'Кадрлық алшақтықты ақша мен өндірістік қуатқа аудару үшін 7 көрсеткіш' },
      fields: { averageSalary: { label: 'Қызметкердің орташа жалақысы', hint: 'айына' }, departures: { label: 'Жылына жұмыстан кеткендер', hint: 'адам' }, rampMonths: { label: 'Нәтижеге шығу мерзімі', hint: 'толық өнімділікке дейінгі айлар' }, revenue: { label: 'Бір қызметкердің түсімі', hint: 'айлық жалпы түсім' }, hrCount: { label: 'HR мамандарының саны', hint: 'адам' }, hrSalary: { label: 'HR маманының құны', hint: 'айына' }, hiresCapacity: { label: '1 HR-ға айына найм', hint: 'жабылған вакансиялар' } },
      result: { label: 'Кадрлық алшақтық құны', year: 'жылына', perDeparture: 'бір алмастыруға', lostRevenue: 'Алынбаған түсім', costPerHire: 'Бір найм құны' },
      loss: { title: 'Кадрлық алшақтық неден тұрады', subtitle: 'Үш түсінікті құрам: найм құны, өнімділікке дейінгі уақыт және рөл жасамаған нәтиже.', recruitment: { title: 'Найм құны', detail: 'бір наймға', totalDetail: 'барлығы {{count}} алмастыруға' }, adaptation: { title: 'Нәтижеге шығу құны', detail: 'Қызметкер толық өнімділікке жеткенге дейінгі жалақы' }, revenue: { title: 'Алынбаған түсім', detail: 'Болжам: бейімделу кезеңінде қызметкер толық түсімнің 50%-ын жасайды', productivityRate: '50% өнімділік' } },
      metrics: { lossPercent: 'Алмастыру құны / жылдық жалақы', productivityShareDetail: 'толық өнімділікке жетпеуден шығынның үлесі', productivityLoss: 'Жоғалған өндірістік қуат', productivityLossDetail: 'алмастырулардың нәтижеге дейінгі жиынтық уақыты', revenueRisk: 'Тәуекелдегі түсім', revenueRiskDetail: 'айлық орташа мән', hrCapacity: 'Жылдық HR қуаты', hrCostYearSuffix: 'жылдық HR құны', adaptationCost: 'Бейімделу кезеңінің ФОТ-ы', adaptationDetail: 'толық өнімділікке дейінгі қызметкерлер жалақысы', recruitmentCost: 'Найм құны', recruitmentDetail: 'барлық алмастыруларға арналған HR ресурсының жылдық құны', revenueGap: 'Теориялық түсім алшақтығы', revenueGapDetail: '0% өнімділік кезіндегі теориялық максимум; жалпы есепте 50% өнімділік алынған', lossPerDeparture: 'Бір алмастыру құны', hrCost: 'HR құны / жыл', turnoverCostEmployee: 'Бір қызметкерді жоғалту құны' },
      scenario: { badge: 'Қуатты қайтару сценарийі', title: 'Егер кадр ауысымы {{value}}%-ға азайса', description: 'Алмастыру азайғанда бизнеске қанша ақша мен өндірістік қуат қайтатынын көріңіз.', slider: 'Кадр ауысымын азайту', saving: 'Жылдық қайтарылатын әсер', remaining: 'Қалған алмастырулар' },
      next: { badge: 'Келесі деңгей', title: 'Кадрлық алшақтық құнынан өндірістік қуатқа', description: 'InCORE бизнес мақсатын, рөлдерді, дағдыларды, өндірістік қуатты, нәтижені, KPI, келісімшарт пен ақшаны байланыстырады.', items: { resultCost: 'Нәтиже құны', roleCost: 'Рөл құны', contractRoi: 'Келісімшарт ROI', financialForecast: 'Қаржылық әсер болжамы' }, cta: 'Компанияның ақша қай жерде жоғалтатынын білу' },
      report: { title: 'Қаржылық срез', description: 'Есеп кадрлық алшақтықтан бизнес қанша қуат пен нәтиже жоғалтатынын көрсетеді.', close: 'Жабу', loss: 'Алшақтық құны', saving25: '-25% ауысымдағы әсер', saving40: '-40% ауысымдағы әсер', ramp: 'Нәтижеге дейінгі жиынтық уақыт' },
      footer: 'InCORE · адам капиталы арқылы бизнес-жоспарды орындау инфрақұрылымы',
      units: { months: 'ай', hires: 'найм', currency: '₽' }
    }
  },
  az: {
    hrCalculator: {
      badge: 'InCORE · Kadr boşluğu diaqnostikası',
      title: 'Biznes işçi axını və nəticəyə gec çıxış səbəbindən nə qədər itirir?',
      subtitle: '5 dəqiqəyə işə qəbul, adaptasiya və itirilmiş gəlirin dəyərini hesablayın. Sonra biznesin ildə nə qədər məhsuldar güc itirdiyini görün.',
      reset: 'Sıfırla',
      company: { title: 'Şirkət məlumatları', subtitle: 'Kadr boşluğunu pul və məhsuldar gücə çevirmək üçün 7 göstərici' },
      fields: { averageSalary: { label: 'Orta əməkdaş maaşı', hint: 'aylıq' }, departures: { label: 'İldə ayrılan əməkdaşlar', hint: 'nəfər' }, rampMonths: { label: 'Nəticəyə çıxış müddəti', hint: 'tam məhsuldarlığa qədər aylar' }, revenue: { label: 'Əməkdaş başına gəlir', hint: 'aylıq ümumi gəlir' }, hrCount: { label: 'HR mütəxəssislərinin sayı', hint: 'nəfər' }, hrSalary: { label: 'HR mütəxəssisinin dəyəri', hint: 'aylıq' }, hiresCapacity: { label: '1 HR üçün aylıq işə qəbul', hint: 'bağlanan vakansiyalar' } },
      result: { label: 'Kadr boşluğunun dəyəri', year: 'ildə', perDeparture: 'bir əvəzləməyə', lostRevenue: 'İtirilmiş gəlir', costPerHire: 'Bir işə qəbulun dəyəri' },
      loss: { title: 'Kadr boşluğu nədən yaranır', subtitle: 'Üç aydın komponent: işə qəbul, məhsuldarlığa qədər vaxt və rolun yaratmadığı nəticə.', recruitment: { title: 'İşə qəbul dəyəri', detail: 'bir işə qəbul üçün', totalDetail: 'cəmi {{count}} əvəzləmə üçün' }, adaptation: { title: 'Nəticəyə çıxış dəyəri', detail: 'Əməkdaş tam məhsuldar olana qədər əmək haqqı' }, revenue: { title: 'İtirilmiş gəlir', detail: 'Fərziyyə: adaptasiya dövründə əməkdaş tam gəlirin 50%-ni yaradır', productivityRate: '50% məhsuldarlıq' } },
      metrics: { lossPercent: 'Əvəzləmə xərci / illik maaş', productivityShareDetail: 'tam məhsuldarlığa çatmamaqdan itkinin payı', productivityLoss: 'İtirilmiş məhsuldar güc', productivityLossDetail: 'əvəzləmələrin nəticəyə çıxış üçün ümumi vaxtı', revenueRisk: 'Riskdə olan gəlir', revenueRiskDetail: 'aylıq orta dəyər', hrCapacity: 'İllik HR gücü', hrCostYearSuffix: 'illik HR dəyəri', adaptationCost: 'Adaptasiya dövrünün əmək haqqı fondu', adaptationDetail: 'tam məhsuldarlığa qədər əməkdaşların maaşı', recruitmentCost: 'İşə qəbul dəyəri', recruitmentDetail: 'bütün əvəzləmələr üçün HR resursunun illik dəyəri', revenueGap: 'Nəzəri gəlir boşluğu', revenueGapDetail: '0% məhsuldarlıqda nəzəri maksimum; ümumi hesablamada 50% məhsuldarlıq götürülür', lossPerDeparture: 'Bir əvəzləmə dəyəri', hrCost: 'HR dəyəri / il', turnoverCostEmployee: 'Bir əməkdaşın itirilmə dəyəri' },
      scenario: { badge: 'Gücün qaytarılması ssenarisi', title: 'Kadr axını {{value}}% azalsa', description: 'Daha az əvəzləmə olduqda biznesə nə qədər pul və məhsuldar güc qayıtdığını görün.', slider: 'Kadr axınının azalması', saving: 'İllik qaytarılan effekt', remaining: 'Qalan əvəzləmələr' },
      next: { badge: 'Növbəti səviyyə', title: 'Kadr boşluğunun dəyərindən məhsuldar gücə', description: 'InCORE biznes məqsədini, rolları, bacarıqları, məhsuldar gücü, nəticəni, KPI, müqaviləni və pulu birləşdirir.', items: { resultCost: 'Nəticə dəyəri', roleCost: 'Rol dəyəri', contractRoi: 'Müqavilə ROI', financialForecast: 'Maliyyə effektinin proqnozu' }, cta: 'Şirkətin harada pul itirdiyini öyrən' },
      report: { title: 'Maliyyə görünüşünüz', description: 'Hesablama kadr boşluğu səbəbindən biznesin nə qədər güc və nəticə itirdiyini göstərir.', close: 'Bağla', loss: 'Boşluğun dəyəri', saving25: '-25% axında effekt', saving40: '-40% axında effekt', ramp: 'Nəticəyə qədər ümumi vaxt' },
      footer: 'InCORE · insan kapitalı ilə biznes planının icrası üçün infrastruktur',
      units: { months: 'ay', hires: 'işə qəbul', currency: '₽' }
    }
  }
};