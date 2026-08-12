export type InsuranceAgentMarketMetric = {
  skill: string;
  hhVacancies: number;
  salaryMedian: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  availability: 'Высокая' | 'Средняя' | 'Низкая' | 'Нет данных';
  confidence: 'Высокая' | 'Средняя' | 'Низкая' | 'Нет данных';
  searchTerms: string[];
};

/**
 * Бесплатный MVP-прототип.
 * Значения ниже являются ИЛЛЮСТРАТИВНОЙ демо-выборкой и не являются
 * утверждением о текущем рынке hh.ru. В production они заменяются
 * автоматически собранными и нормализованными данными hh.ru.
 */
export const insuranceAgentMarketDemo: InsuranceAgentMarketMetric[] = [
  {
    skill: 'Продажи корпоративного страхования',
    hhVacancies: 126,
    salaryMedian: 180000,
    salaryMin: 120000,
    salaryMax: 300000,
    availability: 'Высокая',
    confidence: 'Средняя',
    searchTerms: ['страхование', 'корпоративное страхование', 'B2B продажи', 'продажи страховых продуктов'],
  },
  {
    skill: 'Удержание клиентов',
    hhVacancies: 98,
    salaryMedian: 165000,
    salaryMin: 110000,
    salaryMax: 260000,
    availability: 'Высокая',
    confidence: 'Средняя',
    searchTerms: ['удержание клиентов', 'развитие клиентской базы', 'пролонгация договоров', 'продление договоров'],
  },
  {
    skill: 'Кросс-продажи',
    hhVacancies: 54,
    salaryMedian: 170000,
    salaryMin: 115000,
    salaryMax: 280000,
    availability: 'Средняя',
    confidence: 'Низкая',
    searchTerms: ['кросс-продажи', 'cross-sell', 'допродажи', 'дополнительные продукты'],
  },
  {
    skill: 'Выполнение плана продаж',
    hhVacancies: 143,
    salaryMedian: 175000,
    salaryMin: 120000,
    salaryMax: 290000,
    availability: 'Высокая',
    confidence: 'Средняя',
    searchTerms: ['план продаж', 'выполнение плана', 'KPI', 'объём продаж'],
  },
  {
    skill: 'Удержание 90 дней',
    hhVacancies: 0,
    salaryMedian: null,
    salaryMin: null,
    salaryMax: null,
    availability: 'Нет данных',
    confidence: 'Нет данных',
    searchTerms: ['удержание 90 дней', '90 days retention'],
  },
  {
    skill: 'Долгосрочная результативность',
    hhVacancies: 0,
    salaryMedian: null,
    salaryMin: null,
    salaryMax: null,
    availability: 'Нет данных',
    confidence: 'Нет данных',
    searchTerms: ['долгосрочная результативность', 'годовой результат', 'стабильное выполнение KPI'],
  },
];

export const insuranceAgentMarketSummary = {
  source: 'hh.ru',
  period: 'MVP demo',
  isDemo: true,
  note: 'Демо-данные. Перед production заменить на реальные данные hh.ru через разрешённый способ доступа.',
};
