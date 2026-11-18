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

  // ── Fetch approved / suspended users from profiles ────────
  let profileQuery = supabase
    .from('profiles')
    .select('id, full_name, email, status, registered_at, last_active_at')
    .order('registered_at', { ascending: false });

  if (status && status !== 'pending') {
    profileQuery = profileQuery.eq('status', status);
  }

  const { data: profiles, error: profilesError } = await profileQuery;
  if (profilesError) return error('Failed to fetch users', 500);

  // ── Fetch pending requests from access_requests ───────────
  // These are users who registered but haven't been approved yet
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
      .order('requested_at', { ascending: false });

    pendingUsers = (requests ?? []).map(r => ({
      id:             r.id,
      full_name:      r.full_name,
      email:          r.email,
      status:         'pending',
      registered_at:  r.requested_at,
      last_active_at: null,
      total_sessions: 0,
      sessions_7d:    0,
    }));
  }

  // ── Enrich profile users with session counts ─────────────
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const enriched = await Promise.all((profiles ?? []).map(async (p) => {
    const [{ count: total }, { count: week }] = await Promise.all([
      supabase.from('user_sessions').select('*', { count: 'exact', head: true }).eq('user_id', p.id),
      supabase.from('user_sessions').select('*', { count: 'exact', head: true }).eq('user_id', p.id).gte('started_at', sevenDaysAgo),
    ]);
    return { ...p, total_sessions: total ?? 0, sessions_7d: week ?? 0 };
  }));

  // ── Merge: pending first, then approved/suspended ─────────
  const users = status === 'pending'
    ? pendingUsers
    : status
      ? enriched
      : [...pendingUsers, ...enriched];

  return json({ users, total: users.length });
});
