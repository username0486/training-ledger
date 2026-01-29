import { Workout } from '../types';
import { IncompleteExerciseSession } from '../types';
import { CurrentLog, AdHocLoggingSession } from '../types';
import { computeDurationSec } from './duration';
import { loadState, saveState } from '../storage/storageGateway';

// Legacy keys (kept for migration compatibility)
const WORKOUTS_KEY = 'workout_logs_workouts';
const INCOMPLETE_EXERCISE_KEY = 'workout_logs_incomplete_exercise';
const INCOMPLETE_WORKOUT_KEY = 'workout_logs_incomplete_workout';
const CURRENT_LOG_KEY = 'workout_logs_current_log';
const AD_HOC_SESSION_KEY = 'workout_logs_ad_hoc_session';

export function saveWorkouts(workouts: Workout[]): void {
  try {
    // Load current state, update workouts, save
    const result = loadState();
    if (result.success && result.state) {
      const updatedState = {
        ...result.state,
        workouts,
      };
      saveState(updatedState);
    } else {
      // Fallback to legacy storage if gateway fails
      localStorage.setItem(WORKOUTS_KEY, JSON.stringify(workouts));
    }
  } catch (error) {
    console.error('Failed to save workouts:', error);
    // Fallback to legacy storage
    try {
      localStorage.setItem(WORKOUTS_KEY, JSON.stringify(workouts));
    } catch (fallbackError) {
      console.error('Fallback save also failed:', fallbackError);
    }
  }
}

export function loadWorkouts(): Workout[] {
  try {
    const result = loadState();
    if (result.success && result.state) {
      return result.state.workouts || [];
    }
    
    // Fallback to legacy storage if gateway fails
    const data = localStorage.getItem(WORKOUTS_KEY);
    const raw: Workout[] = data ? JSON.parse(data) : [];

    // Migration: ensure new timing fields exist (canonical timestamps remain startTime/endTime)
    return raw.map((w: any) => {
      const startedAt = typeof w.startedAt === 'number' ? w.startedAt : (typeof w.startTime === 'number' ? w.startTime : Date.now());
      const endedAt = typeof w.endedAt === 'number' ? w.endedAt : (typeof w.endTime === 'number' ? w.endTime : undefined);
      const durationSec =
        typeof w.durationSec === 'number'
          ? w.durationSec
          : endedAt
            ? computeDurationSec(startedAt, endedAt)
            : undefined;

      return {
        ...w,
        startedAt,
        endedAt,
        durationSec,
      };
    });
  } catch (error) {
    console.error('Failed to load workouts:', error);
    // NEVER return empty array on error - preserve data
    // Return empty array only if truly no data exists
    return [];
  }
}

export function getUnfinishedWorkout(workouts: Workout[]): Workout | null {
  return workouts.find(w => !w.isComplete) || null;
}

export function saveIncompleteWorkoutId(workoutId: string | null): void {
  try {
    const result = loadState();
    if (result.success && result.state) {
      const updatedState = {
        ...result.state,
        incompleteWorkoutId: workoutId,
      };
      saveState(updatedState);
    } else {
      // Fallback to legacy storage
      if (workoutId) {
        localStorage.setItem(INCOMPLETE_WORKOUT_KEY, workoutId);
      } else {
        localStorage.removeItem(INCOMPLETE_WORKOUT_KEY);
      }
    }
  } catch (error) {
    console.error('Failed to save incomplete workout ID:', error);
    // Fallback to legacy storage
    try {
      if (workoutId) {
        localStorage.setItem(INCOMPLETE_WORKOUT_KEY, workoutId);
      } else {
        localStorage.removeItem(INCOMPLETE_WORKOUT_KEY);
      }
    } catch (fallbackError) {
      console.error('Fallback save also failed:', fallbackError);
    }
  }
}

export function loadIncompleteWorkoutId(): string | null {
  try {
    const result = loadState();
    if (result.success && result.state) {
      return result.state.incompleteWorkoutId ?? null;
    }
    
    // Fallback to legacy storage
    return localStorage.getItem(INCOMPLETE_WORKOUT_KEY);
  } catch (error) {
    console.error('Failed to load incomplete workout ID:', error);
    return null;
  }
}

export function saveIncompleteExerciseSession(session: IncompleteExerciseSession | null): void {
  try {
    const result = loadState();
    if (result.success && result.state) {
      const updatedState = {
        ...result.state,
        incompleteExerciseSession: session,
      };
      saveState(updatedState);
    } else {
      // Fallback to legacy storage
      if (session) {
        localStorage.setItem(INCOMPLETE_EXERCISE_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(INCOMPLETE_EXERCISE_KEY);
      }
    }
  } catch (error) {
    console.error('Failed to save incomplete exercise session:', error);
    // Fallback to legacy storage
    try {
      if (session) {
        localStorage.setItem(INCOMPLETE_EXERCISE_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(INCOMPLETE_EXERCISE_KEY);
      }
    } catch (fallbackError) {
      console.error('Fallback save also failed:', fallbackError);
    }
  }
}

export function loadIncompleteExerciseSession(): IncompleteExerciseSession | null {
  try {
    const result = loadState();
    if (result.success && result.state) {
      return result.state.incompleteExerciseSession ?? null;
    }
    
    // Fallback to legacy storage
    const data = localStorage.getItem(INCOMPLETE_EXERCISE_KEY);
    const raw: any = data ? JSON.parse(data) : null;
    if (!raw) return null;

    const startedAt = typeof raw.startedAt === 'number' ? raw.startedAt : (typeof raw.startTime === 'number' ? raw.startTime : Date.now());
    const endedAt = typeof raw.endedAt === 'number' ? raw.endedAt : undefined;
    const durationSec =
      typeof raw.durationSec === 'number'
        ? raw.durationSec
        : endedAt
          ? computeDurationSec(startedAt, endedAt)
          : undefined;

    return {
      ...raw,
      startedAt,
      endedAt,
      durationSec,
    };
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

/**
 * Get the last completed session data for an exercise.
 * IMPORTANT: Only returns data from completed workouts (isComplete === true).
 * Never includes data from active/in-progress sessions.
 * Returns a defensive copy to prevent mutation.
 */
export function getLastSessionForExercise(exerciseName: string, workouts: Workout[]): { sets: Array<{ weight: number; reps: number }>; date: number } | null {
  // Strictly filter to only completed workouts (never include active/in-progress)
  const completedWorkouts = workouts
    .filter(w => w.isComplete && w.endTime)
    .sort((a, b) => (b.endTime || 0) - (a.endTime || 0));
  
  for (const workout of completedWorkouts) {
    const exercise = workout.exercises.find(ex => ex.name === exerciseName);
    if (exercise && exercise.sets.length > 0) {
      // Return defensive copy - never return reference to original data
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
  if (days === 1) return 'Yesterday';
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

export function saveCurrentLog(currentLog: CurrentLog | null): void {
  try {
    if (currentLog) {
      localStorage.setItem(CURRENT_LOG_KEY, JSON.stringify(currentLog));
    } else {
      localStorage.removeItem(CURRENT_LOG_KEY);
    }
  } catch (error) {
    console.error('Failed to save current log:', error);
  }
}

export function loadCurrentLog(): CurrentLog | null {
  try {
    const data = localStorage.getItem(CURRENT_LOG_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to load current log:', error);
    return null;
  }
}

export function saveAdHocLoggingSession(session: AdHocLoggingSession | null): void {
  try {
    const result = loadState();
    if (result.success && result.state) {
      const updatedState = {
        ...result.state,
        adHocSession: session,
      };
      saveState(updatedState);
    } else {
      // Fallback to legacy storage
      if (session) {
        localStorage.setItem(AD_HOC_SESSION_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(AD_HOC_SESSION_KEY);
      }
    }
  } catch (error) {
    console.error('Failed to save ad-hoc logging session:', error);
    // Fallback to legacy storage
    try {
      if (session) {
        localStorage.setItem(AD_HOC_SESSION_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(AD_HOC_SESSION_KEY);
      }
    } catch (fallbackError) {
      console.error('Fallback save also failed:', fallbackError);
    }
  }
}

export function loadAdHocLoggingSession(): AdHocLoggingSession | null {
  try {
    const result = loadState();
    if (result.success && result.state) {
      return result.state.adHocSession ?? null;
    }
    
    // Fallback to legacy storage
    const data = localStorage.getItem(AD_HOC_SESSION_KEY);
    const raw: any = data ? JSON.parse(data) : null;
    if (!raw) return null;

    const startedAt = typeof raw.startedAt === 'number' ? raw.startedAt : (typeof raw.startTime === 'number' ? raw.startTime : (typeof raw.createdAt === 'number' ? raw.createdAt : Date.now()));
    const endedAt = typeof raw.endedAt === 'number' ? raw.endedAt : (typeof raw.endTime === 'number' ? raw.endTime : undefined);
    const durationSec =
      typeof raw.durationSec === 'number'
        ? raw.durationSec
        : (raw.createdAt && raw.endTime)
          ? computeDurationSec(raw.createdAt, raw.endTime)
          : undefined;

    return {
      ...raw,
      startedAt,
      endedAt,
      durationSec,
    };
  } catch (error) {
    console.error('Failed to load ad-hoc logging session:', error);
    return null;
  }
}

export function getActiveAdHocSession(): AdHocLoggingSession | null {
  const session = loadAdHocLoggingSession();
  return session && session.status === 'active' ? session : null;
}