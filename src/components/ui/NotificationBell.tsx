import { useState, useEffect } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const notificationKey = (type: string, field: 'title' | 'message') => `notifications.${type}.${field}`;

export function NotificationBell() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10);
      if (data) { setNotifications(data); setUnreadCount(data.filter(n => !n.is_read).length); }
    };
    fetchNotifications();
    const subscription = supabase.channel('notifications').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
      if (user && payload.new.user_id === user.id) fetchNotifications();
    }).subscribe();
    return () => { subscription.unsubscribe(); };
  }, [user]);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };
  const markAllAsRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
    setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };
  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(notifications.filter(n => n.id !== id));
  };
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString(i18n.language || 'ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  const getNotificationText = (notification: Notification, field: 'title' | 'message') => {
    const translated = t(notificationKey(notification.type, field), { defaultValue: '' });
    return translated || (field === 'title' ? notification.title : notification.message);
  };

  return <div className="relative">
    <button onClick={() => setIsOpen(!isOpen)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative" aria-label={t('ui.notifications', { defaultValue: 'Notifications' })}>
      <Bell className="w-5 h-5 text-[#000052]" />
      {unreadCount > 0 && <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{unreadCount}</span>}
    </button>
    {isOpen && <div className="absolute right-0 mt-2 w-[min(24rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[min(24rem,70vh)] overflow-y-auto">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-[#000052]">{t('notifications.title', { defaultValue: 'Уведомления' })}</h3>
        {unreadCount > 0 && <button onClick={markAllAsRead} className="text-xs text-[#B8860B] hover:underline text-right">{t('notifications.markAllRead', { defaultValue: 'Отметить все как прочитанные' })}</button>}
      </div>
      {notifications.length === 0 ? <div className="p-8 text-center text-gray-500"><Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" /><p>{t('notifications.empty', { defaultValue: 'Нет уведомлений' })}</p></div> : <div className="divide-y divide-gray-100">
        {notifications.map(notification => <div key={notification.id} className={`p-4 hover:bg-gray-50 transition-colors ${!notification.is_read ? 'bg-blue-50/50' : ''}`}>
          <div className="flex items-start justify-between gap-2"><div className="flex-1 min-w-0">
            <p className="font-medium text-[#000052] text-sm break-words">{getNotificationText(notification, 'title')}</p>
            <p className="text-xs text-gray-600 mt-1 break-words">{getNotificationText(notification, 'message')}</p>
            <p className="text-xs text-gray-400 mt-2">{formatDate(notification.created_at)}</p>
          </div><div className="flex gap-1 flex-shrink-0">
            {!notification.is_read && <button onClick={() => markAsRead(notification.id)} className="p-1 hover:bg-gray-200 rounded transition-colors" aria-label={t('notifications.markRead', { defaultValue: 'Mark as read' })}><Check className="w-4 h-4 text-green-600" /></button>}
            <button onClick={() => deleteNotification(notification.id)} className="p-1 hover:bg-gray-200 rounded transition-colors" aria-label={t('notifications.delete', { defaultValue: 'Delete' })}><Trash2 className="w-4 h-4 text-red-600" /></button>
          </div></div>
        </div>)}
      </div>}
    </div>}
  </div>;
}
