import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RefreshCw, ChevronRight } from 'lucide-react';
import { GlassCard, EmptyState } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import { UserActionMenu } from './components/UserActionMenu';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../utils/cn';

type UserStatus = 'pending' | 'approved' | 'suspended';

interface UserSummary {
  id: string;
  full_name: string;
  email: string;
  status: UserStatus;
  registered_at: string;
  last_active_at: string | null;
  total_sessions: number;
  sessions_7d: number;
}

type FilterTab = 'all' | UserStatus;

const STATUS_COLORS: Record<UserStatus, string> = {
  pending:   'bg-warning/20 text-warning border border-warning/30',
  approved:  'bg-success/20 text-success border border-success/30',
  suspended: 'bg-danger/20  text-danger  border border-danger/30',
};

export function AdminUsersPage() {
  const { session }     = useAuth();
  const navigate        = useNavigate();
  const [users, setUsers]       = useState<UserSummary[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState<FilterTab>('all');
  const [error, setError]       = useState('');

  const fetchUsers = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(
        `${supabaseUrl}/functions/v1/admin-list-users`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json() as { users: UserSummary[] };
      setUsers(data.users ?? []);
      setError('');
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = users.filter(u => {
    const matchesFilter = filter === 'all' || u.status === filter;
    const q = search.toLowerCase();
    const matchesSearch = !q || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const counts: Record<FilterTab, number> = {
    all:       users.length,
    pending:   users.filter(u => u.status === 'pending').length,
    approved:  users.filter(u => u.status === 'approved').length,
    suspended: users.filter(u => u.status === 'suspended').length,
  };

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'all',       label: 'All' },
    { id: 'pending',   label: 'Pending' },
    { id: 'approved',  label: 'Approved' },
    { id: 'suspended', label: 'Suspended' },
  ];

  return (
    <div className="p-4 flex flex-col gap-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-content-primary">Users</h2>
        <button onClick={fetchUsers} className="p-1.5 glass-1 rounded-lg text-content-muted hover:text-content-primary transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 glass-1 rounded-input p-0.5 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all',
              filter === tab.id ? 'accent-gradient text-white' : 'text-content-muted hover:text-content-primary',
            )}
          >
            {tab.label}
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full',
              filter === tab.id ? 'bg-white/20' : 'bg-white/[0.07]',
            )}>
              {counts[tab.id]}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" />
        <input
          className="w-full h-10 rounded-input glass-input text-content-primary placeholder:text-content-muted pl-9 pr-3 text-sm"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {error && <GlassCard className="border-danger/30"><p className="text-sm text-danger">{error}</p></GlassCard>}

      {/* User list */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map(i => <SkeletonRow key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="👥" title="No users found" subtitle={search ? 'No users match your search' : `No ${filter === 'all' ? '' : filter + ' '}users`} />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(user => (
            <GlassCard key={user.id} padding="sm" className="transition-all">
              <div className="flex items-center gap-3">
                {/* Left side: tappable area that navigates — separate from action buttons */}
                <button
                  className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                  onClick={() => navigate(`/admin/users/${user.id}`)}
                >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full accent-gradient flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-white">{user.full_name.charAt(0).toUpperCase()}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-content-primary truncate">{user.full_name}</p>
                    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', STATUS_COLORS[user.status])}>
                      {user.status}
                    </span>
                  </div>
                  <p className="text-xs text-content-muted truncate">{user.email}</p>
                  <div className="flex gap-3 mt-0.5">
                    <span className="text-[10px] text-content-dim">
                      Registered {formatDistanceToNow(new Date(user.registered_at), { addSuffix: true })}
                    </span>
                    {user.last_active_at && (
                      <span className="text-[10px] text-content-dim">
                        Active {formatDistanceToNow(new Date(user.last_active_at), { addSuffix: true })}
                      </span>
                    )}
                    <span className="text-[10px] text-content-dim">{user.sessions_7d} sessions (7d)</span>
                  </div>
                </div>
                </button> {/* end navigation button */}

                {/* Actions — sibling to nav button, NOT a child. No stopPropagation needed. */}
                <div className="flex items-center gap-1 shrink-0">
                  <UserActionMenu
                    userId={user.id}
                    email={user.email}
                    fullName={user.full_name}
                    currentStatus={user.status}
                    onActionComplete={fetchUsers}
                    compact
                  />
                  <ChevronRight size={14} className="text-content-muted" />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}

function SkeletonRow() {
  return (
    <GlassCard padding="sm">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-white/[0.07] animate-pulse" />
        <div className="flex-1">
          <div className="h-3 w-32 bg-white/[0.07] rounded animate-pulse mb-1.5" />
          <div className="h-2.5 w-48 bg-white/[0.05] rounded animate-pulse" />
        </div>
      </div>
    </GlassCard>
  );
}
