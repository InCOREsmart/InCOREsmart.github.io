import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type UserRole = 'ceo' | 'agent' | 'guest' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>; // ДОБАВЛЕНО
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>('ceo');
  const [loading, setLoading] = useState(true);

  // Функция входа в систему
  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      
      // Роль обновится автоматически через onAuthStateChange ниже
    } catch (error: any) {
      console.error('Ошибка входа:', error);
      throw new Error(error.message || 'Неверный email или пароль');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🚀 AUTH INIT: Запуск');
    
    // МГНОВЕННАЯ РАЗБЛОКИРОВКА ИНТЕРФЕЙСА
    const timer = setTimeout(() => {
      console.log('✅ AUTH: Начальная загрузка завершена (loading = false)');
      setLoading(false);
    }, 100);

    // Проверка текущей сессии
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

  // Подписка на изменения состояния (срабатывает после успешного signIn)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('🔄 AUTH STATE CHANGED:', event);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          const metaRole = currentSession.user.user_metadata?.role;
          setRole(metaRole === 'agent' || metaRole === 'ceo' ? metaRole : 'ceo');
        } else {
          setRole('guest');
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
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
    <AuthContext.Provider value={{ user, session, role, loading, signIn, signOut }}>
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