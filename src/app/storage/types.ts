// Storage schema types
import { Workout } from '../types';
import { WorkoutTemplate } from '../types/templates';
import { AdHocLoggingSession, IncompleteExerciseSession } from '../types';

export interface AppState {
  workouts: Workout[];
  templates: WorkoutTemplate[];
  incompleteExerciseSession: IncompleteExerciseSession | null;
  incompleteWorkoutId: string | null;
  adHocSession: AdHocLoggingSession | null;
}

export interface StorageSchema {
  schemaVersion: number;
  data: AppState;
}

export interface StorageLoadResult {
  success: boolean;
  state?: AppState;
  error?: string;
  rawData?: string; // Preserved raw data for recovery
}
