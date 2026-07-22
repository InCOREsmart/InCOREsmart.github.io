import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, Settings, AlertTriangle, LogOut, Globe, Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface DashboardLayoutProps { children: React.ReactNode; }

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isCEO = user?.user_metadata?.role === 'ceo' || location.pathname.includes('/ceo');
  
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
  const changeLanguage = (code: string) => i18n.changeLanguage(code);
  const handleLogout = async () => { await signOut(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-2 bg-[#000052] px-3 py-2 rounded-lg w-fit">
              <span className="text-white font-bold text-lg tracking-wider">In<span className="text-yellow-500">C</span>ORE</span>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-[#000052]/5 text-[#000052] border border-[#000052]/10' : 'text-gray-600 hover:bg-gray-50 hover:text-[#000052]'}`}>
                  {item.icon} <span>{t(item.label)}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-3 text-gray-500">
              <Globe className="w-4 h-4" /> <span className="text-xs font-medium uppercase tracking-wider">{t('nav.language')}</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {languages.map((lang) => (
                <button key={lang.code} onClick={() => changeLanguage(lang.code)} className={`px-2 py-1.5 text-xs rounded-md border transition-all font-semibold ${i18n.language === lang.code ? 'bg-[#000052] text-white border-[#000052]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#000052] hover:text-[#000052]'}`}>
                  {lang.name}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-[#000052]/10 flex items-center justify-center text-[#000052] font-bold">{user?.email?.[0].toUpperCase() || 'U'}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#000052] truncate">{user?.email}</p>
                <p className="text-xs text-gray-500">{isCEO ? 'CEO' : 'Agent'}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <LogOut className="w-4 h-4" /> {t('auth.logout')}
            </button>
          </div>
        </div>
      </aside>

      <button className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md text-[#000052]" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">{children}</main>
    </div>
  );
}