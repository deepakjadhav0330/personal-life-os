import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, Flame, Dumbbell, Grid3X3,
  DollarSign, BookOpen, Target, CalendarDays, Settings, GraduationCap, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import { BottomSheet } from '../ui/BottomSheet';

const primaryTabs = [
  { path: '/', label: 'Home', icon: LayoutDashboard, exact: true },
  { path: '/tasks', label: 'Tasks', icon: CheckSquare },
  { path: '/habits', label: 'Habits', icon: Flame },
  { path: '/fitness', label: 'Fitness', icon: Dumbbell },
  { path: null, label: 'More', icon: Grid3X3 },
];

const moreItems = [
  { path: '/finance', label: 'Finance', icon: DollarSign, color: '#22c55e' },
  { path: '/journal', label: 'Journal', icon: BookOpen, color: '#8b5cf6' },
  { path: '/goals', label: 'Goals', icon: Target, color: '#f59e0b' },
  { path: '/learning', label: 'Learning', icon: GraduationCap, color: '#3b82f6' },
  { path: '/calendar', label: 'Calendar', icon: CalendarDays, color: '#06b6d4' },
  { path: '/settings', label: 'Settings', icon: Settings, color: '#94a3b8' },
];

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
                    'flex flex-col items-center gap-1 px-4 py-1.5 rounded-pill transition-all duration-200 min-h-touch',
                    moreOpen ? 'text-accent' : 'text-content-muted',
                  )}
                >
                  <tab.icon size={20} />
                  <span className="text-[10px] font-medium">{tab.label}</span>
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
                      isActive && 'scale-110',
                      isActive && '[filter:drop-shadow(0_0_7px_rgba(124,58,237,0.75))]',
                    )}>
                      <tab.icon size={20} />
                    </span>
                    <span className={cn('text-[10px] font-medium transition-colors', isActive && 'font-semibold')}>
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

      {/* More drawer */}
      <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More" hideClose={false}>
        <div className="flex flex-col gap-2">
          {moreItems.map(item => (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); setMoreOpen(false); }}
              className="flex items-center gap-4 px-3 py-3.5 glass-1 rounded-card hover:glass-2 transition-all duration-200 min-h-touch"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${item.color}22`, border: `1px solid ${item.color}44` }}
              >
                <item.icon size={18} style={{ color: item.color }} />
              </div>
              <span className="flex-1 text-sm font-medium text-content-primary text-left">{item.label}</span>
              <ChevronRight size={16} className="text-content-muted" />
            </button>
          ))}
        </div>
      </BottomSheet>
    </>
  );
}
