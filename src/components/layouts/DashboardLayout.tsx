import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Settings,
  FileText,
  Users,
  Bell,
  LogOut,
  Menu,
  X,
  Globe,
  Check,
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Notification, UserRole } from '../../lib/supabase';
import { useTranslation } from "react-i18next";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navItems: Record<UserRole, Array<{ path: string; label: string; icon: React.ReactNode }>> = {
  CEO: [
    { path: '/ceo/dashboard', label: 'nav.dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { path: '/ceo/contracts', label: 'nav.contracts', icon: <FileText className="w-5 h-5" /> },
    { path: '/ceo/agents', label: 'nav.agents', icon: <Users className="w-5 h-5" /> },
    { path: '/ceo/settings', label: 'nav.settings', icon: <Settings className="w-5 h-5" /> },
    { path: '/ceo/disputes', label: 'nav.disputes', icon: <AlertTriangle className="w-5 h-5" /> },
  ],
  AGENT: [
    { path: '/agent/dashboard', label: 'nav.dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { path: '/agent/contracts', label: 'nav.contracts', icon: <FileText className="w-5 h-5" /> },
    { path: '/agent/payouts', label: 'nav.payouts', icon: <DollarSign className="w-5 h-5" /> },
    { path: '/agent/settings', label: 'nav.settings', icon: <Settings className="w-5 h-5" /> },
  ],
  ADMIN: [
    { path: '/admin/dashboard', label: 'nav.dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { path: '/admin/users', label: 'nav.agents', icon: <Users className="w-5 h-5" /> },
    { path: '/admin/contracts', label: 'nav.contracts', icon: <FileText className="w-5 h-5" /> },
  ],
};

const languages = [
  { code: 'ru', name: 'RU' },
  { code: 'en', name: 'EN' },
  { code: 'kk', name: 'KK' },
  { code: 'az', name: 'AZ' },
];

function formatTimeAgo(date: string): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Сейчас';
  if (diffMins < 60) return `${diffMins} мин назад`;
  if (diffHours < 24) return `${diffHours} ч назад`;
  if (diffDays < 7) return `${diffDays} дн назад`;
  return past.toLocaleDateString('ru-RU');
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { t, i18n } = useTranslation();
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const role = profile?.role || 'AGENT';
  const items = navItems[role] || [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (data) setNotifications(data as Notification[]);
    };

    fetchNotifications();

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user?.id}` },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev].slice(0, 5));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-text-secondary/10 transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center p-6 border-b border-text-secondary/10 relative">
            <Link to="/" className="flex items-center justify-center w-full">
              <img 
                src="/logo.png" 
                alt="InCore Logo" 
                className="h-10 w-auto object-contain" 
              />
            </Link>
            
            {/* Кнопка закрытия для мобильных (сдвинута вправо, чтобы не мешать центру) */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-text-secondary hover:text-text-primary absolute right-6"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {items.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-gold/20 text-gold'
                      : 'text-text-secondary hover:bg-primary-dark hover:text-text-primary'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  {item.icon}
                  <span className="font-medium">{t(item.label)}</span>
                </Link>
              );
            })}
          </nav>

          {/* Language Switcher */}
          <div className="p-4 border-t border-text-secondary/10">
            <div className="flex items-center gap-1 mb-3 text-text-secondary">
              <Globe className="w-4 h-4" />
              <span className="text-xs">Language</span>
            </div>
            <div className="flex gap-1">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={`px-2 py-1 text-xs rounded transition-all ${
                    i18n.language === lang.code
                      ? 'bg-gold text-primary-dark font-medium'
                      : 'bg-primary-dark text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          </div>

          {/* User Info & Logout */}
          <div className="p-4 border-t border-text-secondary/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                <span className="text-gold font-medium">
                  {user?.email?.[0].toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {user?.email}
                </p>
                <p className="text-xs text-text-muted">{role}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-text-secondary hover:text-error rounded-lg hover:bg-error/10 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>{t('auth.logout')}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-primary border-b border-text-secondary/10 px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-text-secondary hover:text-text-primary"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="ml-auto flex items-center gap-4">
              {/* Notifications */}
              <div className="relative" ref={notificationRef}>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-text-secondary hover:text-text-primary rounded-lg hover:bg-card transition-all"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-error rounded-full text-xs text-white flex items-center justify-center font-medium">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-text-secondary/20 rounded-xl shadow-xl overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-text-secondary/10">
                      <h3 className="font-medium text-text-primary">{t('notification.title')}</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-gold hover:text-gold/80 flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          {t('notification.markAllRead')}
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-text-secondary">
                          {t('notification.noNotifications')}
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 border-b border-text-secondary/5 hover:bg-primary-light transition-colors ${
                              !notification.is_read ? 'bg-gold/5' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className={`text-sm ${!notification.is_read ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
                                  {notification.title}
                                </p>
                                <p className="text-xs text-text-muted mt-1">
                                  {notification.message}
                                </p>
                              </div>
                              <span className="text-xs text-text-muted whitespace-nowrap">
                                {formatTimeAgo(notification.created_at)}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}