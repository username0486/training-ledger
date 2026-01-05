// Main exercise database API
// ExerciseDB-first, offline-first, cannot silently fail

import { SystemExercise, UserExercise, AnyExercise, normalizeExerciseName } from './types';
import { loadSystemExercises } from './system';
import { loadUserExercises, saveUserExercises, addUserExercise } from './user';
import { initializeAnchorAliases } from '../exerciseAnchors';

// Re-export familiarity search for convenience
export { searchExercisesFamiliarity } from './familiaritySearch';
export type { } from './familiaritySearch'; // Ensure types are available

// In-memory caches
let systemCache: SystemExercise[] = [];
let userCache: UserExercise[] = [];
let initialized = false;

/**
 * Initialize exercise database (load system + user exercises)
 */
export async function initializeExerciseDb(): Promise<void> {
  try {
    systemCache = await loadSystemExercises();
    userCache = loadUserExercises();

    // Initialize anchor aliases for system exercises
    initializeAnchorAliases(systemCache);

    if (import.meta.env.DEV) {
      console.log(`[ExerciseDB] System exercises: ${systemCache.length}`);
      console.log(`[ExerciseDB] User exercises: ${userCache.length}`);
      console.log(`[ExerciseDB] Total exercises: ${getAllExercises().length}`);
    }

    initialized = true;
  } catch (error) {
    console.error('[ExerciseDB] Error initializing:', error);
    // Ensure we have at least the fallback
    systemCache = await loadSystemExercises();
    userCache = loadUserExercises();
    // Initialize anchor aliases even on fallback
    initializeAnchorAliases(systemCache);
    initialized = true;
  }
}

/**
 * Get all exercises (system + user), merged and deduplicated
 * Deduplication: prefer user exercise over system only if normalized name matches exactly AND user has non-empty aliases
 * Otherwise prefer system exercise
 */
export function getAllExercises(): AnyExercise[] {
  if (!initialized) {
    // Synchronous fallback - reload user exercises
    userCache = loadUserExercises();
  }

  const exerciseMap = new Map<string, AnyExercise>();

  // Add system exercises first
  for (const exercise of systemCache) {
    const key = normalizeExerciseName(exercise.name);
    if (!exerciseMap.has(key)) {
      exerciseMap.set(key, exercise);
    }
  }

  // Add user exercises (prefer user if it has aliases and name matches)
  for (const exercise of userCache) {
    const key = normalizeExerciseName(exercise.name);
    const existing = exerciseMap.get(key);
    
    if (existing) {
      // Prefer user only if it has non-empty aliases
      if (exercise.aliases && exercise.aliases.length > 0) {
        exerciseMap.set(key, exercise);
      }
      // Otherwise keep system exercise
    } else {
      // New exercise, add it
      exerciseMap.set(key, exercise);
    }
  }

  return Array.from(exerciseMap.values());
}

/**
 * Search exercises by query string
 * Overload 1: searchExercises(query, limit?) - returns AnyExercise[]
 * Overload 2: searchExercises(query, exercises: string[]) - returns string[] (backward compat)
 */
export function searchExercises(query: string, limit?: number): AnyExercise[];
export function searchExercises(query: string, exercises: string[]): string[];
export function searchExercises(query: string, limitOrExercises?: number | string[]): AnyExercise[] | string[] {
  // Backward compatibility: if second param is string[], return string[]
  if (Array.isArray(limitOrExercises)) {
    const exercises = limitOrExercises;
    if (!query.trim()) {
      return exercises;
    }
    
    const normalizedQuery = normalizeExerciseName(query);
    const all = getAllExercises();
    
    // Filter exercises that match the query
    const matched = all.filter(ex => {
      const normalizedName = normalizeExerciseName(ex.name);
      if (normalizedName.includes(normalizedQuery)) {
        return true;
      }
      if (ex.aliases) {
        return ex.aliases.some(alias => 
          normalizeExerciseName(alias).includes(normalizedQuery)
        );
      }
      return false;
    });
    
    // Return names that are in the exercises array (backward compatibility)
    const matchedNames = new Set(matched.map(ex => ex.name));
    return exercises.filter(name => matchedNames.has(name));
  }
  
  // New API: searchExercises(query, limit?)
  const limit = limitOrExercises as number | undefined;
  if (!query || !query.trim()) {
    const all = getAllExercises();
    return limit ? all.slice(0, limit) : all;
  }

  const normalizedQuery = normalizeExerciseName(query);
  const all = getAllExercises();

  // Score and sort results
  const scored = all.map(exercise => {
    const normalizedName = normalizeExerciseName(exercise.name);
    let score = 0;

    // Exact match gets highest score
    if (normalizedName === normalizedQuery) {
      score = 1000;
    }
    // Starts with match
    else if (normalizedName.startsWith(normalizedQuery)) {
      score = 500;
    }
    // Includes match
    else if (normalizedName.includes(normalizedQuery)) {
      score = 100;
    }
    // Check aliases
    else if (exercise.aliases) {
      for (const alias of exercise.aliases) {
        const normalizedAlias = normalizeExerciseName(alias);
        if (normalizedAlias === normalizedQuery) {
          score = 1000;
          break;
        } else if (normalizedAlias.startsWith(normalizedQuery)) {
          score = Math.max(score, 500);
        } else if (normalizedAlias.includes(normalizedQuery)) {
          score = Math.max(score, 100);
        }
      }
    }

    return { exercise, score };
  }).filter(item => item.score > 0);

  // Sort by score (descending), then alphabetically
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return normalizeExerciseName(a.exercise.name).localeCompare(normalizeExerciseName(b.exercise.name));
  });

  const results = scored.map(item => item.exercise);
  return limit ? results.slice(0, limit) : results;
}

/**
 * Add exercise to database (creates user exercise)
 * Returns existing exercise if it already exists (system or user)
 */
export function addExerciseToDb(name: string): UserExercise | AnyExercise {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('Exercise name cannot be empty');
  }

  // Check if exercise already exists (system or user)
  const normalizedInput = normalizeExerciseName(trimmedName);
  const allExercises = getAllExercises();
  const existing = allExercises.find(
    ex => normalizeExerciseName(ex.name) === normalizedInput
  );

  if (existing) {
    // Exercise already exists, return it
    return existing;
  }

  // Exercise doesn't exist, create new user exercise
  const exercise = addUserExercise(trimmedName);
  // Update cache
  userCache = loadUserExercises();
  return exercise;
}

// Export types for backward compatibility
export type { SystemExercise, UserExercise, AnyExercise };
export type ExerciseDBEntry = AnyExercise; // Alias for backward compatibility

// Backward compatibility functions

/**
 * Backward compatibility: Load exercises as string array (legacy API)
 * @deprecated Use getAllExercises() instead
 */
export function loadExercisesDB(): string[] {
  return getAllExercises().map(ex => ex.name);
}

// Note: searchExercises() with two parameters is handled by overloading below

/**
 * Backward compatibility: Get all exercises as ExerciseDBEntry array
 */
export function getAllExercisesList(): AnyExercise[] {
  return getAllExercises();
}

/**
 * Backward compatibility: Filter exercises (for components using ExerciseDBEntry[])
 */
export function filterExercises(exercises: AnyExercise[], searchTerm: string): AnyExercise[] {
  if (!searchTerm || !searchTerm.trim()) {
    return exercises;
  }
  
  const normalizedQuery = normalizeExerciseName(searchTerm);
  
  return exercises.filter(exercise => {
    const normalizedName = normalizeExerciseName(exercise.name);
    
    // Name match
    if (normalizedName.includes(normalizedQuery)) {
      return true;
    }
    
    // Aliases match
    if (exercise.aliases) {
      return exercise.aliases.some(alias => 
        normalizeExerciseName(alias).includes(normalizedQuery)
      );
    }
    
    return false;
  });
}

/**
 * Backward compatibility: Initialize exercise database (old name)
 * @deprecated Use initializeExerciseDb() instead
 */
export async function initializeExerciseDatabase(): Promise<void> {
  return initializeExerciseDb();
}

