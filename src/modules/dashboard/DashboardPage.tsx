import { useNavigate, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { useSetting } from '../../hooks/useSetting';
import { PageHeader } from '../../components/layout/PageHeader';
import { GlassCard } from '../../components/ui';
import { QuickAddBar } from '../../components/dashboard/QuickAddBar';
import { NotificationCenter } from '../../components/dashboard/NotificationCenter';
import { SampleDataBanner, useShouldShowBanner } from '../../components/dashboard/SampleDataBanner';
import { useSmartNudges } from '../../hooks/useSmartNudges';
import { useAdminNudges } from '../../hooks/useAdminNudges';
import { GreetingWidget } from '../../components/widgets/GreetingWidget';
import { DailySummaryWidget } from '../../components/widgets/DailySummaryWidget';
import { TaskWidget } from '../../components/widgets/TaskWidget';
import { HabitRingWidget } from '../../components/widgets/HabitRingWidget';
import { QuickStatsWidget } from '../../components/widgets/QuickStatsWidget';
import { GoalsWidget } from '../../components/widgets/GoalsWidget';
import { RemindersWidget } from '../../components/widgets/RemindersWidget';
import { QuickActionsWidget } from '../../components/widgets/QuickActionsWidget';
import { FinancePulseWidget } from '../../components/widgets/FinancePulseWidget';
import { db } from '../../db/database';
import type { DashboardWidgetConfig } from '../../db/schema';
import { CheckSquare, Flame, Target, DollarSign, ArrowRight } from 'lucide-react';

const widgetMap: Record<string, React.ComponentType> = {
  'greeting':       GreetingWidget,
  'daily-summary':  DailySummaryWidget,
  'tasks':          TaskWidget,
  'habits':         HabitRingWidget,
  'quick-stats':    QuickStatsWidget,
  'finance-pulse':  FinancePulseWidget,
  'goals':          GoalsWidget,
  'reminders':      RemindersWidget,
  'quick-actions':  QuickActionsWidget,
};

const defaultConfig: DashboardWidgetConfig[] = [
  { widgetId: 'greeting',      label: 'Greeting',       visible: true,  order: 0 },
  { widgetId: 'daily-summary', label: 'Daily Summary',  visible: true,  order: 1 },
  { widgetId: 'tasks',         label: 'Tasks',          visible: true,  order: 2 },
  { widgetId: 'habits',        label: 'Habit Progress', visible: true,  order: 3 },
  { widgetId: 'finance-pulse', label: 'Finance Pulse',  visible: true,  order: 4 },
  { widgetId: 'quick-stats',   label: 'Quick Stats',    visible: true,  order: 5 },
  { widgetId: 'goals',         label: 'Goals',          visible: true,  order: 6 },
  { widgetId: 'reminders',     label: 'Reminders',      visible: true,  order: 7 },
  { widgetId: 'quick-actions', label: 'Quick Actions',  visible: true,  order: 8 },
];

export function DashboardPage() {
  const [dashConfig] = useSetting<DashboardWidgetConfig[]>('dashboardConfig', defaultConfig);
  const location = useLocation();
  const quickAddText: string | undefined = location.state?.quickAdd;
  const nudges      = useSmartNudges();
  const adminNudges = useAdminNudges();
  const allNudges   = [...adminNudges, ...nudges]; // admin alerts first
  const activeNudgeCount = allNudges.length;
  const showBanner = useShouldShowBanner();

  // Clear the state so it doesn't persist on subsequent renders
  useEffect(() => {
    if (quickAddText) {
      window.history.replaceState({}, '');
    }
  }, [quickAddText]);

  // Check whether the user has any real data yet
  const hasData = useLiveQuery(async () => {
    const tasks   = await db.tasks.count();
    const habits  = await db.habits.count();
    const goals   = await db.goals.count();
    return tasks > 0 || habits > 0 || goals > 0;
  }, [], null); // null = still loading

  // Merge stored config with defaultConfig so any newly introduced widgets
  // appear automatically for existing users who already have a saved config.
  const storedConfig  = dashConfig?.length ? dashConfig : defaultConfig;
  const storedIds     = new Set(storedConfig.map(w => w.widgetId));
  const missingWidgets = defaultConfig
    .filter(w => !storedIds.has(w.widgetId))
    .map((w, i) => ({ ...w, order: storedConfig.length + i }));
  const config        = [...storedConfig, ...missingWidgets];
  const visibleWidgets = config.filter(w => w.visible).sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen-dvh">
      <PageHeader title="Life OS" showNotifications nudgeCount={activeNudgeCount} large />
      <div className="px-4 pb-4 flex flex-col gap-3">

        {hasData === false ? (
          <>
            <QuickAddBar initialValue={quickAddText} />
            <GreetingWidget />
            <WelcomeCard />
          </>
        ) : (
          <>
            <QuickAddBar initialValue={quickAddText} />
            {/* Show one-time sample data banner until user dismisses it */}
            {showBanner && hasData === true && <SampleDataBanner />}
            {visibleWidgets.map(widget => {
              const Widget = widgetMap[widget.widgetId];
              if (!Widget) return null;
              return <Widget key={widget.widgetId} />;
            })}
          </>
        )}
      </div>

      {/* Notification center — bell icon opens this via useNotificationStore */}
      <NotificationCenter nudges={allNudges} />
    </div>
  );
}

function WelcomeCard() {
  const navigate = useNavigate();

  const steps = [
    { icon: CheckSquare, label: 'Add your first task', path: '/tasks', color: '#6366f1' },
    { icon: Flame,       label: 'Create a daily habit', path: '/habits', color: '#f59e0b' },
    { icon: Target,      label: 'Set a goal', path: '/goals', color: '#22c55e' },
    { icon: DollarSign,  label: 'Track spending', path: '/finance', color: '#8b5cf6' },
  ];

  return (
    <GlassCard variant="accent" padding="lg">
      <div className="text-center mb-5">
        <div className="text-4xl mb-3">🚀</div>
        <h2 className="text-lg font-bold text-content-primary mb-1">Welcome to Life OS</h2>
        <p className="text-sm text-content-secondary">
          Your personal command centre is ready. Start by setting up the areas that matter most.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {steps.map(step => (
          <button
            key={step.path}
            onClick={() => navigate(step.path)}
            className="flex items-center gap-3 glass-1 hover:glass-2 rounded-card p-3 transition-all duration-200 text-left active:scale-95"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${step.color}22` }}
            >
              <step.icon size={16} style={{ color: step.color }} />
            </div>
            <span className="text-xs font-medium text-content-secondary leading-tight">{step.label}</span>
          </button>
        ))}
      </div>

      <button
        onClick={() => navigate('/settings')}
        className="mt-4 flex items-center justify-center gap-1.5 w-full text-xs text-content-muted hover:text-content-secondary transition-colors py-2"
      >
        Skip setup and explore
        <ArrowRight size={12} />
      </button>
    </GlassCard>
  );
}
