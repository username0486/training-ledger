export interface Exercise {
  id: string;
  name: string;
  sets: Set[];
  isComplete?: boolean;
  groupId?: string | null; // exercises with same groupId are grouped (superset/tri-set)
  lastSetAt?: number; // timestamp of last set logged for this exercise (for rest timer)
}

export interface Set {
  id: string;
  weight: number;
  reps: number;
  timestamp: number;
  restDuration?: number; // Rest duration in seconds before this set
  supersetSetId?: string; // UUID shared by all sets created in one "Add set" action
}

export interface Workout {
  id: string;
  name: string;
  exercises: Exercise[];
  startTime: number;
  endTime?: number;
  startedAt: number; // persisted session start timestamp (ms)
  endedAt?: number; // persisted session end timestamp (ms)
  durationSec?: number; // persisted total duration in seconds
  isComplete: boolean;
  isUserNamed?: boolean; // Flag to prevent auto-naming override
  sessionType?: 'exercise' | 'workout'; // Classification: exercise (1) or workout (2+)
  templateId?: string; // Reference to WorkoutTemplate if created from template
  lastSetAt?: number | null; // session-level timestamp of most recent set logged
  lastSetOwnerId?: string | null; // exercise instance ID or group ID that owns the most recent set
}

export interface IncompleteExerciseSession {
  exerciseName: string;
  sets: Set[];
  startTime: number;
  startedAt: number; // persisted session start timestamp (ms)
  endedAt?: number; // persisted session end timestamp (ms)
  durationSec?: number; // persisted total duration in seconds
  lastSetAt?: number | null; // session-level timestamp of most recent set logged
  lastSetOwnerId?: string | null; // exercise instance ID (always the same exercise for single-exercise sessions)
  restTimerStart?: number | null; // DEPRECATED: kept for migration, use lastSetAt instead
}

export interface ExerciseHistory {
  exerciseId: string;
  name: string;
  lastPerformed: number;
  totalSets: number;
  workoutId: string;
}

export interface CurrentLog {
  id: string;
  createdAt: number;
  exercises: Array<{
    exerciseId: string;
    name: string;
    source: 'system' | 'user';
    addedAt: number;
  }>;
}

export interface AdHocLoggingSession {
  id: string;
  createdAt: number;
  status: 'active' | 'completed' | 'abandoned';
  exerciseOrder: string[]; // Array of exercise instance IDs
  exercises: Array<{
    id: string; // exercise instance ID
    exerciseId: string; // reference to exercise DB
    name: string;
    source: 'system' | 'user';
    addedAt: number;
    sets: Set[];
    isComplete?: boolean;
    groupId?: string | null; // exercises with same groupId are grouped (superset/tri-set)
    lastSetAt?: number; // timestamp of last set logged for this exercise (for rest timer)
  }>;
  startTime: number;
  endTime?: number;
  startedAt: number; // persisted session start timestamp (ms)
  endedAt?: number; // persisted session end timestamp (ms)
  durationSec?: number; // persisted total duration in seconds
  lastSetAt?: number | null; // session-level timestamp of most recent set logged
  lastSetOwnerId?: string | null; // exercise instance ID or group ID that owns the most recent set
  groups?: { [groupId: string]: { createdAt: number } }; // optional helper map
  name?: string; // User-editable session name
  isUserNamed?: boolean; // Flag to prevent auto-naming override
  sessionType?: 'exercise' | 'workout'; // Classification: exercise (1) or workout (2+)
}

export type Screen = 
  | { type: 'home' }
  | { type: 'workout-session'; workoutId: string }
  | { type: 'exercise-session'; exerciseName: string; previousScreen?: AppScreen }
  | { type: 'workout-summary'; workoutId: string; isJustCompleted?: boolean; isSingleExercise?: boolean; previousScreen?: AppScreen }
  | { type: 'history'; searchQuery?: string; scrollPosition?: number; restoreKey?: number }
  | { type: 'settings'; previousScreen?: AppScreen }
  | { type: 'backups-and-data'; previousScreen?: AppScreen }
  | { type: 'start-logging' }
  | { type: 'ad-hoc-session'; sessionId: string };