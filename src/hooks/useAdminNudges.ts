/**
 * useAdminNudges
 * ──────────────
 * Fetches admin-specific notifications from Supabase.
 * Only runs when the authenticated user is an admin.
 * Falls back silently when Supabase is unavailable.
 *
 * Currently checks:
 *   1. Pending onboarding requests (access_requests table)
 *   2. Users pending approval (profiles table, status = 'pending')
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import type { Nudge } from './useSmartNudges';

const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

export function useAdminNudges(): Nudge[] {
  const { isAdmin, session } = useAuth();
  const [nudges, setNudges]  = useState<Nudge[]>([]);

  const refresh = useCallback(async () => {
    if (!isAdmin || !session?.access_token || !isSupabaseConfigured) {
      setNudges([]);
      return;
    }

    try {
      const results: Nudge[] = [];

      // ── 1. Pending access requests ────────────────────────────
      const { count: pendingRequests } = await supabase
        .from('access_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (pendingRequests && pendingRequests > 0) {
        results.push({
          id:      'admin-pending-requests',
          message: `${pendingRequests} new onboarding request${pendingRequests > 1 ? 's' : ''} waiting for your review`,
          emoji:   '👥',
          color:   '#7c3aed',
          priority: 1,
          action:  { label: 'Review requests', path: '/admin/users' },
        });
      }

      // ── 2. Pending profile approvals ──────────────────────────
      const { count: pendingProfiles } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Only surface if different from access_requests count (can overlap)
      if (
        pendingProfiles &&
        pendingProfiles > 0 &&
        pendingProfiles !== pendingRequests
      ) {
        results.push({
          id:      'admin-pending-approvals',
          message: `${pendingProfiles} account${pendingProfiles > 1 ? 's' : ''} waiting for approval`,
          emoji:   '✅',
          color:   '#6366f1',
          priority: 1,
          action:  { label: 'Approve users', path: '/admin/users' },
        });
      }

      setNudges(results);
    } catch {
      // Supabase unavailable — fail silently, don't show stale data
      setNudges([]);
    }
  }, [isAdmin, session?.access_token]);

  useEffect(() => {
    refresh();

    const interval = setInterval(refresh, POLL_INTERVAL_MS);

    // Re-fetch when admin returns to the app
    const handleVisibility = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refresh]);

  return nudges;
}
