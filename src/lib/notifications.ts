import { supabase } from './supabase';

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  contractId?: string
) {
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      type,
      title,
      message,
      contract_id: contractId || null,
    });

    if (error) {
      console.error('Ошибка создания уведомления:', error);
    }
  } catch (err) {
    console.error('Критическая ошибка:', err);
  }
}

// Уведомление о создании контракта
export async function notifyContractCreated(agentUserId: string, contractTitle: string, contractId: string) {
  await createNotification(
    agentUserId,
    'contract_created',
    'Новый контракт назначен',
    `Вам назначен новый контракт: "${contractTitle}". Проверьте детали и примите контракт.`,
    contractId
  );
}

// Уведомление о принятии контракта
export async function notifyContractAccepted(ceoUserId: string, contractTitle: string, agentName: string, contractId: string) {
  await createNotification(
    ceoUserId,
    'contract_accepted',
    'Контракт принят',
    `Агент ${agentName} принял контракт "${contractTitle}". Смарт-контракт активирован.`,
    contractId
  );
}

// Уведомление о завершении контракта
export async function notifyContractCompleted(userId: string, contractTitle: string, contractId: string) {
  await createNotification(
    userId,
    'contract_completed',
    'Контракт завершен',
    `Контракт "${contractTitle}" успешно завершен. Бонусы разблокированы.`,
    contractId
  );
}

// Уведомление об обновлении KPI
export async function notifyKpiUpdated(userId: string, contractTitle: string, contractId: string) {
  await createNotification(
    userId,
    'kpi_updated',
    'KPI обновлены',
    `Показатели KPI по контракту "${contractTitle}" обновлены из CRM.`,
    contractId
  );
}