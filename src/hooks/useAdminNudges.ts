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

      // ── 3. New feedback since last seen ──────────────────────
      // We store the last-acknowledged feedback total in localStorage.
      // Any increase means new submissions came in.
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (supabaseUrl && session?.access_token) {
          const res = await fetch(`${supabaseUrl}/functions/v1/admin-feedback?page=1`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (res.ok) {
            const data = await res.json() as { total: number };
            const currentTotal = data.total ?? 0;
            const FEEDBACK_KEY = 'lifeOS_admin_feedback_seen';
            const lastSeen = parseInt(localStorage.getItem(FEEDBACK_KEY) ?? '0');

            if (currentTotal > lastSeen) {
              const newCount = currentTotal - lastSeen;
              results.push({
                id:      `admin-new-feedback-${currentTotal}`,
                message: `${newCount} new feedback submission${newCount > 1 ? 's' : ''} from users`,
                emoji:   '💬',
                color:   '#8b5cf6',
                priority: 2,
                action:  { label: 'View feedback', path: '/admin/feedback' },
              });
            }
          }
        }
      } catch { /* feedback check is best-effort */ }

      // ── 4. New user registrations today ───────────────────────
      const todayISO = new Date().toISOString().slice(0, 10);
      const { count: newToday } = await supabase
        .from('access_requests')
        .select('*', { count: 'exact', head: true })
        .gte('requested_at', `${todayISO}T00:00:00`);

      if (newToday && newToday > 0) {
        results.push({
          id:      `admin-signups-today-${todayISO}`,
          message: `${newToday} new access request${newToday > 1 ? 's' : ''} submitted today`,
          emoji:   '🆕',
          color:   '#22c55e',
          priority: 2,
          action:  { label: 'Review requests', path: '/admin/users' },
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

/** Call this when the admin opens the feedback page to mark all as seen. */
export function markFeedbackSeen(total: number): void {
  try { localStorage.setItem('lifeOS_admin_feedback_seen', String(total)); } catch { /* silent */ }
}
