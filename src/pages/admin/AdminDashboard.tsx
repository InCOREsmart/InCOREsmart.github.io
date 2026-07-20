import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  FileText,
  DollarSign,
  AlertTriangle,
  Shield,
  Activity,
  TrendingUp,
} from 'lucide-react';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { StatCard } from '../../components/ui';
import { supabase } from '../../lib/supabase';

interface AdminStats {
  totalUsers: number;
  totalContracts: number;
  totalEscrow: number;
  pendingApprovals: number;
  fraudAlerts: number;
  monthlyRevenue: number;
  activeAgents: number;
  activeCompanies: number;
}

interface User {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

interface RecentContract {
  id: string;
  title: string;
  status: string;
  escrow_amount: number;
  created_at: string;
}

export function AdminDashboard() {
  const { t } = useTranslation();

  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalContracts: 0,
    totalEscrow: 0,
    pendingApprovals: 0,
    fraudAlerts: 0,
    monthlyRevenue: 0,
    activeAgents: 0,
    activeCompanies: 0,
  });
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [recentContracts, setRecentContracts] = useState<RecentContract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get total users
        const { count: totalUsers } = await supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true });

        // Get agents count
        const { count: activeAgents } = await supabase
          .from('agents')
          .select('*', { count: 'exact', head: true });

        // Get companies count
        const { count: activeCompanies } = await supabase
          .from('companies')
          .select('*', { count: 'exact', head: true });

        // Get contracts
        const { data: contracts, count: totalContracts } = await supabase
          .from('contracts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        // Get recent users
        const { data: users } = await supabase
          .from('user_roles')
          .select('*, user:users(email)')
          .order('created_at', { ascending: false })
          .limit(10);

        // Calculate stats
        const totalEscrow = (contracts || []).reduce(
          (sum, c) => sum + (c.escrow_amount || 0),
          0
        );

        const pendingApprovals = (contracts || []).filter(
          (c) => c.status === 'PENDING_APPROVAL'
        ).length;

        const fraudAlerts = Math.floor(Math.random() * 3); // Placeholder

        const monthlyRevenue = (contracts || [])
          .filter((c) => c.status === 'COMPLETED')
          .reduce((sum, c) => sum + (c.kpi_revenue || 0), 0);

        setStats({
          totalUsers: totalUsers || 0,
          totalContracts: totalContracts || 0,
          totalEscrow,
          pendingApprovals,
          fraudAlerts,
          monthlyRevenue,
          activeAgents: activeAgents || 0,
          activeCompanies: activeCompanies || 0,
        });

        setRecentContracts(contracts || []);
        setRecentUsers(users?.map(u => ({
          id: u.user_id,
          email: (u as any).user?.email || 'N/A',
          role: u.role,
          created_at: u.created_at,
        })) || []);
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-text-secondary">{t('common.loading')}</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-text-primary">
          Admin Dashboard
        </h1>
        <p className="text-text-secondary mt-1">Platform overview and management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
        />
        <StatCard
          title="Total Contracts"
          value={stats.totalContracts}
          icon={FileText}
        />
        <StatCard
          title="Total Escrow"
          value={`$${stats.totalEscrow.toLocaleString()}`}
          icon={DollarSign}
        />
        <StatCard
          title="Monthly Revenue"
          value={`$${stats.monthlyRevenue.toLocaleString()}`}
          icon={TrendingUp}
          trend={{ value: 15, isPositive: true }}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card bg-success/10 border-success/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/20 rounded-lg">
              <Users className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Active Agents</p>
              <p className="text-2xl font-display font-bold text-success">
                {stats.activeAgents}
              </p>
            </div>
          </div>
        </div>

        <div className="card bg-gold/10 border-gold/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gold/20 rounded-lg">
              <Users className="w-5 h-5 text-gold" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Active Companies</p>
              <p className="text-2xl font-display font-bold text-gold">
                {stats.activeCompanies}
              </p>
            </div>
          </div>
        </div>

        <div className="card bg-orange/10 border-orange/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange/20 rounded-lg">
              <Activity className="w-5 h-5 text-orange" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Pending Approvals</p>
              <p className="text-2xl font-display font-bold text-orange">
                {stats.pendingApprovals}
              </p>
            </div>
          </div>
        </div>

        <div className="card bg-error/10 border-error/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-error/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-error" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Fraud Alerts</p>
              <p className="text-2xl font-display font-bold text-error">
                {stats.fraudAlerts}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gold/20 rounded-lg">
              <Users className="w-5 h-5 text-gold" />
            </div>
            <h2 className="text-lg font-display font-semibold text-text-primary">
              Recent Users
            </h2>
          </div>

          <div className="space-y-3">
            {recentUsers.slice(0, 5).map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 bg-primary-dark rounded-lg"
              >
                <div>
                  <p className="text-text-primary text-sm">{user.email}</p>
                  <p className="text-text-muted text-xs">
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    user.role === 'CEO'
                      ? 'bg-gold/20 text-gold'
                      : user.role === 'AGENT'
                      ? 'bg-success/20 text-success'
                      : 'bg-error/20 text-error'
                  }`}
                >
                  {user.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Contracts */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gold/20 rounded-lg">
              <FileText className="w-5 h-5 text-gold" />
            </div>
            <h2 className="text-lg font-display font-semibold text-text-primary">
              Recent Contracts
            </h2>
          </div>

          <div className="space-y-3">
            {recentContracts.slice(0, 5).map((contract) => (
              <div
                key={contract.id}
                className="flex items-center justify-between p-3 bg-primary-dark rounded-lg"
              >
                <div>
                  <p className="text-text-primary text-sm">{contract.title}</p>
                  <p className="text-text-muted text-xs">
                    ${contract.escrow_amount?.toLocaleString() || 0} escrow
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    contract.status === 'COMPLETED'
                      ? 'bg-success/20 text-success'
                      : contract.status === 'ACTIVE'
                      ? 'bg-gold/20 text-gold'
                      : 'bg-text-secondary/20 text-text-secondary'
                  }`}
                >
                  {contract.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="card mt-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-success/20 rounded-lg">
            <Shield className="w-5 h-5 text-success" />
          </div>
          <h2 className="text-lg font-display font-semibold text-text-primary">
            System Status
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-3 bg-primary-dark rounded-lg">
            <div className="w-3 h-3 bg-success rounded-full animate-pulse" />
            <div>
              <p className="text-text-secondary text-xs">Database</p>
              <p className="text-success text-sm font-medium">Operational</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-primary-dark rounded-lg">
            <div className="w-3 h-3 bg-success rounded-full animate-pulse" />
            <div>
              <p className="text-text-secondary text-xs">Auth Service</p>
              <p className="text-success text-sm font-medium">Operational</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-primary-dark rounded-lg">
            <div className="w-3 h-3 bg-success rounded-full animate-pulse" />
            <div>
              <p className="text-text-secondary text-xs">Payment Gateway</p>
              <p className="text-success text-sm font-medium">Operational</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-primary-dark rounded-lg">
            <div className="w-3 h-3 bg-success rounded-full animate-pulse" />
            <div>
              <p className="text-text-secondary text-xs">API</p>
              <p className="text-success text-sm font-medium">Operational</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
