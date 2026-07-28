import { createClient } from '@supabase/supabase-js';

// 1. Инициализация переменных окружения
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ CRITICAL: Missing Supabase environment variables! Check your .env file.');
}

// 2. Создание клиента Supabase
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// ==========================================
// 3. ТИПЫ ДАННЫХ (Database Types)
// ==========================================

export interface Company {
  id: string;
  user_id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface Agent {
  id: string;
  user_id: string;
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface AgentWithUser {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  specialization?: string | null;
  status?: string;
  created_at?: string;
  updated_at?: string;
  user?: {
    id: string;
    email: string;
  };
  [key: string]: any;
}

export interface Contract {
  id: string;
  company_id: string;
  agent_id: string | null;
  title: string;
  description?: string;
  status: string;
  escrow_amount?: number;
  revenue?: number;
  kpi_revenue?: number;
  agent_payouts_total?: number;
  company_profit?: number;
  roi_percentage?: number;
  reward_type?: string;
  deadline?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface PaymentStream {
  id: string;
  contract_id: string;
  amount: number;
  status: string;
  created_at?: string;
  [key: string]: any;
}

export const DEFAULT_PAYMENT_STREAMS = [
  { id: '1', name: '100% предоплата', value: 100 },
  { id: '2', name: '50% предоплата, 50% по факту', value: 50 },
  { id: '3', name: 'Постоплата', value: 0 }
];