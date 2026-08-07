import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export function NotificationBell() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const loadNotifications = async () => {
      try {
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(20);
        
        setNotifications(data || []);
        setCount((data || []).length);
      } catch (err) {
        console.error('Ошибка загрузки уведомлений:', err);
      }
    };
    loadNotifications();
  }, [user]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-[#000052]/5 rounded-lg transition"
      >
        <Bell className="w-5 h-5 text-[#000052]" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-2xl border border-[#000052]/10 z-50">
          <div className="p-4 border-b border-[#000052]/10">
            <h3 className="font-bold text-[#000052]">Уведомления</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-[#000052]/60">
                Нет новых уведомлений
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="p-3 border-b border-[#000052]/5 hover:bg-[#000052]/5">
                  <div className="text-sm font-semibold text-[#000052]">{n.title || 'Уведомление'}</div>
                  <div className="text-xs text-[#000052]/60 mt-1">{n.message || ''}</div>
                  <div className="text-xs text-[#000052]/40 mt-1">
                    {new Date(n.created_at).toLocaleString('ru-RU')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}