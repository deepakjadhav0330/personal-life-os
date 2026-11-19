import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { useAnalytics } from '../../analytics/AnalyticsContext';

const PATH_MODULE_MAP: Record<string, string> = {
  '/':              'dashboard',
  '/tasks':         'tasks',
  '/habits':        'habits',
  '/fitness':       'fitness',
  '/finance':       'finance',
  '/journal':       'journal',
  '/goals':         'goals',
  '/calendar':      'calendar',
  '/learning':      'learning',
  '/settings':      'settings',
  '/intelligence':  'intelligence',
};

export function AppLayout() {
  const location = useLocation();
  const hideNav  = location.pathname.includes('/fitness/active-workout');
  const { track } = useAnalytics();
  const prevPath   = useRef('');

  useEffect(() => {
    const module = PATH_MODULE_MAP[location.pathname];
    if (module && location.pathname !== prevPath.current) {
      prevPath.current = location.pathname;
      track('module_opened', { module_name: module });
    }
  }, [location.pathname, track]);

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
