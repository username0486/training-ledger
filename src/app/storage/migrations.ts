// Migration functions - forward-only, non-destructive
import { StorageSchema, AppState } from './types';
import { computeDurationSec } from '../utils/duration';

const CURRENT_SCHEMA_VERSION = 2;

/**
 * Migrate from v1 (legacy format) to v2 (unified schema)
 * v1: Multiple localStorage keys, no schema version
 * v2: Single unified schema with versioning
 */
export function migrate_v1_to_v2(rawData: any): StorageSchema {
  // v1 had separate keys, so we need to load from legacy keys
  // This migration is called when we detect no schemaVersion
  const workouts: any[] = [];
  const templates: any[] = [];
  let incompleteExerciseSession: any = null;
  let incompleteWorkoutId: string | null = null;
  let adHocSession: any = null;

  // Try to load from legacy keys
  try {
    const workoutsData = localStorage.getItem('workout_logs_workouts');
    if (workoutsData) {
      const parsed = JSON.parse(workoutsData);
      if (Array.isArray(parsed)) {
        workouts.push(...parsed);
      }
    }
  } catch (e) {
    console.warn('[Migration] Failed to load legacy workouts:', e);
  }

  try {
    const templatesData = localStorage.getItem('workout_logs_templates');
    if (templatesData) {
      const parsed = JSON.parse(templatesData);
      if (Array.isArray(parsed)) {
        templates.push(...parsed);
      }
    }
  } catch (e) {
    console.warn('[Migration] Failed to load legacy templates:', e);
  }

  try {
    const exerciseData = localStorage.getItem('workout_logs_incomplete_exercise');
    if (exerciseData) {
      incompleteExerciseSession = JSON.parse(exerciseData);
    }
  } catch (e) {
    console.warn('[Migration] Failed to load legacy incomplete exercise:', e);
  }

  try {
    const workoutId = localStorage.getItem('workout_logs_incomplete_workout');
    if (workoutId) {
      incompleteWorkoutId = workoutId;
    }
  } catch (e) {
    console.warn('[Migration] Failed to load legacy incomplete workout ID:', e);
  }

  try {
    const sessionData = localStorage.getItem('workout_logs_ad_hoc_session');
    if (sessionData) {
      adHocSession = JSON.parse(sessionData);
    }
  } catch (e) {
    console.warn('[Migration] Failed to load legacy ad-hoc session:', e);
  }

  // Migrate workouts: ensure timing fields exist
  const migratedWorkouts = workouts.map((w: any) => {
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

  // Migrate incomplete exercise session: ensure timing fields exist
  let migratedExerciseSession = incompleteExerciseSession;
  if (incompleteExerciseSession) {
    const startedAt = typeof incompleteExerciseSession.startedAt === 'number' 
      ? incompleteExerciseSession.startedAt 
      : (typeof incompleteExerciseSession.startTime === 'number' ? incompleteExerciseSession.startTime : Date.now());
    const endedAt = typeof incompleteExerciseSession.endedAt === 'number' ? incompleteExerciseSession.endedAt : undefined;
    const durationSec =
      typeof incompleteExerciseSession.durationSec === 'number'
        ? incompleteExerciseSession.durationSec
        : endedAt
          ? computeDurationSec(startedAt, endedAt)
          : undefined;

    migratedExerciseSession = {
      ...incompleteExerciseSession,
      startedAt,
      endedAt,
      durationSec,
    };
  }

  // Migrate ad-hoc session: ensure timing fields exist
  let migratedAdHocSession = adHocSession;
  if (adHocSession) {
    const startedAt = typeof adHocSession.startedAt === 'number' 
      ? adHocSession.startedAt 
      : (typeof adHocSession.startTime === 'number' ? adHocSession.startTime : (typeof adHocSession.createdAt === 'number' ? adHocSession.createdAt : Date.now()));
    const endedAt = typeof adHocSession.endedAt === 'number' ? adHocSession.endedAt : (typeof adHocSession.endTime === 'number' ? adHocSession.endTime : undefined);
    const durationSec =
      typeof adHocSession.durationSec === 'number'
        ? adHocSession.durationSec
        : (adHocSession.createdAt && adHocSession.endTime)
          ? computeDurationSec(adHocSession.createdAt, adHocSession.endTime)
          : undefined;

    migratedAdHocSession = {
      ...adHocSession,
      startedAt,
      endedAt,
      durationSec,
    };
  }

  return {
    schemaVersion: 2,
    data: {
      workouts: migratedWorkouts,
      templates,
      incompleteExerciseSession: migratedExerciseSession,
      incompleteWorkoutId,
      adHocSession: migratedAdHocSession,
    },
  };
}

/**
 * Get current schema version
 */
export function getCurrentSchemaVersion(): number {
  return CURRENT_SCHEMA_VERSION;
}

/**
 * Run migrations sequentially from current version to target version
 */
export function migrateSchema(schema: StorageSchema | null, targetVersion: number = CURRENT_SCHEMA_VERSION): StorageSchema {
  if (!schema || !schema.schemaVersion) {
    // No schema version = v1 (legacy)
    schema = migrate_v1_to_v2(null);
  }

  let currentVersion = schema.schemaVersion;

  // Run migrations sequentially
  while (currentVersion < targetVersion) {
    if (currentVersion === 1) {
      schema = migrate_v1_to_v2(null);
      currentVersion = 2;
    } else {
      // No more migrations defined yet
      break;
    }
  }

  return schema;
}
