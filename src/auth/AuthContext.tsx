import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// ─── Profile type ─────────────────────────────────────────────
export interface Profile {
  id: string;
  full_name: string;
  email: string;
  status: 'pending' | 'approved' | 'suspended';
  registered_at: string;
  approved_at: string | null;
  last_login_at: string | null;
  last_active_at: string | null;
  suspended_at: string | null;
  suspended_reason: string | null;
  has_seen_disclosure: boolean;
}

// ─── Context shape ─────────────────────────────────────────────
interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  isLoading: boolean;
  isSuspended: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Profile fetch with 6-second timeout — prevents infinite loading on slow networks
async function fetchProfileWithTimeout(userId: string): Promise<Profile | null> {
  const timeoutMs = 6000;
  try {
    const result = await Promise.race([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('profile-timeout')), timeoutMs),
      ),
    ]);
    if (!result || typeof result !== 'object' || !('data' in result)) return null;
    return (result.data as Profile) ?? null;
  } catch {
    return null;
  }
}

// ─── Provider ─────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession]     = useState<Session | null>(null);
  const [user, setUser]           = useState<User | null>(null);
  const [profile, setProfile]     = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Safety net: loading cannot be stuck for more than 10 seconds
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadDone   = useRef(false);

  function startLoadingTimeout() {
    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    loadingTimeoutRef.current = setTimeout(() => {
      console.warn('[AuthContext] Loading timeout — forcing isLoading = false');
      setIsLoading(false);
    }, 10_000);
  }

  function clearLoadingTimeout() {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  }

  const updateLastLogin = useCallback(async (userId: string): Promise<void> => {
    try {
      await supabase.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', userId);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Start safety timeout immediately
    startLoadingTimeout();

    // ── Subscribe to auth state changes ──────────────────────
    // This fires INITIAL_SESSION synchronously (before getSession resolves),
    // TOKEN_REFRESHED, SIGNED_IN, SIGNED_OUT, etc.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        if (!mounted) return;

        setSession(s);
        setUser(s?.user ?? null);

        if (s?.user) {
          if (event === 'SIGNED_IN') {
            // New sign-in: show spinner while profile loads to prevent flash
            setIsLoading(true);
            startLoadingTimeout();
          }

          const p = await fetchProfileWithTimeout(s.user.id);
          if (!mounted) return;
          setProfile(p);

          if (event === 'SIGNED_IN') {
            clearLoadingTimeout();
            setIsLoading(false);
            updateLastLogin(s.user.id).catch(() => {/* non-critical */});
          }
        } else {
          setProfile(null);
          if (!initialLoadDone.current) {
            // No session on initial load — we can resolve
            clearLoadingTimeout();
            setIsLoading(false);
            initialLoadDone.current = true;
          }
        }
      },
    );

    // ── Get initial session ───────────────────────────────────
    // This is the authoritative initial load. After it resolves,
    // we always set isLoading = false regardless of what onAuthStateChange did.
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      if (initialLoadDone.current) return; // already handled by onAuthStateChange

      setSession(s);
      setUser(s?.user ?? null);

      if (s?.user) {
        fetchProfileWithTimeout(s.user.id).then(p => {
          if (!mounted) return;
          setProfile(p);
          clearLoadingTimeout();
          setIsLoading(false);
          initialLoadDone.current = true;
        });
      } else {
        clearLoadingTimeout();
        setIsLoading(false);
        initialLoadDone.current = true;
      }
    }).catch(() => {
      if (!mounted) return;
      clearLoadingTimeout();
      setIsLoading(false);
      initialLoadDone.current = true;
    });

    return () => {
      mounted = false;
      clearLoadingTimeout();
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshProfile = useCallback(async (): Promise<void> => {
    if (user?.id) {
      const p = await fetchProfileWithTimeout(user.id);
      setProfile(p);
    }
  }, [user?.id]);

  const signOut = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const isAdmin     = user?.app_metadata?.['role'] === 'admin';
  const isSuspended = profile?.status === 'suspended';

  return (
    <AuthContext.Provider
      value={{ session, user, profile, isAdmin, isLoading, isSuspended, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
