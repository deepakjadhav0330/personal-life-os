import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Info, Database, Upload } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { GlassCard, EmptyState, Button } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import { EVENT_LABELS, type EventName } from '../analytics/events';
import { cn } from '../utils/cn';
import { db } from '../db/database';
import { analytics } from '../analytics/analyticsClient';

interface ProductStats {
  feature_adoption: { event_name: EventName; adopters: number; total_events: number; pct: number }[];
  module_popularity: { module_name: string; users: number; total: number }[];
  platform_breakdown: { platform: string; count: number }[];
  retention: { day1: number; day7: number; day30: number };
  weekly_cohorts: { week: string; cohort_size: number; week_data: number[] }[];
  avg_sessions_per_user: number;
  avg_active_days: number;
  avg_session_duration: number;
  total_approved_users: number;
}

const PLATFORM_COLORS = ['#7c3aed', '#3b82f6', '#22c55e'];

export function AdminProductPage() {
  const { session }   = useAuth();
  const [stats, setStats]     = useState<ProductStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const fetchStats = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(
        `${supabaseUrl}/functions/v1/admin-product-stats`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json() as ProductStats;
      setStats(data);
      setError('');
    } catch {
      setError('Failed to load product stats');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return (
    <div className="p-4 flex flex-col gap-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-content-primary">Product</h2>
        <button onClick={fetchStats} className="p-1.5 glass-1 rounded-lg text-content-muted hover:text-content-primary transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && <GlassCard className="border-danger/30"><p className="text-sm text-danger">{error}</p></GlassCard>}

      {/* ── Analytics diagnostic (admin-only debug) ─────────── */}
      <AnalyticsDiagnostic />

      {/* Average stats */}
      <div className="grid grid-cols-3 gap-3">
        <GlassCard>
          <p className="text-2xl font-bold text-content-primary">{stats?.avg_sessions_per_user.toFixed(1) ?? '—'}</p>
          <p className="text-xs text-content-muted mt-0.5">Avg sessions / user</p>
        </GlassCard>
        <GlassCard>
          <p className="text-2xl font-bold text-content-primary">{stats?.avg_active_days.toFixed(1) ?? '—'}</p>
          <p className="text-xs text-content-muted mt-0.5">Avg active days</p>
        </GlassCard>
        <GlassCard>
          <p className="text-2xl font-bold text-content-primary">
            {stats ? formatDuration(stats.avg_session_duration) : '—'}
          </p>
          <p className="text-xs text-content-muted mt-0.5">Avg session duration</p>
        </GlassCard>
      </div>

      {/* Retention */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <p className="text-xs font-semibold text-content-muted uppercase tracking-widest">Retention</p>
          <span title="% of users who returned after registration"><Info size={12} className="text-content-muted" /></span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <RetentionCard label="Day 1"  value={stats?.retention.day1  ?? 0} />
          <RetentionCard label="Day 7"  value={stats?.retention.day7  ?? 0} />
          <RetentionCard label="Day 30" value={stats?.retention.day30 ?? 0} />
        </div>
      </GlassCard>

      {/* Module popularity */}
      {stats?.module_popularity && stats.module_popularity.length > 0 && (
        <GlassCard>
          <p className="text-xs font-semibold text-content-muted uppercase tracking-widest mb-3">Module Popularity</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.module_popularity} layout="vertical">
              <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fill: '#888', fontSize: 10 }} />
              <YAxis type="category" dataKey="module_name" tick={{ fill: '#888', fontSize: 11 }} width={70} />
              <Tooltip
                contentStyle={{ background: 'rgba(10,10,20,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
              />
              <Bar dataKey="users" fill="#7c3aed" radius={[0, 3, 3, 0]} name="Unique users" />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      )}

      {/* Feature adoption table */}
      <GlassCard>
        <p className="text-xs font-semibold text-content-muted uppercase tracking-widest mb-3">Feature Adoption</p>
        {loading ? (
          <div className="h-32 flex items-center justify-center text-sm text-content-muted">Loading…</div>
        ) : stats?.feature_adoption && stats.feature_adoption.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-content-muted border-b border-white/[0.06]">
                  <th className="text-left pb-2 font-medium">Feature</th>
                  <th className="text-right pb-2 font-medium">Unique Users</th>
                  <th className="text-right pb-2 font-medium">% Adopted</th>
                  <th className="text-right pb-2 font-medium">Total Events</th>
                </tr>
              </thead>
              <tbody>
                {stats.feature_adoption.sort((a, b) => b.pct - a.pct).map(row => (
                  <tr key={row.event_name} className="border-b border-white/[0.03]">
                    <td className="py-2 text-content-secondary">{EVENT_LABELS[row.event_name]}</td>
                    <td className="py-2 text-right text-content-primary">{row.adopters}</td>
                    <td className="py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-white/[0.07]">
                          <div
                            className="h-full rounded-full bg-accent"
                            style={{ width: `${Math.min(row.pct, 100)}%` }}
                          />
                        </div>
                        <span className="text-content-primary w-8 text-right">{row.pct}%</span>
                      </div>
                    </td>
                    <td className="py-2 text-right text-content-muted">{row.total_events}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon="📊" title="No feature data yet" subtitle="Feature adoption data will appear here once users start using the app." />
        )}
      </GlassCard>

      {/* Platform breakdown */}
      {stats?.platform_breakdown && stats.platform_breakdown.length > 0 && (
        <GlassCard>
          <p className="text-xs font-semibold text-content-muted uppercase tracking-widest mb-3">Platform Breakdown</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={stats.platform_breakdown}
                dataKey="count"
                nameKey="platform"
                cx="50%"
                cy="50%"
                outerRadius={70}
              >
                {stats.platform_breakdown.map((_, index) => (
                  <Cell key={index} fill={PLATFORM_COLORS[index % PLATFORM_COLORS.length]} />
                ))}
              </Pie>
              <Legend formatter={(value) => <span style={{ color: '#aaa', fontSize: 11 }}>{value}</span>} />
              <Tooltip
                contentStyle={{ background: 'rgba(10,10,20,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </GlassCard>
      )}

      {/* Weekly retention cohort heatmap */}
      {stats?.weekly_cohorts && stats.weekly_cohorts.length > 0 && (
        <GlassCard>
          <p className="text-xs font-semibold text-content-muted uppercase tracking-widest mb-1">Weekly Retention Cohorts</p>
          <p className="text-[10px] text-content-dim mb-3">% of cohort active each week after registration</p>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-content-muted pb-1 pr-2 font-medium">Cohort</th>
                  <th className="text-content-muted pb-1 font-medium px-1">Size</th>
                  {Array.from({ length: 8 }, (_, i) => (
                    <th key={i} className="text-content-muted pb-1 font-medium px-1 text-center">W{i}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.weekly_cohorts.map(cohort => (
                  <tr key={cohort.week}>
                    <td className="text-content-secondary pr-2 py-1">{cohort.week}</td>
                    <td className="text-content-muted px-1 text-center">{cohort.cohort_size}</td>
                    {cohort.week_data.map((pct, wi) => (
                      <td key={wi} className="px-1 py-1 text-center">
                        <div
                          className="w-8 h-5 rounded flex items-center justify-center mx-auto text-[9px] font-medium"
                          style={{
                            background: pct === 0 ? 'rgba(255,255,255,0.03)'
                              : `rgba(124,58,237,${Math.min(pct / 100, 1) * 0.8 + 0.1})`,
                            color: pct > 30 ? '#fff' : '#888',
                          }}
                        >
                          {pct > 0 ? `${pct}%` : '·'}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
}

function RetentionCard({ label, value }: { label: string; value: number }) {
  const color = value >= 60 ? 'text-success' : value >= 30 ? 'text-warning' : 'text-danger';
  return (
    <div className="glass-1 rounded-input p-3 text-center">
      <p className={cn('text-2xl font-bold', color)}>{value}%</p>
      <p className="text-xs text-content-muted mt-0.5">{label}</p>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 60) return `${Math.round(seconds || 0)}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

// ── Analytics Diagnostic ──────────────────────────────────────
// Shows the admin's own queued event count and lets them force-flush.
// Useful for debugging analytics pipeline issues.
function AnalyticsDiagnostic() {
  const { user } = useAuth();
  const [queuedCount, setQueuedCount] = useState<number | null>(null);
  const [flushing,    setFlushing]    = useState(false);
  const [lastResult,  setLastResult]  = useState<string | null>(null);

  const refreshCount = useCallback(async () => {
    if (!user?.id) return;
    try {
      const count = await db.analyticsQueue.where('user_id').equals(user.id).count();
      setQueuedCount(count);
    } catch { setQueuedCount(0); }
  }, [user?.id]);

  useEffect(() => { refreshCount(); }, [refreshCount]);

  const forceFlush = async () => {
    setFlushing(true);
    setLastResult(null);
    try {
      await analytics.flush();
      await refreshCount();
      setLastResult('Flush completed. Check the feature adoption table for updated counts.');
    } catch (e) {
      setLastResult(`Flush error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setFlushing(false);
    }
  };

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-3">
        <Database size={13} className="text-accent" />
        <p className="text-xs font-semibold text-content-muted uppercase tracking-widest">
          Analytics Pipeline (your session)
        </p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-content-muted">Events queued locally (not yet sent)</p>
          <p className={`text-2xl font-bold mt-0.5 ${(queuedCount ?? 0) > 0 ? 'text-warning' : 'text-success'}`}>
            {queuedCount ?? '—'}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={flushing ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={13} />}
          onClick={forceFlush}
          disabled={flushing}
        >
          Force flush
        </Button>
      </div>
      {lastResult && (
        <p className="text-xs text-content-muted mt-3 leading-relaxed">{lastResult}</p>
      )}
      <p className="text-[10px] text-content-dim mt-2">
        If queued count stays &gt; 0 after flush, check browser console for the specific error (401/403/etc).
      </p>
    </GlassCard>
  );
}
