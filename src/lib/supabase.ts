import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://utsuzqmzawunqpiguuhk.supabase.co';
// ВНИМАНИЕ: Замените текст ниже на ваш реальный anon ключ из настроек Supabase!
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0c3V6cW16YXd1bnFwaWd1dWhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NjYxODUsImV4cCI6MjA5OTQ0MjE4NX0._GC9VYIpmpd-64nvM-vPJvhMR1ixsd6Yn9ztrTDd8Uw'; 

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Contract {
  id: string;
  company_id: string;
  agent_id: string | null;
  title: string;
  description: string;
  status: 'ACTIVE' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'COMPLETED' | 'DRAFT' | 'DISPUTED' | 'PENDING_PAYMENT';
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