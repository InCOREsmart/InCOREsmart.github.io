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

  const determineRole = async (currentUser: User): Promise<UserRole> => {
    console.log('🔍 ROLE: определяем роль для', currentUser.id);
    
    // 1. Сначала проверяем user_metadata (сохраняется при регистрации)
    const metadataRole = currentUser.user_metadata?.role as UserRole | undefined;
    if (metadataRole && (metadataRole === 'ceo' || metadataRole === 'agent')) {
      console.log('✅ ROLE: найдена в metadata:', metadataRole);
      return metadataRole;
    }

    // 2. Если в metadata нет — проверяем таблицу companies (CEO)
    try {
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (companyError) {
        console.error('❌ ROLE: ошибка запроса companies:', companyError);
      } else if (companyData) {
        console.log('✅ ROLE: найдена в companies → ceo');
        return 'ceo';
      }
    } catch (err) {
      console.error('❌ ROLE: исключение при запросе companies:', err);
    }

    // 3. Если не CEO — проверяем таблицу agents (Агент)
    try {
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (agentError) {
        console.error('❌ ROLE: ошибка запроса agents:', agentError);
      } else if (agentData) {
        console.log('✅ ROLE: найдена в agents → agent');
        return 'agent';
      }
    } catch (err) {
      console.error('❌ ROLE: исключение при запросе agents:', err);
    }

    console.log('⚠️ ROLE: роль не найдена, устанавливаем guest');
    return 'guest';
  };

  useEffect(() => {
    console.log('🚀 AUTH INIT');
    
    const initializeAuth = async () => {
      try {
        console.log('🚀 AUTH: получаем сессию...');
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ AUTH: ошибка getSession:', error);
        }

        console.log('🚀 AUTH: сессия', currentSession ? 'НАЙДЕНА' : 'ПУСТАЯ');
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          console.log('🚀 AUTH: пользователь найден, определяем роль...');
          const userRole = await determineRole(currentSession.user);
          console.log('🚀 AUTH: итоговая роль:', userRole);
          setRole(userRole);
        } else {
          console.log('🚀 AUTH: пользователь не найден, роль = guest');
          setRole('guest');
        }
      } catch (error) {
        console.error('💥 AUTH: критическая ошибка:', error);
        setRole('guest');
      } finally {
        console.log('🏁 AUTH: загрузка завершена, loading = false');
        setLoading(false);
      }
    };

    initializeAuth();

    // Подписка на изменения состояния аутентификации
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('🔄 AUTH STATE CHANGED:', event);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          const userRole = await determineRole(currentSession.user);
          setRole(userRole);
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