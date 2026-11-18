import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle2, LogIn, Activity, BarChart3 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { GlassCard, Button, EmptyState, Badge } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import { UserActionMenu } from './components/UserActionMenu';
import { EVENT_LABELS, ALL_EVENTS, type EventName } from '../analytics/events';
import { formatDistanceToNow, format, parseISO } from 'date-fns';
import { cn } from '../utils/cn';

type UserStatus = 'pending' | 'approved' | 'suspended';

interface UserDetail {
  id: string;
  full_name: string;
  email: string;
  status: UserStatus;
  registered_at: string;
  approved_at: string | null;
  last_login_at: string | null;
  last_active_at: string | null;
  suspended_at: string | null;
  suspended_reason: string | null;
  total_sessions: number;
  sessions_7d: number;
  sessions_30d: number;
  avg_duration_seconds: number;
  active_days_7d: number;
  active_days_30d: number;
  total_events: number;
  event_summary: { event_name: EventName; count: number; first_used: string }[];
  module_usage: { module_name: string; count: number }[];
  daily_activity: { day: string; events: number }[];
  sessions: {
    id: string;
    started_at: string;
    ended_at: string | null;
    duration_seconds: number | null;
    platform: string | null;
    is_estimated_end: boolean;
  }[];
}

const STATUS_COLORS: Record<UserStatus, string> = {
  pending:   'bg-warning/20 text-warning',
  approved:  'bg-success/20 text-success',
  suspended: 'bg-danger/20  text-danger',
};

export function AdminUserDetailPage() {
  const { userId }  = useParams<{ userId: string }>();
  const navigate    = useNavigate();
  const { session } = useAuth();
  const [user, setUser]       = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const fetchUser = useCallback(async () => {
    if (!session?.access_token || !userId) return;
    setLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(
        `${supabaseUrl}/functions/v1/admin-user-detail?userId=${userId}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json() as UserDetail;
      setUser(data);
      setError('');
    } catch {
      setError('Failed to load user details');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, userId]);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  if (loading) return (
    <div className="p-4 flex flex-col gap-4">
      <div className="h-6 w-32 bg-white/[0.07] rounded animate-pulse" />
      <div className="h-32 bg-white/[0.05] rounded-card animate-pulse" />
    </div>
  );

  if (error || !user) return (
    <div className="p-4">
      <Button variant="ghost" leftIcon={<ArrowLeft size={14} />} onClick={() => navigate('/admin/users')}>
        Back to Users
      </Button>
      <GlassCard className="mt-4 border-danger/30">
        <p className="text-sm text-danger">{error || 'User not found'}</p>
      </GlassCard>
    </div>
  );

  const firedEvents = new Set(user.event_summary.map(e => e.event_name));

  return (
    <div className="p-4 flex flex-col gap-4 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <button
        onClick={() => navigate('/admin/users')}
        className="flex items-center gap-1.5 text-content-muted hover:text-content-primary transition-colors text-sm w-fit"
      >
        <ArrowLeft size={14} />
        Users / {user.full_name}
      </button>

      {/* Identity card */}
      <GlassCard>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl accent-gradient flex items-center justify-center shrink-0">
            <span className="text-xl font-bold text-white">{user.full_name.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-content-primary">{user.full_name}</h2>
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[user.status])}>
                {user.status}
              </span>
            </div>
            <p className="text-sm text-content-muted">{user.email}</p>
          </div>
        </div>

        {/* Action buttons in their own row — prevents overlap with username */}
        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <UserActionMenu
            userId={user.id}
            email={user.email}
            fullName={user.full_name}
            currentStatus={user.status}
            onActionComplete={fetchUser}
          />
        </div>

        {/* Timeline */}
        <div className="mt-4 flex flex-col gap-2">
          <TimelineItem icon={<Clock size={12} />}         label="Registered"  value={user.registered_at} />
          {user.approved_at    && <TimelineItem icon={<CheckCircle2 size={12} className="text-success" />} label="Approved"  value={user.approved_at} />}
          {user.last_login_at  && <TimelineItem icon={<LogIn size={12} />}     label="Last login"  value={user.last_login_at} />}
          {user.last_active_at && <TimelineItem icon={<Activity size={12} />}  label="Last active" value={user.last_active_at} />}
          {user.suspended_at   && <TimelineItem icon={<Badge>!</Badge>}         label="Suspended"   value={user.suspended_at} extra={user.suspended_reason ?? undefined} />}
        </div>
      </GlassCard>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SmallStat label="Total Sessions"  value={user.total_sessions} />
        <SmallStat label="Sessions (7d)"   value={user.sessions_7d} />
        <SmallStat label="Sessions (30d)"  value={user.sessions_30d} />
        <SmallStat label="Avg Duration"    value={formatDuration(user.avg_duration_seconds)} isText />
        <SmallStat label="Active Days (7d)"  value={user.active_days_7d} />
        <SmallStat label="Active Days (30d)" value={user.active_days_30d} />
        <SmallStat label="Total Events"    value={user.total_events} />
      </div>

      {/* Activity heatmap */}
      {user.daily_activity.length > 0 && (
        <GlassCard>
          <p className="text-xs font-semibold text-content-muted uppercase tracking-widest mb-3">
            Activity (last 90 days)
          </p>
          <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}>
            {user.daily_activity.slice(-91).map((d, i) => (
              <div
                key={i}
                className={cn(
                  'w-full aspect-square rounded-sm transition-colors',
                  d.events === 0 ? 'bg-white/[0.04]' :
                  d.events < 3  ? 'bg-accent/30' :
                  d.events < 8  ? 'bg-accent/60' : 'bg-accent',
                )}
                title={`${d.day}: ${d.events} events`}
              />
            ))}
          </div>
        </GlassCard>
      )}

      {/* Module usage chart */}
      {user.module_usage.length > 0 && (
        <GlassCard>
          <p className="text-xs font-semibold text-content-muted uppercase tracking-widest mb-3">
            Module Usage
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={user.module_usage} layout="vertical">
              <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fill: '#888', fontSize: 10 }} />
              <YAxis type="category" dataKey="module_name" tick={{ fill: '#888', fontSize: 11 }} width={70} />
              <Tooltip
                contentStyle={{ background: 'rgba(10,10,20,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                labelStyle={{ color: '#ccc', fontSize: 11 }}
              />
              <Bar dataKey="count" fill="#7c3aed" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      )}

      {/* Feature adoption */}
      <GlassCard>
        <p className="text-xs font-semibold text-content-muted uppercase tracking-widest mb-3">
          Feature Adoption ({firedEvents.size}/{ALL_EVENTS.length} features used)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ALL_EVENTS.map(evt => {
            const summary = user.event_summary.find(e => e.event_name === evt);
            return (
              <div key={evt} className="flex items-center gap-2.5 py-1.5">
                <div className={cn('w-4 h-4 rounded-full flex items-center justify-center shrink-0',
                  summary ? 'bg-success/20' : 'bg-white/[0.06]',
                )}>
                  <div className={cn('w-2 h-2 rounded-full', summary ? 'bg-success' : 'bg-white/20')} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-xs', summary ? 'text-content-primary' : 'text-content-muted')}>{EVENT_LABELS[evt]}</p>
                  {summary && (
                    <p className="text-[10px] text-content-dim">
                      {summary.count}× · first {format(parseISO(summary.first_used), 'd MMM yyyy')}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Session history */}
      {user.sessions.length > 0 && (
        <GlassCard>
          <p className="text-xs font-semibold text-content-muted uppercase tracking-widest mb-3">
            Recent Sessions
          </p>
          <div className="flex flex-col gap-2">
            {user.sessions.slice(0, 10).map(s => (
              <div key={s.id} className="flex items-center gap-3 glass-1 rounded-input px-3 py-2">
                <BarChart3 size={13} className="text-accent shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-content-primary">{format(parseISO(s.started_at), 'd MMM yyyy, HH:mm')}</p>
                  <p className="text-[10px] text-content-muted">
                    {s.platform ?? 'web'} ·{' '}
                    {s.duration_seconds != null ? formatDuration(s.duration_seconds) : 'active'}
                    {s.is_estimated_end && ' (estimated)'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {user.sessions.length === 0 && user.total_sessions === 0 && (
        <EmptyState icon="📊" title="No activity yet" subtitle="This user hasn't used the app yet." />
      )}
    </div>
  );
}

function TimelineItem({ icon, label, value, extra }: { icon: React.ReactNode; label: string; value: string; extra?: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-content-muted w-3 flex justify-center">{icon}</span>
      <span className="text-content-muted w-20 shrink-0">{label}</span>
      <span className="text-content-secondary">{formatDistanceToNow(new Date(value), { addSuffix: true })}</span>
      {extra && <span className="text-content-dim">— {extra}</span>}
    </div>
  );
}

function SmallStat({ label, value, isText }: { label: string; value: number | string; isText?: boolean }) {
  return (
    <GlassCard>
      <p className={cn('font-bold text-content-primary', isText ? 'text-lg' : 'text-2xl')}>{value}</p>
      <p className="text-xs text-content-muted mt-0.5">{label}</p>
    </GlassCard>
  );
}

function formatDuration(seconds: number): string {
  if (!seconds) return '0s';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
