/**
 * Familiarity-first search ranking
 * Uses weighted scoring: usage (0.4) + context (0.2) + affinity (0.3) + text (0.1)
 */

import { AnyExercise, normalizeExerciseName } from './types';
import { getAffinityExerciseIds } from '../exerciseAffinity';
import { findAliasesForQuery } from '../exerciseAlias';
import { computeTotalScore } from '../exerciseScoring';
import { normalize } from '../searchNormalize';

interface ScoredExercise {
  exercise: AnyExercise;
  score: number;
}

/**
 * Rank exercises using familiarity-first weighted scoring
 */
export function rankExercisesByFamiliarity(
  exercises: AnyExercise[],
  query: string,
  templateId?: string
): AnyExercise[] {
  const normalizedQuery = normalize(query);
  
  // If empty query, return exercises ordered by usage (recents first)
  if (!normalizedQuery) {
    return exercises.sort((a, b) => {
      const scoreA = computeTotalScore(a, '', templateId);
      const scoreB = computeTotalScore(b, '', templateId);
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
      return normalizeExerciseName(a.name).localeCompare(normalizeExerciseName(b.name));
    });
  }
  
  // Find candidates: exercises that match query or have matching aliases
  const candidates = new Set<string>();
  const aliasMatches = findAliasesForQuery(normalizedQuery);
  
  for (const exercise of exercises) {
    const normalizedName = normalizeExerciseName(exercise.name);
    let isCandidate = false;
    
    // Check name match
    if (normalizedName === normalizedQuery ||
        normalizedName.startsWith(normalizedQuery) ||
        normalizedName.includes(normalizedQuery)) {
      isCandidate = true;
    }
    
    // Check aliases
    if (!isCandidate && exercise.aliases) {
      for (const alias of exercise.aliases) {
        const normalizedAlias = normalizeExerciseName(alias);
        if (normalizedAlias === normalizedQuery ||
            normalizedAlias.startsWith(normalizedQuery) ||
            normalizedAlias.includes(normalizedQuery)) {
          isCandidate = true;
          break;
        }
      }
    }
    
    // Check alias expansion
    if (!isCandidate) {
      const aliasMatch = aliasMatches.find(m => m.exerciseId === exercise.id);
      if (aliasMatch) {
        isCandidate = true;
      }
    }
    
    if (isCandidate) {
      candidates.add(exercise.id);
    }
  }
  
  // Score and rank candidates
  const scored: ScoredExercise[] = [];
  for (const exercise of exercises) {
    if (candidates.has(exercise.id)) {
      const score = computeTotalScore(exercise, normalizedQuery, templateId);
      scored.push({ exercise, score });
    }
  }
  
  // Sort by score (descending), then alphabetically
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return normalizeExerciseName(a.exercise.name).localeCompare(
      normalizeExerciseName(b.exercise.name)
    );
  });
  
  return scored.map(item => item.exercise);
}

/**
 * Search exercises with familiarity-first ranking
 * @param exercises - All exercises to search
 * @param query - Search query (empty for recents)
 * @param templateId - Optional template/workout context for boosting
 */
export function searchExercisesFamiliarity(
  exercises: AnyExercise[],
  query: string,
  templateId?: string
): AnyExercise[] {
  return rankExercisesByFamiliarity(exercises, query, templateId);
}

