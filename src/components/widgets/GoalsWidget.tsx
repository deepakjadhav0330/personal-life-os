import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../../db/database';
import type { Milestone } from '../../db/schema';
import { GlassCard, EmptyState, ProgressBar } from '../ui';
import { Target } from 'lucide-react';

export function GoalsWidget() {
  const navigate = useNavigate();

  const goals = useLiveQuery(
    () => db.goals.where('status').equals('active').limit(3).toArray(),
    [], [],
  );

  const goalIds = goals?.map(g => g.id!).filter(Boolean) ?? [];

  const allMilestones = useLiveQuery<Milestone[]>(
    async () => {
      if (!goalIds.length) return [];
      return db.milestones.where('goalId').anyOf(goalIds).toArray();
    },
    [goalIds.join(',')],
  ) ?? [];

  function getProgress(goalId: number): number {
    const goalMilestones = allMilestones.filter((m: Milestone) => m.goalId === goalId);
    if (!goalMilestones.length) return 0;
    return Math.round(goalMilestones.filter((m: Milestone) => m.status === 'completed').length / goalMilestones.length * 100);
  }

  return (
    <GlassCard variant="interactive" onClick={() => navigate('/goals')}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold text-content-muted uppercase tracking-widest mb-2">Active Goals</p>
      </div>

      {!goals?.length ? (
        <EmptyState icon={<Target size={20} />} title="No active goals" subtitle="Set a goal to start tracking" compact />
      ) : (
        <div className="flex flex-col gap-3">
          {goals.map(goal => {
            const progress = getProgress(goal.id!);
            return (
              <div key={goal.id} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: goal.color }} />
                  <p className="text-sm text-content-primary flex-1 truncate">{goal.title}</p>
                  <span className="text-xs text-content-muted">{progress}%</span>
                </div>
                <ProgressBar value={progress} color="custom" customColor={goal.color} size="xs" />
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}
