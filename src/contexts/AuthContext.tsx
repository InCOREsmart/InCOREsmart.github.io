import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export type UserRole = 'CEO' | 'AGENT' | 'ADMIN';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  role: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const determineRole = async (userId: string): Promise<UserRole> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.role) {
        return user.user_metadata.role as UserRole;
      }

      const { data: companyData } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (companyData) return 'CEO';

      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (agentData) return 'AGENT';

      return 'AGENT';
    } catch (err) {
      console.error('Error determining role:', err);
      return 'AGENT';
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        setSession(session);
        
        if (session?.user) {
          setUser(session.user);
          const userRole = await determineRole(session.user.id);
          if (isMounted) setRole(userRole);
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initAuth();
    console.log('1. initAuth started');

const { data: { session } } = await supabase.auth.getSession();

console.log('2. session =', session);

if (session?.user) {
  console.log('3. determineRole');
  const userRole = await determineRole(session.user.id);
  console.log('4. role =', userRole);
}

console.log('5. loading false');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      setSession(session);
      
      if (session?.user) {
        setUser(session.user);
        const userRole = await determineRole(session.user.id);
        if (isMounted) setRole(userRole);
      } else {
        setUser(null);
        setRole(null);
      }
      
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);