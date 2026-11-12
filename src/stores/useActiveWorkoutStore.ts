import { create } from 'zustand';

export interface ActiveSet {
  id: string; // local only
  exerciseId: number;
  exerciseName: string;
  setNumber: number;
  weight: number;
  reps: number;
  rpe?: number;
  isCompleted: boolean;
  isPR?: boolean;
}

export interface ActiveExercise {
  exerciseId: number;
  exerciseName: string;
  sets: ActiveSet[];
}

interface ActiveWorkoutStore {
  workoutId: number | null;
  workoutName: string;
  startedAt: string | null;
  exercises: ActiveExercise[];
  restTimerSeconds: number | null;
  restTimerActive: boolean;

  startWorkout: (workoutId: number, name?: string) => void;
  endWorkout: () => void;
  addExercise: (exerciseId: number, exerciseName: string) => void;
  removeExercise: (exerciseId: number) => void;
  addSet: (exerciseId: number) => void;
  updateSet: (exerciseId: number, setId: string, updates: Partial<ActiveSet>) => void;
  removeSet: (exerciseId: number, setId: string) => void;
  completeSet: (exerciseId: number, setId: string) => void;
  startRestTimer: (seconds: number) => void;
  stopRestTimer: () => void;
}

export const useActiveWorkoutStore = create<ActiveWorkoutStore>((set, get) => ({
  workoutId: null,
  workoutName: '',
  startedAt: null,
  exercises: [],
  restTimerSeconds: null,
  restTimerActive: false,

  startWorkout: (workoutId, name = 'Workout') => set({
    workoutId, workoutName: name, startedAt: new Date().toISOString(), exercises: [],
  }),

  endWorkout: () => set({
    workoutId: null, workoutName: '', startedAt: null, exercises: [],
    restTimerSeconds: null, restTimerActive: false,
  }),

  addExercise: (exerciseId, exerciseName) => set(state => ({
    exercises: [...state.exercises, { exerciseId, exerciseName, sets: [] }],
  })),

  removeExercise: (exerciseId) => set(state => ({
    exercises: state.exercises.filter(e => e.exerciseId !== exerciseId),
  })),

  addSet: (exerciseId) => set(state => {
    const exercises = state.exercises.map(ex => {
      if (ex.exerciseId !== exerciseId) return ex;
      const last = ex.sets[ex.sets.length - 1];
      const newSet: ActiveSet = {
        id: Math.random().toString(36).slice(2, 9),
        exerciseId,
        exerciseName: ex.exerciseName,
        setNumber: ex.sets.length + 1,
        weight: last?.weight ?? 0,
        reps: last?.reps ?? 8,
        isCompleted: false,
      };
      return { ...ex, sets: [...ex.sets, newSet] };
    });
    return { exercises };
  }),

  updateSet: (exerciseId, setId, updates) => set(state => ({
    exercises: state.exercises.map(ex => {
      if (ex.exerciseId !== exerciseId) return ex;
      return { ...ex, sets: ex.sets.map(s => s.id === setId ? { ...s, ...updates } : s) };
    }),
  })),

  removeSet: (exerciseId, setId) => set(state => ({
    exercises: state.exercises.map(ex => {
      if (ex.exerciseId !== exerciseId) return ex;
      const sets = ex.sets.filter(s => s.id !== setId).map((s, i) => ({ ...s, setNumber: i + 1 }));
      return { ...ex, sets };
    }),
  })),

  completeSet: (exerciseId, setId) => {
    get().updateSet(exerciseId, setId, { isCompleted: true });
  },

  startRestTimer: (seconds) => set({ restTimerSeconds: seconds, restTimerActive: true }),
  stopRestTimer: () => set({ restTimerSeconds: null, restTimerActive: false }),
}));
