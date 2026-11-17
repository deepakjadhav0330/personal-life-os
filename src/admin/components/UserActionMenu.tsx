import { useState } from 'react';
import { CheckCircle2, XCircle, ShieldOff, ShieldCheck, LogOut, MoreHorizontal } from 'lucide-react';
import { Button, Modal, Textarea, GlassCard } from '../../components/ui';
import { useAuth } from '../../auth/AuthContext';
import { toast } from '../../stores/useToastStore';
import { cn } from '../../utils/cn';

type UserStatus = 'pending' | 'approved' | 'suspended';

interface UserActionMenuProps {
  userId: string;
  email: string;
  fullName: string;
  currentStatus: UserStatus;
  onActionComplete: () => void;
  compact?: boolean; // show as dropdown vs. inline buttons
}

async function callAdminFunction(
  fnName: string,
  body: Record<string, unknown>,
  accessToken: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const res = await fetch(`${supabaseUrl}/functions/v1/${fnName}`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      return { ok: false, error: data.error ?? `Error ${res.status}` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Network error' };
  }
}

export function UserActionMenu({
  userId, email, fullName, currentStatus, onActionComplete, compact = false,
}: UserActionMenuProps) {
  const { session } = useAuth();
  const token = session?.access_token ?? '';

  const [menuOpen, setMenuOpen]         = useState(false);
  const [rejectOpen, setRejectOpen]     = useState(false);
  const [suspendOpen, setSuspendOpen]   = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [loading, setLoading]           = useState<string | null>(null);

  async function approveUser() {
    setLoading('approve');
    setMenuOpen(false);
    const { ok, error } = await callAdminFunction('approve-user', { userId, email, fullName }, token);
    setLoading(null);
    if (ok) { toast.success('User approved — invitation email sent'); onActionComplete(); }
    else toast.error(error ?? 'Could not approve user');
  }

  async function rejectUser() {
    setLoading('reject');
    setRejectOpen(false);
    const { ok, error } = await callAdminFunction('reject-user', { userId, reason: rejectReason }, token);
    setLoading(null);
    setRejectReason('');
    if (ok) { toast.success('Request rejected'); onActionComplete(); }
    else toast.error(error ?? 'Could not reject request');
  }

  async function suspendUser() {
    setLoading('suspend');
    setSuspendOpen(false);
    const { ok, error } = await callAdminFunction('suspend-user', { userId, reason: suspendReason }, token);
    setLoading(null);
    setSuspendReason('');
    if (ok) { toast.success('User suspended'); onActionComplete(); }
    else toast.error(error ?? 'Could not suspend user');
  }

  async function reactivateUser() {
    setLoading('reactivate');
    setMenuOpen(false);
    const { ok, error } = await callAdminFunction('reactivate-user', { userId }, token);
    setLoading(null);
    if (ok) { toast.success('User reactivated'); onActionComplete(); }
    else toast.error(error ?? 'Could not reactivate user');
  }

  async function revokeSessions() {
    setLoading('revoke');
    setMenuOpen(false);
    const { ok, error } = await callAdminFunction('revoke-sessions', { userId }, token);
    setLoading(null);
    if (ok) { toast.success('All sessions revoked'); onActionComplete(); }
    else toast.error(error ?? 'Could not revoke sessions');
  }

  const isLoading = loading !== null;

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-1.5 glass-1 rounded-lg text-content-muted hover:text-content-primary transition-colors"
          disabled={isLoading}
        >
          <MoreHorizontal size={15} />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-8 z-50 w-44 glass-elevated rounded-card border border-white/[0.1] shadow-glass overflow-hidden">
              {currentStatus === 'pending' && (
                <>
                  <ActionItem icon={<CheckCircle2 size={13} className="text-success" />} label="Approve" onClick={approveUser} />
                  <ActionItem icon={<XCircle size={13} className="text-danger" />} label="Reject" onClick={() => { setMenuOpen(false); setRejectOpen(true); }} />
                </>
              )}
              {currentStatus === 'approved' && (
                <>
                  <ActionItem icon={<ShieldOff size={13} className="text-warning" />} label="Suspend" onClick={() => { setMenuOpen(false); setSuspendOpen(true); }} />
                  <ActionItem icon={<LogOut size={13} className="text-content-muted" />} label="Revoke sessions" onClick={revokeSessions} />
                </>
              )}
              {currentStatus === 'suspended' && (
                <ActionItem icon={<ShieldCheck size={13} className="text-success" />} label="Reactivate" onClick={reactivateUser} />
              )}
            </div>
          </>
        )}

        {/* Reject modal */}
        <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} title="Reject Request">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-content-secondary">Rejecting access request for <strong className="text-content-primary">{email}</strong></p>
            <Textarea
              label="Reason (optional)"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Enter a reason…"
              rows={3}
            />
            <div className="flex gap-2">
              <Button variant="ghost" fullWidth onClick={() => setRejectOpen(false)}>Cancel</Button>
              <Button variant="danger" fullWidth loading={loading === 'reject'} onClick={rejectUser}>Reject Request</Button>
            </div>
          </div>
        </Modal>

        {/* Suspend modal */}
        <Modal open={suspendOpen} onClose={() => setSuspendOpen(false)} title="Suspend User">
          <div className="flex flex-col gap-4">
            <GlassCard className="border-warning/30">
              <p className="text-sm text-warning font-medium mb-1">This will immediately sign the user out of all active sessions.</p>
              <p className="text-xs text-content-muted">Suspending <strong className="text-content-secondary">{fullName}</strong> ({email})</p>
            </GlassCard>
            <Textarea
              label="Reason (optional)"
              value={suspendReason}
              onChange={e => setSuspendReason(e.target.value)}
              placeholder="Enter a reason…"
              rows={3}
            />
            <div className="flex gap-2">
              <Button variant="ghost" fullWidth onClick={() => setSuspendOpen(false)}>Cancel</Button>
              <Button variant="danger" fullWidth loading={loading === 'suspend'} onClick={suspendUser}>Suspend User</Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // Inline buttons (for detail page)
  return (
    <div className="flex flex-wrap gap-2">
      {currentStatus === 'pending' && (
        <>
          <Button size="sm" variant="success" leftIcon={<CheckCircle2 size={13} />} loading={loading === 'approve'} onClick={approveUser} disabled={isLoading}>Approve</Button>
          <Button size="sm" variant="danger"  leftIcon={<XCircle size={13} />}      loading={loading === 'reject'}  onClick={() => setRejectOpen(true)}  disabled={isLoading}>Reject</Button>
        </>
      )}
      {currentStatus === 'approved' && (
        <>
          <Button size="sm" variant="ghost"   leftIcon={<ShieldOff size={13} className="text-warning" />} loading={loading === 'suspend'}  onClick={() => setSuspendOpen(true)} disabled={isLoading} className="text-warning">Suspend</Button>
          <Button size="sm" variant="ghost"   leftIcon={<LogOut size={13} />}                              loading={loading === 'revoke'}   onClick={revokeSessions}            disabled={isLoading}>Revoke Sessions</Button>
        </>
      )}
      {currentStatus === 'suspended' && (
        <Button size="sm" variant="success" leftIcon={<ShieldCheck size={13} />} loading={loading === 'reactivate'} onClick={reactivateUser} disabled={isLoading}>Reactivate</Button>
      )}

      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} title="Reject Request">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-content-secondary">Rejecting access request for <strong className="text-content-primary">{email}</strong></p>
          <Textarea label="Reason (optional)" value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Enter a reason…" rows={3} />
          <div className="flex gap-2">
            <Button variant="ghost" fullWidth onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="danger" fullWidth loading={loading === 'reject'} onClick={rejectUser}>Reject</Button>
          </div>
        </div>
      </Modal>

      <Modal open={suspendOpen} onClose={() => setSuspendOpen(false)} title="Suspend User">
        <div className="flex flex-col gap-4">
          <GlassCard className="border-warning/30">
            <p className="text-sm text-warning font-medium mb-1">This will immediately sign the user out of all active sessions.</p>
          </GlassCard>
          <Textarea label="Reason (optional)" value={suspendReason} onChange={e => setSuspendReason(e.target.value)} placeholder="Enter a reason…" rows={3} />
          <div className="flex gap-2">
            <Button variant="ghost" fullWidth onClick={() => setSuspendOpen(false)}>Cancel</Button>
            <Button variant="danger" fullWidth loading={loading === 'suspend'} onClick={suspendUser}>Suspend</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ActionItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-content-secondary',
        'hover:bg-white/[0.07] hover:text-content-primary transition-colors text-left',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
