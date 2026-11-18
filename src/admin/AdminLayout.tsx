import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ShieldCheck, LayoutDashboard, Users, TrendingUp, ArrowLeft, LogOut, MessageSquare } from 'lucide-react';
import { cn } from '../utils/cn';
import { useAuth } from '../auth/AuthContext';

const adminNav = [
  { path: '/admin',          label: 'Overview',  icon: LayoutDashboard, exact: true },
  { path: '/admin/users',    label: 'Users',     icon: Users },
  { path: '/admin/product',  label: 'Product',   icon: TrendingUp },
  { path: '/admin/feedback', label: 'Feedback',  icon: MessageSquare },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen-dvh flex flex-col">
      {/* Top bar */}
      <header className="glass-nav border-b border-white/[0.06] sticky top-0 z-nav pt-safe">
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Back to app */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-content-muted hover:text-content-primary transition-colors mr-1"
          >
            <ArrowLeft size={15} />
            <span className="text-xs">App</span>
          </button>

          {/* Title */}
          <div className="flex items-center gap-2 flex-1">
            <div className="w-7 h-7 rounded-lg accent-gradient flex items-center justify-center">
              <ShieldCheck size={14} className="text-white" />
            </div>
            <span className="text-sm font-bold text-content-primary">Life OS Admin</span>
          </div>

          {/* Identity + sign out */}
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-content-primary">{profile?.full_name ?? 'Admin'}</p>
              <p className="text-[10px] text-accent font-semibold uppercase tracking-wide">Admin</p>
            </div>
            <button
              onClick={() => signOut()}
              className="p-1.5 glass-1 rounded-lg text-content-muted hover:text-content-primary transition-colors"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 px-4 pb-2 overflow-x-auto">
          {adminNav.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) => cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                'whitespace-nowrap transition-all duration-200',
                isActive
                  ? 'accent-gradient text-white shadow-accent-sm'
                  : 'text-content-secondary hover:text-content-primary hover:bg-white/[0.06]',
              )}
            >
              <item.icon size={13} />
              {item.label}
            </NavLink>
          ))}
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
