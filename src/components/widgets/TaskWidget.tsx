import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../../db/database';
import { GlassCard, Badge, EmptyState } from '../ui';
import { todayStr } from '../../utils/dates';
import { CheckSquare, Circle } from 'lucide-react';

export function TaskWidget() {
  const navigate = useNavigate();
  const today = todayStr();

  const todayTasks = useLiveQuery(
    () => db.tasks
      .where('status').equals('pending')
      .filter(t => t.dueDate === today)
      .toArray()
      .then(tasks => tasks.sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
      })),
    [today],
    [],
  );

  const priorityVariant = (p: string) =>
    p === 'high' ? 'priority-high' : p === 'medium' ? 'priority-medium' : 'priority-low';

  return (
    <GlassCard variant="interactive" onClick={() => navigate('/tasks')}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-content-muted uppercase tracking-wide">Today's Tasks</p>
        {(todayTasks?.length ?? 0) > 0 && (
          <Badge variant="accent">{todayTasks!.length} pending</Badge>
        )}
      </div>

      {!todayTasks?.length ? (
        <EmptyState
          icon={<CheckSquare size={20} />}
          title="All clear!"
          subtitle="No tasks due today"
          compact
        />
      ) : (
        <div className="flex flex-col gap-2">
          {todayTasks!.slice(0, 4).map(task => (
            <div key={task.id} className="flex items-center gap-3">
              <Circle size={16} className="text-content-muted shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-content-primary truncate">{task.title}</p>
              </div>
              <Badge variant={priorityVariant(task.priority)} size="xs">{task.priority}</Badge>
            </div>
          ))}
          {todayTasks!.length > 4 && (
            <p className="text-xs text-content-muted text-center">+{todayTasks!.length - 4} more</p>
          )}
        </div>
      )}
    </GlassCard>
  );
}
