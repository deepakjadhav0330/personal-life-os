import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  const location = useLocation();
  const hideNav = location.pathname.includes('/fitness/active-workout');

  return (
    // No position/z-index here — adding stacking contexts in the app shell
    // breaks modal/sheet z-indices because they become relative to this
    // context instead of the root. AmbientBackground is rendered at the
    // App.tsx level with z-index:-1 so it stays behind all content.
    <div className="min-h-screen-dvh">
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
