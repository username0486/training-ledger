/**
 * Exercise anchor/canonical mechanism
 * Ensures generic searches resolve to obvious defaults
 */

import { AnyExercise, normalizeExerciseName } from './exerciseDb/types';
import { addAlias } from './exerciseAlias';

/**
 * Key lift anchors - canonical exercise names
 * These are the "obvious defaults" for generic queries
 */
export const ANCHOR_EXERCISES: { [key: string]: string[] } = {
  'deadlift': ['Deadlift', 'Barbell Deadlift'],
  'squat': ['Squat', 'Barbell Squat', 'Back Squat'],
  'bench press': ['Bench Press', 'Barbell Bench Press'],
  'overhead press': ['Overhead Press', 'Barbell Overhead Press', 'OHP'],
  'row': ['Barbell Row', 'Bent-Over Row'],
  'pulldown': ['Lat Pulldown', 'Lat Pull-down'],
  'pull-up': ['Pull-up', 'Pull Up', 'Chin-up'],
};

/**
 * Specialty modifiers that should be penalized unless query includes them
 */
const SPECIALTY_MODIFIERS = [
  'band', 'bands', 'chain', 'chains', 'axle', 'car', 'reverse band',
  'rickshaw', 'leverage', 'trap bar', 'hex bar', 'safety bar',
  'cambered', 'swiss bar', 'football bar', 'ez bar', 'cable',
  'smith', 'hack', 'belt', 'suit', 'brief', 'sling',
];

/**
 * Check if an exercise name contains specialty modifiers
 */
export function hasSpecialtyModifiers(exerciseName: string): boolean {
  const normalized = normalizeExerciseName(exerciseName);
  return SPECIALTY_MODIFIERS.some(modifier => 
    normalized.includes(normalizeExerciseName(modifier))
  );
}

/**
 * Check if query includes specialty modifiers
 */
export function queryHasSpecialtyModifiers(query: string): boolean {
  const normalized = normalizeExerciseName(query);
  return SPECIALTY_MODIFIERS.some(modifier => 
    normalized.includes(normalizeExerciseName(modifier))
  );
}

/**
 * Check if an exercise is an anchor for a given query
 */
export function isAnchorForQuery(exercise: AnyExercise, query: string): boolean {
  const normalizedQuery = normalizeExerciseName(query);
  const normalizedName = normalizeExerciseName(exercise.name);
  
  // Check if this exercise is a canonical anchor for the query
  for (const [key, anchorNames] of Object.entries(ANCHOR_EXERCISES)) {
    if (normalizedQuery.includes(key) || key.includes(normalizedQuery)) {
      // Check if exercise name matches any anchor name
      if (anchorNames.some(anchor => normalizeExerciseName(anchor) === normalizedName)) {
        return true;
      }
    }
  }
  
  // Also check if exercise has isAnchor flag (for system exercises)
  if ('isAnchor' in exercise && exercise.isAnchor === true) {
    // Check if query matches the base name (without modifiers)
    const baseName = getBaseName(exercise.name);
    if (normalizeExerciseName(baseName) === normalizedQuery) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get base name without specialty modifiers
 */
function getBaseName(exerciseName: string): string {
  let base = exerciseName;
  for (const modifier of SPECIALTY_MODIFIERS) {
    const regex = new RegExp(`\\b${modifier}\\b`, 'gi');
    base = base.replace(regex, '').trim();
  }
  // Clean up extra spaces
  return base.replace(/\s+/g, ' ').trim();
}

/**
 * Find or create anchor exercise for a generic query
 * Returns the exercise ID of the anchor, or null if not found
 */
export function findAnchorExercise(query: string, allExercises: AnyExercise[]): AnyExercise | null {
  const normalizedQuery = normalizeExerciseName(query);
  
  // Check anchor registry
  for (const [key, anchorNames] of Object.entries(ANCHOR_EXERCISES)) {
    if (normalizedQuery === normalizeExerciseName(key) || 
        normalizedQuery.includes(key) || 
        key.includes(normalizedQuery)) {
      // Find matching anchor exercise
      for (const anchorName of anchorNames) {
        const found = allExercises.find(ex => 
          normalizeExerciseName(ex.name) === normalizeExerciseName(anchorName)
        );
        if (found) {
          return found;
        }
      }
    }
  }
  
  // Check exercises with isAnchor flag
  const anchorExercises = allExercises.filter(ex => 
    'isAnchor' in ex && ex.isAnchor === true
  );
  
  for (const anchor of anchorExercises) {
    const baseName = getBaseName(anchor.name);
    if (normalizeExerciseName(baseName) === normalizedQuery) {
      return anchor;
    }
  }
  
  return null;
}

/**
 * Initialize anchor aliases for system exercises
 * Called when loading system exercises to ensure anchors have proper aliases
 */
export function initializeAnchorAliases(exercises: AnyExercise[]): void {
  for (const exercise of exercises) {
    if (exercise.source !== 'system') continue;
    
    const normalizedName = normalizeExerciseName(exercise.name);
    
    // Check if this exercise matches an anchor
    for (const [key, anchorNames] of Object.entries(ANCHOR_EXERCISES)) {
      // Check if exercise name matches an anchor name
      const isAnchor = anchorNames.some(anchor => 
        normalizeExerciseName(anchor) === normalizedName
      );
      
      if (isAnchor) {
        // Add generic alias (e.g., "deadlift" for "Barbell Deadlift")
        addAlias(exercise.id, key, 'system');
        
        // Also add base name without equipment if applicable
        const baseName = getBaseName(exercise.name);
        if (baseName !== exercise.name && normalizeExerciseName(baseName) !== normalizedName) {
          addAlias(exercise.id, baseName, 'system');
        }
      }
    }
  }
}

/**
 * Get specialty modifier penalty score
 * Higher penalty = lower ranking
 */
export function getSpecialtyModifierPenalty(
  exercise: AnyExercise,
  query: string
): number {
  // No penalty if query includes specialty modifiers
  if (queryHasSpecialtyModifiers(query)) {
    return 0;
  }
  
  // Penalty if exercise has specialty modifiers but query doesn't
  if (hasSpecialtyModifiers(exercise.name)) {
    return -50; // Significant penalty
  }
  
  return 0;
}

