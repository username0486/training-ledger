/**
 * Intent-based search with two-tier results: Matches + Related
 * Matches: direct token/text matches (existing behavior)
 * Related: semantic fallback using tags (muscle, equipment, etc.)
 */

import { AnyExercise, normalizeExerciseName } from './types';
import { inferQueryConcepts, QueryConcepts } from '../searchConcepts';
import { semanticScore, isAnchorExercise, getAnchorBoost } from '../semanticScoring';
import { computeTotalScore } from '../exerciseScoring';
import { normalize } from '../searchNormalize';
import { stringMatchScore } from '../searchNormalize';
import { isAnchorForQuery, getSpecialtyModifierPenalty, findAnchorExercise } from '../exerciseAnchors';
import { getUsageScore } from '../exerciseUsageStats';
import { getAffinityScore } from '../exerciseAffinity';
import { recordRecentExercise } from '../exerciseRecents';

export interface SearchResults {
  matches: AnyExercise[];  // Direct text/token matches (limit 10-15)
  related: AnyExercise[]; // Semantic matches (limit 3-5, only if matches empty/weak)
}

interface ScoredExercise {
  exercise: AnyExercise;
  score: number;
  semanticScore: number;
}

/**
 * Check if exercise matches query via text/token matching
 */
function hasTextMatch(exercise: AnyExercise, query: string): boolean {
  const normalizedQuery = normalize(query);
  const normalizedName = normalizeExerciseName(exercise.name);
  
  // Exact or prefix match
  if (normalizedName === normalizedQuery || normalizedName.startsWith(normalizedQuery)) {
    return true;
  }
  
  // Substring match
  if (normalizedName.includes(normalizedQuery)) {
    return true;
  }
  
  // Token overlap
  const nameTokens = normalizedName.split(/\s+/);
  const queryTokens = normalizedQuery.split(/\s+/);
  const matchingTokens = queryTokens.filter(qt => nameTokens.some(nt => nt.includes(qt) || qt.includes(nt)));
  if (matchingTokens.length > 0 && matchingTokens.length === queryTokens.length) {
    return true;
  }
  
  // Alias match
  if (exercise.aliases) {
    for (const alias of exercise.aliases) {
      const normalizedAlias = normalizeExerciseName(alias);
      if (normalizedAlias.includes(normalizedQuery) || normalizedQuery.includes(normalizedAlias)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Intent-based search with two-tier results
 */
export function searchExercisesWithIntent(
  exercises: AnyExercise[],
  query: string,
  templateId?: string
): SearchResults {
  const normalizedQuery = normalize(query);
  
  // Empty query: return all exercises ordered by usage (no semantic fallback needed)
  if (!normalizedQuery) {
    const sorted = exercises.sort((a, b) => {
      const scoreA = computeTotalScore(a, '', templateId);
      const scoreB = computeTotalScore(b, '', templateId);
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
      return normalizeExerciseName(a.name).localeCompare(normalizeExerciseName(b.name));
    });
    return {
      matches: sorted,
      related: [],
    };
  }
  
  // Infer query concepts for semantic matching
  const concepts = inferQueryConcepts(normalizedQuery);
  
  // Find anchor exercise for generic queries
  const anchorExercise = findAnchorExercise(normalizedQuery, exercises);
  
  // Separate exercises into matches and candidates for related
  const matches: ScoredExercise[] = [];
  const relatedCandidates: ScoredExercise[] = [];
  const matchedIds = new Set<string>();
  
  for (const exercise of exercises) {
    // Check for text match
    if (hasTextMatch(exercise, normalizedQuery)) {
      let familiarityScore = computeTotalScore(exercise, normalizedQuery, templateId);
      
      // Anchor boost: anchors rank higher for generic queries
      if (anchorExercise && exercise.id === anchorExercise.id) {
        familiarityScore += 100; // Strong boost for anchor
      } else if (isAnchorForQuery(exercise, normalizedQuery)) {
        familiarityScore += 50; // Moderate boost for anchor matches
      }
      
      // Specialty modifier penalty: penalize specialty variants unless query includes modifiers
      const specialtyPenalty = getSpecialtyModifierPenalty(exercise, normalizedQuery);
      familiarityScore += specialtyPenalty;
      
      matches.push({
        exercise,
        score: familiarityScore,
        semanticScore: 0,
      });
      matchedIds.add(exercise.id);
    } else {
      // No text match - compute semantic score
      const semScore = semanticScore(exercise, concepts);
      if (semScore > 0) {
        const anchorBoost = getAnchorBoost(exercise);
        const specialtyPenalty = getSpecialtyModifierPenalty(exercise, normalizedQuery);
        const totalSemScore = semScore + anchorBoost + specialtyPenalty;
        
        relatedCandidates.push({
          exercise,
          score: 0, // Not used for related
          semanticScore: totalSemScore,
        });
      }
    }
  }
  
  // Sort matches with anchor-aware ranking
  matches.sort((a, b) => {
    // 1. Previously-used exercises (usage/affinity) rank highest
    const usageA = getUsageScore(a.exercise.id);
    const usageB = getUsageScore(b.exercise.id);
    const affinityA = getAffinityScore(normalizedQuery, a.exercise.id);
    const affinityB = getAffinityScore(normalizedQuery, b.exercise.id);
    
    const userHistoryScoreA = usageA * 10 + affinityA * 5;
    const userHistoryScoreB = usageB * 10 + affinityB * 5;
    
    if (userHistoryScoreB !== userHistoryScoreA) {
      return userHistoryScoreB - userHistoryScoreA;
    }
    
    // 2. Anchors rank above non-anchors for generic queries
    const isAnchorA = anchorExercise && a.exercise.id === anchorExercise.id;
    const isAnchorB = anchorExercise && b.exercise.id === anchorExercise.id;
    
    if (isAnchorA !== isAnchorB) {
      return isAnchorA ? -1 : 1;
    }
    
    // 3. Then by familiarity score
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    
    // 4. Finally alphabetical
    return normalizeExerciseName(a.exercise.name).localeCompare(
      normalizeExerciseName(b.exercise.name)
    );
  });
  
  // Limit matches to 10-15
  const limitedMatches = matches.slice(0, 15).map(item => item.exercise);
  
  // Determine if we should show Related section
  const shouldShowRelated = limitedMatches.length === 0 || 
    (limitedMatches.length < 5 && matches.length < 5); // Weak matches
  
  let related: AnyExercise[] = [];
  
  if (shouldShowRelated && relatedCandidates.length > 0) {
    // Sort related by semantic score, prefer anchors
    relatedCandidates.sort((a, b) => {
      // Primary: semantic score
      if (b.semanticScore !== a.semanticScore) {
        return b.semanticScore - a.semanticScore;
      }
      // Secondary: anchor boost
      const aIsAnchor = isAnchorExercise(a.exercise);
      const bIsAnchor = isAnchorExercise(b.exercise);
      if (aIsAnchor !== bIsAnchor) {
        return aIsAnchor ? -1 : 1;
      }
      // Tertiary: alphabetical
      return normalizeExerciseName(a.exercise.name).localeCompare(
        normalizeExerciseName(b.exercise.name)
      );
    });
    
    // Limit related to top 3-5
    related = relatedCandidates.slice(0, 5).map(item => item.exercise);
  }
  
  return {
    matches: limitedMatches,
    related,
  };
}

