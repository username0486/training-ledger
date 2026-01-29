// Centralized storage gateway - all storage access goes through here
import { StorageSchema, AppState, StorageLoadResult } from './types';
import { migrateSchema, getCurrentSchemaVersion } from './migrations';

const STORAGE_KEY = 'training_ledger_app_state';

/**
 * Load app state from storage with migration and error recovery
 */
export function loadState(): StorageLoadResult {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    
    if (!rawData) {
      // No data exists - try to migrate from legacy keys
      const migrated = migrateSchema(null, getCurrentSchemaVersion());
      return {
        success: true,
        state: migrated.data,
        rawData: null,
      };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(rawData);
    } catch (parseError) {
      // Parse error - preserve raw data for recovery
      return {
        success: false,
        error: `Failed to parse stored data: ${parseError}`,
        rawData,
      };
    }

    // Validate minimal structure
    if (typeof parsed !== 'object' || parsed === null) {
      return {
        success: false,
        error: 'Stored data is not an object',
        rawData,
      };
    }

    // Migrate if needed
    let schema: StorageSchema;
    try {
      schema = migrateSchema(parsed, getCurrentSchemaVersion());
    } catch (migrationError) {
      // Migration error - preserve raw data for recovery
      return {
        success: false,
        error: `Migration failed: ${migrationError}`,
        rawData,
      };
    }

    // Validate migrated data structure
    if (!schema.data || typeof schema.data !== 'object') {
      return {
        success: false,
        error: 'Migrated data structure is invalid',
        rawData,
      };
    }

    // Ensure arrays exist (backwards compatibility)
    const state: AppState = {
      workouts: Array.isArray(schema.data.workouts) ? schema.data.workouts : [],
      templates: Array.isArray(schema.data.templates) ? schema.data.templates : [],
      incompleteExerciseSession: schema.data.incompleteExerciseSession ?? null,
      incompleteWorkoutId: schema.data.incompleteWorkoutId ?? null,
      adHocSession: schema.data.adHocSession ?? null,
    };

    return {
      success: true,
      state,
      rawData: null,
    };
  } catch (error) {
    // Unexpected error - try to preserve any raw data
    let rawData: string | undefined;
    try {
      rawData = localStorage.getItem(STORAGE_KEY) || undefined;
    } catch {
      // Can't even read raw data
    }

    return {
      success: false,
      error: `Unexpected error loading state: ${error}`,
      rawData,
    };
  }
}

/**
 * Save app state to storage
 */
export function saveState(state: AppState): { success: boolean; error?: string } {
  try {
    const schema: StorageSchema = {
      schemaVersion: getCurrentSchemaVersion(),
      data: state,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(schema));
    return { success: true };
  } catch (error) {
    console.error('[StorageGateway] Failed to save state:', error);
    return {
      success: false,
      error: `Failed to save state: ${error}`,
    };
  }
}

/**
 * Export all app data as JSON
 */
export function exportData(): string {
  const result = loadState();
  
  if (!result.success || !result.state) {
    // If load failed, try to export raw data
    if (result.rawData) {
      return result.rawData;
    }
    // Otherwise export empty state
    const emptySchema: StorageSchema = {
      schemaVersion: getCurrentSchemaVersion(),
      data: {
        workouts: [],
        templates: [],
        incompleteExerciseSession: null,
        incompleteWorkoutId: null,
        adHocSession: null,
      },
    };
    return JSON.stringify(emptySchema, null, 2);
  }

  const schema: StorageSchema = {
    schemaVersion: getCurrentSchemaVersion(),
    data: result.state,
  };

  return JSON.stringify(schema, null, 2);
}

/**
 * Import data from JSON string
 */
export function importData(json: string): { success: boolean; error?: string; state?: AppState } {
  try {
    const parsed = JSON.parse(json);

    if (typeof parsed !== 'object' || parsed === null) {
      return {
        success: false,
        error: 'Imported data is not an object',
      };
    }

    // Migrate if needed
    let schema: StorageSchema;
    try {
      schema = migrateSchema(parsed, getCurrentSchemaVersion());
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

    // Ensure arrays exist
    const state: AppState = {
      workouts: Array.isArray(schema.data.workouts) ? schema.data.workouts : [],
      templates: Array.isArray(schema.data.templates) ? schema.data.templates : [],
      incompleteExerciseSession: schema.data.incompleteExerciseSession ?? null,
      incompleteWorkoutId: schema.data.incompleteWorkoutId ?? null,
      adHocSession: schema.data.adHocSession ?? null,
    };

    // Save imported state
    const saveResult = saveState(state);
    if (!saveResult.success) {
      return {
        success: false,
        error: saveResult.error || 'Failed to save imported data',
      };
    }

    return {
      success: true,
      state,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to import data: ${error}`,
    };
  }
}

/**
 * Clear all app data (only for explicit user action)
 */
export function clearAllData(): { success: boolean; error?: string } {
  try {
    // Remove unified key
    localStorage.removeItem(STORAGE_KEY);
    
    // Also remove legacy keys if they exist (cleanup)
    localStorage.removeItem('workout_logs_workouts');
    localStorage.removeItem('workout_logs_templates');
    localStorage.removeItem('workout_logs_incomplete_exercise');
    localStorage.removeItem('workout_logs_incomplete_workout');
    localStorage.removeItem('workout_logs_ad_hoc_session');
    localStorage.removeItem('workout_logs_current_log');
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to clear data: ${error}`,
    };
  }
}

/**
 * Get raw stored data for recovery purposes
 */
export function getRawStoredData(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
