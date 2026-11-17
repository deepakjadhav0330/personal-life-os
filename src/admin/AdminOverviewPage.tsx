import { useState, useCallback, useEffect } from 'react';
import { Users, UserCheck, Clock, ShieldOff, Activity, TrendingUp, RefreshCw } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { GlassCard } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import { useInterval } from '../hooks/useInterval';
import { format, subDays, parseISO } from 'date-fns';
import { cn } from '../utils/cn';

type DateRange = '7d' | '30d' | '90d';

interface OverviewStats {
  user_counts: { status: string; count: number }[];
  dau: number;
  wau: number;
  mau: number;
  new_this_week: number;
  daily_active: { day: string; users: number }[];
  daily_registrations: { day: string; count: number }[];
}

const GlassTooltipContent = ({ active, payload, label }: { active?: boolean; payload?: { value: number; color?: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-elevated rounded-input px-3 py-2 text-xs border border-white/[0.1]">
      <p className="text-content-muted mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color ?? '#7c3aed' }}>{p.value}</p>
      ))}
    </div>
  );
};

export function AdminOverviewPage() {
  const { session } = useAuth();
  const [stats, setStats]       = useState<OverviewStats | null>(null);
  const [loading, setLoading]   = useState(true);
  const [range, setRange]       = useState<DateRange>('30d');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [error, setError]       = useState('');

  const fetchStats = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
      const start = format(subDays(new Date(), days), 'yyyy-MM-dd');
      const res = await fetch(
        `${supabaseUrl}/functions/v1/admin-overview-stats?start=${start}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json() as OverviewStats;
      setStats(data);
      setLastUpdated(new Date());
      setError('');
    } catch {
      setError('Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, range]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useInterval(fetchStats, 5 * 60 * 1000);

  const getCount = (status: string) =>
    stats?.user_counts.find(u => u.status === status)?.count ?? 0;

  const totalUsers = (stats?.user_counts ?? []).reduce((s, u) => s + u.count, 0);

  return (
    <div className="p-4 flex flex-col gap-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-content-primary">Overview</h2>
          <p className="text-xs text-content-muted">Last updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Range selector */}
          <div className="flex glass-1 rounded-input p-0.5 gap-0.5">
            {(['7d', '30d', '90d'] as DateRange[]).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-lg transition-all',
                  range === r ? 'accent-gradient text-white' : 'text-content-muted hover:text-content-primary',
                )}
              >{r}</button>
            ))}
          </div>
          <button onClick={fetchStats} className="p-1.5 glass-1 rounded-lg text-content-muted hover:text-content-primary transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && <GlassCard className="border-danger/30"><p className="text-sm text-danger">{error}</p></GlassCard>}

      {/* User count cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Users"  value={totalUsers}         icon={<Users size={16} className="text-accent" />} loading={loading} />
        <StatCard label="Approved"     value={getCount('approved')} icon={<UserCheck size={16} className="text-success" />} loading={loading} />
        <StatCard label="Pending"      value={getCount('pending')}  icon={<Clock size={16} className="text-warning" />} loading={loading} badge={getCount('pending') > 0} />
        <StatCard label="Suspended"    value={getCount('suspended')} icon={<ShieldOff size={16} className="text-danger" />} loading={loading} />
      </div>

      {/* Engagement cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="DAU (today)"  value={stats?.dau ?? 0} icon={<Activity size={16} className="text-blue-400" />}  loading={loading} sub="daily active" />
        <StatCard label="WAU (7d)"     value={stats?.wau ?? 0} icon={<Activity size={16} className="text-indigo-400" />} loading={loading} sub="weekly active" />
        <StatCard label="MAU (30d)"    value={stats?.mau ?? 0} icon={<TrendingUp size={16} className="text-purple-400" />} loading={loading} sub="monthly active" />
      </div>

      {/* Daily active users chart */}
      <GlassCard>
        <p className="text-xs font-semibold text-content-muted uppercase tracking-widest mb-4">
          Daily Active Users (last {range})
        </p>
        {!loading && stats?.daily_active && stats.daily_active.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={stats.daily_active}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
              <XAxis
                dataKey="day"
                tick={{ fill: '#888', fontSize: 10 }}
                tickFormatter={d => { try { return format(parseISO(d), 'd MMM'); } catch { return d as string; } }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fill: '#888', fontSize: 10 }} allowDecimals={false} />
              <Tooltip content={<GlassTooltipContent />} />
              <Line type="monotone" dataKey="users" stroke="#7c3aed" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-40 flex items-center justify-center text-sm text-content-muted">
            {loading ? 'Loading…' : 'No activity data for this period'}
          </div>
        )}
      </GlassCard>

      {/* Daily registrations chart */}
      <GlassCard>
        <p className="text-xs font-semibold text-content-muted uppercase tracking-widest mb-4">
          New Registrations
        </p>
        {!loading && stats?.daily_registrations && stats.daily_registrations.length > 0 ? (
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={stats.daily_registrations}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
              <XAxis
                dataKey="day"
                tick={{ fill: '#888', fontSize: 10 }}
                tickFormatter={d => { try { return format(parseISO(d), 'd MMM'); } catch { return d as string; } }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fill: '#888', fontSize: 10 }} allowDecimals={false} />
              <Tooltip content={<GlassTooltipContent />} />
              <Bar dataKey="count" fill="#7c3aed" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-28 flex items-center justify-center text-sm text-content-muted">
            {loading ? 'Loading…' : 'No registration data for this period'}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function StatCard({
  label, value, icon, loading, sub, badge,
}: {
  label: string; value: number; icon: React.ReactNode; loading: boolean; sub?: string; badge?: boolean;
}) {
  return (
    <GlassCard>
      <div className="flex items-start justify-between mb-2">
        {icon}
        {badge && value > 0 && (
          <span className="text-[10px] bg-warning/20 text-warning px-1.5 py-0.5 rounded-full font-medium">
            {value} new
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-content-primary">
        {loading ? <span className="opacity-30">—</span> : value}
      </p>
      <p className="text-xs text-content-muted mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-content-dim">{sub}</p>}
    </GlassCard>
  );
}
