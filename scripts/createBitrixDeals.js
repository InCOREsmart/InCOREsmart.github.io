// Скрипт создания демо-сделок в Битрикс24 через REST API
// Запуск: node scripts/createBitrixDeals.js

const WEBHOOK_URL = process.env.BITRIX_WEBHOOK || 'https://ваш-битрикс24.ru/rest/1/ваш-ключ/';

// Демо-агенты с датами подключения и базовыми KPI
const AGENTS = [
  { id: 'demo-1', name: 'Смирнов Александр', start_date: '2026-01-15', kpi: { calls: 120, meetings: 45, proposals: 30, clients: 10 } },
  { id: 'demo-2', name: 'Козлова Мария', start_date: '2026-01-20', kpi: { calls: 150, meetings: 60, proposals: 40, clients: 12 } },
  { id: 'demo-3', name: 'Волков Дмитрий', start_date: '2026-02-10', kpi: { calls: 90, meetings: 30, proposals: 20, clients: 8 } },
  { id: 'demo-4', name: 'Петрова Елена', start_date: '2026-03-05', kpi: { calls: 130, meetings: 50, proposals: 35, clients: 9 } },
  { id: 'demo-5', name: 'Тихонов Иван', start_date: '2026-03-12', kpi: { calls: 80, meetings: 25, proposals: 18, clients: 5 } },
  { id: 'demo-6', name: 'Морозова Ольга', start_date: '2026-03-18', kpi: { calls: 160, meetings: 65, proposals: 45, clients: 14 } },
  { id: 'demo-7', name: 'Новиков Сергей', start_date: '2026-03-25', kpi: { calls: 110, meetings: 40, proposals: 28, clients: 7 } },
  { id: 'demo-8', name: 'Киселева Наталья', start_date: '2026-01-10', kpi: { calls: 140, meetings: 55, proposals: 38, clients: 11 } },
];

// Генерация сделок для одного контракта
function generateDealsForContract(agent, month, contractIndex) {
  const deals = [];
  const startDate = new Date(`${month}-01`);
  const monthName = startDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
  
  // Звонки (показываем 5 из фактических)
  const callsCount = Math.min(Math.round(agent.kpi.calls * 0.9), 5);
  for (let i = 0; i < callsCount; i++) {
    deals.push({
      title: `Звонок клиенту ${i + 1} (${monthName})`,
      stage: 'NEW',
      sum: 0,
      comments: `[${agent.name}] Звонок в рамках контракта ${monthName}`,
    });
  }
  
  // Встречи (показываем 3 из фактических)
  const meetingsCount = Math.min(Math.round(agent.kpi.meetings * 0.9), 3);
  for (let i = 0; i < meetingsCount; i++) {
    deals.push({
      title: `Встреча с клиентом ${i + 1} (${monthName})`,
      stage: 'MEETING',
      sum: 0,
      comments: `[${agent.name}] Встреча в рамках контракта ${monthName}`,
    });
  }
  
  // КП (показываем 2 из фактических)
  const proposalsCount = Math.min(Math.round(agent.kpi.proposals * 0.9), 2);
  for (let i = 0; i < proposalsCount; i++) {
    deals.push({
      title: `КП для клиента ${i + 1} (${monthName})`,
      stage: 'PROPOSAL',
      sum: 1000000 / agent.kpi.clients,
      comments: `[${agent.name}] КП отправлено в рамках контракта ${monthName}`,
    });
  }
  
  // Клиенты (все фактические)
  const clientsCount = Math.round(agent.kpi.clients * 0.9);
  for (let i = 0; i < clientsCount; i++) {
    deals.push({
      title: `Клиент ${i + 1} - Договор страхования (${monthName})`,
      stage: 'WON',
      sum: 1000000 / agent.kpi.clients,
      comments: `[${agent.name}] Успешная сделка в рамках контракта ${monthName}. InCORE: +1 Клиент, бонус 50%`,
    });
  }
  
  return deals;
}

// Генерация всех контрактов для агента
function generateAllContracts(agent) {
  const contracts = [];
  const start = new Date(agent.start_date);
  const end = new Date('2026-08-31');
  
  let currentMonth = new Date(start.getFullYear(), start.getMonth(), 1);
  let contractIndex = 1;
  
  while (currentMonth <= end) {
    const monthKey = currentMonth.toISOString().slice(0, 7);
    const deals = generateDealsForContract(agent, monthKey, contractIndex);
    contracts.push({ month: monthKey, deals });
    
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    contractIndex++;
  }
  
  return contracts;
}

// Создание сделки в Битрикс24
async function createDeal(deal) {
  try {
    const response = await fetch(`${WEBHOOK_URL}crm.deal.add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          TITLE: deal.title,
          STAGE_ID: deal.stage,
          OPPORTUNITY: deal.sum,
          CURRENCY_ID: 'RUB',
          COMMENTS: deal.comments,
          SOURCE_ID: 'INCORE_DEMO',
          UTM_SOURCE: 'InCORE Platform',
        },
      }),
    });
    const data = await response.json();
    if (data.result) {
      console.log(`✅ Создана сделка #${data.result}: ${deal.title}`);
      return data.result;
    } else {
      console.error(`❌ Ошибка: ${deal.title}`, data.error_description);
      return null;
    }
  } catch (err) {
    console.error(`❌ Сетевая ошибка: ${deal.title}`, err.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Запуск создания демо-сделок в Битрикс24...\n');
  console.log(`Webhook: ${WEBHOOK_URL}\n`);
  
  let totalDeals = 0;
  let createdDeals = 0;
  
  for (const agent of AGENTS) {
    console.log(`\n👤 Агент: ${agent.name} (подключен ${agent.start_date})`);
    const contracts = generateAllContracts(agent);
    
    for (const contract of contracts) {
      console.log(`  📅 Контракт ${contract.month}: ${contract.deals.length} сделок`);
      totalDeals += contract.deals.length;
      
      for (const deal of contract.deals) {
        const id = await createDeal(deal);
        if (id) createdDeals++;
        await new Promise(r => setTimeout(r, 300)); // пауза, чтобы не превысить лимит API
      }
    }
  }
  
  console.log(`\n🎉 Готово! Создано сделок: ${createdDeals} из ${totalDeals}`);
  console.log('👉 Откройте страницу "Интеграции" в кабинете CEO — сделки появятся в таблице.');
}

main();