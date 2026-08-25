import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  getSession,
  onAuthStateChange,
  sendPasswordResetEmail,
  signInWithPassword,
  signOut as signOutRequest,
  signUpWithPassword,
} from '@/services/auth';
import { traducirErrorAuth } from '@/services/errors';

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ requiereConfirmacion: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = onAuthStateChange((_event, nuevaSesion) => {
      setSession(nuevaSesion);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      async signIn(email, password) {
        try {
          await signInWithPassword(email, password);
        } catch (error) {
          throw new Error(traducirErrorAuth(error));
        }
      },
      async signUp(email, password) {
        try {
          const data = await signUpWithPassword(email, password);
          return { requiereConfirmacion: !data.session };
        } catch (error) {
          throw new Error(traducirErrorAuth(error));
        }
      },
      async signOut() {
        try {
          await signOutRequest();
        } catch (error) {
          throw new Error(traducirErrorAuth(error));
        }
      },
      async resetPassword(email) {
        try {
          await sendPasswordResetEmail(email);
        } catch (error) {
          throw new Error(traducirErrorAuth(error));
        }
      },
    }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
