import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

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

type ProfileError = 'timeout' | 'not_found' | null;

interface AuthContextValue {
  session:      Session | null;
  user:         User    | null;
  profile:      Profile | null;
  isAdmin:      boolean;
  isLoading:    boolean;
  isSuspended:  boolean;
  profileError: ProfileError;
  signOut:        () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Fetch profile with 6s timeout. Returns the profile and the error type. */
async function fetchProfileWithTimeout(userId: string): Promise<{ profile: Profile | null; error: ProfileError }> {
  const TIMEOUT_MS = 6000;
  try {
    const fetchPromise   = supabase.from('profiles').select('*').eq('id', userId).single();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS),
    );

    const result = await Promise.race([fetchPromise, timeoutPromise]);
    return {
      profile: (result.data as Profile) ?? null,
      error:   result.data ? null : 'not_found',
    };
  } catch (e) {
    const isTimeout = e instanceof Error && e.message === 'timeout';
    return { profile: null, error: isTimeout ? 'timeout' : 'not_found' };
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session,      setSession]      = useState<Session | null>(null);
  const [user,         setUser]         = useState<User    | null>(null);
  const [profile,      setProfile]      = useState<Profile | null>(null);
  const [isLoading,    setIsLoading]    = useState(true);
  const [profileError, setProfileError] = useState<ProfileError>(null);

  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadDone   = useRef(false);
  // Ref tracks current profile so onAuthStateChange closure can read it without stale state
  const profileRef        = useRef<Profile | null>(null);

  function startLoadingTimeout() {
    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    loadingTimeoutRef.current = setTimeout(() => {
      console.warn('[AuthContext] Safety net: forcing isLoading = false after 10s');
      setIsLoading(false);
    }, 10_000);
  }

  function clearLoadingTimeout() {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  }

  // Keep profileRef current so the auth state change handler can read it
  useEffect(() => { profileRef.current = profile; }, [profile]);

  const updateLastLogin = useCallback(async (userId: string): Promise<void> => {
    try {
      await supabase.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', userId);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    let mounted = true;
    startLoadingTimeout();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        if (!mounted) return;

        setSession(s);
        setUser(s?.user ?? null);

        if (s?.user) {
          if (event === 'SIGNED_IN') {
            setIsLoading(true);
            setProfileError(null);
            startLoadingTimeout();
          }

          // TOKEN_REFRESHED fires every hour and when iOS brings the app back from
          // background. The user's profile hasn't changed — skip the network fetch
          // to avoid a timeout error on a briefly unavailable network.
          if ((event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && profileRef.current) {
            return;
          }

          const { profile: p, error: pErr } = await fetchProfileWithTimeout(s.user.id);
          if (!mounted) return;

          setProfile(p);
          setProfileError(p ? null : pErr);

          if (event === 'SIGNED_IN') {
            clearLoadingTimeout();
            setIsLoading(false);
            updateLastLogin(s.user.id).catch(() => {/* non-critical */});
          }
        } else {
          setProfile(null);
          setProfileError(null);
          if (!initialLoadDone.current) {
            clearLoadingTimeout();
            setIsLoading(false);
            initialLoadDone.current = true;
          }
        }
      },
    );

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted || initialLoadDone.current) return;

      setSession(s);
      setUser(s?.user ?? null);

      if (s?.user) {
        fetchProfileWithTimeout(s.user.id).then(({ profile: p, error: pErr }) => {
          if (!mounted) return;
          setProfile(p);
          setProfileError(p ? null : pErr);
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
      setProfileError('timeout');
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
    if (!user?.id) return;
    setProfileError(null);
    const { profile: p, error: pErr } = await fetchProfileWithTimeout(user.id);
    setProfile(p);
    setProfileError(p ? null : pErr);
  }, [user?.id]);

  const signOut = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut();
    setProfile(null);
    setProfileError(null);
  }, []);

  const isAdmin     = user?.app_metadata?.['role'] === 'admin';
  const isSuspended = profile?.status === 'suspended';

  return (
    <AuthContext.Provider
      value={{ session, user, profile, isAdmin, isLoading, isSuspended, profileError, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
