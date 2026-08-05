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
  month: string;
  kpi_calls: number;
  kpi_meetings: number;
  kpi_proposals: number;
  target_clients: number;
  actual_calls: number;
  actual_meetings: number;
  actual_proposals: number;
  actual_clients: number;
  bitrix_deals: BitrixDeal[];
}

export interface BitrixDeal {
  id: string;
  title: string;
  stage: string;
  amount: number; // Это сумма БОНУСА, а не всей сделки
  created_at: string;
}

function generateBitrixDeals(contract: Omit<DemoContract, 'bitrix_deals'>): BitrixDeal[] {
  const deals: BitrixDeal[] = [];
  const startDate = new Date(contract.start_date);
  const month = startDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
  const dealValue = contract.revenue / contract.target_clients;
  
  // Звонки и встречи (бонус 0, пока не закрыты)
  for (let i = 0; i < Math.min(contract.actual_meetings, 3); i++) {
    deals.push({
      id: `${contract.id}-meeting-${i + 1}`,
      title: `Встреча с клиентом ${i + 1} (${month})`,
      stage: 'Встреча назначена',
      amount: 0,
      created_at: new Date(startDate.getTime() + (i + 5) * 86400000).toISOString(),
    });
  }
  
  // Успешные клиенты (бонус 50% от суммы сделки + 15% продление и т.д., берем 50% для простоты демо)
  for (let i = 0; i < contract.actual_clients; i++) {
    deals.push({
      id: `${contract.id}-client-${i + 1}`,
      title: `Клиент ${i + 1} - Договор страхования (${month})`,
      stage: 'Успешно реализовано',
      amount: dealValue * 0.50, // 50% бонус за новую продажу
      created_at: new Date(startDate.getTime() + (i + 15) * 86400000).toISOString(),
    });
  }
  
  return deals;
}

function generateMonthlyContracts(
  agentId: string,
  startDate: string,
  baseKpi: { calls: number; meetings: number; proposals: number; clients: number }
): DemoContract[] {
  const contracts: DemoContract[] = [];
  const start = new Date(startDate);
  const end = new Date('2026-08-31');
  
  let currentMonth = new Date(start.getFullYear(), start.getMonth(), 1);
  let contractIndex = 1;
  
  while (currentMonth <= end) {
    const monthKey = currentMonth.toISOString().slice(0, 7);
    const monthName = currentMonth.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
    
    const variation = 0.8 + Math.random() * 0.4;
    const kpiCalls = Math.round(baseKpi.calls * variation);
    const kpiMeetings = Math.round(baseKpi.meetings * variation);
    const kpiProposals = Math.round(baseKpi.proposals * variation);
    const targetClients = Math.round(baseKpi.clients * variation) || 1;
    
    const performance = 0.8 + Math.random() * 0.3;
    const actualCalls = Math.round(kpiCalls * performance);
    const actualMeetings = Math.round(kpiMeetings * performance);
    const actualProposals = Math.round(kpiProposals * performance);
    const actualClients = Math.round(targetClients * performance);
    
    const contractStartDate = new Date(currentMonth);
    contractStartDate.setDate(start.getDate());
    
    const contractDeadline = new Date(currentMonth);
    contractDeadline.setMonth(contractDeadline.getMonth() + 1);
    contractDeadline.setDate(0);
    
    // Август 2026 всегда ACTIVE, прошлые месяцы COMPLETED
    const status: 'ACTIVE' | 'IN_PROGRESS' | 'COMPLETED' = monthKey === '2026-08' ? 'ACTIVE' : 'COMPLETED';
    
    const contractBase: Omit<DemoContract, 'bitrix_deals'> = {
      id: `contract-${agentId}-${contractIndex}`,
      title: `Контракт ${monthName} - Выполнение плана`,
      description: `Ежемесячный контракт на выполнение KPI в ${monthName}`,
      revenue: 200000, // Реалистичная сумма контракта ($200K вместо $1M)
      status,
      start_date: contractStartDate.toISOString().slice(0, 10),
      deadline: contractDeadline.toISOString().slice(0, 10),
      month: monthKey,
      kpi_calls: kpiCalls,
      kpi_meetings: kpiMeetings,
      kpi_proposals: kpiProposals,
      target_clients: targetClients,
      actual_calls: actualCalls,
      actual_meetings: actualMeetings,
      actual_proposals: actualProposals,
      actual_clients: actualClients,
    };
    
    contracts.push({
      ...contractBase,
      bitrix_deals: generateBitrixDeals(contractBase),
    });
    
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    contractIndex++;
  }
  
  return contracts;
}

export const DEMO_AGENTS: DemoAgent[] = [
  { id: 'demo-1', name: 'Смирнов Александр', full_name: 'Смирнов Александр Иванович', email: 'a.smirnov@incore.demo', phone: '+7 900 123-45-67', specialization: 'B2B Страхование', start_date: '2026-01-15', contracts: generateMonthlyContracts('demo-1', '2026-01-15', { calls: 120, meetings: 45, proposals: 30, clients: 10 }) },
  { id: 'demo-2', name: 'Козлова Мария', full_name: 'Козлова Мария Петровна', email: 'm.kozlova@incore.demo', phone: '+7 900 234-56-78', specialization: 'Корпоративные клиенты', start_date: '2026-01-20', contracts: generateMonthlyContracts('demo-2', '2026-01-20', { calls: 150, meetings: 60, proposals: 40, clients: 12 }) },
  { id: 'demo-3', name: 'Волков Дмитрий', full_name: 'Волков Дмитрий Сергеевич', email: 'd.volkov@incore.demo', phone: '+7 900 345-67-89', specialization: 'МСБ сегмент', start_date: '2026-02-10', contracts: generateMonthlyContracts('demo-3', '2026-02-10', { calls: 90, meetings: 30, proposals: 20, clients: 8 }) },
  { id: 'demo-4', name: 'Петрова Елена', full_name: 'Петрова Елена Александровна', email: 'e.petrova@incore.demo', phone: '+7 900 456-78-90', specialization: 'Страхование жизни', start_date: '2026-03-05', contracts: generateMonthlyContracts('demo-4', '2026-03-05', { calls: 130, meetings: 50, proposals: 35, clients: 9 }) },
  { id: 'demo-5', name: 'Тихонов Иван', full_name: 'Тихонов Иван Михайлович', email: 'i.tikhonov@incore.demo', phone: '+7 900 567-89-01', specialization: 'Региональные продажи', start_date: '2026-03-12', contracts: generateMonthlyContracts('demo-5', '2026-03-12', { calls: 80, meetings: 25, proposals: 18, clients: 5 }) },
  { id: 'demo-6', name: 'Морозова Ольга', full_name: 'Морозова Ольга Викторовна', email: 'o.morozova@incore.demo', phone: '+7 900 678-90-12', specialization: 'Удержание клиентов', start_date: '2026-03-18', contracts: generateMonthlyContracts('demo-6', '2026-03-18', { calls: 160, meetings: 65, proposals: 45, clients: 14 }) },
  { id: 'demo-7', name: 'Новиков Сергей', full_name: 'Новиков Сергей Андреевич', email: 's.novikov@incore.demo', phone: '+7 900 789-01-23', specialization: 'Партнерская сеть', start_date: '2026-03-25', contracts: generateMonthlyContracts('demo-7', '2026-03-25', { calls: 110, meetings: 40, proposals: 28, clients: 7 }) },
  { id: 'demo-8', name: 'Киселева Наталья', full_name: 'Киселева Наталья Викторовна', email: 'n.kiseleva@incore.demo', phone: '+7 909 013-35-44', specialization: 'EdTech & HRTech', start_date: '2026-01-10', contracts: generateMonthlyContracts('demo-8', '2026-01-10', { calls: 140, meetings: 55, proposals: 38, clients: 11 }) },
];

export function calculateRevenueByMonth(): { month: string; value: number; label: string }[] {
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

  return months.map(m => {
    // Считаем реальную выручку за месяц: сумма (actual_clients * стоимость одного клиента) по всем контрактам этого месяца
    const monthRevenue = DEMO_AGENTS.reduce((sum, agent) => {
      const agentMonthContracts = agent.contracts.filter(c => c.month === m.key);
      const monthSum = agentMonthContracts.reduce((cSum, c) => {
        const dealValue = c.revenue / c.target_clients;
        return cSum + (c.actual_clients * dealValue);
      }, 0);
      return sum + monthSum;
    }, 0);
    return { month: m.key, value: Math.round(monthRevenue), label: m.label };
  });
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

export function calculateTotalBitrixDeals(): number {
  return DEMO_AGENTS.reduce((sum, agent) => sum + agent.contracts.reduce((cSum, c) => cSum + c.bitrix_deals.length, 0), 0);
}