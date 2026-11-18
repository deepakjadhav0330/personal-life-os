import { handleCors, json, error } from '../_shared/cors.ts';
import { getServiceClient, validateAdmin } from '../_shared/supabase.ts';

const ROW_LIMIT = 10_000; // prevent Supabase max_rows truncation

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const supabase = getServiceClient();
  const admin = await validateAdmin(req, supabase);
  if (!admin) return error('Forbidden', 403);

  const { count: totalApproved } = await supabase
    .from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'approved');
  const approvedCount = totalApproved ?? 1;

  // ── Feature adoption — bounded ─────────────────────────────
  const { data: allEvents } = await supabase
    .from('analytics_events').select('event_name, user_id').limit(ROW_LIMIT);

  const adoptionMap = new Map<string, { users: Set<string>; total: number }>();
  for (const e of allEvents ?? []) {
    if (!adoptionMap.has(e.event_name)) adoptionMap.set(e.event_name, { users: new Set(), total: 0 });
    const ent = adoptionMap.get(e.event_name)!;
    ent.users.add(e.user_id); ent.total++;
  }
  const feature_adoption = Array.from(adoptionMap.entries()).map(([event_name, v]) => ({
    event_name, adopters: v.users.size, total_events: v.total,
    pct: Math.round((v.users.size / approvedCount) * 100),
  }));

  // ── Module popularity — bounded ────────────────────────────
  const { data: moduleEvts } = await supabase
    .from('analytics_events').select('user_id, properties')
    .eq('event_name', 'module_opened').limit(ROW_LIMIT);

  const modMap = new Map<string, { users: Set<string>; total: number }>();
  for (const e of moduleEvts ?? []) {
    const name = (e.properties as Record<string, string>)?.module_name;
    if (!name) continue;
    if (!modMap.has(name)) modMap.set(name, { users: new Set(), total: 0 });
    modMap.get(name)!.users.add(e.user_id); modMap.get(name)!.total++;
  }
  const module_popularity = Array.from(modMap.entries())
    .map(([module_name, v]) => ({ module_name, users: v.users.size, total: v.total }))
    .sort((a, b) => b.users - a.users);

  // ── Platform breakdown — bounded ───────────────────────────
  const { data: sessionPlatforms } = await supabase
    .from('user_sessions').select('platform').limit(ROW_LIMIT);

  const platformMap = new Map<string, number>();
  for (const s of sessionPlatforms ?? []) {
    const p = s.platform ?? 'web';
    platformMap.set(p, (platformMap.get(p) ?? 0) + 1);
  }
  const totalPlatform = Array.from(platformMap.values()).reduce((a, b) => a + b, 0) || 1;
  const platform_breakdown = Array.from(platformMap.entries()).map(([platform, count]) => ({
    platform, count, pct: Math.round((count / totalPlatform) * 100),
  }));

  // ── Retention — fixed immature cohort exclusion + no N+1 ──
  const now = Date.now();
  const { data: allProfiles } = await supabase
    .from('profiles').select('id, registered_at').eq('status', 'approved').limit(500);

  // Separate denominators per retention window (immature cohort fix)
  const usersFor = (days: number) => (allProfiles ?? []).filter(p =>
    (now - new Date(p.registered_at).getTime()) > days * 24 * 60 * 60 * 1000
  );
  const d1Profiles  = usersFor(1);
  const d7Profiles  = usersFor(7);
  const d30Profiles = usersFor(30);

  // One query for all retention activity (no N+1)
  const allRetentionIds = [...new Set([
    ...d1Profiles.map(p => p.id),
    ...d7Profiles.map(p => p.id),
    ...d30Profiles.map(p => p.id),
  ])];

  const activityByUser = new Map<string, Date[]>();
  if (allRetentionIds.length > 0) {
    const { data: activity } = await supabase
      .from('analytics_events').select('user_id, occurred_at')
      .eq('event_name', 'module_opened')
      .in('user_id', allRetentionIds).limit(ROW_LIMIT);

    for (const a of activity ?? []) {
      if (!activityByUser.has(a.user_id)) activityByUser.set(a.user_id, []);
      activityByUser.get(a.user_id)!.push(new Date(a.occurred_at));
    }
  }

  function countReturned(profiles: typeof allProfiles, minDays: number, maxDays: number): number {
    if (!profiles || profiles.length === 0) return 0;
    return profiles.filter(p => {
      const reg   = new Date(p.registered_at);
      const dates = activityByUser.get(p.id) ?? [];
      return dates.some(d => {
        const diff = (d.getTime() - reg.getTime()) / (1000 * 60 * 60 * 24);
        return diff > minDays && diff <= maxDays;
      });
    }).length;
  }

  const retention = {
    day1:  d1Profiles.length  > 0 ? Math.round((countReturned(d1Profiles,  0, 2)  / d1Profiles.length)  * 100) : null,
    day7:  d7Profiles.length  > 0 ? Math.round((countReturned(d7Profiles,  1, 8)  / d7Profiles.length)  * 100) : null,
    day30: d30Profiles.length > 0 ? Math.round((countReturned(d30Profiles, 7, 31) / d30Profiles.length) * 100) : null,
  };

  // ── Weekly cohorts — 1 query instead of 64 ─────────────────
  const { data: cohortProfiles } = await supabase
    .from('profiles').select('id, registered_at').eq('status', 'approved')
    .gte('registered_at', new Date(now - 56 * 24 * 60 * 60 * 1000).toISOString()).limit(500);

  const cohortMap = new Map<string, string[]>();
  for (const p of cohortProfiles ?? []) {
    const ws = getWeekStart(new Date(p.registered_at));
    if (!cohortMap.has(ws)) cohortMap.set(ws, []);
    cohortMap.get(ws)!.push(p.id);
  }

  const allCohortIds = Array.from(cohortMap.values()).flat();
  const cohortActivityByUser = new Map<string, string[]>();

  if (allCohortIds.length > 0) {
    const { data: cohortActivity } = await supabase
      .from('analytics_events').select('user_id, occurred_at')
      .eq('event_name', 'module_opened')
      .in('user_id', allCohortIds)
      .gte('occurred_at', new Date(now - 56 * 24 * 60 * 60 * 1000).toISOString())
      .limit(ROW_LIMIT);

    for (const a of cohortActivity ?? []) {
      if (!cohortActivityByUser.has(a.user_id)) cohortActivityByUser.set(a.user_id, []);
      cohortActivityByUser.get(a.user_id)!.push(a.occurred_at);
    }
  }

  const weekly_cohorts = Array.from(cohortMap.entries()).slice(-8).map(([week, userIds]) => {
    const wsDate = new Date(week);
    const weekData = Array.from({ length: 8 }, (_, w) => {
      const wStart = wsDate.getTime() + w       * 7 * 24 * 60 * 60 * 1000;
      const wEnd   = wsDate.getTime() + (w + 1) * 7 * 24 * 60 * 60 * 1000;
      const active = new Set(userIds.filter(uid => {
        const dates = cohortActivityByUser.get(uid) ?? [];
        return dates.some(d => { const t = new Date(d).getTime(); return t >= wStart && t < wEnd; });
      })).size;
      return userIds.length > 0 ? Math.round((active / userIds.length) * 100) : 0;
    });
    return { week: week.slice(0, 10), cohort_size: userIds.length, week_data: weekData };
  });

  // ── Average stats — bounded ────────────────────────────────
  const { data: allSessions } = await supabase
    .from('user_sessions').select('user_id, duration_seconds, started_at').limit(ROW_LIMIT);

  const userSessionMap = new Map<string, { count: number; durations: number[]; dates: Set<string> }>();
  for (const s of allSessions ?? []) {
    if (!userSessionMap.has(s.user_id)) userSessionMap.set(s.user_id, { count: 0, durations: [], dates: new Set() });
    const u = userSessionMap.get(s.user_id)!;
    u.count++;
    if (s.duration_seconds != null) u.durations.push(s.duration_seconds);
    u.dates.add((s.started_at as string).slice(0, 10));
  }

  const totalUniqueUsers  = userSessionMap.size || 1;
  const totalSessionCount = Array.from(userSessionMap.values()).reduce((s, u) => s + u.count, 0);
  const totalActiveDays   = Array.from(userSessionMap.values()).reduce((s, u) => s + u.dates.size, 0);
  const allDurations      = Array.from(userSessionMap.values()).flatMap(u => u.durations);
  const avg_duration      = allDurations.length > 0
    ? Math.round(allDurations.reduce((a, b) => a + b, 0) / allDurations.length) : 0;

  return json({
    feature_adoption, module_popularity, platform_breakdown, retention,
    weekly_cohorts: weekly_cohorts.sort((a, b) => a.week.localeCompare(b.week)),
    avg_sessions_per_user:  parseFloat((totalSessionCount / totalUniqueUsers).toFixed(1)),
    avg_active_days:        parseFloat((totalActiveDays  / totalUniqueUsers).toFixed(1)),
    avg_session_duration:   avg_duration,
    total_approved_users:   approvedCount,
  });
});

function getWeekStart(d: Date): string {
  const day  = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon  = new Date(d.setDate(diff));
  return mon.toISOString().slice(0, 10);
}
