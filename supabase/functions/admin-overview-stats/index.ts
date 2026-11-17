import { handleCors, json, error } from '../_shared/cors.ts';
import { getServiceClient, validateAdmin } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const supabase = getServiceClient();
  const admin = await validateAdmin(req, supabase);
  if (!admin) return error('Forbidden', 403);

  const url   = new URL(req.url);
  const start = url.searchParams.get('start') ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo   = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo  = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // User counts by status
  const { data: profiles } = await supabase
    .from('profiles')
    .select('status');

  const user_counts = (['pending', 'approved', 'suspended'] as const).map(status => ({
    status,
    count: (profiles ?? []).filter(p => p.status === status).length,
  }));

  // DAU: unique users with module_opened today
  const { data: dauUsers } = await supabase
    .from('analytics_events')
    .select('user_id')
    .eq('event_name', 'module_opened')
    .gte('occurred_at', today + 'T00:00:00.000Z');
  const dau = new Set((dauUsers ?? []).map(e => e.user_id)).size;

  // WAU
  const { data: wauUsers } = await supabase
    .from('analytics_events')
    .select('user_id')
    .eq('event_name', 'module_opened')
    .gte('occurred_at', sevenDaysAgo);
  const wau = new Set((wauUsers ?? []).map(e => e.user_id)).size;

  // MAU
  const { data: mauUsers } = await supabase
    .from('analytics_events')
    .select('user_id')
    .eq('event_name', 'module_opened')
    .gte('occurred_at', thirtyDaysAgo);
  const mau = new Set((mauUsers ?? []).map(e => e.user_id)).size;

  // New this week
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count: new_this_week } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('registered_at', weekAgo);

  // Daily active users trend (from start)
  const { data: dailyActiveRaw } = await supabase
    .from('analytics_events')
    .select('user_id, occurred_at')
    .eq('event_name', 'module_opened')
    .gte('occurred_at', start + 'T00:00:00.000Z');

  const dailyMap = new Map<string, Set<string>>();
  for (const e of dailyActiveRaw ?? []) {
    const day = (e.occurred_at as string).slice(0, 10);
    if (!dailyMap.has(day)) dailyMap.set(day, new Set());
    dailyMap.get(day)!.add(e.user_id as string);
  }
  const daily_active = Array.from(dailyMap.entries())
    .map(([day, users]) => ({ day, users: users.size }))
    .sort((a, b) => a.day.localeCompare(b.day));

  // Daily registrations (from start)
  const { data: regRaw } = await supabase
    .from('profiles')
    .select('registered_at')
    .gte('registered_at', start + 'T00:00:00.000Z');

  const regMap = new Map<string, number>();
  for (const p of regRaw ?? []) {
    const day = (p.registered_at as string).slice(0, 10);
    regMap.set(day, (regMap.get(day) ?? 0) + 1);
  }
  const daily_registrations = Array.from(regMap.entries())
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => a.day.localeCompare(b.day));

  return json({ user_counts, dau, wau, mau, new_this_week: new_this_week ?? 0, daily_active, daily_registrations });
});
