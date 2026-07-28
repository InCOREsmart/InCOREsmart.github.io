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
      console.log('ROLE: reading user_roles...', userId);

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      console.log('ROLE RESULT:', data, error);

      if (error) {
        console.error('ROLE ERROR:', error);
        return 'AGENT';
      }

      if (data?.role === 'CEO') {
        return 'CEO';
      }

      if (data?.role === 'ADMIN') {
        return 'ADMIN';
      }

      return 'AGENT';
    } catch (err) {
      console.error('ROLE EXCEPTION:', err);
      return 'AGENT';
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        console.log('AUTH INIT');

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        console.log('SESSION:', session, error);

        if (!isMounted) return;

        setSession(session);

        if (!session?.user) {
          setUser(null);
          setRole(null);
          return;
        }

        setUser(session.user);

        const detectedRole = await determineRole(session.user.id);

        if (!isMounted) return;

        setRole(detectedRole);
      } catch (err) {
        console.error('AUTH ERROR:', err);

        if (isMounted) {
          setUser(null);
          setSession(null);
          setRole(null);
        }
      } finally {
        if (isMounted) {
          console.log('LOADING FALSE');
          setLoading(false);
        }
      }
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;

      console.log('AUTH STATE CHANGED:', _event);

      setSession(session);

      if (!session?.user) {
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      setUser(session.user);

      const detectedRole = await determineRole(session.user.id);

      if (!isMounted) return;

      setRole(detectedRole);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }
  };

  const signOut = async () => {
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