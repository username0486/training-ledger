/**
 * Exercise similarity scoring for "Likely replacements"
 * Scores exercises based on how similar they are to a given exercise
 * using tags: primaryMuscles, equipment, mechanic, force
 */

import { AnyExercise } from './exerciseDb/types';
import { normalize } from './searchNormalize';

export interface SimilarityScore {
  exercise: AnyExercise;
  score: number;
  reasons: string[]; // For debugging/transparency
}

/**
 * Calculate similarity score between two exercises
 * Higher score = more similar
 */
export function calculateSimilarity(
  original: AnyExercise,
  candidate: AnyExercise
): SimilarityScore {
  let score = 0;
  const reasons: string[] = [];

  // Normalize arrays for comparison
  const normalizeArray = (arr: string[] | undefined): string[] => {
    if (!arr) return [];
    return arr.map(item => normalize(item));
  };

  const origPrimary = normalizeArray(original.primaryMuscles);
  const origSecondary = normalizeArray(original.secondaryMuscles);
  const origEquipment = normalizeArray(original.equipment);
  const origForce = original.force ? normalize(original.force) : null;
  const origMechanic = original.mechanic ? normalize(original.mechanic) : null;

  const candPrimary = normalizeArray(candidate.primaryMuscles);
  const candSecondary = normalizeArray(candidate.secondaryMuscles);
  const candEquipment = normalizeArray(candidate.equipment);
  const candForce = candidate.force ? normalize(candidate.force) : null;
  const candMechanic = candidate.mechanic ? normalize(candidate.mechanic) : null;

  // Primary muscles match: +5 per match (most important)
  const primaryMatches = origPrimary.filter(m => candPrimary.includes(m));
  if (primaryMatches.length > 0) {
    score += primaryMatches.length * 5;
    reasons.push(`${primaryMatches.length} primary muscle${primaryMatches.length > 1 ? 's' : ''} match`);
  }

  // Secondary muscles match: +2 per match
  const secondaryMatches = origSecondary.filter(m => candSecondary.includes(m));
  if (secondaryMatches.length > 0) {
    score += secondaryMatches.length * 2;
    reasons.push(`${secondaryMatches.length} secondary muscle${secondaryMatches.length > 1 ? 's' : ''} match`);
  }

  // Equipment match: +3 per match
  const equipmentMatches = origEquipment.filter(eq => candEquipment.includes(eq));
  if (equipmentMatches.length > 0) {
    score += equipmentMatches.length * 3;
    reasons.push(`${equipmentMatches.length} equipment match${equipmentMatches.length > 1 ? 'es' : ''}`);
  }

  // Force match: +2
  if (origForce && candForce && origForce === candForce) {
    score += 2;
    reasons.push('force match');
  }

  // Mechanic match: +2
  if (origMechanic && candMechanic && origMechanic === candMechanic) {
    score += 2;
    reasons.push('mechanic match');
  }

  return { exercise: candidate, score, reasons };
}

/**
 * Find likely replacements for an exercise
 * Returns exercises sorted by similarity score (highest first)
 */
export function findLikelyReplacements(
  originalExercise: AnyExercise,
  allExercises: AnyExercise[],
  excludeIds: string[] = []
): SimilarityScore[] {
  const candidates = allExercises.filter(
    ex => ex.id !== originalExercise.id && !excludeIds.includes(ex.id)
  );

  const scored = candidates.map(candidate => 
    calculateSimilarity(originalExercise, candidate)
  );

  // Sort by score (descending), then by name (alphabetical)
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.exercise.name.localeCompare(b.exercise.name);
  });

  return scored;
}

