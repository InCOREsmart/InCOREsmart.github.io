import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type UserRole = 'ceo' | 'agent' | 'guest' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🚀 AUTH INIT');
    
    // ГАРАНТИРОВАННАЯ РАЗБЛОКИРОВКА ЧЕРЕЗ 100 МС
    const timer = setTimeout(() => {
      console.log('✅ AUTH: Интерфейс разблокирован');
      setLoading(false);
    }, 100);

    // Фоновая проверка сессии (не блокирует UI)
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (currentSession?.user) {
        setUser(currentSession.user);
        setSession(currentSession);
        
        // Берем роль ТОЛЬКО из metadata (быстро, без запросов к БД)
        const metaRole = currentSession.user.user_metadata?.role as string | undefined;
        if (metaRole === 'ceo' || metaRole === 'agent') {
          setRole(metaRole);
          console.log('✅ Роль из metadata:', metaRole);
        } else {
          setRole('guest');
          console.log('️ Роль не найдена в metadata');
        }
      } else {
        console.log('👤 Пользователь не авторизован');
      }
    }).catch(err => {
      console.error(' Ошибка getSession:', err);
    });

    // Подписка на изменения
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log('🔄 AUTH STATE CHANGED:', event);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          const metaRole = currentSession.user.user_metadata?.role as string | undefined;
          setRole(metaRole === 'ceo' || metaRole === 'agent' ? metaRole : 'guest');
        } else {
          setRole(null);
        }
        setLoading(false);
      }
    );

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Роль обновится через onAuthStateChange
    } catch (error: any) {
      console.error('Ошибка входа:', error);
      throw new Error(error.message || 'Неверный email или пароль');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error(e);
    }
    setUser(null);
    setSession(null);
    setRole(null);
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