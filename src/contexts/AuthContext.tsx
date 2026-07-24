import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, UserProfile, UserRole } from '../lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface AuthContextType {
  user: SupabaseUser | null;
  profile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userRole: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session;
        
        if (session?.user && isMounted) {
          setUser(session.user);
          
          let detectedRole: UserRole | null = null;
          const metadataRole = session.user.user_metadata?.role as UserRole | undefined;
          
          if (metadataRole === 'CEO' || metadataRole === 'AGENT' || metadataRole === 'ADMIN') {
            detectedRole = metadataRole;
          } else {
            const { data: companyData } = await supabase.from('companies').select('id').eq('user_id', session.user.id).maybeSingle();
            if (companyData) {
              detectedRole = 'CEO';
            } else {
              const { data: agentData } = await supabase.from('agents').select('id').eq('user_id', session.user.id).maybeSingle();
              if (agentData) {
                detectedRole = 'AGENT';
              } else {
                detectedRole = 'ADMIN';
              }
            }
          }
          
          if (isMounted) {
            setRole(detectedRole);
            setProfile({
              id: session.user.id,
              email: session.user.email || '',
              role: detectedRole || 'ADMIN'
            });
          }
        }
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        let detectedRole: UserRole | null = null;
        const metadataRole = session.user.user_metadata?.role as UserRole | undefined;
        
        if (metadataRole === 'CEO' || metadataRole === 'AGENT' || metadataRole === 'ADMIN') {
          detectedRole = metadataRole;
        } else {
          const { data: companyData } = await supabase.from('companies').select('id').eq('user_id', session.user.id).maybeSingle();
          if (companyData) {
            detectedRole = 'CEO';
          } else {
            const { data: agentData } = await supabase.from('agents').select('id').eq('user_id', session.user.id).maybeSingle();
            if (agentData) {
              detectedRole = 'AGENT';
            } else {
              detectedRole = 'ADMIN';
            }
          }
        }
        setRole(detectedRole);
        setProfile({
          id: session.user.id,
          email: session.user.email || '',
          role: detectedRole || 'ADMIN'
        });
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setRole(null);
        setProfile(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, userRole: UserRole) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role: userRole } }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, role, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};