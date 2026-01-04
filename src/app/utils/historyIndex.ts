import { Workout } from '../types';

export type TimeBucket = 
  | { type: 'this-week' }
  | { type: 'this-month' }
  | { type: 'month'; year: number; month: number }
  | { type: 'year'; year: number };

export interface WorkoutBucket {
  bucket: TimeBucket;
  workouts: Workout[];
  isExpanded: boolean;
}

export interface HistoryIndex {
  buckets: WorkoutBucket[];
  totalCount: number;
}

/**
 * Groups workouts into time-based buckets
 * Returns buckets in reverse chronological order (most recent first)
 */
export function createHistoryIndex(workouts: Workout[]): HistoryIndex {
  const now = new Date();
  const buckets = new Map<string, WorkoutBucket>();

  const completedWorkouts = workouts.filter(w => w.isComplete);

  completedWorkouts.forEach(workout => {
    const workoutDate = new Date(workout.endTime || workout.startTime);
    const bucket = getTimeBucket(workoutDate, now);
    const bucketKey = getBucketKey(bucket);

    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, {
        bucket,
        workouts: [],
        isExpanded: false, // Start collapsed
      });
    }

    buckets.get(bucketKey)!.workouts.push(workout);
  });

  // Sort workouts within each bucket (most recent first)
  buckets.forEach(bucket => {
    bucket.workouts.sort((a, b) => 
      (b.endTime || 0) - (a.endTime || 0)
    );
  });

  // Convert to array and sort buckets chronologically (most recent first)
  const bucketArray = Array.from(buckets.values()).sort((a, b) => 
    compareBuckets(b.bucket, a.bucket) // Reverse for most recent first
  );

  // Expand "This Week" and "This Month" by default
  bucketArray.forEach(b => {
    if (b.bucket.type === 'this-week' || b.bucket.type === 'this-month') {
      b.isExpanded = true;
    }
  });

  return {
    buckets: bucketArray,
    totalCount: completedWorkouts.length,
  };
}

/**
 * Determines which time bucket a workout date belongs to
 */
function getTimeBucket(date: Date, now: Date): TimeBucket {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Start of week (Sunday)

  const diffDays = Math.floor((startOfToday.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    // Future date, put in this week
    return { type: 'this-week' };
  }

  if (diffDays <= 6) {
    return { type: 'this-week' };
  }

  // Check if same month
  if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) {
    return { type: 'this-month' };
  }

  // Specific month/year
  return { type: 'month', year: date.getFullYear(), month: date.getMonth() };
}

/**
 * Generates a unique key for a time bucket
 */
export function getBucketKey(bucket: TimeBucket): string {
  switch (bucket.type) {
    case 'this-week':
      return 'this-week';
    case 'this-month':
      return 'this-month';
    case 'month':
      return `month-${bucket.year}-${bucket.month}`;
    case 'year':
      return `year-${bucket.year}`;
  }
}

/**
 * Compares two time buckets for sorting
 */
function compareBuckets(a: TimeBucket, b: TimeBucket): number {
  const getBucketDate = (bucket: TimeBucket): Date => {
    const now = new Date();
    switch (bucket.type) {
      case 'this-week':
      case 'this-month':
        return now;
      case 'month':
        return new Date(bucket.year, bucket.month, 1);
      case 'year':
        return new Date(bucket.year, 0, 1);
    }
  };

  return getBucketDate(a).getTime() - getBucketDate(b).getTime();
}

/**
 * Formats a bucket label for display
 */
export function formatBucketLabel(bucket: TimeBucket): string {
  const now = new Date();
  switch (bucket.type) {
    case 'this-week':
      return 'This Week';
    case 'this-month':
      return 'This Month';
    case 'month':
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      if (bucket.year === now.getFullYear()) {
        return monthNames[bucket.month];
      }
      return `${monthNames[bucket.month]} ${bucket.year}`;
    case 'year':
      return bucket.year.toString();
  }
}

/**
 * Finds workouts containing a specific exercise
 * Returns workouts sorted by most recent first
 */
export function findWorkoutsByExercise(
  workouts: Workout[],
  exerciseName: string
): Workout[] {
  const searchTerm = exerciseName.toLowerCase().trim();
  
  return workouts
    .filter(w => w.isComplete)
    .filter(workout => 
      workout.exercises.some(ex => 
        ex.name.toLowerCase().includes(searchTerm)
      )
    )
    .sort((a, b) => (b.endTime || 0) - (a.endTime || 0));
}

/**
 * Gets all unique months/years that have workouts for time navigation
 */
export function getAvailableTimePeriods(workouts: Workout[]): Array<{ year: number; month: number }> {
  const periods = new Set<string>();
  const completedWorkouts = workouts.filter(w => w.isComplete);

  completedWorkouts.forEach(workout => {
    const date = new Date(workout.endTime || workout.startTime);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    periods.add(key);
  });

  return Array.from(periods)
    .map(key => {
      const [year, month] = key.split('-').map(Number);
      return { year, month };
    })
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
}

