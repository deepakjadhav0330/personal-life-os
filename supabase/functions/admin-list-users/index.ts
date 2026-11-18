import { handleCors, json, error } from '../_shared/cors.ts';
import { getServiceClient, validateAdmin } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const supabase = getServiceClient();
  const admin = await validateAdmin(req, supabase);
  if (!admin) return error('Forbidden', 403);

  const url    = new URL(req.url);
  const status = url.searchParams.get('status');

  // ── Fetch profiles ────────────────────────────────────────
  let profileQuery = supabase
    .from('profiles')
    .select('id, full_name, email, status, registered_at, last_active_at')
    .order('registered_at', { ascending: false })
    .limit(500);

  if (status && status !== 'pending') {
    profileQuery = profileQuery.eq('status', status);
  }

  const { data: profiles, error: profilesError } = await profileQuery;
  if (profilesError) return error('Failed to fetch users', 500);

  // ── Fetch pending requests ────────────────────────────────
  let pendingUsers: {
    id: string; full_name: string; email: string; status: string;
    registered_at: string; last_active_at: null;
    total_sessions: number; sessions_7d: number;
  }[] = [];

  if (!status || status === 'pending') {
    const { data: requests } = await supabase
      .from('access_requests')
      .select('id, full_name, email, status, requested_at')
      .eq('status', 'pending')
      .order('requested_at', { ascending: false })
      .limit(500);

    pendingUsers = (requests ?? []).map(r => ({
      id: r.id, full_name: r.full_name, email: r.email,
      status: 'pending', registered_at: r.requested_at,
      last_active_at: null, total_sessions: 0, sessions_7d: 0,
    }));
  }

  // ── Session counts — 2 queries total instead of 2N ───────
  // Fetch ALL session rows for the fetched profile IDs in one query,
  // then aggregate in memory. No N+1.
  const profileIds = (profiles ?? []).map(p => p.id);

  let totalByUser = new Map<string, number>();
  let weekByUser  = new Map<string, number>();

  if (profileIds.length > 0) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: allSessions }, { data: weekSessions }] = await Promise.all([
      supabase.from('user_sessions').select('user_id').in('user_id', profileIds).limit(10000),
      supabase.from('user_sessions').select('user_id').in('user_id', profileIds).gte('started_at', sevenDaysAgo).limit(10000),
    ]);

    for (const s of allSessions  ?? []) totalByUser.set(s.user_id, (totalByUser.get(s.user_id) ?? 0) + 1);
    for (const s of weekSessions ?? []) weekByUser.set(s.user_id,  (weekByUser.get(s.user_id)  ?? 0) + 1);
  }

  const enriched = (profiles ?? []).map(p => ({
    ...p,
    total_sessions: totalByUser.get(p.id) ?? 0,
    sessions_7d:    weekByUser.get(p.id)  ?? 0,
  }));

  const users = status === 'pending'
    ? pendingUsers
    : status
      ? enriched
      : [...pendingUsers, ...enriched];

  return json({ users, total: users.length });
});
