/**
 * Scoring components for familiarity-first ranking
 * Each component returns a score 0..1
 */

import { AnyExercise } from './exerciseDb/types';
import { getUsageScore, getContextScore } from './exerciseUsageStats';
import { getAffinityScore } from './exerciseAffinity';
import { stringMatchScore, aliasMatchScore } from './searchNormalize';
import { getAliasesForExercise } from './exerciseAlias';

/**
 * Weights for scoring components (tuneable constants)
 */
export const SCORING_WEIGHTS = {
  USAGE: 0.4,      // Usage history (recency + frequency)
  CONTEXT: 0.2,   // Template/workout context
  AFFINITY: 0.3,  // Query→exercise affinity
  TEXT: 0.1,      // Text matching (weakest)
} as const;

/**
 * Compute usage score for an exercise
 */
export function computeUsageScore(exerciseId: string): number {
  return getUsageScore(exerciseId);
}

/**
 * Compute context score if exercise was used in a specific template
 */
export function computeContextScore(exerciseId: string, templateId?: string): number {
  return getContextScore(exerciseId, templateId);
}

/**
 * Compute affinity score for query→exercise pair
 */
export function computeAffinityScore(query: string, exerciseId: string): number {
  return getAffinityScore(query, exerciseId);
}

/**
 * Compute text matching score
 * Checks both exercise name and aliases
 */
export function computeTextScore(query: string, exercise: AnyExercise): number {
  // Match against display name
  const nameScore = stringMatchScore(query, exercise.name);
  
  // Match against aliases (both stored aliases and exercise.aliases field)
  const storedAliases = getAliasesForExercise(exercise.id);
  const aliasStrings = storedAliases.map(a => a.alias);
  
  // Also check exercise.aliases field if present
  if (exercise.aliases) {
    aliasStrings.push(...exercise.aliases);
  }
  
  const aliasScore = aliasMatchScore(query, aliasStrings);
  
  // Return best match
  return Math.max(nameScore, aliasScore);
}

/**
 * Compute total score for an exercise
 */
export function computeTotalScore(
  exercise: AnyExercise,
  query: string,
  templateId?: string
): number {
  const usageScore = computeUsageScore(exercise.id);
  const contextScore = computeContextScore(exercise.id, templateId);
  const affinityScore = computeAffinityScore(query, exercise.id);
  const textScore = computeTextScore(query, exercise);
  
  return (
    SCORING_WEIGHTS.USAGE * usageScore +
    SCORING_WEIGHTS.CONTEXT * contextScore +
    SCORING_WEIGHTS.AFFINITY * affinityScore +
    SCORING_WEIGHTS.TEXT * textScore
  );
}

