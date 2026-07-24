import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, Settings, AlertTriangle, LogOut, Globe, Menu, X, Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface DashboardLayoutProps { children: React.ReactNode; }

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { t, i18n } = useTranslation();
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Определяем меню по роли из контекста
  const isCEO = role === 'CEO';
  
  const navItems = isCEO ? [
    { path: '/ceo/dashboard', label: 'nav.dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { path: '/ceo/contracts', label: 'nav.contracts', icon: <FileText className="w-5 h-5" /> },
    { path: '/ceo/agents', label: 'nav.agents', icon: <Users className="w-5 h-5" /> },
    { path: '/ceo/disputes', label: 'nav.disputes', icon: <AlertTriangle className="w-5 h-5" /> },
    { path: '/ceo/settings', label: 'nav.settings', icon: <Settings className="w-5 h-5" /> },
  ] : [
    { path: '/agent/dashboard', label: 'nav.dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { path: '/agent/contracts', label: 'nav.contracts', icon: <FileText className="w-5 h-5" /> },
    { path: '/agent/settings', label: 'nav.settings', icon: <Settings className="w-5 h-5" /> },
  ];

  const languages = [{ code: 'ru', name: 'RU' }, { code: 'en', name: 'EN' }, { code: 'kk', name: 'KK' }, { code: 'az', name: 'AZ' }];

  const handleLogout = async () => { await signOut(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#B8860B] border-r border-gray-200 transform transition-transform duration-200 lg:translate-x-0 lg:static ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-yellow-600/30 flex justify-center">
            <img src="/logo.png" alt="InCORE" className="h-10 w-auto object-contain" />
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-white/20 text-white border border-white/30' : 'text-white/90 hover:bg-white/10'}`}>
                  {item.icon} <span>{t(item.label)}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-yellow-600/30">
            <div className="flex items-center gap-2 mb-3 text-white/80">
              <Globe className="w-4 h-4" /> <span className="text-xs font-medium uppercase">{t('nav.language')}</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {languages.map((lang) => (
                <button key={lang.code} onClick={() => i18n.changeLanguage(lang.code)} className={`px-2 py-1.5 text-xs rounded-md border font-semibold ${i18n.language === lang.code ? 'bg-white text-[#B8860B] border-white' : 'bg-transparent text-white border-white/30'}`}>
                  {lang.name}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-yellow-600/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">{user?.email?.[0]?.toUpperCase() || 'U'}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                <p className="text-xs text-white/70">{role || 'User'}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 rounded-lg">
              <LogOut className="w-4 h-4" /> {t('auth.logout')}
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
        <div className="flex justify-end mb-4 relative">
          <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="p-2 hover:bg-gray-100 rounded-lg relative">
            <Bell className="w-5 h-5 text-[#000052]" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-50">
              <p className="text-sm text-gray-500 text-center">Уведомления в разработке</p>
            </div>
          )}
        </div>
        {children}
      </main>
    </div>
  );
}