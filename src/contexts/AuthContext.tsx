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
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  const determineRole = async (userId: string): Promise<UserRole> => {
    console.log('ROLE: reading user_roles...', userId);
    try {
      // 1. Проверяем user_metadata (сохраняется при регистрации)
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.user_metadata?.role) {
        console.log('ROLE: found in metadata', userData.user.user_metadata.role);
        return userData.user.user_metadata.role as UserRole;
      }

      // 2. Проверяем таблицу companies (CEO)
      // ИСПОЛЬЗУЕМ maybeSingle вместо single, чтобы избежать ошибки, если записей нет
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (companyData && !companyError) {
        console.log('ROLE: found in companies');
        return 'ceo';
      }

      // 3. Проверяем таблицу agents (Агент)
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (agentData && !agentError) {
        console.log('ROLE: found in agents');
        return 'agent';
      }

      console.log('ROLE: no role found in DB, defaulting to guest');
      return 'guest';
    } catch (error) {
      console.error('Error determining role:', error);
      return 'guest';
    }
  };

  useEffect(() => {
    console.log('AUTH INIT');
    
    // Функция для инициализации сессии при первой загрузке
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log('AUTH STATE CHANGED:', currentSession ? 'SIGNED_IN' : 'SIGNED_OUT');
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          const userRole = await determineRole(currentSession.user.id);
          setRole(userRole);
        } else {
          setRole('guest');
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setRole('guest');
      } finally {
        // КРИТИЧНО: всегда снимаем флаг загрузки, даже при ошибке
        setLoading(false);
      }
    };

    initializeAuth();

    // Подписываемся на изменения состояния аутентификации
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('AUTH STATE CHANGED:', event);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          const userRole = await determineRole(currentSession.user.id);
          setRole(userRole);
        } else {
          setRole('guest');
        }
        // КРИТИЧНО: всегда снимаем флаг загрузки при изменении состояния
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
      setUser(null);
      setSession(null);
      setRole('guest');
    } catch (error) {
      console.error('Error signing out:', error);
    }
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