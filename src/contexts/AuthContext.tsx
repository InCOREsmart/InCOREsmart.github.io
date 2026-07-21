import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase, UserRole, UserProfile } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      console.error('No active session');
      return null;
    }

    const { data, error } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    if (data) {
      return {
        id: data.user_id,
        email: sessionData.session.user.email || '',
        role: data.role as UserRole,
      };
    }

    return null;

  } catch (err) {
    console.error('fetchProfile failed:', err);
    return null;
  }
}, []);

  const refreshProfile = useCallback(async () => {
  if (!user) return;

  try {
    const userProfile = await fetchProfile(user.id);
    setProfile(userProfile);
  } catch (error) {
    console.error('Failed to refresh profile:', error);
  }
}, [user, fetchProfile]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        (async () => {
          const userProfile = await fetchProfile(session.user.id);
          setProfile(userProfile);
          setLoading(false);
        })();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
  setSession(session);
  setUser(session?.user ?? null);
  setLoading(false);
});

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signOut = async () => {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error('Sign out failed:', error);
  } finally {
    setUser(null);
    setSession(null);
    setProfile(null);
    setLoading(false);
  }
};

  const value = {
    user,
    session,
    profile,
    role: profile?.role || null,
    loading,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
