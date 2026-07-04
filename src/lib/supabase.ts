import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'CEO' | 'AGENT' | 'ADMIN';
export type CompanyType = 'ООО' | 'ИП';
export type TaxStatus = 'self_employed' | 'ip';
export type ContractStatus = 'DRAFT' | 'PENDING_PAYMENT' | 'ACTIVE' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'COMPLETED' | 'DISPUTED';
export type EscrowStatus = 'PENDING' | 'FUNDED' | 'RELEASED' | 'FROZEN';
export type TransactionType = 'ESCROW_FUND' | 'SALARY_PAYOUT' | 'BONUS_PAYOUT' | 'CLAWBACK' | 'COMMISSION';
export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED';
export type NotificationType = 'TASK_CREATED' | 'TASK_APPLIED' | 'ESCROW_FUNDED' | 'TASK_APPROVED' | 'PAYOUT_SENT' | 'CLAWBACK_APPLIED';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
}

export interface Company {
  id: string;
  user_id: string;
  full_name: string;
  display_name?: string;
  position?: string;
  company_type: CompanyType;
  company_name: string;
  inn: string;
  kpp?: string;
  ogrn: string;
  legal_address: string;
  phone?: string;
  bank_name: string;
  bank_bik: string;
  bank_inn: string;
  bank_address: string;
  correspondent_account: string;
  settlement_account: string;
  created_at: string;
}

export interface Agent {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  passport_series: string;
  passport_number: string;
  passport_issued_by: string;
  passport_issue_date: string;
  passport_department_code: string;
  inn_personal: string;
  snils: string;
  tax_status: TaxStatus;
  bank_name: string;
  bank_bik: string;
  correspondent_account: string;
  settlement_account: string;
  created_at: string;
}

export interface PaymentStream {
  id: string;
  name: string;
  percent?: number;
  amount?: number;
  release?: string;
  clawback?: boolean;
}

export interface Contract {
  id: string;
  company_id: string;
  agent_id?: string;
  title: string;
  description: string;
  deadline: string;
  status: ContractStatus;
  kpi_calls: number;
  kpi_meetings: number;
  kpi_proposals: number;
  kpi_revenue: number;
  min_check: number;
  target_conversion: number;
  avg_check: number;
  target_clients: number;
  payment_streams: PaymentStream[];
  escrow_amount: number;
  escrow_status: EscrowStatus;
  created_at: string;
  completed_at?: string;
}

export interface DailyMetric {
  id: string;
  contract_id: string;
  date: string;
  calls: number;
  meetings: number;
  proposals: number;
  revenue: number;
  client_retention_days: number;
  is_fraud_risk: boolean;
}

export interface Transaction {
  id: string;
  contract_id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  status: TransactionStatus;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
}

export const DEFAULT_PAYMENT_STREAMS: PaymentStream[] = [
  { id: 'new_sales', name: 'Бонус за новые продажи', percent: 10 },
  { id: 'renewal', name: 'Бонус за продление', percent: 3 },
  { id: 'cross_sell', name: 'Бонус за кросс-продажи', percent: 5 },
  { id: 'plan_bonus', name: 'Бонус за выполнение плана', amount: 50000 },
  { id: 'annual_bonus', name: 'Годовой бонус', release: '1/12_per_month' },
  { id: 'retention_bonus', name: 'Бонус за удержание (90 дней)', clawback: true },
];
