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
export type ContractStatus = 
  | 'DRAFT' 
  | 'PENDING_PAYMENT' 
  | 'ACTIVE' 
  | 'IN_PROGRESS' 
  | 'PENDING_APPROVAL' 
  | 'PENDING_MANUAL_APPROVAL' 
  | 'COMPLETED' 
  | 'DISPUTED' 
  | 'DISPUTED_REJECTED';
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
  company_type: CompanyType;
  full_name: string;
  display_name?: string;
  position?: string;
  phone?: string;
  company_name: string;
  inn: string;
  kpp?: string;
  ogrn: string;
  legal_address: string;
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
  user_id?: string;
  company_id?: string;
  full_name: string;
  email?: string;
  phone: string;
  specialization?: string;
  tax_status: TaxStatus;
  inn: string;
  snils: string;
  bank_name: string;
  bank_bik: string;
  correspondent_account: string;
  settlement_account: string;
  status?: string;
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
  ceo_id?: string;
  title: string;
  description: string;
  status: ContractStatus;
  escrow_amount: number;
  escrow_status: EscrowStatus;
  deadline: string;
  created_at: string;
  updated_at?: string;
  revenue?: number;
  agent_payouts_total?: number;
  company_profit?: number;
  roi_percentage?: number;
  reward_type?: 'standard_b2b' | 'renewal' | 'cross_sell';
  requires_manual_approval?: boolean;
  dispute_id?: string;
  kpi_revenue?: number;
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
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const DEFAULT_PAYMENT_STREAMS: PaymentStream[] = [
  { id: 'new_sales', name: 'Бонус за новые продажи', percent: 50 },
  { id: 'renewal', name: 'Бонус за продление', percent: 15 },
  { id: 'cross_sell', name: 'Бонус за кросс-продажи', percent: 10 },
  { id: 'plan_bonus', name: 'Бонус за выполнение плана', percent: 10 },
  { id: 'retention', name: 'Бонус за удержание (90 дней)', percent: 10, clawback: true },
  { id: 'annual', name: 'Годовой бонус', percent: 5 },
];