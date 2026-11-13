import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, Dumbbell, DollarSign,
  Flame, BookOpen, Target, CalendarDays, Settings, GraduationCap, Zap,
} from 'lucide-react';
import { cn } from '../../utils/cn';

// Mirrors the mobile nav logic:
// Primary = tabs on the bottom bar  |  More = everything else
const navGroups = [
  {
    label: 'Primary',
    items: [
      { path: '/',        label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { path: '/tasks',   label: 'Tasks',     icon: CheckSquare },
      { path: '/fitness', label: 'Fitness',   icon: Dumbbell },
      { path: '/finance', label: 'Finance',   icon: DollarSign },
    ],
  },
  {
    label: 'More',
    items: [
      { path: '/habits',   label: 'Habits',   icon: Flame },
      { path: '/journal',  label: 'Journal',  icon: BookOpen },
      { path: '/goals',    label: 'Goals',    icon: Target },
      { path: '/learning', label: 'Learning', icon: GraduationCap },
      { path: '/calendar', label: 'Calendar', icon: CalendarDays },
    ],
  },
  {
    label: 'System',
    items: [
      { path: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 glass-nav border-r border-white/[0.06] flex flex-col pt-safe">
      {/* Logo */}
      <div className="px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl accent-gradient flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-content-primary">Life OS</p>
            <p className="text-[10px] text-content-muted">Personal Dashboard</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-6">
        {navGroups.map(group => (
          <div key={group.label} className="mb-6">
            <p className="text-[10px] font-semibold text-content-muted uppercase tracking-widest px-3 mb-2">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={(item as any).exact}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-input text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'accent-gradient text-white shadow-accent-sm'
                      : 'text-content-secondary hover:text-content-primary hover:bg-white/[0.06]',
                  )}
                >
                  <item.icon size={16} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
