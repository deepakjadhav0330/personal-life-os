import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useLocation } from 'react-router-dom';
import { db } from '../../db/database';
import { PageHeader } from '../../components/layout/PageHeader';
import { GlassCard, Button, Tabs, EmptyState, BottomSheet, ProgressBar, Modal } from '../../components/ui';
import { useAnalytics } from '../../analytics/AnalyticsContext';
import { useInterval } from '../../hooks/useInterval';
import { toast } from '../../stores/useToastStore';
import { todayStr, formatDate, getDaysAgo } from '../../utils/dates';
import { useSetting } from '../../hooks/useSetting';
import { Input, Select } from '../../components/ui';
import {
  Scale, Dumbbell, Utensils, BarChart3, Plus, TrendingDown, TrendingUp, Minus, X,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { format as dateFmt, subDays, parseISO } from 'date-fns';

type FitnessTab = 'body' | 'workouts' | 'nutrition' | 'analytics';

const GlassTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-elevated rounded-input px-3 py-2 text-xs">
      <p className="text-content-muted mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.value}</p>
      ))}
    </div>
  );
};

export function FitnessPage() {
  const [activeTab, setActiveTab] = useState<FitnessTab>('body');
  const location = useLocation();

  useEffect(() => {
    const tab = location.state?.autoTab as FitnessTab | undefined;
    if (tab) { setActiveTab(tab); window.history.replaceState({}, ''); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tabs = [
    { id: 'body', label: 'Body', icon: <Scale size={12} /> },
    { id: 'workouts', label: 'Workouts', icon: <Dumbbell size={12} /> },
    { id: 'nutrition', label: 'Nutrition', icon: <Utensils size={12} /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={12} /> },
  ];

  return (
    <div className="min-h-screen-dvh">
      <PageHeader title="Fitness" />
      <div className="px-4 pb-4 flex flex-col gap-3">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={id => setActiveTab(id as FitnessTab)} variant="underline" scrollable />
        {activeTab === 'body' && <BodyTab />}
        {activeTab === 'workouts' && <WorkoutsTab />}
        {activeTab === 'nutrition' && <NutritionTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
      </div>
    </div>
  );
}

// ─── Body Tab ────────────────────────────────────────────────
function BodyTab() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [measureType, setMeasureType] = useState('weight');
  const [measureValue, setMeasureValue] = useState('');
  const [measureDate, setMeasureDate] = useState(todayStr());
  const [_weightUnit] = useSetting('weightUnit', 'kg');
  const { track } = useAnalytics();

  const measurements = useLiveQuery(
    () => db.bodyMeasurements.orderBy('date').reverse().toArray(),
    [], [],
  );

  const weightData = measurements?.filter(m => m.type === 'weight').slice(0, 30).reverse() ?? [];
  const chartData = weightData.map(m => ({ date: dateFmt(parseISO(m.date), 'dd/MM'), value: m.value }));

  const latest = weightData[weightData.length - 1];
  const previous = weightData[weightData.length - 2];
  const delta = latest && previous ? latest.value - previous.value : 0;

  const saveMeasurement = async () => {
    const val = parseFloat(measureValue);
    if (!val || isNaN(val)) return;
    const unitMap: Record<string, string> = {
      weight: 'kg', body_fat: '%', waist: 'cm', chest: 'cm',
      hips: 'cm', arms: 'cm', shoulders: 'cm', thighs: 'cm', neck: 'cm', custom: 'cm',
    };
    await db.bodyMeasurements.add({
      date: measureDate, type: measureType as any,
      value: val, unit: unitMap[measureType] ?? 'cm',
      createdAt: new Date().toISOString(),
    });
    track('measurement_logged', { measurement_type: measureType });
    toast.success('Measurement saved!');
    setMeasureValue(''); setIsFormOpen(false);
  };

  return (
    <>
      <div className="flex justify-end">
        <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setIsFormOpen(true)}>
          Log Measurement
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <GlassCard padding="sm" className="text-center">
          <p className="text-xl font-bold text-content-primary">{latest ? formatNumber(latest.value) : '—'}</p>
          <p className="text-xs text-content-muted mt-0.5">kg (current)</p>
        </GlassCard>
        <GlassCard padding="sm" className="text-center">
          <div className="flex items-center justify-center gap-1">
            {delta < 0 ? <TrendingDown size={14} className="text-success" /> : delta > 0 ? <TrendingUp size={14} className="text-danger" /> : <Minus size={14} className="text-content-muted" />}
            <p className={`text-xl font-bold ${delta < 0 ? 'text-success' : delta > 0 ? 'text-danger' : 'text-content-primary'}`}>
              {delta ? `${delta > 0 ? '+' : ''}${formatNumber(delta)}` : '—'}
            </p>
          </div>
          <p className="text-xs text-content-muted mt-0.5">since last</p>
        </GlassCard>
        <GlassCard padding="sm" className="text-center">
          <p className="text-xl font-bold text-content-primary">{weightData.length}</p>
          <p className="text-xs text-content-muted mt-0.5">entries</p>
        </GlassCard>
      </div>

      {/* Weight chart */}
      {chartData.length > 1 && (
        <GlassCard>
          <p className="text-[11px] font-semibold text-content-muted uppercase tracking-widest mb-3">Weight Trend</p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fill: '#606080', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={['auto', 'auto']} tick={{ fill: '#606080', fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip content={<GlassTooltip />} />
              <Line type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#7c3aed' }} />
            </LineChart>
          </ResponsiveContainer>
        </GlassCard>
      )}

      {/* History */}
      <GlassCard>
        <p className="text-[11px] font-semibold text-content-muted uppercase tracking-widest mb-3">Recent Measurements</p>
        {!measurements?.length ? (
          <p className="text-sm text-content-muted text-center py-4">No measurements yet</p>
        ) : (
          <div className="flex flex-col gap-2">
            {measurements.slice(0, 10).map(m => (
              <div key={m.id} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                <div>
                  <p className="text-sm text-content-primary capitalize">{m.type.replace('_', ' ')}</p>
                  <p className="text-xs text-content-muted">{formatDate(m.date)}</p>
                </div>
                <p className="text-sm font-semibold text-content-primary">{m.value} {m.unit}</p>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <BottomSheet open={isFormOpen} onClose={() => setIsFormOpen(false)} title="Log Measurement">
        <div className="flex flex-col gap-4">
          <Select
            label="Measurement Type"
            value={measureType}
            onChange={e => setMeasureType(e.target.value)}
            options={[
              { value: 'weight', label: 'Weight (kg)' },
              { value: 'body_fat', label: 'Body Fat (%)' },
              { value: 'waist', label: 'Waist (cm)' },
              { value: 'chest', label: 'Chest (cm)' },
              { value: 'hips', label: 'Hips (cm)' },
              { value: 'arms', label: 'Arms (cm)' },
            ]}
          />
          <Input label="Value" type="number" inputMode="decimal" value={measureValue} onChange={e => setMeasureValue(e.target.value)} placeholder="e.g. 75.5" autoFocus />
          <Input label="Date" type="date" value={measureDate} onChange={e => setMeasureDate(e.target.value)} />
          <Button variant="primary" onClick={saveMeasurement}>Save</Button>
        </div>
      </BottomSheet>
    </>
  );
}

// ─── Workouts Tab ─────────────────────────────────────────────
function WorkoutsTab() {
  const [isStarting,       setIsStarting]       = useState(false);
  const [workoutName,      setWorkoutName]       = useState('');
  const [trackingOpen,     setTrackingOpen]      = useState(false);
  const [currentWorkoutId, setCurrentWorkoutId]  = useState<number | null>(null);

  // Show BOTH active and completed workouts — order by date (indexed)
  const allWorkouts = useLiveQuery(
    () => db.workouts.orderBy('date').reverse().limit(21).toArray(),
    [], [],
  );

  const activeWorkout    = allWorkouts?.find(w => w.status === 'active');
  const completedWorkouts = (allWorkouts ?? []).filter(w => w.status === 'completed').slice(0, 20);

  const startWorkout = async () => {
    if (activeWorkout) {
      toast.error('Finish your current workout first.');
      setIsStarting(false);
      return;
    }
    const name = workoutName.trim() || 'Workout';
    const id = await db.workouts.add({
      name, date: todayStr(), startedAt: new Date().toISOString(), status: 'active',
    });
    setWorkoutName('');
    setIsStarting(false);
    setCurrentWorkoutId(id as number);
    setTrackingOpen(true);
  };

  // Use locally-created ID first; fall back to any active workout from DB
  const workoutIdForSheet = currentWorkoutId ?? activeWorkout?.id ?? null;

  return (
    <>
      <div className="flex justify-end">
        <Button
          variant="primary"
          size="sm"
          leftIcon={activeWorkout ? <Dumbbell size={14} /> : <Plus size={14} />}
          onClick={() => activeWorkout ? setTrackingOpen(true) : setIsStarting(true)}
        >
          {activeWorkout ? 'Continue Workout' : 'Start Workout'}
        </Button>
      </div>

      {/* Active workout banner — appears when a session is in progress */}
      {activeWorkout && (
        <GlassCard variant="accent" className="border-accent/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl accent-gradient flex items-center justify-center shrink-0">
              <Dumbbell size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-content-primary">{activeWorkout.name}</p>
              <p className="text-xs text-accent">Session in progress</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setTrackingOpen(true)}>
              Continue
            </Button>
          </div>
        </GlassCard>
      )}

      {/* Completed workouts history */}
      {!completedWorkouts.length && !activeWorkout ? (
        <EmptyState
          icon={<Dumbbell size={24} />}
          title="No workouts logged yet"
          subtitle="Start a workout to track your exercises and sets"
          action={{ label: 'Start Now', onClick: () => setIsStarting(true) }}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {completedWorkouts.map(w => <WorkoutCard key={w.id} workout={w} />)}
        </div>
      )}

      {/* Start workout sheet */}
      <BottomSheet open={isStarting} onClose={() => setIsStarting(false)} title="Start Workout">
        <div className="flex flex-col gap-4">
          <Input
            label="Workout Name"
            value={workoutName}
            onChange={e => setWorkoutName(e.target.value)}
            placeholder="e.g. Push Day"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            {['Push Day', 'Pull Day', 'Leg Day', 'Full Body', 'Cardio', 'Core'].map(template => (
              <button
                key={template}
                onClick={() => setWorkoutName(template)}
                className={`py-2 text-sm rounded-input transition-all ${workoutName === template ? 'accent-gradient text-white' : 'glass-1 text-content-secondary'}`}
              >
                {template}
              </button>
            ))}
          </div>
          <Button variant="primary" onClick={startWorkout}>Start Session</Button>
        </div>
      </BottomSheet>

      {/* Active workout tracking sheet */}
      {workoutIdForSheet && (
        <ActiveWorkoutSheet
          workoutId={workoutIdForSheet}
          open={trackingOpen}
          onClose={() => { setTrackingOpen(false); setCurrentWorkoutId(null); }}
        />
      )}
    </>
  );
}

function WorkoutCard({ workout }: { workout: any }) {
  const sets = useLiveQuery(() => db.workoutSets.where('workoutId').equals(workout.id!).toArray(), [workout.id], []);
  const volume = sets?.reduce((s, set) => s + (set.weight ?? 0) * (set.reps ?? 0), 0) ?? 0;
  const exerciseIds = [...new Set(sets?.map(s => s.exerciseId) ?? [])];

  return (
    <GlassCard padding="sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-content-primary">{workout.name || 'Workout'}</p>
          <p className="text-xs text-content-muted">{formatDate(workout.date)} · {workout.duration || 0}m · {exerciseIds.length} exercises</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-accent">{(volume / 1000).toFixed(1)}k</p>
          <p className="text-[10px] text-content-muted">kg volume</p>
        </div>
      </div>
    </GlassCard>
  );
}

// ─── Set row — inline weight/reps editor ─────────────────────
function SetRow({ set, onDelete }: { set: any; onDelete: () => void }) {
  const [weight, setWeight] = useState(String(set.weight ?? 0));
  const [reps,   setReps]   = useState(String(set.reps   ?? 0));

  const save = () => {
    db.workoutSets.update(set.id!, {
      weight: parseFloat(weight) || 0,
      reps:   parseInt(reps,  10) || 0,
    }).catch(() => {});
  };

  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-white/[0.04] last:border-0">
      <span className="text-xs text-content-muted w-6 text-center shrink-0">{set.setNumber}</span>
      <input
        type="number" inputMode="decimal"
        value={weight}
        onChange={e => setWeight(e.target.value)}
        onBlur={save}
        className="glass-input rounded-input text-center text-sm font-semibold w-16 h-9 px-1"
        placeholder="0"
        aria-label={`Set ${set.setNumber} weight in kg`}
      />
      <span className="text-xs text-content-muted">kg ×</span>
      <input
        type="number" inputMode="numeric"
        value={reps}
        onChange={e => setReps(e.target.value)}
        onBlur={save}
        className="glass-input rounded-input text-center text-sm font-semibold w-14 h-9 px-1"
        placeholder="0"
        aria-label={`Set ${set.setNumber} reps`}
      />
      <span className="text-xs text-content-muted flex-1">reps</span>
      <button
        onClick={onDelete}
        aria-label="Delete set"
        className="text-content-muted hover:text-danger transition-colors p-1"
      >
        <X size={13} />
      </button>
    </div>
  );
}

// ─── Exercise picker ──────────────────────────────────────────
function ExercisePickerSheet({
  workoutId, open, onClose,
}: { workoutId: number; open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');

  const exercises = useLiveQuery(
    () => query.length >= 1
      ? db.exercises.filter(e => e.name.toLowerCase().includes(query.toLowerCase())).toArray()
      : db.exercises.toArray().then(arr =>
          arr.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 30),
        ),
    [query], [],
  );

  const addExercise = async (exerciseId: number) => {
    const existing = await db.workoutSets
      .where('workoutId').equals(workoutId)
      .filter(s => s.exerciseId === exerciseId)
      .count();
    if (existing > 0) { toast.error('Exercise already in this workout'); return; }
    await db.workoutSets.add({
      workoutId, exerciseId,
      setNumber: 1, weight: 0, reps: 8,
      isCompleted: false,
      createdAt: new Date().toISOString(),
    });
    setQuery('');
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Add Exercise" snapPoints>
      <div className="flex flex-col gap-3">
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search exercises (bench press, squat…)"
          autoFocus
        />
        <div className="flex flex-col gap-1 overflow-y-auto" style={{ maxHeight: '55dvh' }}>
          {(exercises ?? []).length === 0 && query.length > 0 && (
            <p className="text-sm text-content-muted text-center py-6">No exercises found</p>
          )}
          {(exercises ?? []).map(ex => (
            <button
              key={ex.id}
              onClick={() => addExercise(ex.id!)}
              className="flex items-center gap-3 p-3 glass-1 hover:glass-2 rounded-card text-left transition-all active:scale-[0.98]"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-content-primary">{ex.name}</p>
                <p className="text-[11px] text-content-muted capitalize">
                  {ex.primaryMuscle} · {ex.type}
                </p>
              </div>
              <Plus size={14} className="text-accent shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </BottomSheet>
  );
}

// ─── Active workout tracking sheet ───────────────────────────
function ActiveWorkoutSheet({
  workoutId, open, onClose,
}: { workoutId: number; open: boolean; onClose: () => void }) {
  const { track } = useAnalytics();
  const [pickerOpen,    setPickerOpen]    = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [elapsed,       setElapsed]       = useState(0);

  const data = useLiveQuery(async () => {
    const workout = await db.workouts.get(workoutId);
    if (!workout) return null;
    const sets        = await db.workoutSets.where('workoutId').equals(workoutId).toArray();
    const exerciseIds = [...new Set(sets.map(s => s.exerciseId))];
    const exRecords   = await Promise.all(exerciseIds.map(id => db.exercises.get(id)));
    return {
      workout,
      exercises: exerciseIds.map((id, i) => ({
        exercise: exRecords[i],
        sets: sets
          .filter(s => s.exerciseId === id)
          .sort((a, b) => a.setNumber - b.setNumber),
      })).filter(g => !!g.exercise),
    };
  }, [workoutId], null);

  // Live timer
  useInterval(() => {
    if (data?.workout?.startedAt) {
      setElapsed(Math.floor(
        (Date.now() - new Date(data.workout.startedAt).getTime()) / 1000,
      ));
    }
  }, 1000);

  const addSet = async (exerciseId: number) => {
    const existing = await db.workoutSets
      .where('workoutId').equals(workoutId)
      .filter(s => s.exerciseId === exerciseId)
      .toArray();
    const last = existing[existing.length - 1];
    await db.workoutSets.add({
      workoutId, exerciseId,
      setNumber:   existing.length + 1,
      weight:      last?.weight ?? 0,
      reps:        last?.reps   ?? 8,
      isCompleted: false,
      createdAt:   new Date().toISOString(),
    });
  };

  const deleteSet = async (setId: number, exerciseId: number) => {
    await db.workoutSets.delete(setId);
    // Renumber remaining sets for this exercise
    const remaining = (await db.workoutSets
      .where('workoutId').equals(workoutId)
      .filter(s => s.exerciseId === exerciseId)
      .toArray())
      .sort((a, b) => a.setNumber - b.setNumber);
    await Promise.all(
      remaining.map((s, i) => db.workoutSets.update(s.id!, { setNumber: i + 1 })),
    );
  };

  const completeWorkout = async () => {
    const duration      = Math.round(
      (Date.now() - new Date(data!.workout.startedAt!).getTime()) / 60000,
    );
    const exerciseCount = data!.exercises.length;
    await db.workouts.update(workoutId, {
      status: 'completed', completedAt: new Date().toISOString(), duration,
    });
    track('workout_logged', { exercise_count: exerciseCount, duration_minutes: duration });
    toast.success(`${data!.workout.name} complete! ${duration}m · ${data!.exercises.flatMap(e => e.sets).length} sets`);
    onClose();
  };

  const cancelWorkout = async () => {
    const sets = await db.workoutSets.where('workoutId').equals(workoutId).toArray();
    const ids  = sets.map(s => s.id).filter((id): id is number => id !== undefined);
    if (ids.length) await db.workoutSets.bulkDelete(ids);
    await db.workouts.delete(workoutId);
    setConfirmCancel(false);
    onClose();
  };

  function formatTime(s: number): string {
    const h   = Math.floor(s / 3600);
    const m   = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    return `${m}:${String(sec).padStart(2,'0')}`;
  }

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title="" hideClose snapPoints>
        <div className="flex flex-col gap-3">

          {/* Header: name + live timer + cancel link */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-base font-bold text-content-primary">
                {data?.workout.name ?? 'Workout'}
              </p>
              <p className="text-2xl font-mono font-semibold text-accent mt-0.5">
                {formatTime(elapsed)}
              </p>
            </div>
            <button
              onClick={() => setConfirmCancel(true)}
              className="text-xs text-content-muted hover:text-danger transition-colors mt-1"
            >
              Cancel session
            </button>
          </div>

          {/* Exercises + sets */}
          {(data?.exercises ?? []).map(({ exercise, sets }) => (
            <GlassCard key={exercise!.id} padding="sm">
              <div className="mb-2">
                <p className="text-sm font-semibold text-content-primary">{exercise!.name}</p>
                <p className="text-[10px] text-content-muted capitalize">
                  {exercise!.primaryMuscle} · {exercise!.equipment}
                </p>
              </div>

              <div className="flex flex-col">
                {sets.map(set => (
                  <SetRow
                    key={set.id}
                    set={set}
                    onDelete={() => set.id !== undefined && deleteSet(set.id, exercise!.id!)}
                  />
                ))}
              </div>

              <button
                onClick={() => addSet(exercise!.id!)}
                className="mt-2 w-full py-1.5 text-xs text-accent hover:bg-accent/5 glass-1 rounded-input transition-colors"
              >
                + Add Set
              </button>
            </GlassCard>
          ))}

          {/* Add exercise button */}
          <button
            onClick={() => setPickerOpen(true)}
            className="flex items-center justify-center gap-2 py-3.5 glass-1 hover:glass-2 rounded-card border border-dashed border-white/[0.1] text-content-muted hover:text-content-secondary transition-all"
          >
            <Plus size={16} />
            <span className="text-sm font-medium">Add Exercise</span>
          </button>

          {/* Complete */}
          <Button variant="primary" onClick={completeWorkout} fullWidth>
            ✓ Complete Workout
          </Button>
        </div>
      </BottomSheet>

      <ExercisePickerSheet
        workoutId={workoutId}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
      />

      <Modal open={confirmCancel} onClose={() => setConfirmCancel(false)} title="Cancel Workout?" size="sm">
        <p className="text-sm text-content-secondary mb-4">
          All exercises and sets from this session will be deleted.
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" fullWidth onClick={() => setConfirmCancel(false)}>Keep Going</Button>
          <Button variant="danger" fullWidth onClick={cancelWorkout}>Cancel Workout</Button>
        </div>
      </Modal>
    </>
  );
}

// ─── Nutrition Tab ────────────────────────────────────────────
function NutritionTab() {
  const [date, setDate] = useState(todayStr());
  const [isAddingFood, setIsAddingFood] = useState(false);
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const { track } = useAnalytics();
  const [meal, setMeal] = useState<'breakfast' | 'lunch' | 'dinner' | 'snacks'>('breakfast');
  const [caloriesManuallyEdited, setCaloriesManuallyEdited] = useState(false);

  const [calorieTarget] = useSetting('calorieTarget', 2200);
  const [proteinTarget] = useSetting('proteinTarget', 150);
  const [carbTarget] = useSetting('carbTarget', 220);
  const [fatTarget] = useSetting('fatTarget', 70);
  const [waterTarget] = useSetting('waterTarget', 2500);

  // Auto-calculate calories from macros (protein × 4 + carbs × 4 + fat × 9)
  // Only auto-fills when macros are entered and user hasn't manually overridden calories
  useEffect(() => {
    if (caloriesManuallyEdited) return;
    const p = parseFloat(protein) || 0;
    const c = parseFloat(carbs) || 0;
    const f = parseFloat(fat) || 0;
    if (p > 0 || c > 0 || f > 0) {
      setCalories(String(Math.round(p * 4 + c * 4 + f * 9)));
    }
  }, [protein, carbs, fat, caloriesManuallyEdited]);

  const log = useLiveQuery(() => db.nutritionLogs.where('date').equals(date).first(), [date]);

  const allFoods = log?.meals.flatMap(m => m.foods) ?? [];
  const totalCal = allFoods.reduce((s, f) => s + f.calories, 0);
  const totalProtein = allFoods.reduce((s, f) => s + f.protein, 0);
  const totalCarbs = allFoods.reduce((s, f) => s + f.carbs, 0);
  const totalFat = allFoods.reduce((s, f) => s + f.fat, 0);
  const water = log?.waterMl ?? 0;

  const addWater = async (ml: number) => {
    const now = new Date().toISOString();
    if (!log?.id) {
      await db.nutritionLogs.add({ date, meals: [], waterMl: ml, createdAt: now, updatedAt: now });
    } else {
      await db.nutritionLogs.update(log.id, { waterMl: (log.waterMl ?? 0) + ml, updatedAt: now });
    }
  };

  const addFood = async () => {
    if (!foodName.trim() || !calories) return;
    const foodEntry = {
      id: Math.random().toString(36).slice(2),
      customName: foodName,
      calories: parseFloat(calories) || 0,
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fat: parseFloat(fat) || 0,
      amount: 1, unit: 'serving',
    };
    const now = new Date().toISOString();
    if (!log?.id) {
      await db.nutritionLogs.add({
        date,
        meals: [{ id: Math.random().toString(36).slice(2), name: meal, foods: [foodEntry] }],
        waterMl: 0, createdAt: now, updatedAt: now,
      });
    } else {
      const existingMeal = log.meals.find(m => m.name === meal);
      let meals = log.meals;
      if (existingMeal) {
        meals = meals.map(m => m.name === meal ? { ...m, foods: [...m.foods, foodEntry] } : m);
      } else {
        meals = [...meals, { id: Math.random().toString(36).slice(2), name: meal, foods: [foodEntry] }];
      }
      await db.nutritionLogs.update(log.id, { meals, updatedAt: now });
    }
    track('nutrition_logged', { meal_name: meal });
    toast.success('Food logged!');
    setFoodName(''); setCalories(''); setProtein(''); setCarbs(''); setFat('');
    setCaloriesManuallyEdited(false);
    setIsAddingFood(false);
  };

  const macros = [
    { label: 'Calories', value: Math.round(totalCal), target: calorieTarget, unit: 'kcal', color: '#f59e0b' },
    { label: 'Protein', value: Math.round(totalProtein), target: proteinTarget, unit: 'g', color: '#22c55e' },
    { label: 'Carbs', value: Math.round(totalCarbs), target: carbTarget, unit: 'g', color: '#3b82f6' },
    { label: 'Fat', value: Math.round(totalFat), target: fatTarget, unit: 'g', color: '#f97316' },
  ];

  return (
    <>
      <div className="flex items-center justify-between">
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} wrapperClassName="flex-1 mr-3" />
        <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setIsAddingFood(true)}>Log Food</Button>
      </div>

      {/* Macro rings */}
      <GlassCard>
        <div className="grid grid-cols-2 gap-3">
          {macros.map(m => (
            <div key={m.label} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-content-muted">{m.label}</span>
                <span className="text-xs font-semibold" style={{ color: m.color }}>{m.value}/{m.target}{m.unit}</span>
              </div>
              <ProgressBar value={m.value} max={m.target} color="custom" customColor={m.color} size="sm" />
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Water tracker */}
      <GlassCard>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-content-muted uppercase tracking-wide">Water</p>
          <span className="text-xs text-content-secondary">{water}ml / {waterTarget}ml</span>
        </div>
        <ProgressBar value={water} max={waterTarget} color="info" size="md" className="mb-3" />
        <div className="flex gap-2">
          {[250, 500].map(ml => (
            <Button key={ml} variant="secondary" size="sm" onClick={() => addWater(ml)}>+{ml}ml</Button>
          ))}
        </div>
      </GlassCard>

      {/* Meals */}
      {(['breakfast', 'lunch', 'dinner', 'snacks'] as const).map(mealName => {
        const mealFoods = log?.meals.find(m => m.name === mealName)?.foods ?? [];
        if (!mealFoods.length) return null;
        return (
          <GlassCard key={mealName}>
            <p className="text-xs font-semibold text-content-muted uppercase tracking-wide mb-2 capitalize">{mealName}</p>
            {mealFoods.map((f, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                <p className="text-sm text-content-primary">{f.customName}</p>
                <p className="text-xs text-content-muted">{Math.round(f.calories)} kcal · {Math.round(f.protein)}g P</p>
              </div>
            ))}
          </GlassCard>
        );
      })}

      <BottomSheet open={isAddingFood} onClose={() => setIsAddingFood(false)} title="Log Food">
        <div className="flex flex-col gap-3">
          <Select label="Meal" value={meal} onChange={e => setMeal(e.target.value as any)} options={[
            { value: 'breakfast', label: 'Breakfast' }, { value: 'lunch', label: 'Lunch' },
            { value: 'dinner', label: 'Dinner' }, { value: 'snacks', label: 'Snacks' },
          ]} />
          <Input label="Food Name *" value={foodName} onChange={e => setFoodName(e.target.value)} placeholder="e.g. Chicken breast 100g" autoFocus />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Calories *" type="number" inputMode="decimal" value={calories}
            onChange={e => { setCaloriesManuallyEdited(true); setCalories(e.target.value); }}
            placeholder="Auto-calculated from macros" />
            <Input label="Protein (g)" type="number" inputMode="decimal" value={protein} onChange={e => setProtein(e.target.value)} placeholder="0" />
            <Input label="Carbs (g)" type="number" inputMode="decimal" value={carbs} onChange={e => setCarbs(e.target.value)} placeholder="0" />
            <Input label="Fat (g)" type="number" inputMode="decimal" value={fat} onChange={e => setFat(e.target.value)} placeholder="0" />
          </div>
          <Button variant="primary" onClick={addFood} disabled={!foodName.trim() || !calories}>Log Food</Button>
        </div>
      </BottomSheet>
    </>
  );
}

// ─── Analytics Tab ────────────────────────────────────────────
function AnalyticsTab() {
  const measurements = useLiveQuery(() => db.bodyMeasurements.where('type').equals('weight').sortBy('date'), [], []);
  const workouts = useLiveQuery(() => db.workouts.where('status').equals('completed').toArray(), [], []);
  const nutritionLogs = useLiveQuery(() => db.nutritionLogs.orderBy('date').reverse().limit(14).toArray(), [], []);

  const weightChartData = (measurements ?? []).slice(-30).map(m => ({
    date: dateFmt(parseISO(m.date), 'dd/MM'),
    weight: m.value,
  }));

  const workoutFreqData = (() => {
    const data: { week: string; count: number }[] = [];
    for (let w = 7; w >= 0; w--) {
      const start = dateFmt(subDays(new Date(), w * 7), 'yyyy-MM-dd');
      const end = dateFmt(subDays(new Date(), w * 7 - 7), 'yyyy-MM-dd');
      const count = workouts?.filter(wk => wk.date >= start && wk.date < end).length ?? 0;
      data.push({ week: `W-${w}`, count });
    }
    return data.slice(-8);
  })();

  const calData = (nutritionLogs ?? []).reverse().map(log => ({
    date: dateFmt(parseISO(log.date), 'dd/MM'),
    calories: Math.round(log.meals.flatMap(m => m.foods).reduce((s, f) => s + f.calories, 0)),
  }));

  return (
    <div className="flex flex-col gap-3">
      <GlassCard padding="sm">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div><p className="text-lg font-bold text-accent">{workouts?.filter(w => w.date >= getDaysAgo(30)).length ?? 0}</p><p className="text-[10px] text-content-muted">workouts (30d)</p></div>
          <div><p className="text-lg font-bold text-success">{measurements?.length ?? 0}</p><p className="text-[10px] text-content-muted">body logs</p></div>
          <div><p className="text-lg font-bold text-warning">{nutritionLogs?.length ?? 0}</p><p className="text-[10px] text-content-muted">nutrition days</p></div>
        </div>
      </GlassCard>

      {weightChartData.length > 1 && (
        <GlassCard>
          <p className="text-[11px] font-semibold text-content-muted uppercase tracking-widest mb-3">Weight Trend (30 days)</p>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={weightChartData}>
              <XAxis dataKey="date" tick={{ fill: '#606080', fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip content={<GlassTooltip />} />
              <Line type="monotone" dataKey="weight" stroke="#7c3aed" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </GlassCard>
      )}

      {workoutFreqData.some(d => d.count > 0) && (
        <GlassCard>
          <p className="text-[11px] font-semibold text-content-muted uppercase tracking-widest mb-3">Workout Frequency</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={workoutFreqData}>
              <XAxis dataKey="week" tick={{ fill: '#606080', fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip content={<GlassTooltip />} />
              <Bar dataKey="count" fill="#7c3aed" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      )}

      {calData.length > 1 && (
        <GlassCard>
          <p className="text-[11px] font-semibold text-content-muted uppercase tracking-widest mb-3">Calorie Consistency</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={calData}>
              <XAxis dataKey="date" tick={{ fill: '#606080', fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip content={<GlassTooltip />} />
              <Bar dataKey="calories" fill="#f59e0b" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      )}
    </div>
  );
}

function formatNumber(v: number): string {
  return v % 1 === 0 ? `${v}` : v.toFixed(1);
}
