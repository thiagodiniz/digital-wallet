import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface AuthState {
  session: Session | null;
  loading: boolean;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  getAccessToken(): Promise<string | null>;
}

const AuthContext = createContext<AuthState | null>(null);

/** Exposed so tests can inject an auth state without a Supabase client. */
export const AuthContextForTests = AuthContext;

export function AuthProvider({ client, children }: { client: SupabaseClient; children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: subscription } = client.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => subscription.subscription.unsubscribe();
  }, [client]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
    },
    [client],
  );

  const signOut = useCallback(async () => {
    await client.auth.signOut();
  }, [client]);

  const getAccessToken = useCallback(async () => {
    const { data } = await client.auth.getSession();
    return data.session?.access_token ?? null;
  }, [client]);

  const value = useMemo<AuthState>(
    () => ({ session, loading, signIn, signOut, getAccessToken }),
    [session, loading, signIn, signOut, getAccessToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth must be used within AuthProvider');
  return auth;
}
