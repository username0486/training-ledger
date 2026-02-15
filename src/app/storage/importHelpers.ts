/**
 * Import helpers: parse, validate, preview, merge/replace
 */
import { StorageSchema, AppState } from './types';
import { migrateSchema, getCurrentSchemaVersion } from './migrations';

export interface ImportPreview {
  workouts: number;
  exercises: number;
  sessions: number;
  sets: number;
  templates: number;
  schemaVersion: number;
  detectedVersion: 'current' | 'legacy' | number;
}

export interface ParseResult {
  success: boolean;
  error?: string;
  schema?: StorageSchema;
  state?: AppState;
  preview?: ImportPreview;
}

/**
 * Parse and validate JSON. Returns parsed state + preview or error.
 */
export function parseAndValidateImport(json: string): ParseResult {
  try {
    const parsed = JSON.parse(json);

    if (typeof parsed !== 'object' || parsed === null) {
      return {
        success: false,
        error: 'Imported data is not an object',
      };
    }

    // Validate we have a recognizable structure (avoid migrateSchema loading from localStorage)
    if (!parsed.data && !parsed.workouts) {
      return {
        success: false,
        error: 'Imported data structure is invalid (missing data or workouts)',
      };
    }

    // Normalize legacy: top-level workouts without data wrapper
    let toMigrate = parsed;
    if (!parsed.schemaVersion && parsed.workouts && !parsed.data) {
      toMigrate = {
        schemaVersion: 1,
        data: {
          workouts: parsed.workouts,
          templates: parsed.templates || [],
          incompleteExerciseSession: null,
          incompleteWorkoutId: null,
          adHocSession: null,
        },
      };
    } else if (!parsed.schemaVersion && parsed.data) {
      toMigrate = { ...parsed, schemaVersion: 1 };
    }

    const rawVersion = toMigrate.schemaVersion;
    const detectedVersion: ImportPreview['detectedVersion'] =
      typeof rawVersion === 'number' ? rawVersion : 'legacy';

    // Migrate if needed
    let schema: StorageSchema;
    try {
      schema = migrateSchema(toMigrate, getCurrentSchemaVersion());
    } catch (migrationError) {
      return {
        success: false,
        error: `Migration failed: ${migrationError}`,
      };
    }

    // Validate structure
    if (!schema.data || typeof schema.data !== 'object') {
      return {
        success: false,
        error: 'Imported data structure is invalid',
      };
    }

    const workouts = Array.isArray(schema.data.workouts) ? schema.data.workouts : [];
    const templates = Array.isArray(schema.data.templates) ? schema.data.templates : [];

    const exerciseCount = workouts.reduce(
      (sum, w) => sum + (Array.isArray(w.exercises) ? w.exercises.length : 0),
      0
    );
    const setCount = workouts.reduce(
      (sum, w) =>
        sum +
        (Array.isArray(w.exercises)
          ? w.exercises.reduce(
              (s, ex) => s + (Array.isArray(ex.sets) ? ex.sets.length : 0),
              0
            )
          : 0),
      0
    );

    // Ad-hoc session contributes exercises/sets
    const adHoc = schema.data.adHocSession;
    const adHocExercises = adHoc?.exercises?.length ?? 0;
    const adHocSets =
      adHoc?.exercises?.reduce((s, ex) => s + (ex.sets?.length ?? 0), 0) ?? 0;

    const preview: ImportPreview = {
      workouts: workouts.length,
      exercises: exerciseCount + adHocExercises,
      sessions: workouts.length + (adHoc ? 1 : 0),
      sets: setCount + adHocSets,
      templates: templates.length,
      schemaVersion: getCurrentSchemaVersion(),
      detectedVersion,
    };

    const state: AppState = {
      workouts,
      templates,
      incompleteExerciseSession: schema.data.incompleteExerciseSession ?? null,
      incompleteWorkoutId: schema.data.incompleteWorkoutId ?? null,
      adHocSession: schema.data.adHocSession ?? null,
    };

    return {
      success: true,
      schema,
      state,
      preview,
    };
  } catch (error) {
    return {
      success: false,
      error: `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get timestamp for ordering (newest wins on merge).
 * Workout: use endedAt || startedAt || startTime
 * Template: use updatedAt
 */
function getWorkoutTimestamp(w: { endedAt?: number; startedAt?: number; startTime?: number }): number {
  return w.endedAt ?? w.startedAt ?? w.startTime ?? 0;
}

function getTemplateTimestamp(t: { updatedAt?: number; createdAt?: number }): number {
  return t.updatedAt ?? t.createdAt ?? 0;
}

/**
 * Merge imported state with existing. Dedupe by id; on conflict prefer newest updatedAt.
 */
export function mergeImportData(imported: AppState, existing: AppState): AppState {
  const workoutMap = new Map<string, typeof existing.workouts[0]>();
  for (const w of existing.workouts) {
    if (w?.id) workoutMap.set(w.id, w);
  }
  for (const w of imported.workouts) {
    if (!w?.id) continue;
    const existingW = workoutMap.get(w.id);
    const existingTs = existingW ? getWorkoutTimestamp(existingW) : 0;
    const importedTs = getWorkoutTimestamp(w);
    if (!existingW || importedTs >= existingTs) {
      workoutMap.set(w.id, w);
    }
  }

  const templateMap = new Map<string, typeof existing.templates[0]>();
  for (const t of existing.templates) {
    if (t?.id) templateMap.set(t.id, t);
  }
  for (const t of imported.templates) {
    if (!t?.id) continue;
    const existingT = templateMap.get(t.id);
    const existingTs = existingT ? getTemplateTimestamp(existingT) : 0;
    const importedTs = getTemplateTimestamp(t);
    if (!existingT || importedTs >= existingTs) {
      templateMap.set(t.id, t);
    }
  }

  // Incomplete session: prefer whichever is newer (by lastSetAt or startedAt)
  let incompleteExerciseSession = existing.incompleteExerciseSession;
  if (imported.incompleteExerciseSession) {
    const existingTs =
      existing.incompleteExerciseSession?.lastSetAt ??
      existing.incompleteExerciseSession?.startedAt ??
      0;
    const importedTs =
      imported.incompleteExerciseSession.lastSetAt ??
      imported.incompleteExerciseSession.startedAt ??
      0;
    if (importedTs >= existingTs) {
      incompleteExerciseSession = imported.incompleteExerciseSession;
    }
  }

  // Ad-hoc session: prefer whichever is newer
  let adHocSession = existing.adHocSession;
  if (imported.adHocSession) {
    const existingTs = existing.adHocSession?.lastSetAt ?? existing.adHocSession?.startedAt ?? 0;
    const importedTs =
      imported.adHocSession.lastSetAt ?? imported.adHocSession.startedAt ?? 0;
    if (importedTs >= existingTs) {
      adHocSession = imported.adHocSession;
    }
  }

  return {
    workouts: Array.from(workoutMap.values()),
    templates: Array.from(templateMap.values()),
    incompleteExerciseSession,
    incompleteWorkoutId:
      incompleteExerciseSession && imported.incompleteExerciseSession
        ? imported.incompleteWorkoutId ?? existing.incompleteWorkoutId
        : existing.incompleteWorkoutId,
    adHocSession,
  };
}
