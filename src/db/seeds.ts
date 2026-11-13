/**
 * SEED DATA — Development & Demo purposes only.
 * This file contains DUMMY data. Never commit personal data here.
 * seedDatabase() is idempotent — safe to call multiple times.
 */
import { db } from './database';
import { subDays, format, addDays } from 'date-fns';

const today = new Date();
const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
const iso = (d: Date) => d.toISOString();

export async function seedDatabase(): Promise<void> {
  // Don't re-seed if the user has explicitly cleared their data
  if (localStorage.getItem('lifeOS_userCleared') === 'true') return;

  // Guard — only seed if the DB is empty
  const existing = await db.tasks.count();
  if (existing > 0) return;

  console.log('[seeds] Seeding database with demo data...');

  await seedSettings();
  await seedTasks();
  await seedHabits();
  await seedHabitCompletions();
  await seedExercises();
  await seedWorkouts();
  await seedBodyMeasurements();
  await seedNutritionLogs();
  await seedFoodItems();
  await seedTransactions();
  await seedBudgets();
  await seedJournalEntries();
  await seedGoals();
  await seedReminders();
  await seedLearningItems();

  console.log('[seeds] Done!');
}

async function seedSettings() {
  await db.settings.bulkAdd([
    { key: 'name', value: JSON.stringify(''), updatedAt: iso(today) },
    { key: 'currency', value: JSON.stringify('INR'), updatedAt: iso(today) },
    { key: 'weightUnit', value: JSON.stringify('kg'), updatedAt: iso(today) },
    { key: 'calorieTarget', value: JSON.stringify(2200), updatedAt: iso(today) },
    { key: 'proteinTarget', value: JSON.stringify(150), updatedAt: iso(today) },
    { key: 'carbTarget', value: JSON.stringify(220), updatedAt: iso(today) },
    { key: 'fatTarget', value: JSON.stringify(70), updatedAt: iso(today) },
    { key: 'waterTarget', value: JSON.stringify(2500), updatedAt: iso(today) },
    { key: 'weekStartsOn', value: JSON.stringify(1), updatedAt: iso(today) },
  ]);
}

async function seedTasks() {
  const tasks = [
    { title: 'Complete quarterly review', description: 'Review Q4 goals and performance metrics', dueDate: fmt(today), priority: 'high', category: 'work', status: 'pending', isRecurring: false },
    { title: 'Morning run – 5 km', description: 'Track pace and distance', dueDate: fmt(today), priority: 'medium', category: 'fitness', status: 'pending', isRecurring: true, recurringFrequency: 'daily' },
    { title: 'Review investment portfolio', description: 'Check SIP performance and rebalance if needed', dueDate: fmt(addDays(today, 2)), priority: 'high', category: 'finance', status: 'pending', isRecurring: false },
    { title: 'Read Atomic Habits – Chapter 6', dueDate: fmt(addDays(today, 1)), priority: 'low', category: 'learning', status: 'pending', isRecurring: false },
    { title: 'Gym session – Push Day', dueDate: fmt(today), priority: 'medium', category: 'fitness', status: 'completed', isRecurring: false, completedAt: iso(today) },
    { title: 'Team standup', dueDate: fmt(today), priority: 'medium', category: 'work', status: 'completed', isRecurring: true, recurringFrequency: 'daily', completedAt: iso(today) },
    { title: 'Pay monthly bills', description: 'Electricity, internet, phone', dueDate: fmt(subDays(today, 2)), priority: 'high', category: 'finance', status: 'pending', isRecurring: false },
    { title: 'Call parents', dueDate: fmt(subDays(today, 1)), priority: 'high', category: 'personal', status: 'pending', isRecurring: false },
    { title: 'Plan weekend trip', dueDate: fmt(addDays(today, 5)), priority: 'low', category: 'personal', status: 'pending', isRecurring: false },
    { title: 'Update LinkedIn profile', dueDate: fmt(addDays(today, 7)), priority: 'low', category: 'work', status: 'pending', isRecurring: false },
    { title: 'Meal prep for the week', description: 'Prep protein sources and vegetables', dueDate: fmt(addDays(today, 3)), priority: 'medium', category: 'fitness', status: 'pending', isRecurring: false },
    { title: 'Review credit card statement', dueDate: fmt(subDays(today, 3)), priority: 'medium', category: 'finance', status: 'pending', isRecurring: false },
    { title: 'Deep clean apartment', dueDate: fmt(addDays(today, 6)), priority: 'low', category: 'personal', status: 'pending', isRecurring: false },
    { title: 'Learn TypeScript generics', dueDate: fmt(addDays(today, 4)), priority: 'medium', category: 'learning', status: 'pending', isRecurring: false },
    { title: 'Weekly review', description: 'Review tasks, habits, and goals from past week', dueDate: fmt(addDays(today, 2)), priority: 'high', category: 'productivity', status: 'pending', isRecurring: true, recurringFrequency: 'weekly' },
  ];

  const now = iso(today);
  await db.tasks.bulkAdd(tasks.map(t => ({
    ...t,
    priority: t.priority as 'high' | 'medium' | 'low',
    category: t.category as 'personal' | 'work' | 'fitness' | 'learning' | 'finance' | 'other',
    status: t.status as 'pending' | 'completed',
    recurringFrequency: t.recurringFrequency as 'daily' | 'weekly' | 'monthly' | undefined,
    createdAt: now,
    updatedAt: now,
  })));
}

async function seedHabits() {
  await db.habits.bulkAdd([
    { name: 'Morning Workout', description: 'Exercise for at least 30 minutes', category: 'fitness', frequency: 'daily', color: '#22c55e', icon: 'Dumbbell', isActive: true, order: 0, createdAt: iso(subDays(today, 20)) },
    { name: 'Read 20 mins', description: 'Read a book or learn something new', category: 'learning', frequency: 'daily', color: '#f59e0b', icon: 'BookOpen', isActive: true, order: 1, createdAt: iso(subDays(today, 20)) },
    { name: 'Meditate', description: '10 minutes of mindfulness', category: 'mindfulness', frequency: 'daily', color: '#8b5cf6', icon: 'Brain', isActive: true, order: 2, createdAt: iso(subDays(today, 20)) },
    { name: 'Track Calories', description: 'Log all meals in the nutrition tracker', category: 'fitness', frequency: 'daily', color: '#06b6d4', icon: 'UtensilsCrossed', isActive: true, order: 3, createdAt: iso(subDays(today, 20)) },
    { name: 'No screens after 10pm', description: 'Phone away 1 hour before sleep', category: 'productivity', frequency: 'daily', color: '#6366f1', icon: 'Moon', isActive: true, order: 4, createdAt: iso(subDays(today, 15)) },
    { name: 'Weekly Review', description: 'Review progress on goals and habits', category: 'productivity', frequency: 'weekly', timesPerWeek: 1, color: '#f97316', icon: 'ClipboardList', isActive: true, order: 5, createdAt: iso(subDays(today, 20)) },
  ]);
}

async function seedHabitCompletions() {
  const habits = await db.habits.toArray();
  const completions: { habitId: number; date: string; completedAt: string }[] = [];

  for (let i = 14; i >= 0; i--) {
    const date = fmt(subDays(today, i));
    for (const habit of habits) {
      if (!habit.id) continue;
      // Skip some days to create realistic streaks
      if (habit.name === 'Morning Workout' && [2, 5, 9].includes(i)) continue;
      if (habit.name === 'Read 20 mins' && [3, 10].includes(i)) continue;
      if (habit.name === 'Meditate' && [1, 4, 7, 11].includes(i)) continue;
      if (habit.name === 'Track Calories' && [6].includes(i)) continue;
      if (habit.name === 'No screens after 10pm' && [0, 3, 8].includes(i)) continue;
      if (habit.frequency === 'weekly' && i % 7 !== 0) continue;
      completions.push({ habitId: habit.id, date, completedAt: iso(subDays(today, i)) });
    }
  }
  if (completions.length) await db.habitCompletions.bulkAdd(completions);
}

async function seedExercises() {
  const count = await db.exercises.count();
  if (count > 0) return;

  const exercises = [
    // Chest
    { name: 'Bench Press', primaryMuscle: 'Chest', secondaryMuscles: ['Triceps', 'Front Delts'], equipment: 'barbell', type: 'compound', instructions: 'Lie flat on bench. Grip bar slightly wider than shoulder width. Lower bar to chest, press back up.', isCustom: false },
    { name: 'Incline Bench Press', primaryMuscle: 'Chest', secondaryMuscles: ['Triceps', 'Front Delts'], equipment: 'barbell', type: 'compound', instructions: 'Set bench to 30–45°. Press bar up at the same angle.', isCustom: false },
    { name: 'Dumbbell Flyes', primaryMuscle: 'Chest', secondaryMuscles: ['Front Delts'], equipment: 'dumbbell', type: 'isolation', instructions: 'Lie on bench, arms wide. Arc dumbbells together above chest.', isCustom: false },
    { name: 'Cable Crossover', primaryMuscle: 'Chest', secondaryMuscles: [], equipment: 'cable', type: 'isolation', instructions: 'Stand between cables. Pull handles together in front of chest.', isCustom: false },
    { name: 'Push-Up', primaryMuscle: 'Chest', secondaryMuscles: ['Triceps', 'Core'], equipment: 'bodyweight', type: 'compound', instructions: 'Hands shoulder-width apart. Lower chest to floor, press back up.', isCustom: false },
    { name: 'Decline Bench Press', primaryMuscle: 'Chest', secondaryMuscles: ['Triceps'], equipment: 'barbell', type: 'compound', instructions: 'Set bench to -15–30°. Press bar from lower chest.', isCustom: false },
    { name: 'Dip', primaryMuscle: 'Chest', secondaryMuscles: ['Triceps'], equipment: 'bodyweight', type: 'compound', instructions: 'Support on parallel bars. Lower by bending elbows. Press back up.', isCustom: false },
    // Back
    { name: 'Deadlift', primaryMuscle: 'Back', secondaryMuscles: ['Glutes', 'Hamstrings', 'Traps'], equipment: 'barbell', type: 'compound', instructions: 'Stand over bar. Hinge at hips, grip bar. Drive hips forward to stand.', isCustom: false },
    { name: 'Pull-Up', primaryMuscle: 'Back', secondaryMuscles: ['Biceps'], equipment: 'bodyweight', type: 'compound', instructions: 'Grip bar overhand. Pull chest to bar, lower controlled.', isCustom: false },
    { name: 'Barbell Row', primaryMuscle: 'Back', secondaryMuscles: ['Biceps', 'Rear Delts'], equipment: 'barbell', type: 'compound', instructions: 'Hinge forward 45°. Pull bar to lower chest.', isCustom: false },
    { name: 'Seated Cable Row', primaryMuscle: 'Back', secondaryMuscles: ['Biceps'], equipment: 'cable', type: 'compound', instructions: 'Sit at cable machine. Pull handle to abdomen.', isCustom: false },
    { name: 'Lat Pulldown', primaryMuscle: 'Back', secondaryMuscles: ['Biceps'], equipment: 'cable', type: 'compound', instructions: 'Grip bar wide overhand. Pull to upper chest.', isCustom: false },
    { name: 'Single-Arm Dumbbell Row', primaryMuscle: 'Back', secondaryMuscles: ['Biceps'], equipment: 'dumbbell', type: 'compound', instructions: 'Support on bench. Pull dumbbell to hip.', isCustom: false },
    { name: 'Face Pull', primaryMuscle: 'Back', secondaryMuscles: ['Rear Delts', 'Traps'], equipment: 'cable', type: 'isolation', instructions: 'Attach rope to high cable. Pull to face, elbows flare.', isCustom: false },
    { name: 'Hyperextension', primaryMuscle: 'Back', secondaryMuscles: ['Glutes', 'Hamstrings'], equipment: 'machine', type: 'isolation', instructions: 'Hinge at extension bench. Lower then raise torso.', isCustom: false },
    // Shoulders
    { name: 'Overhead Press', primaryMuscle: 'Shoulders', secondaryMuscles: ['Triceps', 'Upper Traps'], equipment: 'barbell', type: 'compound', instructions: 'Press bar from front rack overhead, fully extend arms.', isCustomy: false, isCustom: false },
    { name: 'Dumbbell Lateral Raise', primaryMuscle: 'Shoulders', secondaryMuscles: [], equipment: 'dumbbell', type: 'isolation', instructions: 'Raise arms to sides to shoulder height, slight elbow bend.', isCustom: false },
    { name: 'Arnold Press', primaryMuscle: 'Shoulders', secondaryMuscles: ['Triceps'], equipment: 'dumbbell', type: 'compound', instructions: 'Start palms facing you. Rotate and press dumbbells overhead.', isCustom: false },
    { name: 'Rear Delt Flye', primaryMuscle: 'Shoulders', secondaryMuscles: ['Traps'], equipment: 'dumbbell', type: 'isolation', instructions: 'Hinge 45° forward. Raise dumbbells to sides.', isCustom: false },
    { name: 'Front Raise', primaryMuscle: 'Shoulders', secondaryMuscles: [], equipment: 'dumbbell', type: 'isolation', instructions: 'Raise dumbbells in front to shoulder height.', isCustom: false },
    // Arms
    { name: 'Barbell Curl', primaryMuscle: 'Biceps', secondaryMuscles: ['Forearms'], equipment: 'barbell', type: 'isolation', instructions: 'Grip barbell shoulder-width. Curl to shoulder, squeeze.', isCustom: false },
    { name: 'Dumbbell Curl', primaryMuscle: 'Biceps', secondaryMuscles: ['Forearms'], equipment: 'dumbbell', type: 'isolation', instructions: 'Curl dumbbells alternately or together.', isCustom: false },
    { name: 'Hammer Curl', primaryMuscle: 'Biceps', secondaryMuscles: ['Brachialis', 'Forearms'], equipment: 'dumbbell', type: 'isolation', instructions: 'Neutral grip. Curl to shoulder.', isCustom: false },
    { name: 'Tricep Pushdown', primaryMuscle: 'Triceps', secondaryMuscles: [], equipment: 'cable', type: 'isolation', instructions: 'Push bar down from cable, fully extend.', isCustom: false },
    { name: 'Skull Crusher', primaryMuscle: 'Triceps', secondaryMuscles: [], equipment: 'barbell', type: 'isolation', instructions: 'Lie on bench. Lower bar to forehead, extend.', isCustom: false },
    { name: 'Overhead Tricep Extension', primaryMuscle: 'Triceps', secondaryMuscles: [], equipment: 'dumbbell', type: 'isolation', instructions: 'Hold dumbbell overhead, lower behind head, extend.', isCustom: false },
    // Legs
    { name: 'Squat', primaryMuscle: 'Legs', secondaryMuscles: ['Glutes', 'Core'], equipment: 'barbell', type: 'compound', instructions: 'Bar on back. Squat below parallel, drive through heels.', isCustom: false },
    { name: 'Romanian Deadlift', primaryMuscle: 'Legs', secondaryMuscles: ['Glutes', 'Lower Back'], equipment: 'barbell', type: 'compound', instructions: 'Hinge at hips, bar close to legs, feel hamstring stretch.', isCustom: false },
    { name: 'Leg Press', primaryMuscle: 'Legs', secondaryMuscles: ['Glutes'], equipment: 'machine', type: 'compound', instructions: 'Feet shoulder-width on plate. Push plate away, slight knee bend.', isCustom: false },
    { name: 'Bulgarian Split Squat', primaryMuscle: 'Legs', secondaryMuscles: ['Glutes'], equipment: 'dumbbell', type: 'compound', instructions: 'Rear foot elevated. Squat on front leg.', isCustom: false },
    { name: 'Leg Curl', primaryMuscle: 'Legs', secondaryMuscles: [], equipment: 'machine', type: 'isolation', instructions: 'Curl legs toward glutes against resistance.', isCustom: false },
    { name: 'Leg Extension', primaryMuscle: 'Legs', secondaryMuscles: [], equipment: 'machine', type: 'isolation', instructions: 'Extend legs against pad.', isCustom: false },
    { name: 'Calf Raise', primaryMuscle: 'Calves', secondaryMuscles: [], equipment: 'machine', type: 'isolation', instructions: 'Rise on toes, lower slowly.', isCustom: false },
    { name: 'Hip Thrust', primaryMuscle: 'Glutes', secondaryMuscles: ['Hamstrings'], equipment: 'barbell', type: 'compound', instructions: 'Shoulders on bench, barbell on hips. Drive hips to ceiling.', isCustom: false },
    { name: 'Lunge', primaryMuscle: 'Legs', secondaryMuscles: ['Glutes'], equipment: 'dumbbell', type: 'compound', instructions: 'Step forward, lower back knee to floor, push back.', isCustom: false },
    { name: 'Sumo Squat', primaryMuscle: 'Legs', secondaryMuscles: ['Inner Thighs', 'Glutes'], equipment: 'barbell', type: 'compound', instructions: 'Wide stance, toes turned out. Squat between heels.', isCustom: false },
    // Core
    { name: 'Plank', primaryMuscle: 'Core', secondaryMuscles: ['Shoulders'], equipment: 'bodyweight', type: 'compound', instructions: 'Hold forearm plank position, body straight.', isCustom: false },
    { name: 'Crunch', primaryMuscle: 'Core', secondaryMuscles: [], equipment: 'bodyweight', type: 'isolation', instructions: 'Lie on back, hands behind head, crunch forward.', isCustom: false },
    { name: 'Leg Raise', primaryMuscle: 'Core', secondaryMuscles: ['Hip Flexors'], equipment: 'bodyweight', type: 'isolation', instructions: 'Lie flat, raise legs to 90°, lower slowly.', isCustom: false },
    { name: 'Russian Twist', primaryMuscle: 'Core', secondaryMuscles: [], equipment: 'bodyweight', type: 'isolation', instructions: 'Sit at 45°, twist side to side.', isCustom: false },
    { name: 'Dead Bug', primaryMuscle: 'Core', secondaryMuscles: [], equipment: 'bodyweight', type: 'compound', instructions: 'Lower opposite arm/leg while keeping back flat.', isCustom: false },
    { name: 'Ab Wheel Rollout', primaryMuscle: 'Core', secondaryMuscles: ['Shoulders'], equipment: 'other', type: 'compound', instructions: 'Roll wheel forward, extend body, roll back.', isCustom: false },
    // Cardio
    { name: 'Treadmill Run', primaryMuscle: 'Cardio', secondaryMuscles: ['Legs'], equipment: 'machine', type: 'cardio', instructions: 'Set speed and incline. Maintain steady pace.', isCustom: false },
    { name: 'Stationary Bike', primaryMuscle: 'Cardio', secondaryMuscles: ['Legs'], equipment: 'machine', type: 'cardio', instructions: 'Set resistance. Maintain target heart rate.', isCustom: false },
    { name: 'Jump Rope', primaryMuscle: 'Cardio', secondaryMuscles: ['Calves', 'Shoulders'], equipment: 'other', type: 'cardio', instructions: 'Jump at steady pace. Wrists flick rope.', isCustom: false },
    { name: 'Rowing Machine', primaryMuscle: 'Cardio', secondaryMuscles: ['Back', 'Legs'], equipment: 'machine', type: 'cardio', instructions: 'Drive with legs first, lean back, pull arms.', isCustom: false },
    { name: 'Elliptical', primaryMuscle: 'Cardio', secondaryMuscles: ['Legs'], equipment: 'machine', type: 'cardio', instructions: 'Maintain smooth oval motion at target resistance.', isCustom: false },
    // Full Body
    { name: 'Burpee', primaryMuscle: 'Full Body', secondaryMuscles: [], equipment: 'bodyweight', type: 'compound', instructions: 'Drop to push-up, stand, jump with arms overhead.', isCustom: false },
    { name: 'Kettlebell Swing', primaryMuscle: 'Full Body', secondaryMuscles: ['Glutes', 'Hamstrings'], equipment: 'kettlebell', type: 'compound', instructions: 'Hinge, swing kettlebell between legs, drive to chest height.', isCustom: false },
    { name: 'Thruster', primaryMuscle: 'Full Body', secondaryMuscles: ['Shoulders', 'Legs'], equipment: 'barbell', type: 'compound', instructions: 'Front squat into overhead press in one motion.', isCustom: false },
    { name: 'Mountain Climber', primaryMuscle: 'Full Body', secondaryMuscles: ['Core'], equipment: 'bodyweight', type: 'cardio', instructions: 'Plank position. Drive knees alternately to chest.', isCustom: false },
  ];

  const now = iso(today);
  await db.exercises.bulkAdd(exercises.map(e => ({ ...e, equipment: e.equipment as any, type: e.type as any, createdAt: now })));
}

async function seedWorkouts() {
  const exercises = await db.exercises.where('primaryMuscle').anyOf(['Chest', 'Back', 'Legs']).toArray();
  const chestExercises = exercises.filter(e => e.primaryMuscle === 'Chest' && e.id).slice(0, 3);
  const backExercises = exercises.filter(e => e.primaryMuscle === 'Back' && e.id).slice(0, 3);
  const legExercises = exercises.filter(e => e.primaryMuscle === 'Legs' && e.id).slice(0, 3);

  const workoutDays = [1, 3, 5, 7, 9, 11, 13];
  const types = [
    { name: 'Push Day', exs: chestExercises },
    { name: 'Pull Day', exs: backExercises },
    { name: 'Leg Day', exs: legExercises },
    { name: 'Push Day', exs: chestExercises },
    { name: 'Pull Day', exs: backExercises },
    { name: 'Leg Day', exs: legExercises },
    { name: 'Full Body', exs: [...chestExercises.slice(0, 1), ...backExercises.slice(0, 1), ...legExercises.slice(0, 1)] },
  ];

  for (let i = 0; i < workoutDays.length; i++) {
    const workoutDate = subDays(today, workoutDays[i]);
    const workoutId = await db.workouts.add({
      name: types[i].name,
      date: fmt(workoutDate),
      startedAt: iso(workoutDate),
      completedAt: iso(workoutDate),
      duration: 55 + Math.floor(Math.random() * 20),
      status: 'completed',
      type: types[i].name,
    });

    const sets: any[] = [];
    for (const ex of types[i].exs) {
      if (!ex.id) continue;
      for (let s = 0; s < 3; s++) {
        const baseWeight = ex.primaryMuscle === 'Chest' ? 60 : ex.primaryMuscle === 'Back' ? 70 : 80;
        sets.push({
          workoutId: workoutId as number,
          exerciseId: ex.id,
          setNumber: s + 1,
          weight: baseWeight + (i * 2.5) + (s * 2.5),
          reps: 8 + Math.floor(Math.random() * 4),
          isCompleted: true,
          isPR: i === workoutDays.length - 1 && s === 2,
          createdAt: iso(workoutDate),
        });
      }
    }
    await db.workoutSets.bulkAdd(sets);
  }
}

async function seedBodyMeasurements() {
  const measurements: any[] = [];
  for (let i = 14; i >= 0; i--) {
    const d = fmt(subDays(today, i));
    const now = iso(subDays(today, i));
    measurements.push({ date: d, type: 'weight', value: parseFloat((80.2 - (14 - i) * 0.057).toFixed(1)), unit: 'kg', createdAt: now });
    if (i % 3 === 0) {
      measurements.push({ date: d, type: 'body_fat', value: parseFloat((18.5 - (14 - i) * 0.025).toFixed(1)), unit: '%', createdAt: now });
    }
  }
  await db.bodyMeasurements.bulkAdd(measurements);
}

async function seedNutritionLogs() {
  const logs: any[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = fmt(subDays(today, i));
    const now = iso(subDays(today, i));
    const totalCal = 1850 + Math.floor(Math.random() * 500);
    logs.push({
      date: d,
      meals: [
        {
          id: `m-${d}-b`,
          name: 'breakfast',
          foods: [{ id: `f-${d}-1`, customName: 'Oats with banana', calories: 380, protein: 12, carbs: 68, fat: 7, amount: 1, unit: 'serving' }],
        },
        {
          id: `m-${d}-l`,
          name: 'lunch',
          foods: [{ id: `f-${d}-2`, customName: 'Chicken rice bowl', calories: 620, protein: 48, carbs: 70, fat: 12, amount: 1, unit: 'serving' }],
        },
        {
          id: `m-${d}-d`,
          name: 'dinner',
          foods: [{ id: `f-${d}-3`, customName: 'Paneer curry with roti', calories: totalCal - 1000, protein: 30, carbs: 55, fat: 18, amount: 1, unit: 'serving' }],
        },
      ],
      waterMl: 2000 + Math.floor(Math.random() * 800),
      createdAt: now,
      updatedAt: now,
    });
  }
  await db.nutritionLogs.bulkAdd(logs);
}

async function seedFoodItems() {
  await db.foodItems.bulkAdd([
    { name: 'Oats (rolled)', category: 'grains', calories: 389, protein: 17, carbs: 66, fat: 7, fiber: 11, servingSize: 100, servingUnit: 'g', createdAt: iso(today) },
    { name: 'Chicken Breast', category: 'protein', calories: 165, protein: 31, carbs: 0, fat: 3.6, servingSize: 100, servingUnit: 'g', createdAt: iso(today) },
    { name: 'Paneer', category: 'protein', calories: 265, protein: 18, carbs: 1.2, fat: 21, servingSize: 100, servingUnit: 'g', createdAt: iso(today) },
    { name: 'Brown Rice', category: 'grains', calories: 216, protein: 5, carbs: 45, fat: 1.8, fiber: 3.5, servingSize: 100, servingUnit: 'g', createdAt: iso(today) },
    { name: 'Banana', category: 'fruits', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, servingSize: 118, servingUnit: 'g', createdAt: iso(today) },
    { name: 'Whole Milk', category: 'dairy', calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3, servingSize: 100, servingUnit: 'ml', createdAt: iso(today) },
    { name: 'Egg (whole)', category: 'protein', calories: 78, protein: 6, carbs: 0.6, fat: 5, servingSize: 1, servingUnit: 'piece', createdAt: iso(today) },
    { name: 'Almonds', category: 'nuts', calories: 579, protein: 21, carbs: 22, fat: 50, fiber: 12.5, servingSize: 100, servingUnit: 'g', createdAt: iso(today) },
    { name: 'Greek Yogurt', category: 'dairy', calories: 97, protein: 9, carbs: 3.6, fat: 5, servingSize: 100, servingUnit: 'g', createdAt: iso(today) },
    { name: 'Whey Protein (scoop)', category: 'protein', calories: 120, protein: 25, carbs: 3, fat: 1.5, servingSize: 1, servingUnit: 'scoop', createdAt: iso(today) },
  ]);
}

async function seedTransactions() {
  const transactions: any[] = [];
  const now = iso(today);

  // This month's salary
  transactions.push({ type: 'income', amount: 85000, currency: 'INR', date: fmt(subDays(today, 11)), category: 'salary', paymentMethod: 'bank_transfer', description: 'Monthly salary', isRecurring: true, recurringFrequency: 'monthly', createdAt: now, updatedAt: now });

  // Expenses spread across categories
  const expenses = [
    { amount: 15000, date: 1, category: 'bills', desc: 'Monthly rent', method: 'bank_transfer' },
    { amount: 2800, date: 2, category: 'groceries', desc: 'Big Basket weekly shop', method: 'upi' },
    { amount: 649, date: 3, category: 'subscriptions', desc: 'Netflix', method: 'card', isRecurring: true },
    { amount: 199, date: 3, category: 'subscriptions', desc: 'Spotify', method: 'card', isRecurring: true },
    { amount: 1200, date: 4, category: 'transport', desc: 'Petrol', method: 'cash' },
    { amount: 850, date: 5, category: 'food', desc: 'Dinner with friends – Zomato', method: 'upi' },
    { amount: 2200, date: 6, category: 'fitness', desc: 'Gym membership', method: 'upi', isRecurring: true },
    { amount: 3500, date: 7, category: 'shopping', desc: 'New running shoes', method: 'card' },
    { amount: 450, date: 8, category: 'food', desc: 'Swiggy lunch', method: 'upi' },
    { amount: 1500, date: 9, category: 'healthcare', desc: 'Monthly medicines', method: 'cash' },
    { amount: 800, date: 10, category: 'groceries', desc: 'Vegetables and fruits', method: 'cash' },
    { amount: 200, date: 10, category: 'transport', desc: 'Metro recharge', method: 'upi' },
    { amount: 1200, date: 11, category: 'entertainment', desc: 'Movie tickets (2)', method: 'card' },
    { amount: 350, date: 11, category: 'food', desc: 'Coffee shop', method: 'upi' },
    { amount: 500, date: 12, category: 'bills', desc: 'Electricity bill', method: 'upi' },
    { amount: 299, date: 13, category: 'subscriptions', desc: 'Amazon Prime', method: 'card' },
  ];

  for (const e of expenses) {
    transactions.push({
      type: 'expense', amount: e.amount, currency: 'INR',
      date: fmt(subDays(today, e.date)), category: e.category,
      paymentMethod: e.method as any,
      description: e.desc,
      isRecurring: (e as any).isRecurring || false,
      recurringFrequency: (e as any).isRecurring ? 'monthly' : undefined,
      createdAt: now, updatedAt: now,
    });
  }

  await db.transactions.bulkAdd(transactions);
}

async function seedBudgets() {
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  await db.budgets.bulkAdd([
    { year, month, category: 'food', limit: 5000, currency: 'INR', createdAt: iso(today), updatedAt: iso(today) },
    { year, month, category: 'groceries', limit: 6000, currency: 'INR', createdAt: iso(today), updatedAt: iso(today) },
    { year, month, category: 'transport', limit: 3000, currency: 'INR', createdAt: iso(today), updatedAt: iso(today) },
    { year, month, category: 'entertainment', limit: 2000, currency: 'INR', createdAt: iso(today), updatedAt: iso(today) },
    { year, month, category: 'shopping', limit: 5000, currency: 'INR', createdAt: iso(today), updatedAt: iso(today) },
  ]);
}

async function seedJournalEntries() {
  const entries: any[] = [];
  const moods = ['great', 'good', 'okay', 'good', 'bad', 'good', 'great'] as const;

  for (let i = 6; i >= 0; i--) {
    const d = fmt(subDays(today, i));
    const now = iso(subDays(today, i));
    const mood = moods[i];
    entries.push({
      date: d, type: 'entry', mood,
      freeText: `Day ${i + 1} of consistent tracking. Feeling ${mood} today. Workout was solid.`,
      templateAnswers: {
        wentWell: 'Completed all planned tasks and had a productive deep-work session.',
        improved: 'Spent too much time on social media in the morning.',
        learned: 'Read about habit stacking and compound interest in learning.',
        grateful: 'Grateful for good health, supportive team, and sunny weather.',
        tomorrowPriority: 'Complete the quarterly review and plan the weekend.',
      },
      gratitude: ['Good health', 'Supportive colleagues', 'Progress on goals'],
      wordCount: 85,
      createdAt: now, updatedAt: now,
    });
  }
  await db.journalEntries.bulkAdd(entries);
}

async function seedGoals() {
  const g1 = await db.goals.add({ title: 'Run 5K under 25 minutes', category: 'fitness', description: 'Build running endurance and speed', targetDate: fmt(addDays(today, 60)), status: 'active', color: '#22c55e', progressMode: 'milestones', createdAt: iso(today), updatedAt: iso(today) });
  const g2 = await db.goals.add({ title: 'Save ₹5 lakh emergency fund', category: 'finance', description: 'Build 6-month expense buffer', targetDate: fmt(addDays(today, 180)), status: 'active', color: '#6366f1', progressMode: 'milestones', createdAt: iso(today), updatedAt: iso(today) });
  const g3 = await db.goals.add({ title: 'Read 24 books this year', category: 'learning', description: '2 books per month', targetDate: fmt(new Date(today.getFullYear(), 11, 31)), status: 'active', color: '#f59e0b', progressMode: 'milestones', createdAt: iso(today), updatedAt: iso(today) });

  await db.milestones.bulkAdd([
    { goalId: g1 as number, title: 'Run 1km without stopping', status: 'completed', completedAt: iso(subDays(today, 10)), order: 0, createdAt: iso(today) },
    { goalId: g1 as number, title: 'Run 2.5km in one go', status: 'completed', completedAt: iso(subDays(today, 5)), order: 1, createdAt: iso(today) },
    { goalId: g1 as number, title: 'Complete first 5km run', status: 'pending', order: 2, createdAt: iso(today) },
    { goalId: g1 as number, title: 'Run 5km in under 28 mins', status: 'pending', order: 3, createdAt: iso(today) },
    { goalId: g2 as number, title: 'Save first ₹1 lakh', status: 'completed', completedAt: iso(subDays(today, 30)), order: 0, createdAt: iso(today) },
    { goalId: g2 as number, title: 'Reach ₹2.5 lakh', status: 'pending', order: 1, createdAt: iso(today) },
    { goalId: g2 as number, title: 'Reach ₹5 lakh target', status: 'pending', order: 2, createdAt: iso(today) },
    { goalId: g3 as number, title: 'Read 6 books (Q1)', status: 'completed', completedAt: iso(subDays(today, 20)), order: 0, createdAt: iso(today) },
    { goalId: g3 as number, title: 'Read 12 books (H1)', status: 'completed', completedAt: iso(subDays(today, 5)), order: 1, createdAt: iso(today) },
    { goalId: g3 as number, title: 'Read 18 books (9 months)', status: 'pending', order: 2, createdAt: iso(today) },
    { goalId: g3 as number, title: 'Complete all 24 books', status: 'pending', order: 3, createdAt: iso(today) },
  ]);
}

async function seedReminders() {
  await db.reminders.bulkAdd([
    { title: 'Take vitamins', description: 'Vitamin D + B12', scheduledAt: iso(addDays(today, 1)), repeat: 'daily', type: 'general', status: 'pending', createdAt: iso(today) },
    { title: 'Evening gym session', scheduledAt: new Date(today.setHours(18, 0, 0, 0)).toISOString(), repeat: 'once', type: 'general', status: 'pending', createdAt: iso(today) },
    { title: 'Call mom', scheduledAt: iso(addDays(today, 1)), repeat: 'once', type: 'general', status: 'pending', createdAt: iso(today) },
    { title: 'Rent payment due', scheduledAt: iso(addDays(today, 5)), repeat: 'monthly', type: 'general', status: 'pending', createdAt: iso(today) },
    { title: 'Team retrospective meeting', scheduledAt: iso(addDays(today, 3)), repeat: 'once', type: 'task', status: 'pending', createdAt: iso(today) },
  ]);
}

async function seedLearningItems() {
  const l1 = await db.learningItems.add({ type: 'book', title: 'Atomic Habits', author: 'James Clear', status: 'active', totalPages: 320, currentPage: 192, progress: 60, coverColor: '#f59e0b', takeaways: ['1% better every day compounds', 'Systems beat goals', 'Identity-based habits stick'], createdAt: iso(today), updatedAt: iso(today) });
  const l2 = await db.learningItems.add({ type: 'course', title: 'TypeScript Advanced Patterns', platform: 'Udemy', status: 'active', totalLessons: 48, completedLessons: 14, progress: 30, coverColor: '#3b82f6', takeaways: [], createdAt: iso(today), updatedAt: iso(today) });
  await db.learningItems.add({ type: 'skill', title: 'Spanish', status: 'active', progress: 15, coverColor: '#ef4444', takeaways: ['Basic greetings mastered', 'Present tense verbs'], createdAt: iso(today), updatedAt: iso(today) });
  await db.learningItems.add({ type: 'course', title: 'Financial Modeling', platform: 'CFA Institute', status: 'active', totalLessons: 25, completedLessons: 20, progress: 80, coverColor: '#22c55e', takeaways: ['DCF analysis', 'Three-statement model'], createdAt: iso(today), updatedAt: iso(today) });

  const sessions: any[] = [];
  for (let i = 0; i < 5; i++) {
    sessions.push({ learningItemId: l1 as number, date: fmt(subDays(today, i * 2)), durationMinutes: 35 + Math.floor(Math.random() * 25), progressDelta: 5, notes: 'Good reading session', createdAt: iso(subDays(today, i * 2)) });
    if (i < 3) sessions.push({ learningItemId: l2 as number, date: fmt(subDays(today, i * 3)), durationMinutes: 45, progressDelta: 2, createdAt: iso(subDays(today, i * 3)) });
  }
  await db.learningSessions.bulkAdd(sessions);
}
