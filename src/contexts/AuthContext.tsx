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
      console.log('ROLE 1: determineRole', userId);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      console.log('ROLE 2: getUser', user);

      if (user?.user_metadata?.role) {
        console.log('ROLE 3: metadata role', user.user_metadata.role);
        return user.user_metadata.role as UserRole;
      }

      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      console.log('ROLE 4: company', companyData, companyError);

      if (companyData) return 'CEO';

      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      console.log('ROLE 5: agent', agentData, agentError);

      if (agentData) return 'AGENT';

      console.log('ROLE 6: default AGENT');
      return 'AGENT';
    } catch (err) {
      console.error('ROLE ERROR', err);
      return 'AGENT';
    }
  };

  useEffect(() => {
    console.log('AUTH 1: useEffect');

    let isMounted = true;

    const initAuth = async () => {
      console.log('AUTH 2: initAuth');

      try {
        console.log('AUTH 3: before getSession');

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        console.log('AUTH 4: after getSession', session, error);

        if (!isMounted) return;

        setSession(session);

        if (session?.user) {
          console.log('AUTH 5: user', session.user.id);

          setUser(session.user);

          const userRole = await determineRole(session.user.id);

          console.log('AUTH 6: role', userRole);

          if (isMounted) setRole(userRole);
        } else {
          console.log('AUTH 5: no session');
        }
      } catch (err) {
        console.error('AUTH ERROR', err);
      } finally {
        console.log('AUTH 7: loading=false');

        if (isMounted) setLoading(false);
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AUTH EVENT', event, session);

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
    console.log('SIGN IN');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const signOut = async () => {
    console.log('SIGN OUT');

    await supabase.auth.signOut();

    setUser(null);
    setSession(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);