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
    console.log('🔍 ROLE: Step 1 - starting determineRole for', userId);
    try {
      console.log('🔍 ROLE: Step 2 - calling supabase.auth.getUser()');
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('❌ ROLE: Step 2 error (getUser):', userError);
      }

      if (userData?.user?.user_metadata?.role) {
        console.log('✅ ROLE: Step 3 - found in metadata:', userData.user.user_metadata.role);
        return userData.user.user_metadata.role as UserRole;
      }

      console.log('🔍 ROLE: Step 4 - checking companies table');
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (companyError) {
        console.error('❌ ROLE: Step 4 error (companies):', companyError);
      } else if (companyData) {
        console.log('✅ ROLE: Step 5 - found in companies');
        return 'ceo';
      }

      console.log('🔍 ROLE: Step 6 - checking agents table');
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (agentError) {
        console.error('❌ ROLE: Step 6 error (agents):', agentError);
      } else if (agentData) {
        console.log('✅ ROLE: Step 7 - found in agents');
        return 'agent';
      }

      console.log('⚠️ ROLE: Step 8 - no role found in DB, defaulting to guest');
      return 'guest';
    } catch (error) {
      console.error('💥 ROLE: Step 9 - CRITICAL ERROR in determineRole:', error);
      return 'guest';
    }
  };

  useEffect(() => {
    console.log('🚀 AUTH INIT');
    
    const initializeAuth = async () => {
      console.log('🚀 AUTH: Step 1 - initializeAuth started');
      try {
        console.log('🚀 AUTH: Step 2 - calling getSession()');
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ AUTH: Step 2 error (getSession):', sessionError);
        }

        console.log('🚀 AUTH STATE CHANGED:', currentSession ? 'SIGNED_IN' : 'SIGNED_OUT');
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          console.log('🚀 AUTH: Step 3 - user exists, calling determineRole');
          const userRole = await determineRole(currentSession.user.id);
          console.log('🚀 AUTH: Step 4 - role determined:', userRole);
          setRole(userRole);
        } else {
          console.log('🚀 AUTH: Step 3 - no user, setting role to guest');
          setRole('guest');
        }
      } catch (error) {
        console.error('💥 AUTH: CRITICAL ERROR in initializeAuth:', error);
        setRole('guest');
      } finally {
        console.log('🏁 AUTH: Step 5 - FINALLY block reached, setting loading to FALSE');
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('🔄 AUTH STATE CHANGED (subscription):', event);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          const userRole = await determineRole(currentSession.user.id);
          setRole(userRole);
        } else {
          setRole('guest');
        }
        console.log('🏁 AUTH: Subscription finally block, setting loading to FALSE');
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