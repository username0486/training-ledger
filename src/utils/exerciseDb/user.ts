// User exercise management with localStorage

import { UserExercise, normalizeExerciseName } from './types';

const USER_EXERCISES_KEY = 'user_exercises_v1';

/**
 * Load user exercises from localStorage
 */
export function loadUserExercises(): UserExercise[] {
  try {
    const data = localStorage.getItem(USER_EXERCISES_KEY);
    if (!data) return [];
    
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    
    // Validate and filter invalid entries
    return parsed.filter((ex): ex is UserExercise => {
      return (
        ex &&
        typeof ex === 'object' &&
        typeof ex.id === 'string' &&
        typeof ex.name === 'string' &&
        ex.source === 'user' &&
        typeof ex.createdAt === 'number'
      );
    });
  } catch (error) {
    console.error('[ExerciseDB] Error loading user exercises:', error);
    return [];
  }
}

/**
 * Save user exercises to localStorage
 */
export function saveUserExercises(exercises: UserExercise[]): void {
  try {
    localStorage.setItem(USER_EXERCISES_KEY, JSON.stringify(exercises));
  } catch (error) {
    console.error('[ExerciseDB] Error saving user exercises:', error);
  }
}

/**
 * Add a new user exercise
 * Checks for duplicates by normalized name before creating
 */
export function addUserExercise(name: string): UserExercise {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('Exercise name cannot be empty');
  }

  // Check for duplicates (normalized name comparison)
  const normalizedInput = normalizeExerciseName(trimmedName);
  const existing = loadUserExercises();
  const duplicate = existing.find(
    ex => normalizeExerciseName(ex.name) === normalizedInput
  );

  if (duplicate) {
    throw new Error(`Exercise "${trimmedName}" already exists`);
  }

  const exercise: UserExercise = {
    id: `usr:${crypto.randomUUID()}`,
    name: trimmedName,
    createdAt: Date.now(),
    source: 'user',
    // Explicitly set optional fields to undefined (not empty arrays)
    primaryMuscles: undefined,
    secondaryMuscles: undefined,
    equipment: undefined,
    category: undefined,
  };

  existing.push(exercise);
  saveUserExercises(existing);

  return exercise;
}



