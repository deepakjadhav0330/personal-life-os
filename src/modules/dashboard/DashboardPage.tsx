import { useSetting } from '../../hooks/useSetting';
import { PageHeader } from '../../components/layout/PageHeader';
import { GreetingWidget } from '../../components/widgets/GreetingWidget';
import { DailySummaryWidget } from '../../components/widgets/DailySummaryWidget';
import { TaskWidget } from '../../components/widgets/TaskWidget';
import { HabitRingWidget } from '../../components/widgets/HabitRingWidget';
import { QuickStatsWidget } from '../../components/widgets/QuickStatsWidget';
import { GoalsWidget } from '../../components/widgets/GoalsWidget';
import { RemindersWidget } from '../../components/widgets/RemindersWidget';
import { QuickActionsWidget } from '../../components/widgets/QuickActionsWidget';
import type { DashboardWidgetConfig } from '../../db/schema';

const widgetMap: Record<string, React.ComponentType> = {
  'greeting': GreetingWidget,
  'daily-summary': DailySummaryWidget,
  'tasks': TaskWidget,
  'habits': HabitRingWidget,
  'quick-stats': QuickStatsWidget,
  'goals': GoalsWidget,
  'reminders': RemindersWidget,
  'quick-actions': QuickActionsWidget,
};

const defaultConfig: DashboardWidgetConfig[] = [
  { widgetId: 'greeting', label: 'Greeting', visible: true, order: 0 },
  { widgetId: 'daily-summary', label: 'Daily Summary', visible: true, order: 1 },
  { widgetId: 'tasks', label: 'Tasks', visible: true, order: 2 },
  { widgetId: 'habits', label: 'Habit Progress', visible: true, order: 3 },
  { widgetId: 'quick-stats', label: 'Quick Stats', visible: true, order: 4 },
  { widgetId: 'goals', label: 'Goals', visible: true, order: 5 },
  { widgetId: 'reminders', label: 'Reminders', visible: true, order: 6 },
  { widgetId: 'quick-actions', label: 'Quick Actions', visible: true, order: 7 },
];

export function DashboardPage() {
  const [dashConfig] = useSetting<DashboardWidgetConfig[]>('dashboardConfig', defaultConfig);
  const config = dashConfig?.length ? dashConfig : defaultConfig;
  const visibleWidgets = config.filter(w => w.visible).sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen-dvh">
      <PageHeader title="Life OS" showNotifications large />
      <div className="px-4 pb-4 flex flex-col gap-3">
        {visibleWidgets.map(widget => {
          const Widget = widgetMap[widget.widgetId];
          if (!Widget) return null;
          return <Widget key={widget.widgetId} />;
        })}
      </div>
    </div>
  );
}
