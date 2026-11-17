import { handleCors, json, error } from '../_shared/cors.ts';
import { getServiceClient, validateAdmin } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const supabase = getServiceClient();
  const admin = await validateAdmin(req, supabase);
  if (!admin) return error('Forbidden', 403);

  const url = new URL(req.url);
  const status = url.searchParams.get('status');

  // Fetch all profiles with session stats
  let profileQuery = supabase
    .from('profiles')
    .select(`
      id, full_name, email, status, registered_at, last_active_at
    `)
    .order('registered_at', { ascending: false });

  if (status && ['pending', 'approved', 'suspended'].includes(status)) {
    profileQuery = profileQuery.eq('status', status);
  }

  const { data: profiles, error: profilesError } = await profileQuery;
  if (profilesError) return error('Failed to fetch users', 500);

  // For each user, get session counts
  const users = await Promise.all((profiles ?? []).map(async (p) => {
    const { count: totalSessions } = await supabase
      .from('user_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', p.id);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: sessions7d } = await supabase
      .from('user_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', p.id)
      .gte('started_at', sevenDaysAgo);

    return {
      ...p,
      total_sessions: totalSessions ?? 0,
      sessions_7d:    sessions7d ?? 0,
    };
  }));

  return json({ users, total: users.length });
});
