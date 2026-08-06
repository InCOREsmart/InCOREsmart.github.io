import { supabase } from './supabase';

// ============================================================
// InCORE Legal Architecture v1.0
// Типы и функции для управления юридическими документами
// ============================================================

// Типы документов
export type DocumentType =
  | 'tos'
  | 'privacy_policy'
  | 'consent_pd'
  | 'consent_bio'
  | 'offer'
  | 'smart_contract'
  | 'tax_disclaimer'
  | 'ceo_agent_contract';

// Интерфейс документа из БД
export interface LegalDocument {
  id: string;
  document_type: DocumentType;
  version: string;
  language: string;
  effective_date: string;
  file_url: string;
  sha256_hash: string;
  is_active: boolean;
  created_at: string;
}

// Данные для записи согласия
export interface AcceptanceData {
  document_type: DocumentType;
  document_version?: string;
  document_hash?: string;
  document_id?: string;
  acceptance_method: 'clickwrap' | 'browsewrap' | 'signature' | 'registration' | 'smart_contract_activation';
  contract_id?: string;
}

// Лог согласия из БД
export interface AcceptanceLog {
  id: string;
  user_id: string;
  document_id: string | null;
  document_type: DocumentType;
  document_version: string | null;
  ip_address: string | null;
  user_agent: string | null;
  session_id: string | null;
  acceptance_method: string;
  accepted_at: string;
  consent_text_hash: string | null;
  is_valid: boolean;
  revoked_at: string | null;
  contract_id: string | null;
}

// ============================================================
// ПОЛУЧЕНИЕ АКТУАЛЬНЫХ ДОКУМЕНТОВ
// ============================================================

export async function getActiveDocuments(language: string = 'ru'): Promise<LegalDocument[]> {
  try {
    const { data, error } = await supabase
      .from('legal_documents')
      .select('*')
      .eq('is_active', true)
      .eq('language', language);

    if (error) {
      console.error('Error fetching active documents:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('getActiveDocuments failed:', error);
    return [];
  }
}

// ============================================================
// ПОЛУЧЕНИЕ URL ФАЙЛА ИЗ STORAGE
// ============================================================

export function getFileUrl(filePath: string): string {
  const { data } = supabase.storage.from('legal-docs').getPublicUrl(filePath);
  return data.publicUrl;
}

// ============================================================
// ЛОГИРОВАНИЕ СОГЛАСИЙ (КРИТИЧНО ДЛЯ ИНВЕСТОРОВ)
// ============================================================

export async function logAcceptance(
  userId: string,
  acceptances: AcceptanceData[]
): Promise<void> {
  try {
    // Получение IP адреса
    let ip = 'unknown';
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      ip = ipData.ip;
    } catch {
      console.warn('Could not fetch IP address');
    }

    // Технические данные
    const userAgent = navigator.userAgent;
    const sessionId = sessionStorage.getItem('session_id') || crypto.randomUUID();
    sessionStorage.setItem('session_id', sessionId);

    // Формирование записей
    const logs = acceptances.map((a) => ({
      user_id: userId,
      document_id: a.document_id || null,
      document_type: a.document_type,
      document_version: a.document_version || null,
      acceptance_method: a.acceptance_method,
      ip_address: ip,
      user_agent: userAgent,
      session_id: sessionId,
      consent_text_hash: a.document_hash || null,
      contract_id: a.contract_id || null,
      accepted_at: new Date().toISOString(),
      is_valid: true
    }));

    // Вставка в БД
    const { error } = await supabase
      .from('acceptance_logs')
      .insert(logs);

    if (error) {
      console.error('Error logging acceptance:', error);
      throw error;
    }

    console.log('✅ Acceptance logged:', logs.length, 'documents');
  } catch (error) {
    console.error('logAcceptance failed:', error);
    throw error;
  }
}

// ============================================================
// ПРОВЕРКА СОГЛАСИЯ ПОЛЬЗОВАТЕЛЯ
// ============================================================

export async function verifyUserConsent(
  userId: string,
  documentType: DocumentType
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('acceptance_logs')
      .select('id, accepted_at')
      .eq('user_id', userId)
      .eq('document_type', documentType)
      .eq('is_valid', true)
      .order('accepted_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error verifying consent:', error);
      return false;
    }

    return data && data.length > 0;
  } catch {
    return false;
  }
}

// ============================================================
// ИСТОРИЯ СОГЛАСИЙ ПОЛЬЗОВАТЕЛЯ
// ============================================================

export async function getUserAcceptanceHistory(userId: string): Promise<AcceptanceLog[]> {
  try {
    const { data, error } = await supabase
      .from('acceptance_logs')
      .select('*')
      .eq('user_id', userId)
      .order('accepted_at', { ascending: false });

    if (error) {
      console.error('Error fetching acceptance history:', error);
      return [];
    }

    return data || [];
  } catch {
    return [];
  }
}

// ============================================================
// ПОЛУЧЕНИЕ ДОКУМЕНТА ПО ТИПУ (ДЛЯ ОТОБРАЖЕНИЯ)
// ============================================================

export async function getDocumentByType(
  documentType: DocumentType,
  language: string = 'ru'
): Promise<LegalDocument | null> {
  try {
    const { data, error } = await supabase
      .from('legal_documents')
      .select('*')
      .eq('document_type', documentType)
      .eq('language', language)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching document:', error);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

// ============================================================
// ОТЗЫВ СОГЛАСИЯ (GDPR / 152-ФЗ)
// ============================================================

export async function revokeConsent(
  userId: string,
  documentId: string,
  reason: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('acceptance_logs')
      .update({
        is_valid: false,
        revoked_at: new Date().toISOString(),
        revocation_reason: reason
      })
      .eq('user_id', userId)
      .eq('document_id', documentId)
      .eq('is_valid', true);

    if (error) {
      console.error('Error revoking consent:', error);
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// ============================================================
// МАССОВАЯ ПРОВЕРКА ВСЕХ ОБЯЗАТЕЛЬНЫХ СОГЛАСИЙ
// ============================================================

export async function checkAllRequiredConsents(
  userId: string
): Promise<{ compliant: boolean; missing: DocumentType[] }> {
  const requiredDocs: DocumentType[] = ['tos', 'privacy_policy', 'consent_pd'];
  const missing: DocumentType[] = [];

  for (const docType of requiredDocs) {
    const hasConsent = await verifyUserConsent(userId, docType);
    if (!hasConsent) {
      missing.push(docType);
    }
  }

  return {
    compliant: missing.length === 0,
    missing
  };
}