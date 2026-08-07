const fs = require('fs');
const path = require('path');

const ruPath = path.join(__dirname, 'src/i18n/locales/ru.json');
const ru = JSON.parse(fs.readFileSync(ruPath, 'utf8'));

// Добавляем/обновляем секцию agent
ru.agent = {
  title: 'Кабинет агента',
  subtitle: 'Управление контрактами и выплатами',
  dashboardTitle: 'Моя панель',
  totalEarned: 'Всего заработано',
  pendingPayouts: 'Ожидает выплат',
  escrowBalance: 'Заморожено в эскроу',
  paymentStreams: 'Потоки выплат',
  smartContractStatus: 'Статус смарт-контракта',
  fundsVerified: 'Ваши деньги защищены смарт-контрактом',
  clawbackWarning: 'Если клиент уйдёт раньше 90 дней, retention-бонус не выплачивается',
  activeContracts: 'Активные контракты',
  myActiveContracts: 'Мои активные контракты',
  personalData: 'Личные данные',
  paymentDetails: 'Реквизиты для выплат',
  fullName: 'ФИО',
  phone: 'Телефон',
  taxStatus: 'Налоговый статус',
  selfEmployed: 'Самозанятый',
  ip: 'ИП',
  inn: 'ИНН',
  snils: 'СНИЛС',
  bankName: 'Название банка',
  bik: 'БИК',
  correspondentAccount: 'Корреспондентский счёт',
  settlementAccount: 'Расчётный счёт',
  ...ru.agent // сохраняем существующие ключи
};

// Добавляем/обновляем секцию payouts
ru.payouts = {
  title: 'Мои выплаты',
  subtitle: 'Детализация потоков по всем контрактам',
  newSales: 'Новые продажи',
  renewal: 'Продление',
  crossSell: 'Кросс-продажи',
  planBonus: 'Бонус за план',
  retention: 'Удержание 90 дней',
  annual: 'Годовой бонус',
  instantRelease: 'Мгновенная выплата',
  ...ru.payouts
};

fs.writeFileSync(ruPath, JSON.stringify(ru, null, 2), 'utf8');
console.log('✅ Переводы agent.* и payouts.* добавлены в ru.json');