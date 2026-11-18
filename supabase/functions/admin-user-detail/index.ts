import { handleCors, json, error } from '../_shared/cors.ts';
import { getServiceClient, validateAdmin } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const supabase = getServiceClient();
  const admin = await validateAdmin(req, supabase);
  if (!admin) return error('Forbidden', 403);

  const url = new URL(req.url);
  const userId = url.searchParams.get('userId');
  if (!userId) return error('userId query parameter is required', 400);

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  // For pending users, profile doesn't exist yet — look up access_request instead
  if (!profile) {
    const { data: accessReq } = await supabase
      .from('access_requests')
      .select('id, full_name, email, status, requested_at')
      .eq('id', userId)
      .maybeSingle();

    if (!accessReq || accessReq.status !== 'pending') {
      return error('User not found', 404);
    }

    // Return a minimal pending-user object so the detail page renders
    return json({
      id:             accessReq.id,
      full_name:      accessReq.full_name,
      email:          accessReq.email,
      status:         'pending',
      registered_at:  accessReq.requested_at,
      approved_at:    null,
      last_login_at:  null,
      last_active_at: null,
      suspended_at:   null,
      suspended_reason: null,
      has_seen_disclosure: false,
      total_sessions: 0,
      sessions_7d:    0,
      sessions_30d:   0,
      avg_duration_seconds: 0,
      active_days_7d:  0,
      active_days_30d: 0,
      total_events:    0,
      event_summary:   [],
      module_usage:    [],
      daily_activity:  [],
      sessions:        [],
    });
  }

  const thirtyDaysAgo  = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo   = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000).toISOString();
  const ninetyDaysAgo  = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  // Session counts
  const [
    { count: total_sessions },
    { count: sessions_7d },
    { count: sessions_30d },
  ] = await Promise.all([
    supabase.from('user_sessions').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('user_sessions').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('started_at', sevenDaysAgo),
    supabase.from('user_sessions').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('started_at', thirtyDaysAgo),
  ]);

  // Recent sessions
  const { data: sessions } = await supabase
    .from('user_sessions')
    .select('id, started_at, ended_at, duration_seconds, platform, is_estimated_end')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(20);

  // Avg session duration
  const sessionsWithDuration = (sessions ?? []).filter(s => s.duration_seconds != null);
  const avg_duration_seconds = sessionsWithDuration.length > 0
    ? Math.round(sessionsWithDuration.reduce((s, r) => s + r.duration_seconds!, 0) / sessionsWithDuration.length)
    : 0;

  // Active days
  const [activeDays7, activeDays30] = await Promise.all([
    supabase.rpc('count_active_days', { p_user_id: userId, p_since: sevenDaysAgo }),
    supabase.rpc('count_active_days', { p_user_id: userId, p_since: thirtyDaysAgo }),
  ]);

  // Event summary
  const { data: rawEvents } = await supabase
    .from('analytics_events')
    .select('event_name, occurred_at')
    .eq('user_id', userId)
    .order('occurred_at', { ascending: true });

  const { count: total_events } = await supabase
    .from('analytics_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Aggregate by event name
  const eventMap = new Map<string, { count: number; first_used: string }>();
  for (const e of rawEvents ?? []) {
    const existing = eventMap.get(e.event_name);
    if (!existing) {
      eventMap.set(e.event_name, { count: 1, first_used: e.occurred_at });
    } else {
      existing.count++;
    }
  }
  const event_summary = Array.from(eventMap.entries()).map(([event_name, v]) => ({
    event_name,
    count: v.count,
    first_used: v.first_used,
  }));

  // Module usage
  const { data: moduleEvents } = await supabase
    .from('analytics_events')
    .select('properties')
    .eq('user_id', userId)
    .eq('event_name', 'module_opened');

  const moduleMap = new Map<string, number>();
  for (const e of moduleEvents ?? []) {
    const name = (e.properties as Record<string, string>)?.module_name;
    if (name) moduleMap.set(name, (moduleMap.get(name) ?? 0) + 1);
  }
  const module_usage = Array.from(moduleMap.entries())
    .map(([module_name, count]) => ({ module_name, count }))
    .sort((a, b) => b.count - a.count);

  // Daily activity for last 90 days (heatmap data)
  const { data: dailyRaw } = await supabase
    .from('analytics_events')
    .select('occurred_at')
    .eq('user_id', userId)
    .gte('occurred_at', ninetyDaysAgo)
    .order('occurred_at');

  const dailyMap = new Map<string, number>();
  for (const e of dailyRaw ?? []) {
    const day = e.occurred_at.slice(0, 10);
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1);
  }
  const daily_activity = Array.from(dailyMap.entries()).map(([day, events]) => ({ day, events }));

  return json({
    ...profile,
    total_sessions:        total_sessions ?? 0,
    sessions_7d:           sessions_7d ?? 0,
    sessions_30d:          sessions_30d ?? 0,
    avg_duration_seconds,
    active_days_7d:        activeDays7.data ?? 0,
    active_days_30d:       activeDays30.data ?? 0,
    total_events:          total_events ?? 0,
    event_summary,
    module_usage,
    daily_activity,
    sessions:              sessions ?? [],
  });
});
