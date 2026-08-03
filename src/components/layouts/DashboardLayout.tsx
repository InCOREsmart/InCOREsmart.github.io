import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Settings, 
  Scale,
  LogOut,
  DollarSign,
  Globe,
  Archive,
  Menu,
  X
} from 'lucide-react';
import { NotificationBell } from '../ui/NotificationBell';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchUserName = async () => {
      if (!user) return;

      try {
        if (role === 'ceo') {
          const { data } = await supabase
            .from('companies')
            .select('display_name, company_name')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (data) {
            setUserName(data.display_name || data.company_name || 'CEO');
          }
        } else if (role === 'agent') {
          const { data } = await supabase
            .from('agents')
            .select('full_name')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (data) {
            setUserName(data.full_name || 'Agent');
          }
        }
      } catch (err) {
        console.error('Ошибка загрузки имени пользователя:', err);
      }
    };

    fetchUserName();
  }, [user, role]);

  // Закрывать мобильное меню при смене маршрута
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const ceoMenuItems = [
    { path: '/ceo', icon: LayoutDashboard, label: t('nav.dashboard') },
    { path: '/ceo/contracts', icon: FileText, label: t('nav.contracts') },
    { path: '/ceo/agents', icon: Users, label: t('nav.agents') },
    { path: '/ceo/integrations', icon: Globe, label: t('nav.integrations') },
    { path: '/ceo/accounting', icon: Archive, label: t('nav.accounting') },
    { path: '/ceo/disputes', icon: Scale, label: t('nav.disputes') },
    { path: '/ceo/settings', icon: Settings, label: t('nav.settings') },
  ];

  const agentMenuItems = [
    { path: '/agent', icon: LayoutDashboard, label: t('nav.dashboard') },
    { path: '/agent/contracts', icon: FileText, label: t('nav.contracts') },
    { path: '/agent/payouts', icon: DollarSign, label: t('payouts.title') },
    { path: '/agent/settings', icon: Settings, label: t('nav.settings') },
  ];

  const menuItems = role === 'ceo' ? ceoMenuItems : agentMenuItems;

  const menuContent = (
    <>
      {/* Только логотип, без подписи */}
      <div className="p-6 border-b border-gray-100 flex justify-center md:justify-start">
        <img src="/logo.png" alt="InCORE" className="w-12 h-12" />
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? 'bg-[#B8860B] text-white font-semibold'
                  : 'text-[#000052] hover:bg-[#000052]/5'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="flex gap-1 mb-3">
          {['ru', 'en', 'kk', 'az'].map((lang) => (
            <button
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              className={`flex-1 px-2 py-1 rounded text-xs font-medium transition ${
                i18n.language === lang
                  ? 'bg-[#000052] text-white'
                  : 'bg-gray-100 text-[#000052] hover:bg-gray-200'
              }`}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-[#000052] hover:bg-[#000052]/5 transition"
        >
          <LogOut className="w-5 h-5" />
          <span>{t('auth.logout')}</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Десктопное левое меню — белое */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 text-[#000052] flex-col">
        {menuContent}
      </aside>

      {/* Мобильное меню (overlay) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white text-[#000052] flex flex-col shadow-xl">
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg z-10"
            >
              <X className="w-5 h-5 text-[#000052]" />
            </button>
            {menuContent}
          </aside>
        </div>
      )}

      {/* Основная область */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Верхняя панель */}
        <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Кнопка бургера для мобильных */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="w-6 h-6 text-[#000052]" />
            </button>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-[#000052] truncate max-w-[200px] md:max-w-none">{userName}</h2>
              <p className="text-xs md:text-sm text-gray-500 truncate max-w-[200px] md:max-w-none">{user?.email}</p>
            </div>
          </div>
          <NotificationBell />
        </header>

        {/* Контент */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}