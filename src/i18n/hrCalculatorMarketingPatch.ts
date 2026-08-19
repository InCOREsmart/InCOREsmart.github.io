export const hrCalculatorMarketingPatch = {
  ru: {
    hrCalculator: {
      title: 'Сколько денег ваша компания теряет из-за людей и процессов?',
      subtitle: 'За 5 минут оцените стоимость текучести, адаптации и недополученной производительности.',
      company: { title: 'Данные компании', subtitle: '7 показателей, которые влияют на стоимость текучести' },
      result: { label: 'Сколько денег теряет компания', year: 'в год', perDeparture: 'на одного уволившегося сотрудника', lostRevenue: 'Недополученная выручка', costPerHire: 'Стоимость одного найма' },
      loss: { title: 'Куда уходят деньги', subtitle: 'Три основные статьи стоимости замены сотрудника.', recruitment: { title: 'Работа HR по найму', detail: 'Сколько HR-ресурса уходит на одно закрытие вакансии' }, adaptation: { title: 'Зарплата до выхода на результат', detail: 'Зарплата сотрудника за период до полной продуктивности' }, revenue: { title: 'Недополученная выручка', detail: 'Выручка, которую компания не получает, пока сотрудник выходит на полную продуктивность' } },
      metrics: { lossPercent: 'Потери / годовая зарплата', productivityLoss: 'Потеря продуктивности', productivityLossDetail: 'суммарное время, которое все замены выходят на полную продуктивность', revenueRisk: 'Недополученная выручка', revenueRiskDetail: 'среднее значение в месяц', hrCapacity: 'Годовая мощность HR', hrCostYearSuffix: 'затраты на HR в год', adaptationCost: 'Стоимость выхода на результат', adaptationDetail: 'зарплата сотрудника до полной продуктивности', recruitmentCost: 'Затраты HR на один найм', recruitmentDetail: 'доля HR-ресурса, приходящаяся на одну замену', revenueGap: 'Недополученная выручка за период выхода', revenueGapDetail: 'теоретическая выручка, которую компания не получает до полной продуктивности', lossPerDeparture: 'Стоимость замены сотрудника', hrCost: 'Затраты на HR / год', turnoverCostEmployee: 'Потери на одного сотрудника' },
      scenario: { badge: 'Сценарий снижения текучести', title: 'Что будет, если увольнений станет на {{value}}% меньше?', description: 'Показываем в деньгах, сколько компания потенциально сохранит при меньшем числе замен.', slider: 'Снижение текучести', saving: 'Экономия в год', remaining: 'Увольнений останется' },
      next: { badge: 'Следующий уровень диагностики', title: 'Зарплата сотрудника показывает только часть реальной стоимости', description: 'InCORE помогает связать стоимость роли, скорость выхода на результат и финансовый эффект, чтобы управлять не только наймом, но и окупаемостью работы человека.', items: { resultCost: 'Стоимость результата', roleCost: 'Стоимость роли', contractRoi: 'ROI контракта', financialForecast: 'Прогноз финансового эффекта' }, cta: 'Получить полный разбор' },
      report: { title: 'Ваш финансовый срез', description: 'Дополнительные показатели рассчитаны на основе введённых вами данных.', close: 'Закрыть', loss: 'Общие потери', saving25: 'Эффект при снижении текучести на 25%', saving40: 'Эффект при снижении текучести на 40%', ramp: 'Суммарное время выхода замен на результат' },
      footer: ''
    }
  },
  en: {
    hrCalculator: {
      title: 'How much money is your company losing because of people and processes?',
      subtitle: 'In 5 minutes, estimate the cost of turnover, ramp-up and lost productivity.',
      company: { title: 'Company data', subtitle: '7 indicators that affect the cost of turnover' },
      reset: 'Reset',
      result: { label: 'How much money the company loses', year: 'per year', perDeparture: 'per employee who leaves', lostRevenue: 'Lost revenue', costPerHire: 'Cost per hire' },
      loss: { title: 'Where the money goes', subtitle: 'Three main cost categories when replacing an employee.', recruitment: { title: 'HR hiring effort', detail: 'HR resources spent on one vacancy' }, adaptation: { title: 'Salary before full productivity', detail: 'Employee salary during the ramp-up period' }, revenue: { title: 'Lost revenue', detail: 'Revenue the company does not generate before full productivity' } },
      metrics: { lossPercent: 'Loss / annual salary', productivityLoss: 'Productivity lost', productivityLossDetail: 'total ramp-up time across replacements', revenueRisk: 'Lost revenue', revenueRiskDetail: 'average monthly value', hrCapacity: 'Annual HR capacity', hrCostYearSuffix: 'annual HR cost', adaptationCost: 'Cost to reach productivity', adaptationDetail: 'employee salary before full productivity', recruitmentCost: 'HR cost per hire', recruitmentDetail: 'HR resources allocated to one replacement', revenueGap: 'Lost revenue during ramp-up', revenueGapDetail: 'theoretical revenue the company does not generate before full productivity', lossPerDeparture: 'Cost to replace an employee', hrCost: 'HR cost / year', turnoverCostEmployee: 'Loss per employee' },
      scenario: { badge: 'Turnover reduction scenario', title: 'What if departures decrease by {{value}}%?', description: 'See how much the company could potentially save with fewer replacements.', slider: 'Turnover reduction', saving: 'Annual savings', remaining: 'Departures remaining' },
      next: { badge: 'Next level of diagnosis', title: 'Salary shows only part of the real cost of an employee', description: 'InCORE connects role cost, speed to productivity and financial impact so the business can manage not only hiring, but the return on people.', items: { resultCost: 'Cost of outcome', roleCost: 'Cost of role', contractRoi: 'Contract ROI', financialForecast: 'Financial impact forecast' }, cta: 'Get full diagnosis' },
      report: { title: 'Your financial snapshot', description: 'Additional indicators are calculated from the data you entered.', close: 'Close', loss: 'Total loss', saving25: 'Impact at -25% turnover', saving40: 'Impact at -40% turnover', ramp: 'Total ramp-up period' },
      footer: ''
    }
  },
  kk: { hrCalculator: {} },
  az: { hrCalculator: {} }
} as const;
