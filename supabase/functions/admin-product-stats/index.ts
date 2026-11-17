import { handleCors, json, error } from '../_shared/cors.ts';
import { getServiceClient, validateAdmin } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const supabase = getServiceClient();
  const admin = await validateAdmin(req, supabase);
  if (!admin) return error('Forbidden', 403);

  // Total approved users (denominator for percentages)
  const { count: totalApproved } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved');

  const approvedCount = totalApproved ?? 1;

  // Feature adoption: unique users per event type
  const { data: allEvents } = await supabase
    .from('analytics_events')
    .select('event_name, user_id');

  const adoptionMap = new Map<string, { users: Set<string>; total: number }>();
  for (const e of allEvents ?? []) {
    if (!adoptionMap.has(e.event_name)) {
      adoptionMap.set(e.event_name, { users: new Set(), total: 0 });
    }
    const entry = adoptionMap.get(e.event_name)!;
    entry.users.add(e.user_id);
    entry.total++;
  }
  const feature_adoption = Array.from(adoptionMap.entries()).map(([event_name, v]) => ({
    event_name,
    adopters:     v.users.size,
    total_events: v.total,
    pct:          Math.round((v.users.size / approvedCount) * 100),
  }));

  // Module popularity
  const { data: moduleEvts } = await supabase
    .from('analytics_events')
    .select('user_id, properties')
    .eq('event_name', 'module_opened');

  const modMap = new Map<string, { users: Set<string>; total: number }>();
  for (const e of moduleEvts ?? []) {
    const name = (e.properties as Record<string, string>)?.module_name;
    if (!name) continue;
    if (!modMap.has(name)) modMap.set(name, { users: new Set(), total: 0 });
    modMap.get(name)!.users.add(e.user_id);
    modMap.get(name)!.total++;
  }
  const module_popularity = Array.from(modMap.entries())
    .map(([module_name, v]) => ({ module_name, users: v.users.size, total: v.total }))
    .sort((a, b) => b.users - a.users);

  // Platform breakdown from sessions
  const { data: sessionPlatforms } = await supabase
    .from('user_sessions')
    .select('platform');

  const platformMap = new Map<string, number>();
  for (const s of sessionPlatforms ?? []) {
    const p = s.platform ?? 'web';
    platformMap.set(p, (platformMap.get(p) ?? 0) + 1);
  }
  const totalPlatform = Array.from(platformMap.values()).reduce((a, b) => a + b, 0) || 1;
  const platform_breakdown = Array.from(platformMap.entries()).map(([platform, count]) => ({
    platform,
    count,
    pct: Math.round((count / totalPlatform) * 100),
  }));

  // Retention: Day-1, Day-7, Day-30
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, registered_at')
    .eq('status', 'approved');

  let retDay1 = 0, retDay7 = 0, retDay30 = 0;
  const profilesWithHistory = (allProfiles ?? []).filter(p => {
    const reg = new Date(p.registered_at);
    const now = Date.now();
    return (now - reg.getTime()) > 24 * 60 * 60 * 1000; // older than 1 day
  });

  for (const p of profilesWithHistory) {
    const regDate = new Date(p.registered_at);
    const { data: activity } = await supabase
      .from('analytics_events')
      .select('occurred_at')
      .eq('user_id', p.id)
      .eq('event_name', 'module_opened')
      .order('occurred_at');

    if (!activity?.length) continue;
    const activityDates = activity.map(a => new Date(a.occurred_at));
    const hasDay1 = activityDates.some(d => {
      const diff = (d.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0.5 && diff <= 2;
    });
    const hasDay7 = activityDates.some(d => {
      const diff = (d.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24);
      return diff > 1 && diff <= 8;
    });
    const hasDay30 = activityDates.some(d => {
      const diff = (d.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24);
      return diff > 7 && diff <= 31;
    });
    if (hasDay1)  retDay1++;
    if (hasDay7)  retDay7++;
    if (hasDay30) retDay30++;
  }

  const retBase = profilesWithHistory.length || 1;
  const retention = {
    day1:  Math.round((retDay1  / retBase) * 100),
    day7:  Math.round((retDay7  / retBase) * 100),
    day30: Math.round((retDay30 / retBase) * 100),
  };

  // Weekly cohorts (last 8 weeks)
  const { data: cohortProfiles } = await supabase
    .from('profiles')
    .select('id, registered_at')
    .eq('status', 'approved')
    .gte('registered_at', new Date(Date.now() - 56 * 24 * 60 * 60 * 1000).toISOString());

  const cohortMap = new Map<string, string[]>();
  for (const p of cohortProfiles ?? []) {
    const weekStart = getWeekStart(new Date(p.registered_at));
    if (!cohortMap.has(weekStart)) cohortMap.set(weekStart, []);
    cohortMap.get(weekStart)!.push(p.id);
  }

  const weekly_cohorts = await Promise.all(
    Array.from(cohortMap.entries()).slice(-8).map(async ([week, userIds]) => {
      const weekData: number[] = [];
      const weekStartDate = new Date(week);
      for (let w = 0; w < 8; w++) {
        const wStart = new Date(weekStartDate.getTime() + w * 7 * 24 * 60 * 60 * 1000).toISOString();
        const wEnd   = new Date(weekStartDate.getTime() + (w + 1) * 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: activeInWeek } = await supabase
          .from('analytics_events')
          .select('user_id')
          .in('user_id', userIds)
          .eq('event_name', 'module_opened')
          .gte('occurred_at', wStart)
          .lt('occurred_at', wEnd);
        const unique = new Set((activeInWeek ?? []).map(e => e.user_id)).size;
        weekData.push(userIds.length > 0 ? Math.round((unique / userIds.length) * 100) : 0);
      }
      return { week: week.slice(0, 10), cohort_size: userIds.length, week_data: weekData };
    }),
  );

  // Average stats per user
  const { data: allSessions } = await supabase
    .from('user_sessions')
    .select('user_id, duration_seconds, started_at');

  const userSessionMap = new Map<string, { count: number; durations: number[]; dates: Set<string> }>();
  for (const s of allSessions ?? []) {
    if (!userSessionMap.has(s.user_id)) {
      userSessionMap.set(s.user_id, { count: 0, durations: [], dates: new Set() });
    }
    const u = userSessionMap.get(s.user_id)!;
    u.count++;
    if (s.duration_seconds != null) u.durations.push(s.duration_seconds);
    u.dates.add((s.started_at as string).slice(0, 10));
  }

  const totalUniqueUsers = userSessionMap.size || 1;
  const totalSessionCount = Array.from(userSessionMap.values()).reduce((s, u) => s + u.count, 0);
  const totalActiveDays   = Array.from(userSessionMap.values()).reduce((s, u) => s + u.dates.size, 0);
  const allDurations = Array.from(userSessionMap.values()).flatMap(u => u.durations);
  const avg_duration = allDurations.length > 0
    ? Math.round(allDurations.reduce((a, b) => a + b, 0) / allDurations.length)
    : 0;

  return json({
    feature_adoption,
    module_popularity,
    platform_breakdown,
    retention,
    weekly_cohorts: weekly_cohorts.sort((a, b) => a.week.localeCompare(b.week)),
    avg_sessions_per_user:  parseFloat((totalSessionCount / totalUniqueUsers).toFixed(1)),
    avg_active_days:        parseFloat((totalActiveDays  / totalUniqueUsers).toFixed(1)),
    avg_session_duration:   avg_duration,
    total_approved_users:   approvedCount,
  });
});

function getWeekStart(d: Date): string {
  const day = d.getDay(); // 0 = Sunday
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().slice(0, 10);
}
