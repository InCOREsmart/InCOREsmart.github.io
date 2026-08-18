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
      loss: { title: 'Из чего складывается кадровый разрыв', subtitle: 'Три понятных CEO компонента: стоимость найма, время до продуктивности и результат, который роль не создала.', recruitment: { title: 'Стоимость найма', detail: 'HR-ресурс, необходимый для замещения' }, adaptation: { title: 'Стоимость выхода на результат', detail: 'Зарплата до выхода сотрудника на полную продуктивность' }, revenue: { title: 'Недополученная выручка', detail: 'Средний результат, который роль не создала за период разгона' } },
      metrics: { lossPercent: 'Разрыв / годовой ФОТ', productivityLoss: 'Потеря производительной мощности', productivityLossDetail: 'суммарное время выхода замен на результат', revenueRisk: 'Выручка под риском', revenueRiskDetail: 'среднее значение в месяц', hrCapacity: 'Годовая HR-мощность', hrCostYearSuffix: 'стоимость HR в год', adaptationCost: 'Стоимость выхода на результат', adaptationDetail: 'стоимость периода до полной продуктивности', recruitmentCost: 'Стоимость найма', recruitmentDetail: 'HR-ресурс на замещение', revenueGap: 'Разрыв результата', revenueGapDetail: 'теоретическая выручка за полный период выхода на продуктивность', lossPerDeparture: 'Стоимость одной замены', hrCost: 'Стоимость HR / год', turnoverCostEmployee: 'Стоимость потери одного сотрудника' },
      scenario: { badge: 'Сценарий возврата мощности', title: 'Если текучесть снизится на {{value}}%', description: 'Посмотрите, сколько денег и производительной мощности возвращается бизнесу при снижении числа замен.', slider: 'Снижение текучести', saving: 'Возвращаемый эффект в год', remaining: 'Останется замен' },
      next: { badge: 'Следующий уровень', title: 'От стоимости кадрового разрыва — к производительной мощности', description: 'InCORE связывает бизнес-цель, роли, компетенции, производительную мощность, результат, KPI, контракт и деньги.', items: { resultCost: 'Стоимость результата', roleCost: 'Стоимость роли', contractRoi: 'ROI контракта', financialForecast: 'Прогноз финансового эффекта' }, cta: 'Получить полный диагноз' },
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
      loss: { title: 'What creates the workforce gap', subtitle: 'Three CEO-friendly components: hiring cost, time to productivity and output the role did not create.', recruitment: { title: 'Hiring cost', detail: 'HR capacity required for replacement' }, adaptation: { title: 'Time-to-productivity cost', detail: 'Salary paid before the employee reaches full productivity' }, revenue: { title: 'Lost revenue', detail: 'Average output the role does not create during ramp-up' } },
      metrics: { lossPercent: 'Gap / annual payroll', productivityLoss: 'Productive capacity lost', productivityLossDetail: 'total time for replacements to reach output', revenueRisk: 'Revenue at risk', revenueRiskDetail: 'average monthly value', hrCapacity: 'Annual HR capacity', hrCostYearSuffix: 'annual HR cost', adaptationCost: 'Time-to-productivity cost', adaptationDetail: 'cost before full productivity', recruitmentCost: 'Hiring cost', recruitmentDetail: 'HR capacity allocated to replacement', revenueGap: 'Output gap', revenueGapDetail: 'theoretical revenue during the full time-to-productivity period', lossPerDeparture: 'Cost per replacement', hrCost: 'HR cost / year', turnoverCostEmployee: 'Cost of losing one employee' },
      scenario: { badge: 'Capacity recovery scenario', title: 'If turnover falls by {{value}}%', description: 'See how much money and productive capacity return to the business when fewer replacements are needed.', slider: 'Turnover reduction', saving: 'Annual recoverable effect', remaining: 'Replacements remaining' },
      next: { badge: 'Next level', title: 'From workforce gap cost to productive capacity', description: 'InCORE connects the business goal, roles, skills, productive capacity, outcome, KPI, contract and money.', items: { resultCost: 'Cost of outcome', roleCost: 'Cost of role', contractRoi: 'Contract ROI', financialForecast: 'Financial impact forecast' }, cta: 'Get full diagnosis' },
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
      loss: { title: 'Кадрлық алшақтық неден тұрады', subtitle: 'Үш түсінікті құрам: найм құны, өнімділікке дейінгі уақыт және рөл жасамаған нәтиже.', recruitment: { title: 'Найм құны', detail: 'Алмастыруға қажет HR қуаты' }, adaptation: { title: 'Нәтижеге шығу құны', detail: 'Қызметкер толық өнімділікке жеткенге дейінгі жалақы' }, revenue: { title: 'Алынбаған түсім', detail: 'Бейімделу кезінде рөл жасамаған орташа нәтиже' } },
      metrics: { lossPercent: 'Алшақтық / жылдық еңбек ақы қоры', productivityLoss: 'Жоғалған өндірістік қуат', productivityLossDetail: 'алмастырулардың нәтижеге дейінгі жиынтық уақыты', revenueRisk: 'Тәуекелдегі түсім', revenueRiskDetail: 'айлық орташа мән', hrCapacity: 'Жылдық HR қуаты', hrCostYearSuffix: 'жылдық HR құны', adaptationCost: 'Нәтижеге шығу құны', adaptationDetail: 'толық өнімділікке дейінгі кезең құны', recruitmentCost: 'Найм құны', recruitmentDetail: 'алмастыруға бөлінген HR қуаты', revenueGap: 'Нәтиже алшақтығы', revenueGapDetail: 'нәтижеге дейінгі толық кезеңдегі теориялық түсім', lossPerDeparture: 'Бір алмастыру құны', hrCost: 'HR құны / жыл', turnoverCostEmployee: 'Бір қызметкерді жоғалту құны' },
      scenario: { badge: 'Қуатты қайтару сценарийі', title: 'Егер кадр ауысымы {{value}}%-ға азайса', description: 'Алмастыру азайғанда бизнеске қанша ақша мен өндірістік қуат қайтатынын көріңіз.', slider: 'Кадр ауысымын азайту', saving: 'Жылдық қайтарылатын әсер', remaining: 'Қалған алмастырулар' },
      next: { badge: 'Келесі деңгей', title: 'Кадрлық алшақтық құнынан өндірістік қуатқа', description: 'InCORE бизнес мақсатын, рөлдерді, дағдыларды, өндірістік қуатты, нәтижені, KPI, келісімшарт пен ақшаны байланыстырады.', items: { resultCost: 'Нәтиже құны', roleCost: 'Рөл құны', contractRoi: 'Келісімшарт ROI', financialForecast: 'Қаржылық әсер болжамы' }, cta: 'Толық диагнозды алу' },
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
      loss: { title: 'Kadr boşluğu nədən yaranır', subtitle: 'Üç aydın komponent: işə qəbul, məhsuldarlığa qədər vaxt və rolun yaratmadığı nəticə.', recruitment: { title: 'İşə qəbul dəyəri', detail: 'Əvəzləmə üçün lazım olan HR resursu' }, adaptation: { title: 'Nəticəyə çıxış dəyəri', detail: 'Əməkdaş tam məhsuldar olana qədər əmək haqqı' }, revenue: { title: 'İtirilmiş gəlir', detail: 'Adaptasiya dövründə yaranmayan orta nəticə' } },
      metrics: { lossPercent: 'Boşluq / illik əmək haqqı fondu', productivityLoss: 'İtirilmiş məhsuldar güc', productivityLossDetail: 'əvəzləmələrin nəticəyə çıxış üçün ümumi vaxtı', revenueRisk: 'Riskdə olan gəlir', revenueRiskDetail: 'aylıq orta dəyər', hrCapacity: 'İllik HR gücü', hrCostYearSuffix: 'illik HR dəyəri', adaptationCost: 'Nəticəyə çıxış dəyəri', adaptationDetail: 'tam məhsuldarlığa qədər dövrün dəyəri', recruitmentCost: 'İşə qəbul dəyəri', recruitmentDetail: 'əvəzləməyə ayrılan HR resursu', revenueGap: 'Nəticə boşluğu', revenueGapDetail: 'tam nəticəyə çıxış dövründə nəzəri gəlir', lossPerDeparture: 'Bir əvəzləmə dəyəri', hrCost: 'HR dəyəri / il', turnoverCostEmployee: 'Bir əməkdaşın itirilmə dəyəri' },
      scenario: { badge: 'Gücün qaytarılması ssenarisi', title: 'Kadr axını {{value}}% azalsa', description: 'Daha az əvəzləmə olduqda biznesə nə qədər pul və məhsuldar güc qayıtdığını görün.', slider: 'Kadr axınının azalması', saving: 'İllik qaytarılan effekt', remaining: 'Qalan əvəzləmələr' },
      next: { badge: 'Növbəti səviyyə', title: 'Kadr boşluğunun dəyərindən məhsuldar gücə', description: 'InCORE biznes məqsədini, rolları, bacarıqları, məhsuldar gücü, nəticəni, KPI, müqaviləni və pulu birləşdirir.', items: { resultCost: 'Nəticə dəyəri', roleCost: 'Rol dəyəri', contractRoi: 'Müqavilə ROI', financialForecast: 'Maliyyə effektinin proqnozu' }, cta: 'Tam diaqnozu əldə et' },
      report: { title: 'Maliyyə görünüşünüz', description: 'Hesablama kadr boşluğu səbəbindən biznesin nə qədər güc və nəticə itirdiyini göstərir.', close: 'Bağla', loss: 'Boşluğun dəyəri', saving25: '-25% axında effekt', saving40: '-40% axında effekt', ramp: 'Nəticəyə qədər ümumi vaxt' },
      footer: 'InCORE · insan kapitalı ilə biznes planının icrası üçün infrastruktur',
      units: { months: 'ay', hires: 'işə qəbul', currency: '₽' }
    }
  }
};