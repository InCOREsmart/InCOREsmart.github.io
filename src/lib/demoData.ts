export interface DemoAgent {
  id: string;
  name: string;
  full_name: string;
  email: string;
  phone: string;
  specialization: string;
  start_date: string;
  contracts: DemoContract[];
}

export interface DemoContract {
  id: string;
  title: string;
  description: string;
  revenue: number;
  status: 'ACTIVE' | 'IN_PROGRESS' | 'COMPLETED';
  start_date: string;
  deadline: string;
  kpi_calls: number;
  kpi_meetings: number;
  kpi_proposals: number;
  target_clients: number;
  actual_calls: number;
  actual_meetings: number;
  actual_proposals: number;
  actual_clients: number;
}

export const DEMO_AGENTS: DemoAgent[] = [
  {
    id: 'demo-1',
    name: 'Смирнов Александр',
    full_name: 'Смирнов Александр Иванович',
    email: 'a.smirnov@incore.demo',
    phone: '+7 900 123-45-67',
    specialization: 'B2B Страхование',
    start_date: '2026-01-15',
    contracts: [
      {
        id: 'contract-1-1',
        title: 'Привлечение 10 корпоративных клиентов B2B',
        description: 'Заключение договоров страхования с крупными компаниями',
        revenue: 1000000,
        status: 'ACTIVE',
        start_date: '2026-01-15',
        deadline: '2026-08-31',
        kpi_calls: 120, kpi_meetings: 45, kpi_proposals: 30, target_clients: 10,
        actual_calls: 95, actual_meetings: 38, actual_proposals: 25, actual_clients: 7,
      },
    ],
  },
  {
    id: 'demo-2',
    name: 'Козлова Мария',
    full_name: 'Козлова Мария Петровна',
    email: 'm.kozlova@incore.demo',
    phone: '+7 900 234-56-78',
    specialization: 'Корпоративные клиенты',
    start_date: '2026-01-20',
    contracts: [
      {
        id: 'contract-2-1',
        title: 'Расширение портфеля страхования в сегменте МСБ',
        description: 'Увеличение количества клиентов в сегменте малого и среднего бизнеса',
        revenue: 1000000,
        status: 'IN_PROGRESS',
        start_date: '2026-01-20',
        deadline: '2026-09-15',
        kpi_calls: 150, kpi_meetings: 60, kpi_proposals: 40, target_clients: 12,
        actual_calls: 120, actual_meetings: 48, actual_proposals: 32, actual_clients: 9,
      },
    ],
  },
  {
    id: 'demo-3',
    name: 'Волков Дмитрий',
    full_name: 'Волков Дмитрий Сергеевич',
    email: 'd.volkov@incore.demo',
    phone: '+7 900 345-67-89',
    specialization: 'МСБ сегмент',
    start_date: '2026-02-10',
    contracts: [
      {
        id: 'contract-3-1',
        title: 'Пролонгация ключевых корпоративных договоров',
        description: 'Продление действующих договоров страхования с корпоративными клиентами',
        revenue: 1000000,
        status: 'ACTIVE',
        start_date: '2026-02-10',
        deadline: '2026-07-30',
        kpi_calls: 90, kpi_meetings: 30, kpi_proposals: 20, target_clients: 8,
        actual_calls: 72, actual_meetings: 24, actual_proposals: 16, actual_clients: 6,
      },
    ],
  },
  {
    id: 'demo-4',
    name: 'Петрова Елена',
    full_name: 'Петрова Елена Александровна',
    email: 'e.petrova@incore.demo',
    phone: '+7 900 456-78-90',
    specialization: 'Страхование жизни',
    start_date: '2026-03-05',
    contracts: [
      {
        id: 'contract-4-1',
        title: 'Кросс-продажи продуктов страхования жизни',
        description: 'Дополнительные продажи продуктов существующим клиентам',
        revenue: 1000000,
        status: 'ACTIVE',
        start_date: '2026-03-05',
        deadline: '2026-10-01',
        kpi_calls: 130, kpi_meetings: 50, kpi_proposals: 35, target_clients: 9,
        actual_calls: 104, actual_meetings: 40, actual_proposals: 28, actual_clients: 7,
      },
    ],
  },
  {
    id: 'demo-5',
    name: 'Тихонов Иван',
    full_name: 'Тихонов Иван Михайлович',
    email: 'i.tikhonov@incore.demo',
    phone: '+7 900 567-89-01',
    specialization: 'Региональные продажи',
    start_date: '2026-03-12',
    contracts: [
      {
        id: 'contract-5-1',
        title: 'Выполнение квартального плана по новым продажам',
        description: 'Достижение плановых показателей по новым клиентам в регионе',
        revenue: 1000000,
        status: 'IN_PROGRESS',
        start_date: '2026-03-12',
        deadline: '2026-08-15',
        kpi_calls: 80, kpi_meetings: 25, kpi_proposals: 18, target_clients: 5,
        actual_calls: 62, actual_meetings: 19, actual_proposals: 14, actual_clients: 4,
      },
    ],
  },
  {
    id: 'demo-6',
    name: 'Морозова Ольга',
    full_name: 'Морозова Ольга Викторовна',
    email: 'o.morozova@incore.demo',
    phone: '+7 900 678-90-12',
    specialization: 'Удержание клиентов',
    start_date: '2026-03-18',
    contracts: [
      {
        id: 'contract-6-1',
        title: 'Удержание клиентов и снижение оттока',
        description: 'Работа с существующей клиентской базой для минимизации оттока',
        revenue: 1000000,
        status: 'ACTIVE',
        start_date: '2026-03-18',
        deadline: '2026-09-30',
        kpi_calls: 160, kpi_meetings: 65, kpi_proposals: 45, target_clients: 14,
        actual_calls: 184, actual_meetings: 75, actual_proposals: 52, actual_clients: 16,
      },
    ],
  },
  {
    id: 'demo-7',
    name: 'Новиков Сергей',
    full_name: 'Новиков Сергей Андреевич',
    email: 's.novikov@incore.demo',
    phone: '+7 900 789-01-23',
    specialization: 'Партнерская сеть',
    start_date: '2026-03-25',
    contracts: [
      {
        id: 'contract-7-1',
        title: 'Развитие партнерской сети в регионах',
        description: 'Создание и развитие сети партнеров для масштабирования продаж',
        revenue: 1000000,
        status: 'ACTIVE',
        start_date: '2026-03-25',
        deadline: '2026-10-15',
        kpi_calls: 110, kpi_meetings: 40, kpi_proposals: 28, target_clients: 7,
        actual_calls: 101, actual_meetings: 37, actual_proposals: 26, actual_clients: 6,
      },
    ],
  },
  {
    id: 'demo-8',
    name: 'Киселева Наталья',
    full_name: 'Киселева Наталья Викторовна',
    email: 'n.kiseleva@incore.demo',
    phone: '+7 909 013-35-44',
    specialization: 'EdTech & HRTech',
    start_date: '2026-01-10',
    contracts: [
      {
        id: 'contract-8-1',
        title: 'Внедрение платформы InCORE в корпоративный сегмент',
        description: 'Привлечение корпоративных клиентов для использования платформы',
        revenue: 1000000,
        status: 'ACTIVE',
        start_date: '2026-01-10',
        deadline: '2026-08-20',
        kpi_calls: 140, kpi_meetings: 55, kpi_proposals: 38, target_clients: 11,
        actual_calls: 126, actual_meetings: 50, actual_proposals: 34, actual_clients: 9,
      },
    ],
  },
];

export function calculateRevenueByMonth(): { month: string; value: number }[] {
  const months = [
    { key: '2026-01', label: 'Янв 26' },
    { key: '2026-02', label: 'Фев 26' },
    { key: '2026-03', label: 'Мар 26' },
    { key: '2026-04', label: 'Апр 26' },
    { key: '2026-05', label: 'Май 26' },
    { key: '2026-06', label: 'Июн 26' },
    { key: '2026-07', label: 'Июл 26' },
    { key: '2026-08', label: 'Авг 26' },
  ];

  const revenueByMonth: Record<string, number> = {};
  let cumulativeRevenue = 0;

  months.forEach((month) => {
    const activeContractsInMonth = DEMO_AGENTS.flatMap(agent => 
      agent.contracts.filter(contract => {
        const contractStart = new Date(contract.start_date);
        const contractStartMonth = contractStart.toISOString().slice(0, 7);
        return contractStartMonth <= month.key;
      })
    );

    const monthlyContribution = activeContractsInMonth.reduce((sum, contract) => {
      return sum + (contract.revenue / 8);
    }, 0);

    cumulativeRevenue += monthlyContribution;
    revenueByMonth[month.key] = Math.round(cumulativeRevenue);
  });

  return months.map(m => ({
    month: m.label,
    value: revenueByMonth[m.key],
  }));
}

export function calculateAgentKPI(agent: DemoAgent): number {
  if (agent.contracts.length === 0) return 0;
  
  const totalKPI = agent.contracts.reduce((sum, contract) => {
    const callsProgress = contract.actual_calls / contract.kpi_calls;
    const meetingsProgress = contract.actual_meetings / contract.kpi_meetings;
    const proposalsProgress = contract.actual_proposals / contract.kpi_proposals;
    const clientsProgress = contract.actual_clients / contract.target_clients;
    
    const avgProgress = (callsProgress + meetingsProgress + proposalsProgress + clientsProgress) / 4;
    return sum + avgProgress * 100;
  }, 0);
  
  return Math.round(totalKPI / agent.contracts.length);
}