import { ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  LogOut,
  User,
  Settings,
  FileText,
  Users,
  BarChart3,
  ShieldCheck,
  Menu,
  X,
  DollarSign,
  Scale,
  BrainCircuit
} from 'lucide-react';
import { NotificationBell } from '../ui/NotificationBell';
import LanguageSwitcher from '../ui/LanguageSwitcher';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const menuItems = [
    { path: '/ceo', label: t('layout.financialCore'), icon: BarChart3, role: 'ceo' },
    { path: '/ceo/contracts', label: t('layout.contracts'), icon: FileText, role: 'ceo' },
    { path: '/ceo/roles/decompose', label: t('layout.roleDecomposition', 'Декомпозиция ролей'), icon: BrainCircuit, role: 'ceo' },
    { path: '/ceo/agents', label: t('layout.agents'), icon: Users, role: 'ceo' },
    { path: '/ceo/disputes', label: t('layout.disputes'), icon: Scale, role: 'ceo' },
    { path: '/ceo/integrations', label: t('layout.integrations'), icon: ShieldCheck, role: 'ceo' },
    { path: '/ceo/accounting', label: t('layout.accounting'), icon: DollarSign, role: 'ceo' },
    { path: '/ceo/settings', label: t('layout.settings'), icon: Settings, role: 'ceo' },
    { path: '/agent', label: t('layout.myDashboard'), icon: BarChart3, role: 'agent' },
    { path: '/agent/contracts', label: t('layout.myContracts'), icon: FileText, role: 'agent' },
    { path: '/agent/payouts', label: t('layout.payouts'), icon: DollarSign, role: 'agent' },
    { path: '/agent/settings', label: t('layout.myData'), icon: Settings, role: 'agent' },
  ];

  const userRole = location.pathname.startsWith('/agent') ? 'agent' : 'ceo';
  const filteredMenu = menuItems.filter(item => item.role === userRole);

  return (
    <div className="flex min-h-screen bg-[#F4F5F7]">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-[280px] md:w-64 bg-white border-r border-gray-100 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex flex-col h-full min-h-screen">
          <div className="px-3 pt-6 pb-4 border-b border-gray-100 flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="w-full h-12 bg-white rounded-xl flex items-center justify-center overflow-hidden">
                <img src="/logo.png" alt="InCORE" className="h-full w-full object-contain" />
              </div>
              <p className="text-xs text-gray-400 mt-2 px-1 break-words">{t('layout.platformSubtitle')}</p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-2 text-[#000052] hover:bg-[#000052]/5 rounded-lg"
              aria-label={t('ui.close', { defaultValue: 'Закрыть меню' })}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
            {filteredMenu.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium transition-all duration-200 text-left ${
                    active
                      ? 'bg-[#000052] text-white shadow-[0_4px_16px_rgba(0,0,82,0.25)]'
                      : 'text-gray-500 hover:bg-[#000052]/5 hover:text-[#000052]'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="min-w-0 break-words">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-3 mb-3 px-2">
              <div className="w-10 h-10 rounded-full bg-[#000052]/5 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-[#000052]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#000052] truncate">
                  {user?.email || t('layout.user')}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {userRole === 'ceo' ? t('layout.ceoRole') : t('layout.agentRole')}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-[#000052] hover:bg-[#000052]/5 text-[#000052] rounded-xl text-sm font-medium transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span>{t('layout.logout')}</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="md:hidden sticky top-0 z-30 flex items-center justify-between gap-2 px-3 py-2.5 bg-white border-b border-gray-100">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-[#000052] hover:bg-[#000052]/5 rounded-lg flex-shrink-0"
            aria-label={t('ui.menu', { defaultValue: 'Открыть меню' })}
          >
            <Menu className="w-6 h-6" />
          </button>
          <img src="/logo.png" alt="InCORE" className="h-8 w-auto min-w-0" />
          <div className="flex items-center gap-1 flex-shrink-0">
            <LanguageSwitcher />
            <NotificationBell />
          </div>
        </header>

        <header className="hidden md:flex sticky top-0 z-30 items-center justify-end px-6 py-3 bg-white border-b border-gray-100 gap-4">
          <LanguageSwitcher />
          <NotificationBell />
        </header>

        <div className="flex-1 overflow-y-auto min-w-0">
          {children}
        </div>
      </main>
    </div>
  );
}
