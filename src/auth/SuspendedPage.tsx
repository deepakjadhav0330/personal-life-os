import { ShieldOff, LogOut } from 'lucide-react';
import { GlassCard, Button } from '../components/ui';
import { useAuth } from './AuthContext';

export function SuspendedPage() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen-dvh flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-16 h-16 rounded-full bg-danger/15 border border-danger/30 flex items-center justify-center">
            <ShieldOff size={28} className="text-danger" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-content-primary">Account Suspended</h1>
            <p className="text-sm text-content-muted mt-1">
              Your access to Life OS has been suspended.
            </p>
          </div>
        </div>

        <GlassCard className="border-danger/20 text-center">
          <p className="text-sm text-content-secondary leading-relaxed">
            If you believe this is an error, please contact the application administrator
            for assistance.
          </p>
        </GlassCard>

        <Button
          variant="ghost"
          leftIcon={<LogOut size={15} />}
          onClick={() => signOut()}
          className="self-center"
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
}
