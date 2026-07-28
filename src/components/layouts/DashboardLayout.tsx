import React, { ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, FileText, Users, Settings, Scale, LogOut, Bell, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { signOut, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [showNotifications, setShowNotifications] = useState(false);

  console.log('🔍 DASHBOARD LAYOUT: Текущая роль =', role);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
    window.location.reload();
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

  const languages = [
    { code: 'ru', label: 'RU' },
    { code: 'en', label: 'EN' },
    { code: 'kk', label: 'KK' },
    { code: 'az', label: 'AZ' },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* ЛЕВОЕ МЕНЮ */}
      <aside className="w-64 bg-[#B8860B] text-white flex flex-col shadow-lg flex-shrink-0">
        <div className="p-6 border-b border-[#9a7009] flex items-center justify-center">
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
          {/* 4 кнопки языков в ряд */}
          <div className="grid grid-cols-4 gap-1">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => i18n.changeLanguage(lang.code)}
                className={`py-2 rounded text-xs font-semibold transition-colors ${
                  i18n.language === lang.code
                    ? 'bg-[#000052] text-white'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg hover:bg-red-600 bg-red-500 text-white text-sm transition-colors"
          >
            <LogOut size={18} />
            <span>{t('auth.logout')}</span>
          </button>
        </div>
      </aside>

      {/* ОСНОВНОЙ КОНТЕНТ */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm flex-shrink-0">
          <h2 className="text-[#000052] text-xl font-semibold">
            {role === 'ceo' ? 'Кабинет CEO' : 'Кабинет Агента'}
          </h2>
          
          <div className="flex items-center space-x-4">
            {/* Колокольчик уведомлений */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-500 hover:text-[#000052] transition-colors"
              >
                <Bell size={24} />
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-semibold text-[#000052]">Уведомления</h3>
                    <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-gray-600">
                      <X size={18} />
                    </button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <div className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 mt-2 bg-[#B8860B] rounded-full flex-shrink-0"></div>
                        <div>
                          <p className="text-sm font-medium text-[#000052]">Новый агент добавлен</p>
                          <p className="text-xs text-gray-500 mt-1">Агент успешно прошел верификацию и добавлен в вашу команду.</p>
                          <p className="text-xs text-gray-400 mt-2">2 мин. назад</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 mt-2 bg-gray-300 rounded-full flex-shrink-0"></div>
                        <div>
                          <p className="text-sm font-medium text-[#000052]">Смарт-контракт подписан</p>
                          <p className="text-xs text-gray-500 mt-1">Контракт #1042 успешно активирован.</p>
                          <p className="text-xs text-gray-400 mt-2">1 час назад</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 border-t border-gray-100 text-center">
                    <button className="text-sm text-[#B8860B] hover:text-[#9a7009] font-medium">
                      Показать все уведомления
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Аватар */}
            <div className="w-9 h-9 bg-[#000052] rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
              {role ? role[0].toUpperCase() : 'U'}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8 bg-gray-50">
          {children}
        </div>
      </main>

      {/* Закрытие dropdown при клике вне */}
      {showNotifications && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowNotifications(false)}
        ></div>
      )}
    </div>
  );
};