import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://utsuzqmzawunqpiguuhk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0c3V6cW16YXd1bnFwaWd1dWhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NjYxODUsImV4cCI6MjA5OTQ0MjE4NX0._GC9VYIpmpd-64nvM-vPJvhMR1ixsd6Yn9ztrTDd8Uw';

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);


// =========================
// Contract types
// =========================

export type ContractStatus =
  | 'ACTIVE'
  | 'IN_PROGRESS'
  | 'PENDING_APPROVAL'
  | 'COMPLETED'
  | 'DRAFT'
  | 'DISPUTED'
  | 'PENDING_PAYMENT';


export type EscrowStatus =
  | 'PENDING'
  | 'FUNDED'
  | 'RELEASED'
  | 'FROZEN';


// =========================
// Contract
// =========================

export interface Contract {
  id: string;

  company_id: string;
  agent_id: string | null;

  title: string;
  description: string;

  status: ContractStatus;

  escrow_status: EscrowStatus;

  escrow_amount: number;

  revenue: number;
  kpi_revenue: number;

  agent_payouts_total: number;
  company_profit: number;

  roi_percentage: number;

  deadline: string;
  created_at: string;

  kpi_calls?: number;
  kpi_meetings?: number;
  kpi_proposals?: number;

  target_clients?: number;
}


// =========================
// Payment Streams
// =========================

export interface PaymentStream {

  id: string;

  name: string;

  type:
    | 'percent_of_gmv'
    | 'percent_of_amount'
    | 'fixed'
    | 'clawback'
    | 'annual';


  percent?: number;

  amount?: number;

  fixedAmount?: number;


  release?: boolean;

  clawback?: boolean;


  description: string;

  color: string;

  isEscrow: boolean;
}


// =========================
// Default streams
// =========================

export const DEFAULT_PAYMENT_STREAMS: PaymentStream[] = [

  {
    id: 'new_sales',
    name: 'Новые продажи',
    type: 'percent_of_gmv',
    percent: 10,
    description: '10% от суммы контракта',
    color: 'bg-[#000052]',
    isEscrow: true,
  },

  {
    id: 'renewal',
    name: 'Продление',
    type: 'percent_of_amount',
    percent: 3,
    description: '3% от суммы продления',
    color: 'bg-blue-500',
    isEscrow: true,
  },

  {
    id: 'cross_sell',
    name: 'Кросс-продажи',
    type: 'percent_of_amount',
    percent: 7,
    description: '7% от суммы договора',
    color: 'bg-indigo-500',
    isEscrow: true,
  },

  {
    id: 'plan_bonus',
    name: 'Бонус за выполнение плана',
    type: 'fixed',
    amount: 200,
    fixedAmount: 200,
    description: 'Бонус KPI',
    color: 'bg-purple-500',
    isEscrow: false,
  },

  {
    id: 'retention',
    name: 'Удержание клиента',
    type: 'clawback',
    clawback: true,
    release: true,
    description: 'Бонус после удержания клиента',
    color: 'bg-[#B8860B]',
    isEscrow: true,
  },

  {
    id: 'annual_bonus',
    name: 'Годовой бонус',
    type: 'annual',
    release: true,
    description: 'Годовой накопительный бонус',
    color: 'bg-green-500',
    isEscrow: false,
  },

];