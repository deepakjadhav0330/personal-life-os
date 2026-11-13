import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { AmbientBackground } from './AmbientBackground';

export function AppLayout() {
  const location = useLocation();
  const hideNav = location.pathname.includes('/fitness/active-workout');

  return (
    // No background colour here — body provides #06060f base,
    // AmbientBackground provides the coloured blobs behind the glass.
    <div className="min-h-screen-dvh" style={{ position: 'relative', zIndex: 1 }}>
      <AmbientBackground />

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Main content */}
      <main className="lg:ml-60 min-h-screen-dvh" style={{ position: 'relative', zIndex: 1 }}>
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
