import { ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { LogOut, User, Settings, FileText, Users, BarChart3, ShieldCheck, Menu, X, DollarSign, Scale, BrainCircuit } from 'lucide-react';
import { NotificationBell } from '../ui/NotificationBell';
import LanguageSwitcher from '../ui/LanguageSwitcher';

interface DashboardLayoutProps { children: ReactNode; }

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => { await signOut(); navigate('/login'); };

  const isActive = (path: string) => {
    if (path === '/ceo' || path === '/agent') return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

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
  const closeMobileMenu = () => setSidebarOpen(false);
  const navigateTo = (path: string) => { navigate(path); closeMobileMenu(); };

  return (
    <div className="flex h-[100dvh] min-h-0 w-full max-w-full overflow-hidden bg-[#F4F5F7]">
      {sidebarOpen && <button type="button" aria-label="Close menu" className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={closeMobileMenu} />}

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[min(21rem,calc(100vw-1rem))] flex-col border-r border-gray-100 bg-white shadow-xl transition-transform duration-300 ease-in-out md:static md:z-auto md:w-72 md:shrink-0 md:translate-x-0 md:shadow-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-start gap-2 border-b border-gray-100 px-3 pb-4 pt-5 sm:px-4 sm:pt-6">
            <div className="min-w-0 flex-1">
              <div className="flex h-11 w-full items-center justify-center overflow-hidden rounded-xl bg-white sm:h-12">
                <img src="/logo.png" alt="InCORE" className="h-full w-full object-contain" />
              </div>
              <p className="mt-2 px-1 text-xs leading-5 text-gray-400">{t('layout.platformSubtitle')}</p>
            </div>
            <button type="button" onClick={closeMobileMenu} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#000052] hover:bg-[#000052]/5 md:hidden" aria-label="Close menu"><X className="h-5 w-5" /></button>
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 sm:px-4">
            <div className="space-y-1.5">
              {filteredMenu.map(item => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return <button key={item.path} type="button" onClick={() => navigateTo(item.path)} className={`flex w-full min-w-0 items-center gap-3 rounded-xl px-3.5 py-3 text-left text-[14px] font-medium transition-all duration-200 sm:text-[15px] ${active ? 'bg-[#000052] text-white shadow-[0_4px_16px_rgba(0,0,82,0.25)]' : 'text-gray-500 hover:bg-[#000052]/5 hover:text-[#000052]'}`}>
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="min-w-0 flex-1 break-words leading-5">{item.label}</span>
                </button>;
              })}
            </div>
          </nav>

          <div className="shrink-0 border-t border-gray-100 p-3 sm:p-4">
            <div className="mb-3"><LanguageSwitcher /></div>
            <div className="mb-3 flex min-w-0 items-center gap-3 px-1 sm:px-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#000052]/5"><User className="h-5 w-5 text-[#000052]" /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#000052]">{user?.email || t('layout.user')}</p>
                <p className="truncate text-xs text-gray-400">{userRole === 'ceo' ? t('layout.ceoRole') : t('layout.agentRole')}</p>
              </div>
            </div>
            <button type="button" onClick={handleLogout} className="flex min-h-10 w-full min-w-0 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-[#000052] transition-all duration-200 hover:border-[#000052] hover:bg-[#000052]/5">
              <LogOut className="h-4 w-4 shrink-0" /><span className="min-w-0 truncate">{t('layout.logout')}</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-gray-100 bg-white px-2.5 sm:px-3 md:hidden">
          <button type="button" onClick={() => setSidebarOpen(true)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#000052] hover:bg-[#000052]/5" aria-label="Open menu"><Menu className="h-6 w-6" /></button>
          <div className="flex min-w-0 flex-1 items-center"><img src="/logo.png" alt="InCORE" className="h-8 w-auto max-w-[110px] object-contain sm:max-w-[130px]" /></div>
          <NotificationBell />
        </header>

        <header className="hidden h-14 shrink-0 items-center justify-end gap-3 border-b border-gray-100 bg-white px-4 md:flex lg:px-6">
          <NotificationBell />
        </header>

        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="min-w-0 max-w-full">{children}</div>
        </div>
      </main>
    </div>
  );
}
