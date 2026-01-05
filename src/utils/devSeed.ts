/**
 * DEVELOPMENT-ONLY mock data seeder
 * Generates deterministic, realistic workout history for testing/demos
 * 
 * USAGE:
 * - Only available in development mode (import.meta.env.DEV)
 * - Call seedAllDemoData() to populate data
 * - Call resetAndSeed() to wipe and reseed
 */

import { Workout, Exercise, Set } from '../app/types';
import { WorkoutTemplate } from '../app/types/templates';
import { saveWorkouts } from '../app/utils/storage';
import { saveTemplates } from '../app/utils/templateStorage';
import { addUserExercise } from './exerciseDb/user';
import { getAllExercisesList } from './exerciseDb';
import { normalizeExerciseName } from './exerciseDb/types';

// Fixed seed for deterministic generation
const SEED = 1337;

// Simple seeded RNG
class SeededRNG {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  pick<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }

  pickWeighted<T>(items: Array<{ item: T; weight: number }>): T {
    const total = items.reduce((sum, i) => sum + i.weight, 0);
    let random = this.next() * total;
    for (const { item, weight } of items) {
      random -= weight;
      if (random <= 0) return item;
    }
    return items[items.length - 1].item;
  }
}

// Common exercise names (will be matched against system exercises)
// Use anchor names to ensure consistency
const COMMON_EXERCISES = [
  'Bench Press',      // Anchor
  'Squat',            // Anchor
  'Deadlift',         // Anchor (or "Barbell Deadlift" if that exists)
  'Overhead Press',   // Anchor
  'Barbell Row',      // Anchor
  'Pull-up',          // Anchor
  'Lat Pulldown',     // Anchor
  'Dumbbell Row',
  'Romanian Deadlift',
  'Leg Press',
  'Leg Curl',
  'Leg Extension',
  'Lateral Raise',
  'Bicep Curl',
  'Tricep Extension',
  'Chest Fly',
  'Cable Fly',
  'Face Pull',
  'Hammer Curl',
  'Calf Raise',
];

// User-created messy names (to test duplicates/aliases)
const USER_CREATED_EXERCISES = [
  'Chest press machine',
  'Lat pull',
  'Ham curl',
  'Back machine',
  'Shoulder machine',
  'Leg machine',
];

// Workout templates
const TEMPLATE_DEFINITIONS = [
  {
    name: 'Upper A',
    exercises: ['Bench Press', 'Barbell Row', 'Overhead Press', 'Pull-up', 'Bicep Curl', 'Tricep Extension'],
  },
  {
    name: 'Lower A',
    exercises: ['Squat', 'Romanian Deadlift', 'Leg Press', 'Leg Curl', 'Leg Extension', 'Calf Raise'],
  },
  {
    name: 'Upper B',
    exercises: ['Overhead Press', 'Dumbbell Row', 'Chest Fly', 'Lat Pulldown', 'Lateral Raise', 'Hammer Curl'],
  },
  {
    name: 'Lower B',
    exercises: ['Deadlift', 'Front Squat', 'Leg Press', 'Leg Curl', 'Calf Raise', 'Plank'], // Uses anchor "Deadlift"
  },
  {
    name: 'Push',
    exercises: ['Bench Press', 'Overhead Press', 'Chest Fly', 'Tricep Extension', 'Lateral Raise'],
  },
  {
    name: 'Pull',
    exercises: ['Barbell Row', 'Pull-up', 'Lat Pulldown', 'Bicep Curl', 'Face Pull'],
  },
  {
    name: 'Legs',
    exercises: ['Squat', 'Romanian Deadlift', 'Leg Press', 'Leg Curl', 'Leg Extension', 'Calf Raise'],
  },
  {
    name: 'Full Body',
    exercises: ['Squat', 'Bench Press', 'Barbell Row', 'Overhead Press', 'Romanian Deadlift', 'Pull-up'],
  },
];

// Query affinities (query → exercise name)
const AFFINITY_MAPPINGS = [
  { query: 'chest press', exerciseName: 'Bench Press' },
  { query: 'back machine', exerciseName: 'Lat Pulldown' },
  { query: 'leg press', exerciseName: 'Leg Press' },
  { query: 'shoulder press', exerciseName: 'Overhead Press' },
  { query: 'lat pull', exerciseName: 'Lat Pulldown' },
  { query: 'row', exerciseName: 'Barbell Row' },
];

/**
 * Generate a set with realistic weight/reps
 */
function generateSet(rng: SeededRNG, exerciseName: string, baseWeight: number, baseReps: number, setNumber: number, timestamp: number): Set {
  // Slight variance in weight (±2.5kg)
  const weightVariance = rng.nextFloat(-2.5, 2.5);
  const weight = Math.max(0, Math.round((baseWeight + weightVariance) * 2) / 2); // Round to 0.5kg

  // Reps variance (±1 rep, but never below 1)
  const repsVariance = rng.nextInt(-1, 1);
  const reps = Math.max(1, baseReps + repsVariance);

  // Occasional missed reps (5% chance)
  const finalReps = rng.next() < 0.05 ? Math.max(1, reps - rng.nextInt(1, 3)) : reps;

  // Rest duration (60-180 seconds, increasing with set number)
  const restDuration = rng.nextInt(60 + setNumber * 10, 120 + setNumber * 20);

  return {
    id: `set_${timestamp}_${setNumber}_${rng.nextInt(1000, 9999)}`,
    weight,
    reps: finalReps,
    timestamp: timestamp + (setNumber - 1) * (restDuration * 1000), // Stagger timestamps
    restDuration,
  };
}

/**
 * Generate base weight/reps for an exercise (realistic starting points)
 */
function getBaseWeightReps(exerciseName: string): { weight: number; reps: number } {
  const normalized = normalizeExerciseName(exerciseName);
  
  // Compound movements - heavier
  if (normalized.includes('squat') || normalized.includes('deadlift')) {
    return { weight: 100, reps: 5 };
  }
  if (normalized.includes('bench press') || normalized.includes('bench')) {
    return { weight: 80, reps: 8 };
  }
  if (normalized.includes('row') || normalized.includes('overhead press')) {
    return { weight: 60, reps: 8 };
  }
  
  // Isolation movements - lighter
  if (normalized.includes('curl') || normalized.includes('extension') || normalized.includes('raise')) {
    return { weight: 15, reps: 12 };
  }
  
  // Machine exercises
  if (normalized.includes('leg press')) {
    return { weight: 150, reps: 10 };
  }
  if (normalized.includes('pulldown') || normalized.includes('lat pull')) {
    return { weight: 70, reps: 10 };
  }
  
  // Default
  return { weight: 30, reps: 10 };
}

/**
 * Generate a workout session
 */
function generateWorkout(
  rng: SeededRNG,
  template: WorkoutTemplate,
  startTime: number,
  isDeload: boolean = false
): Workout {
  const exercises: Exercise[] = [];
  let currentTime = startTime;
  const duration = rng.nextInt(45, 90); // 45-90 minutes
  const endTime = startTime + duration * 60 * 1000;

  for (const exerciseName of template.exerciseNames) {
    const { weight: baseWeight, reps: baseReps } = getBaseWeightReps(exerciseName);
    
    // Deload: reduce weight by 20%
    const weight = isDeload ? baseWeight * 0.8 : baseWeight;
    const reps = isDeload ? Math.max(5, baseReps - 2) : baseReps;
    
    const numSets = rng.nextInt(3, 5);
    const sets: Set[] = [];
    
    // Progressive overload: slight weight increase per set (for compound movements)
    const isCompound = ['squat', 'deadlift', 'bench', 'press', 'row'].some(term => 
      normalizeExerciseName(exerciseName).includes(term)
    );
    const weightProgression = isCompound ? 2.5 : 0;

    for (let i = 1; i <= numSets; i++) {
      const setWeight = weight + (i - 1) * weightProgression;
      sets.push(generateSet(rng, exerciseName, setWeight, reps, i, currentTime));
      currentTime += rng.nextInt(60, 180) * 1000; // Rest between sets
    }

    exercises.push({
      id: `ex_${startTime}_${exercises.length}_${rng.nextInt(1000, 9999)}`,
      name: exerciseName,
      sets,
      isComplete: true,
    });
  }

  return {
    id: `workout_${startTime}_${rng.nextInt(1000, 9999)}`,
    name: template.name,
    exercises,
    startTime,
    endTime,
    isComplete: true,
  };
}

/**
 * Find or create exercise by name
 */
function findOrCreateExercise(exerciseName: string): string {
  const allExercises = getAllExercisesList();
  const normalized = normalizeExerciseName(exerciseName);
  
  // Try to find existing exercise
  const existing = allExercises.find(ex => normalizeExerciseName(ex.name) === normalized);
  if (existing) {
    return existing.id;
  }
  
  // Create user exercise if not found
  try {
    const userExercise = addUserExercise(exerciseName);
    return userExercise.id;
  } catch (error) {
    // Exercise might already exist (race condition), try to find again
    const retry = getAllExercisesList().find(ex => normalizeExerciseName(ex.name) === normalized);
    return retry?.id || `usr:${crypto.randomUUID()}`;
  }
}

/**
 * Seed workout templates
 */
function seedTemplates(rng: SeededRNG): WorkoutTemplate[] {
  const templates: WorkoutTemplate[] = [];
  const baseTime = Date.now() - 60 * 24 * 60 * 60 * 1000; // 60 days ago

  TEMPLATE_DEFINITIONS.forEach((def, index) => {
    templates.push({
      id: `template_${baseTime + index * 1000}`,
      name: def.name,
      exerciseNames: def.exercises,
      createdAt: baseTime + index * 1000,
      updatedAt: baseTime + index * 1000,
    });
  });

  saveTemplates(templates);
  return templates;
}

/**
 * Seed workouts (4-8 weeks of history)
 */
function seedWorkouts(rng: SeededRNG, templates: WorkoutTemplate[]): Workout[] {
  const workouts: Workout[] = [];
  const now = Date.now();
  const weeksAgo = 6; // 6 weeks of history
  const startDate = now - weeksAgo * 7 * 24 * 60 * 60 * 1000;

  let currentDate = startDate;
  let workoutCount = 0;

  while (currentDate < now) {
    // 3-5 sessions per week
    const sessionsThisWeek = rng.nextInt(3, 5);
    
    for (let i = 0; i < sessionsThisWeek; i++) {
      // Space sessions 1-3 days apart
      const daysOffset = i === 0 ? 0 : rng.nextInt(1, 3);
      currentDate += daysOffset * 24 * 60 * 60 * 1000;
      
      // Skip some days (10% chance)
      if (rng.next() < 0.1) {
        currentDate += 24 * 60 * 60 * 1000;
        continue;
      }

      // Pick a template
      const template = rng.pick(templates);
      
      // Occasional deload (15% chance)
      const isDeload = rng.next() < 0.15;
      
      // Time of day (morning: 6-9am, afternoon: 12-3pm, evening: 5-8pm)
      const timeOfDay = rng.pick([
        { start: 6, end: 9 },
        { start: 12, end: 15 },
        { start: 17, end: 20 },
      ]);
      const hour = rng.nextInt(timeOfDay.start, timeOfDay.end);
      const minute = rng.nextInt(0, 59);
      
      const workoutTime = new Date(currentDate);
      workoutTime.setHours(hour, minute, 0, 0);
      
      const workout = generateWorkout(rng, template, workoutTime.getTime(), isDeload);
      workouts.push(workout);
      workoutCount++;
    }

    // Move to next week
    currentDate += (7 - sessionsThisWeek) * 24 * 60 * 60 * 1000;
  }

  saveWorkouts(workouts);
  return workouts;
}

/**
 * Seed user-created exercises
 */
function seedUserExercises(rng: SeededRNG): void {
  USER_CREATED_EXERCISES.forEach(name => {
    try {
      addUserExercise(name);
    } catch (error) {
      // Exercise might already exist, skip
    }
  });
}

/**
 * Update usage stats based on workout history
 */
function seedUsageStats(workouts: Workout[]): void {
  // Dynamic import to avoid circular dependencies
  const exerciseUsageStats = require('./exerciseUsageStats');
  const exerciseUsage = new Map<string, { count: number; lastUsed: number; templateId?: string }>();

  workouts.forEach(workout => {
    workout.exercises.forEach(exercise => {
      const exerciseId = findOrCreateExercise(exercise.name);
      const existing = exerciseUsage.get(exerciseId) || { count: 0, lastUsed: 0 };
      
      exerciseUsage.set(exerciseId, {
        count: existing.count + 1,
        lastUsed: Math.max(existing.lastUsed, workout.endTime || workout.startTime),
        templateId: workout.name, // Use workout name as template identifier
      });
    });
  });

  // Record usage for each exercise
  exerciseUsage.forEach((usage, exerciseId) => {
    // Record multiple times to build up useCount
    for (let i = 0; i < usage.count; i++) {
      exerciseUsageStats.recordUsage(exerciseId, usage.templateId);
    }
  });
}

/**
 * Seed query affinities
 */
function seedAffinities(rng: SeededRNG): void {
  // Dynamic import to avoid circular dependencies
  const exerciseAffinity = require('./exerciseAffinity');
  
  AFFINITY_MAPPINGS.forEach(({ query, exerciseName }) => {
    const exerciseId = findOrCreateExercise(exerciseName);
    if (exerciseId) {
      // Record affinity multiple times to build up score
      for (let i = 0; i < rng.nextInt(3, 8); i++) {
        exerciseAffinity.recordAffinity(query, exerciseId);
      }
    }
  });
}

/**
 * Reset all demo data (wipe and reseed)
 */
export function resetAndSeed(): void {
  if (import.meta.env.PROD) {
    return;
  }

  if (import.meta.env.DEV) {
    console.log('[DevSeed] Resetting and seeding demo data...');
  }
  
  // Clear existing data
  localStorage.removeItem('workout_logs_workouts');
  localStorage.removeItem('workout_logs_templates');
  localStorage.removeItem('exercise.usage.stats');
  localStorage.removeItem('exercise.search.affinity');
  localStorage.removeItem('exercise.search.recent');
  localStorage.removeItem('exercise.aliases');
  
  // Seed fresh data
  seedAllDemoData();
  
  if (import.meta.env.DEV) {
    console.log('[DevSeed] Demo data seeded successfully');
  }
}

/**
 * Seed all demo data (idempotent - won't create duplicates)
 */
export function seedAllDemoData(): void {
  if (import.meta.env.PROD) {
    return;
  }

  if (import.meta.env.DEV) {
    console.log('[DevSeed] Seeding demo data...');
  }
  
  const rng = new SeededRNG(SEED);
  
  // 1. Seed user-created exercises
  seedUserExercises(rng);
  
  // 2. Seed templates
  const templates = seedTemplates(rng);
  
  // 3. Seed workouts
  const workouts = seedWorkouts(rng, templates);
  
  // 4. Update usage stats
  seedUsageStats(workouts);
  
  // 5. Seed affinities
  seedAffinities(rng);
  
  if (import.meta.env.DEV) {
    console.log(`[DevSeed] Seeded ${templates.length} templates, ${workouts.length} workouts`);
  }
}

/**
 * Check if demo data is already seeded
 */
export function isDemoDataSeeded(): boolean {
  // Dynamic import to avoid circular dependencies
  const storage = require('../app/utils/storage');
  const templateStorage = require('../app/utils/templateStorage');
  const workouts = storage.loadWorkouts();
  const templates = templateStorage.loadTemplates();
  return workouts.length > 0 || templates.length > 0;
}

