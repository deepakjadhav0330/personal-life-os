import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  back?: boolean;
  rightAction?: React.ReactNode;
  showNotifications?: boolean;
  /** Extra badge count to add to the bell (e.g. active nudge count) */
  nudgeCount?: number;
  /** Override the default bell behaviour — if provided, calls this instead of navigating */
  onBellClick?: () => void;
  className?: string;
  large?: boolean;
}

export function PageHeader({
  title, subtitle, back, rightAction,
  showNotifications, nudgeCount = 0, onBellClick,
  className, large,
}: PageHeaderProps) {
  const navigate = useNavigate();

  const pendingReminders = useLiveQuery(
    () => db.reminders.where('status').equals('pending').count(),
    [],
    0,
  );

  const totalBadge = (pendingReminders ?? 0) + nudgeCount;

  const handleBell = () => {
    if (onBellClick) onBellClick();
    else navigate('/calendar');
  };

  return (
    <div className={cn('flex items-center gap-3 px-4 py-3', className)}>
      {back && (
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="p-2 -ml-1 rounded-input glass-1 text-content-secondary hover:text-content-primary transition-colors min-h-touch min-w-touch flex items-center justify-center"
        >
          <ArrowLeft size={18} />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h1 className={cn('font-bold text-content-primary truncate', large ? 'text-2xl' : 'text-xl')}>
          {title}
        </h1>
        {subtitle && <p className="text-xs text-content-muted mt-0.5">{subtitle}</p>}
      </div>
      {showNotifications && (
        <button
          onClick={handleBell}
          aria-label={`Notifications${totalBadge > 0 ? ` (${totalBadge} unread)` : ''}`}
          className="relative p-2 rounded-input glass-1 text-content-secondary hover:text-content-primary transition-colors min-h-touch min-w-touch flex items-center justify-center"
        >
          <Bell size={18} />
          {totalBadge > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full accent-gradient text-white text-[9px] flex items-center justify-center font-bold">
              {totalBadge > 9 ? '9+' : totalBadge}
            </span>
          )}
        </button>
      )}
      {rightAction && <div>{rightAction}</div>}
    </div>
  );
}
