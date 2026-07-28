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

  const determineRole = async (currentUser: User): Promise<UserRole> => {
    console.log('🔍 Определяем роль для:', currentUser.id);
    
    // 1. Проверяем metadata (самый быстрый способ)
    const metaRole = currentUser.user_metadata?.role as string | undefined;
    if (metaRole === 'agent' || metaRole === 'ceo') {
      console.log('✅ Роль найдена в metadata:', metaRole);
      return metaRole;
    }

    // 2. Проверяем таблицу companies (CEO)
    try {
      const { data: companyData } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', currentUser.id)
        .maybeSingle();
        
      if (companyData) {
        console.log('✅ Роль найдена в таблице companies -> ceo');
        return 'ceo';
      }
    } catch (err) {
      console.error('Ошибка проверки companies:', err);
    }

    // 3. Проверяем таблицу agents (Агент)
    try {
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', currentUser.id)
        .maybeSingle();
        
      if (agentData) {
        console.log('✅ Роль найдена в таблице agents -> agent');
        return 'agent';
      }
    } catch (err) {
      console.error('Ошибка проверки agents:', err);
    }

    console.log('⚠️ Роль не найдена, устанавливаем ceo по умолчанию для демо');
    return 'ceo'; 
  };

  useEffect(() => {
    console.log('🚀 AUTH INIT');
    
    // ГАРАНТИРОВАННАЯ РАЗБЛОКИРОВКА ИНТЕРФЕЙСА ЧЕРЕЗ 300 МС
    // Даже если Supabase зависнет, пользователь увидит интерфейс
    const forceLoadTimer = setTimeout(() => {
      console.log('⏱️ AUTH: Таймаут истек, принудительно снимаем loading');
      setLoading(false);
    }, 300);

    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          const userRole = await determineRole(currentSession.user);
          setRole(userRole);
        } else {
          setRole('ceo'); // fallback для демо
        }
      } catch (error) {
        console.error('💥 AUTH ERROR:', error);
        setRole('ceo'); // fallback для демо
      } finally {
        console.log('🏁 AUTH: Загрузка завершена (loading = false)');
        setLoading(false);
        clearTimeout(forceLoadTimer); // отменяем таймер, если все прошло быстро
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('🔄 AUTH STATE CHANGED:', event);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          const userRole = await determineRole(currentSession.user);
          setRole(userRole);
        } else {
          setRole('ceo');
        }
        setLoading(false);
      }
    );

    return () => {
      clearTimeout(forceLoadTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error: any) {
      console.error('Ошибка входа:', error);
      throw new Error(error.message || 'Неверный email или пароль');
    } finally {
      // loading снимется автоматически через onAuthStateChange
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