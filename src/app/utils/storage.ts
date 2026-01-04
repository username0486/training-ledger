import { Workout } from '../types';
import { IncompleteExerciseSession } from '../types';

const WORKOUTS_KEY = 'workout_logs_workouts';
const INCOMPLETE_EXERCISE_KEY = 'workout_logs_incomplete_exercise';
const INCOMPLETE_WORKOUT_KEY = 'workout_logs_incomplete_workout';

export function saveWorkouts(workouts: Workout[]): void {
  try {
    localStorage.setItem(WORKOUTS_KEY, JSON.stringify(workouts));
  } catch (error) {
    console.error('Failed to save workouts:', error);
  }
}

export function loadWorkouts(): Workout[] {
  try {
    const data = localStorage.getItem(WORKOUTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load workouts:', error);
    return [];
  }
}

export function getUnfinishedWorkout(workouts: Workout[]): Workout | null {
  return workouts.find(w => !w.isComplete) || null;
}

export function saveIncompleteWorkoutId(workoutId: string | null): void {
  try {
    if (workoutId) {
      localStorage.setItem(INCOMPLETE_WORKOUT_KEY, workoutId);
    } else {
      localStorage.removeItem(INCOMPLETE_WORKOUT_KEY);
    }
  } catch (error) {
    console.error('Failed to save incomplete workout ID:', error);
  }
}

export function loadIncompleteWorkoutId(): string | null {
  try {
    return localStorage.getItem(INCOMPLETE_WORKOUT_KEY);
  } catch (error) {
    console.error('Failed to load incomplete workout ID:', error);
    return null;
  }
}

export function saveIncompleteExerciseSession(session: IncompleteExerciseSession | null): void {
  try {
    if (session) {
      localStorage.setItem(INCOMPLETE_EXERCISE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(INCOMPLETE_EXERCISE_KEY);
    }
  } catch (error) {
    console.error('Failed to save incomplete exercise session:', error);
  }
}

export function loadIncompleteExerciseSession(): IncompleteExerciseSession | null {
  try {
    const data = localStorage.getItem(INCOMPLETE_EXERCISE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to load incomplete exercise session:', error);
    return null;
  }
}

export function getWorkoutHistory(workouts: Workout[]): Workout[] {
  return workouts
    .filter(w => w.isComplete)
    .sort((a, b) => (b.endTime || 0) - (a.endTime || 0));
}

export function getExerciseHistory(workouts: Workout[]): Map<string, { lastPerformed: number; totalSets: number; workoutId: string }> {
  const history = new Map<string, { lastPerformed: number; totalSets: number; workoutId: string }>();
  
  workouts
    .filter(w => w.isComplete)
    .forEach(workout => {
      workout.exercises.forEach(exercise => {
        const existing = history.get(exercise.name);
        const lastPerformed = workout.endTime || 0;
        
        if (!existing || lastPerformed > existing.lastPerformed) {
          history.set(exercise.name, {
            lastPerformed,
            totalSets: exercise.sets.length,
            workoutId: workout.id,
          });
        }
      });
    });
  
  return history;
}

export function getLastSessionForExercise(exerciseName: string, workouts: Workout[]): { sets: Array<{ weight: number; reps: number }>; date: number } | null {
  const completedWorkouts = workouts
    .filter(w => w.isComplete && w.endTime)
    .sort((a, b) => (b.endTime || 0) - (a.endTime || 0));
  
  for (const workout of completedWorkouts) {
    const exercise = workout.exercises.find(ex => ex.name === exerciseName);
    if (exercise && exercise.sets.length > 0) {
      return {
        sets: exercise.sets.map(s => ({ weight: s.weight, reps: s.reps })),
        date: workout.endTime || 0,
      };
    }
  }
  
  return null;
}

export function getRecentSessionsForExercise(exerciseName: string, workouts: Workout[], limit: number = 5): Array<{ sets: Array<{ weight: number; reps: number }>; date: number; workoutName: string }> {
  const completedWorkouts = workouts
    .filter(w => w.isComplete && w.endTime)
    .sort((a, b) => (b.endTime || 0) - (a.endTime || 0));
  
  const sessions: Array<{ sets: Array<{ weight: number; reps: number }>; date: number; workoutName: string }> = [];
  
  for (const workout of completedWorkouts) {
    if (sessions.length >= limit) break;
    
    const exercise = workout.exercises.find(ex => ex.name === exerciseName);
    if (exercise && exercise.sets.length > 0) {
      sessions.push({
        sets: exercise.sets.map(s => ({ weight: s.weight, reps: s.reps })),
        date: workout.endTime || 0,
        workoutName: workout.name,
      });
    }
  }
  
  return sessions;
}

export function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(diff / 604800000);
  
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return `${weeks}w ago`;
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(diff / 604800000);
  const months = Math.floor(diff / 2592000000); // ~30 days
  const years = Math.floor(diff / 31536000000); // ~365 days
  
  if (minutes < 1) return 'just now';
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  if (weeks === 1) return '1 week ago';
  if (weeks < 4) return `${weeks} weeks ago`;
  if (months === 1) return '1 month ago';
  if (months < 12) return `${months} months ago`;
  if (years === 1) return '1 year ago';
  return `${years} years ago`;
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}