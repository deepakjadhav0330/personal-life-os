import { Brain } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { PageHeader } from '../../components/layout/PageHeader';
import { GlassCard, EmptyState } from '../../components/ui';
import { OverallStatusBanner } from './components/OverallStatusBanner';
import { PriorityRecommendations } from './components/PriorityRecommendations';
import { InsightGroup as InsightGroupSection } from './components/InsightGroup';
import { AskChatGPTSection } from './components/ask-chatgpt/AskChatGPTSection';
import { useInsightEngine } from './insightEngine/useInsightEngine';
import { useSetting } from '../../hooks/useSetting';
import {
  fetchTransactions,
  fetchCurrentBudgets,
  fetchActiveHabits,
  fetchHabitCompletions,
  fetchActiveGoals,
  fetchAllMilestones,
  fetchAllTasks,
  fetchRecentWorkouts,
  fetchBodyMeasurements,
  fetchNutritionLogs,
  fetchLearningItems,
  fetchLearningSessions,
} from './insightEngine/insightSelectors';

// ── Skeleton placeholder ──────────────────────────────────────
function InsightSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1, 2].map(i => (
        <GlassCard key={i} className="animate-pulse">
          <div className="flex flex-col gap-2">
            <div className="h-3 bg-white/[0.06] rounded w-24" />
            <div className="h-4 bg-white/[0.08] rounded w-3/4" />
            <div className="h-3 bg-white/[0.05] rounded w-full" />
            <div className="h-3 bg-white/[0.05] rounded w-2/3" />
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────
export function IntelligencePage() {
  const { groups, overallStatus, priorityInsights, loading, dismissInsight } = useInsightEngine();

  // Settings for ChatGPT section
  const [currency]     = useSetting('currency', 'INR');
  const [weekStartsOn] = useSetting<0 | 1>('weekStartsOn', 1);
  const [weightUnit]   = useSetting<'kg' | 'lbs'>('weightUnit', 'kg');
  const [userName]     = useSetting('name', '');

  // Raw data for ChatGPT summary builder (same queries as the engine)
  const transactions     = useLiveQuery(() => fetchTransactions(3),       [], []);
  const budgets          = useLiveQuery(() => fetchCurrentBudgets(),       [], []);
  const habits           = useLiveQuery(() => fetchActiveHabits(),         [], []);
  const habitCompletions = useLiveQuery(() => fetchHabitCompletions(21),   [], []);
  const goals            = useLiveQuery(() => fetchActiveGoals(),          [], []);
  const milestones       = useLiveQuery(() => fetchAllMilestones(),        [], []);
  const tasks            = useLiveQuery(() => fetchAllTasks(),             [], []);
  const workouts         = useLiveQuery(() => fetchRecentWorkouts(4),      [], []);
  const bodyMeasurements = useLiveQuery(() => fetchBodyMeasurements(),     [], []);
  const nutritionLogs    = useLiveQuery(() => fetchNutritionLogs(14),      [], []);
  const learningItems    = useLiveQuery(() => fetchLearningItems(),        [], []);
  const learningSessions = useLiveQuery(() => fetchLearningSessions(4),    [], []);

  // All insights (undismissed) across all categories
  const allInsights = groups.flatMap(g => g.insights);

  // Determine if the user has meaningful data at all
  const hasAnyData = groups.some(g => g.hasData);

  return (
    <div className="min-h-screen-dvh">
      <PageHeader
        title="Intelligence"
        subtitle="Personal insights"
      />

      <div className="px-4 pb-8 flex flex-col gap-4">

        {/* ── Loading state ───────────────────────────────── */}
        {loading && <InsightSkeleton />}

        {/* ── Loaded ──────────────────────────────────────── */}
        {!loading && (
          <>
            {/* No data at all — new user */}
            {!hasAnyData && (
              <EmptyState
                icon={<Brain size={24} />}
                title="No insights yet"
                subtitle="Add transactions, habits, goals, and other data to Life OS. Intelligence will start generating insights as your data grows."
              />
            )}

            {/* Has data — show full experience */}
            {hasAnyData && (
              <>
                {/* Overall status banner */}
                <OverallStatusBanner status={overallStatus} />

                {/* Priority recommendations (only when actionable insights exist) */}
                {priorityInsights.some(i => i.severity !== 'positive') && (
                  <PriorityRecommendations insights={priorityInsights} />
                )}

                {/* Category groups (excluding daily_activity — always last) */}
                {groups
                  .filter(g => g.category !== 'daily_activity')
                  .map(group => (
                    <InsightGroupSection
                      key={group.category}
                      group={group}
                      onDismiss={dismissInsight}
                    />
                  ))}

                {/* Daily activity — shown last as unavailable */}
                {groups
                  .filter(g => g.category === 'daily_activity')
                  .map(group => (
                    <InsightGroupSection
                      key={group.category}
                      group={group}
                      onDismiss={dismissInsight}
                    />
                  ))}
              </>
            )}

            {/* Ask ChatGPT — always shown at the bottom */}
            <AskChatGPTSection
              groups={groups}
              insights={allInsights}
              transactions={transactions ?? []}
              budgets={budgets ?? []}
              currency={currency}
              habits={habits ?? []}
              habitCompletions={habitCompletions ?? []}
              weekStartsOn={weekStartsOn}
              goals={goals ?? []}
              milestones={milestones ?? []}
              tasks={tasks ?? []}
              workouts={workouts ?? []}
              bodyMeasurements={bodyMeasurements ?? []}
              nutritionLogs={nutritionLogs ?? []}
              learningItems={learningItems ?? []}
              learningSessions={learningSessions ?? []}
              weightUnit={weightUnit}
              userName={userName}
            />
          </>
        )}
      </div>
    </div>
  );
}
