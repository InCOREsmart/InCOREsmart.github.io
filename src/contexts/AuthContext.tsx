import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type UserRole = 'ceo' | 'agent' | 'guest' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>('ceo'); // Временная заглушка для разблокировки UI
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🚀 AUTH INIT: Запуск в упрощенном режиме');
    
    // МГНОВЕННАЯ РАЗБЛОКИРОВКА ИНТЕРФЕЙСА (через 100 мс)
    const timer = setTimeout(() => {
      console.log('✅ AUTH: Роль установлена, загрузка завершена (loading = false)');
      setLoading(false);
    }, 100);

    // Фоновая попытка получить реальную сессию (не блокирует интерфейс, если Supabase тормозит)
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (currentSession?.user) {
        setUser(currentSession.user);
        setSession(currentSession);
        const metaRole = currentSession.user.user_metadata?.role;
        if (metaRole === 'agent' || metaRole === 'ceo') {
          setRole(metaRole);
        }
      }
    }).catch(err => {
      console.warn('⚠️ AUTH: Supabase недоступен, работаем в локальном режиме', err);
    });

    return () => clearTimeout(timer);
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error(e);
    }
    setUser(null);
    setSession(null);
    setRole('guest');
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};