import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { DEMO_AGENTS } from '../lib/demoData';
import { COMPLETED_DEMO_CONTRACTS } from '../lib/demoCompletedContracts';

type UserRole = 'ceo' | 'agent' | 'guest' | null;
interface AuthContextType { user: User | null; session: Session | null; role: UserRole; loading: boolean; signIn: (email: string, password: string) => Promise<void>; signOut: () => Promise<void> }
const AuthContext = createContext<AuthContextType | undefined>(undefined);
const DEMO_EMAILS = new Set(['hronline1226@gmail.com', 'hronline2612@gmail.com', 'hronline1226ceo@gmail.com']);
const demoAgentsBackup = DEMO_AGENTS.slice();
const demoContractsBackup = COMPLETED_DEMO_CONTRACTS.slice();
const syncDemoVisibility = (email?: string | null) => {
  const isDemo = !!email && DEMO_EMAILS.has(email.toLowerCase());
  DEMO_AGENTS.splice(0, DEMO_AGENTS.length, ...(isDemo ? demoAgentsBackup : []));
  COMPLETED_DEMO_CONTRACTS.splice(0, COMPLETED_DEMO_CONTRACTS.length, ...(isDemo ? demoContractsBackup : []));
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  const determineRole = async (u: User): Promise<UserRole> => {
    const meta = (u.user_metadata?.role as string | undefined)?.toLowerCase();
    const profileType = (u.user_metadata?.profile_type as string | undefined)?.toLowerCase();
    if (profileType === 'b2c_calculator') return 'guest';
    if (meta === 'guest') return 'guest';
    if (meta === 'agent' || meta === 'ceo') return meta;
    const { data: c } = await supabase.from('companies').select('id').eq('user_id', u.id).maybeSingle();
    if (c) return 'ceo';
    const { data: a } = await supabase.from('agents').select('id').eq('user_id', u.id).maybeSingle();
    if (a) return 'agent';
    return 'ceo';
  };

  const applyUser = async (u: User | null) => {
    setUser(u);
    syncDemoVisibility(u?.email);
    if (!u) {
      setRole(null);
      return;
    }
    const nextRole = await determineRole(u);
    setRole(nextRole);
  };

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (!alive) return;
      setSession(s);
      await applyUser(s?.user ?? null);
      if (alive) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!alive) return;
      setSession(s);
      setUser(s?.user ?? null);
      syncDemoVisibility(s?.user?.email);
      if (!s?.user) {
        setRole(null);
        setLoading(false);
        return;
      }
      const meta = (s.user.user_metadata?.role as string | undefined)?.toLowerCase();
      const profileType = (s.user.user_metadata?.profile_type as string | undefined)?.toLowerCase();
      if (profileType === 'b2c_calculator' || meta === 'guest') {
        setRole('guest');
        setLoading(false);
        return;
      }
      if (meta === 'agent' || meta === 'ceo') {
        setRole(meta);
        setLoading(false);
        return;
      }
      setLoading(false);
      void determineRole(s.user).then(nextRole => {
        if (alive) setRole(nextRole);
      });
    });

    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (e: any) {
      throw new Error(e.message || 'Неверный email или пароль');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    syncDemoVisibility(null);
    setUser(null);
    setSession(null);
    setRole(null);
  };

  return <AuthContext.Provider value={{ user, session, role, loading, signIn, signOut }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const c = useContext(AuthContext);
  if (!c) throw new Error('useAuth must be used within AuthProvider');
  return c;
};
