import React, { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, FileText, Users, Settings, Scale, LogOut, Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { signOut, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const ceoMenu = [
    { path: '/ceo/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
    { path: '/ceo/contracts', icon: FileText, label: t('nav.contracts') },
    { path: '/ceo/agents', icon: Users, label: t('nav.agents') },
    { path: '/ceo/disputes', icon: Scale, label: t('nav.disputes') },
    { path: '/ceo/settings', icon: Settings, label: t('nav.settings') },
  ];

  const agentMenu = [
    { path: '/agent/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
    { path: '/agent/contracts', icon: FileText, label: t('nav.contracts') },
    { path: '/agent/payouts', icon: FileText, label: t('payouts.title') },
    { path: '/agent/settings', icon: Settings, label: t('nav.settings') },
  ];

  const menu = role === 'ceo' ? ceoMenu : agentMenu;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className="w-64 bg-[#B8860B] text-white flex flex-col shadow-lg flex-shrink-0">
        <div className="p-6 border-b border-[#9a7009]">
          <img src="/logo.png" alt="InCORE" className="h-10 w-auto" onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }} />
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menu.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive ? 'bg-[#000052] text-white' : 'hover:bg-[#9a7009] text-white'
                }`}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#9a7009] space-y-3">
          <button
            onClick={() => i18n.changeLanguage(i18n.language === 'ru' ? 'en' : 'ru')}
            className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg hover:bg-[#9a7009] text-white text-sm"
          >
            <span> {i18n.language.toUpperCase()}</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg hover:bg-red-600 bg-red-500 text-white text-sm transition-colors"
          >
            <LogOut size={18} />
            <span>{t('auth.logout')}</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm flex-shrink-0">
          <h2 className="text-[#000052] text-xl font-semibold">
            {role === 'ceo' ? 'Кабинет CEO' : 'Кабинет Агента'}
          </h2>
          <div className="flex items-center space-x-4">
            <button className="relative p-2 text-gray-500 hover:text-[#000052] transition-colors">
              <Bell size={24} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="w-8 h-8 bg-[#000052] rounded-full flex items-center justify-center text-white font-bold">
              {role?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
};