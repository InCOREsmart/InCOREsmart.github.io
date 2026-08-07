import { ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
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
  Scale
} from 'lucide-react';
import { NotificationBell } from '../ui/NotificationBell';
import LanguageSwitcher from '../ui/LanguageSwitcher';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const menuItems = [
    { path: '/ceo', label: 'Финансовое ядро', icon: BarChart3, role: 'ceo' },
    { path: '/ceo/contracts', label: 'Контракты', icon: FileText, role: 'ceo' },
    { path: '/ceo/agents', label: 'Агенты', icon: Users, role: 'ceo' },
    { path: '/ceo/disputes', label: 'Арбитраж', icon: Scale, role: 'ceo' },
    { path: '/ceo/integrations', label: 'Интеграции', icon: ShieldCheck, role: 'ceo' },
    { path: '/ceo/accounting', label: 'Бухгалтерия', icon: DollarSign, role: 'ceo' },
    { path: '/ceo/settings', label: 'Настройки', icon: Settings, role: 'ceo' },
    { path: '/agent', label: 'Моя панель', icon: BarChart3, role: 'agent' },
    { path: '/agent/contracts', label: 'Мои контракты', icon: FileText, role: 'agent' },
    { path: '/agent/payouts', label: 'Выплаты', icon: DollarSign, role: 'agent' },
    { path: '/agent/settings', label: 'Мои данные', icon: Settings, role: 'agent' },
  ];

  const userRole = location.pathname.startsWith('/agent') ? 'agent' : 'ceo';
  const filteredMenu = menuItems.filter(item => item.role === userRole);

  return (
    <div className="flex h-screen bg-[#F8F9FA]">
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-[#000052]/10 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-[#000052]/10 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#000052] tracking-tight">InCORE</h1>
              <p className="text-xs text-[#000052]/60 mt-1">Smart Contracts Platform</p>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1 text-[#000052] hover:bg-[#000052]/5 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
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
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-[#B8860B] text-white'
                      : 'text-[#000052]/70 hover:bg-[#000052]/5 hover:text-[#000052]'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-[#000052]/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#B8860B]/10 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-[#B8860B]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#000052] truncate">
                  {user?.email || 'Пользователь'}
                </p>
                <p className="text-xs text-[#000052]/60 truncate">
                  {userRole === 'ceo' ? 'CEO / Администратор' : 'Агент'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#000052]/5 hover:bg-[#000052]/10 text-[#000052] rounded-lg text-sm font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Выйти</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-[#000052]/10">
          <h1 className="text-lg font-bold text-[#000052]">InCORE</h1>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-[#000052] hover:bg-[#000052]/5 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* Верхняя панель с языком и уведомлениями (только для десктопа) */}
        <header className="hidden md:flex items-center justify-end p-4 bg-white border-b border-[#000052]/10 gap-4">
          <LanguageSwitcher />
          <NotificationBell />
        </header>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}