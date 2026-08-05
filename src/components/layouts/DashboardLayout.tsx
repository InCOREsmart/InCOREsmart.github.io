import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Settings, 
  LogOut, 
  Bell,
  Menu,
  X,
  Shield
} from 'lucide-react';
import NotificationBell from '../ui/NotificationBell';

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const menuItems = role === 'ceo' ? [
    { path: '/ceo/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
    { path: '/ceo/contracts', icon: FileText, label: t('nav.contracts') },
    { path: '/ceo/agents', icon: Users, label: t('nav.agents') },
    { path: '/ceo/disputes', icon: Shield, label: t('nav.disputes') },
    { path: '/ceo/settings', icon: Settings, label: t('nav.settings') },
  ] : [
    { path: '/agent/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
    { path: '/agent/contracts', icon: FileText, label: t('nav.contracts') },
    { path: '/agent/payouts', icon: FileText, label: t('nav.payouts') },
    { path: '/agent/settings', icon: Settings, label: t('nav.settings') },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 w-64`}
      >
        {/* Золотое меню с градиентом */}
        <div className="h-full flex flex-col bg-gradient-to-b from-[#B8860B] to-[#9A7209] shadow-xl">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-white/10">
            <Link to="/" className="flex items-center space-x-3">
              <img src="/logo.png" alt="InCORE" className="h-8 w-auto brightness-0 invert" />
              <span className="text-white font-bold text-lg tracking-tight">InCORE</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white hover:bg-white/10 rounded-lg p-1.5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 group ${
                    isActive
                      ? 'bg-white/20 text-white shadow-lg'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 mr-3 transition-transform duration-200 ${
                    isActive ? 'scale-110' : 'group-hover:scale-105'
                  }`} />
                  <span className="font-medium text-sm">{item.label}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User info & Logout */}
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center px-3 py-2 mb-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mr-3">
                <span className="text-white font-semibold text-sm">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {role === 'ceo' ? 'CEO' : 'Агент'}
                </p>
                <p className="text-white/60 text-xs truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            
            {/* Language switcher */}
            <div className="flex gap-1 mb-3 px-1">
              {['ru', 'en', 'kk', 'az'].map((lang) => (
                <button
                  key={lang}
                  onClick={() => changeLanguage(lang)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded transition-all ${
                    i18n.language === lang
                      ? 'bg-white text-[#B8860B]'
                      : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-2.5 text-white/80 hover:bg-white/10 hover:text-white rounded-lg transition-all duration-200 group"
            >
              <LogOut className="w-5 h-5 mr-3 group-hover:rotate-12 transition-transform" />
              <span className="font-medium text-sm">{t('auth.logout')}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between h-16 px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-[#0B1F35] hover:bg-gray-100 rounded-lg p-2 transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex-1" />

            <div className="flex items-center space-x-4">
              <NotificationBell />
              
              <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-[#F8F9FA] rounded-lg">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-[#5E6D82]">
                  {role === 'ceo' ? 'CEO Panel' : 'Agent Workspace'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6 lg:p-8">
          <div className="animate-fadeIn">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;