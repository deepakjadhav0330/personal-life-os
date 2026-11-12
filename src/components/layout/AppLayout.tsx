import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  const location = useLocation();

  // Routes where we don't want the bottom nav (e.g., active workout, full-screen views)
  const hideNav = location.pathname.includes('/fitness/active-workout');

  return (
    <div className="min-h-screen-dvh bg-space-950">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Main content */}
      <main className="lg:ml-60 min-h-screen-dvh">
        <div className={hideNav ? '' : 'pb-nav'}>
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      {!hideNav && (
        <div className="lg:hidden">
          <BottomNav />
        </div>
      )}
    </div>
  );
}
