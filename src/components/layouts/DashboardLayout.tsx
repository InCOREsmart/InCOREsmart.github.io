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
  Archive
} from 'lucide-react';
import { NotificationBell } from '../ui/NotificationBell';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState('');

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  // Меню для CEO - ВСЕ С t()
  const ceoMenuItems = [
    { path: '/ceo', icon: LayoutDashboard, label: t('nav.dashboard') },
    { path: '/ceo/contracts', icon: FileText, label: t('nav.contracts') },
    { path: '/ceo/agents', icon: Users, label: t('nav.agents') },
    { path: '/ceo/integrations', icon: Globe, label: t('nav.integrations') },
    { path: '/ceo/accounting', icon: Archive, label: t('nav.accounting') },
    { path: '/ceo/disputes', icon: Scale, label: t('nav.disputes') },
    { path: '/ceo/settings', icon: Settings, label: t('nav.settings') },
  ];

  // Меню для Агента
  const agentMenuItems = [
    { path: '/agent', icon: LayoutDashboard, label: t('nav.dashboard') },
    { path: '/agent/contracts', icon: FileText, label: t('nav.contracts') },
    { path: '/agent/payouts', icon: DollarSign, label: t('payouts.title') },
    { path: '/agent/settings', icon: Settings, label: t('nav.settings') },
  ];

  const menuItems = role === 'ceo' ? ceoMenuItems : agentMenuItems;

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-[#B8860B] text-white flex flex-col">
        <div className="p-6 border-b border-[#B8860B]/20">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="InCORE" className="w-10 h-10" />
            <div>
              <h1 className="text-xl font-bold">InCORE</h1>
              <p className="text-xs opacity-80">{role === 'ceo' ? 'CEO' : 'Agent'}</p>
            </div>
          </div>
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
                    ? 'bg-white text-[#B8860B] font-semibold'
                    : 'hover:bg-[#B8860B]/20'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#B8860B]/20">
          <div className="flex gap-1 mb-3">
            {['ru', 'en', 'kk', 'az'].map((lang) => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={`flex-1 px-2 py-1 rounded text-xs font-medium transition ${
                  i18n.language === lang
                    ? 'bg-white text-[#B8860B]'
                    : 'bg-[#B8860B]/20 hover:bg-[#B8860B]/30'
                }`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[#B8860B]/20 transition"
          >
            <LogOut className="w-5 h-5" />
            <span>{t('auth.logout')}</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#000052]">{userName}</h2>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
          <NotificationBell />
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}