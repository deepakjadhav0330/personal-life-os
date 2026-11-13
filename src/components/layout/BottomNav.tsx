import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  LayoutDashboard, CheckSquare, Dumbbell, DollarSign, Grid3X3,
  Flame, BookOpen, Target, CalendarDays, Settings, GraduationCap,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { db } from '../../db/database';
import { todayStr } from '../../utils/dates';
import { formatMinutes } from '../../utils/format';

// ── Primary tabs ──────────────────────────────────────────────
const primaryTabs = [
  { path: '/',        label: 'Home',    icon: LayoutDashboard, exact: true },
  { path: '/tasks',   label: 'Tasks',   icon: CheckSquare },
  { path: '/fitness', label: 'Fitness', icon: Dumbbell },
  { path: '/finance', label: 'Finance', icon: DollarSign },
  { path: null,       label: 'More',    icon: Grid3X3 },
];

// ── More drawer module config ─────────────────────────────────
const moreModules = [
  { path: '/habits',   label: 'Habits',   icon: Flame,          color: '#f59e0b' },
  { path: '/journal',  label: 'Journal',  icon: BookOpen,       color: '#8b5cf6' },
  { path: '/goals',    label: 'Goals',    icon: Target,         color: '#22c55e' },
  { path: '/learning', label: 'Learning', icon: GraduationCap,  color: '#3b82f6' },
  { path: '/calendar', label: 'Calendar', icon: CalendarDays,   color: '#06b6d4' },
  { path: '/settings', label: 'Settings', icon: Settings,       color: '#94a3b8' },
];

// ── Main component ────────────────────────────────────────────
export function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-nav px-4 pb-safe">
        <div className="mb-4 glass-nav rounded-pill px-2 py-2 flex items-center justify-around">
          {primaryTabs.map(tab => {
            if (!tab.path) {
              return (
                <button
                  key="more"
                  onClick={() => setMoreOpen(true)}
                  className={cn(
                    'relative flex flex-col items-center gap-0.5 px-4 py-2 rounded-pill transition-all duration-200 min-h-touch',
                    moreOpen ? 'text-accent' : 'text-content-muted',
                  )}
                >
                  <span className={cn(
                    'transition-all duration-200',
                    moreOpen && 'scale-110 [filter:drop-shadow(0_0_7px_rgba(124,58,237,0.75))]',
                  )}>
                    <tab.icon size={20} />
                  </span>
                  <span className="text-[10px] font-medium">{tab.label}</span>
                  {moreOpen && (
                    <span
                      className="absolute bottom-1 w-5 h-0.5 rounded-full bg-accent"
                      style={{ boxShadow: '0 0 8px rgba(139,71,255,0.9), 0 0 16px rgba(139,71,255,0.4)' }}
                    />
                  )}
                </button>
              );
            }

            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                end={tab.exact}
                className={({ isActive }) => cn(
                  'relative flex flex-col items-center gap-0.5 px-4 py-2 rounded-pill transition-all duration-200 min-h-touch',
                  isActive ? 'text-accent' : 'text-content-muted',
                )}
              >
                {({ isActive }) => (
                  <>
                    <span className={cn(
                      'transition-all duration-200',
                      isActive && 'scale-110 [filter:drop-shadow(0_0_7px_rgba(124,58,237,0.75))]',
                    )}>
                      <tab.icon size={20} />
                    </span>
                    <span className={cn('text-[10px] font-medium', isActive && 'font-semibold')}>
                      {tab.label}
                    </span>
                    {isActive && (
                      <span
                        className="absolute bottom-1 w-5 h-0.5 rounded-full bg-accent"
                        style={{ boxShadow: '0 0 8px rgba(139,71,255,0.9), 0 0 16px rgba(139,71,255,0.4)' }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* More drawer — visual module grid */}
      {moreOpen && (
        <MoreDrawer onClose={() => setMoreOpen(false)} navigate={navigate} />
      )}
    </>
  );
}

// ── More drawer — separate component so useLiveQuery hooks are
//   only mounted when the drawer is actually open.
function MoreDrawer({
  onClose,
  navigate,
}: {
  onClose: () => void;
  navigate: (path: string) => void;
}) {
  const today = todayStr();

  // Live stats per module card
  const habitsTotal  = useLiveQuery(() => db.habits.where({ isActive: 1 as any }).count(), [], 0);
  const habitsDone   = useLiveQuery(() => db.habitCompletions.where({ date: today }).count(), [today], 0);
  const activeGoals  = useLiveQuery(() => db.goals.where('status').equals('active').count(), [], 0);
  const learningMins = useLiveQuery(async () => {
    const start = new Date();
    start.setDate(start.getDate() - 7);
    const startStr = start.toISOString().slice(0, 10);
    const sessions = await db.learningSessions.where('date').aboveOrEqual(startStr).toArray();
    return sessions.reduce((s, l) => s + l.durationMinutes, 0);
  }, [], 0);
  const upcomingReminders = useLiveQuery(
    () => db.reminders.where('status').equals('pending').count(), [], 0,
  );

  const stats: Record<string, string> = {
    '/habits':   habitsTotal ? `${habitsDone}/${habitsTotal} done today` : 'Track consistency',
    '/journal':  'Reflect & record',
    '/goals':    activeGoals ? `${activeGoals} active goal${activeGoals !== 1 ? 's' : ''}` : 'Set a goal',
    '/learning': learningMins ? `${formatMinutes(learningMins ?? 0)} this week` : 'Books & courses',
    '/calendar': upcomingReminders ? `${upcomingReminders} upcoming` : 'Events & reminders',
    '/settings': 'Preferences',
  };

  const goTo = (path: string) => { navigate(path); onClose(); };

  return (
    <div className="fixed inset-0 z-modal flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-space-950/70"
        style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative glass-elevated rounded-t-[20px] shadow-glass animate-slide-up pb-safe">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <p className="text-base font-semibold text-content-primary">More</p>
        </div>

        {/* 2 × 3 module grid */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {moreModules.map(mod => (
              <button
                key={mod.path}
                onClick={() => goTo(mod.path)}
                className="flex flex-col items-center gap-3 glass-1 hover:glass-2 rounded-card py-5 px-3 transition-all duration-200 active:scale-95"
              >
                {/* Icon */}
                <div
                  className="w-13 h-13 rounded-2xl flex items-center justify-center"
                  style={{
                    width: 52,
                    height: 52,
                    background: `${mod.color}1e`,
                    border: `1px solid ${mod.color}44`,
                    borderTopColor: `${mod.color}70`,
                  }}
                >
                  <mod.icon size={24} style={{ color: mod.color }} />
                </div>

                {/* Label + stat */}
                <div className="text-center">
                  <p className="text-sm font-semibold text-content-primary">{mod.label}</p>
                  <p className="text-[11px] text-content-muted mt-0.5 leading-tight">
                    {stats[mod.path]}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
