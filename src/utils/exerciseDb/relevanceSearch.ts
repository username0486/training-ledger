// Unified relevance search with precision/discovery modes

import { AnyExercise } from './types';
import { detectSearchIntent, type SearchIntent } from './searchIntent';
import { precisionSearch, type PrecisionSearchResults, type BestMatchResult, type RelatedResult } from './precisionSearch';
import { smartSearch, type SearchResult } from './smartSearch';
import { applyRefiners } from './smartSearch';
import { normalizeEquipment, deriveMuscleBucket, type EquipmentLabel, type MuscleBucket } from './normalize';

export type UnifiedSearchResult = 
  | { intent: 'precision'; best: BestMatchResult[]; related: RelatedResult[] }
  | { intent: 'discovery'; results: SearchResult[] };

/**
 * Unified search with intent detection
 */
export function relevanceSearch(
  exercises: AnyExercise[],
  query: string
): UnifiedSearchResult {
  const intent = detectSearchIntent(query);

  if (intent === 'precision') {
    const precisionResults = precisionSearch(exercises, query);
    return {
      intent: 'precision',
      best: precisionResults.best,
      related: precisionResults.related,
    };
  } else {
    // Discovery mode: use existing smart search but prioritize name matches
    const discoveryResults = smartSearch(exercises, query);
    
    // Cap discovery results to 80 items
    const cappedResults = discoveryResults.slice(0, 80);
    
    return {
      intent: 'discovery',
      results: cappedResults,
    };
  }
}

/**
 * Apply refiners to unified search results
 */
export function applyRefinersToUnified(
  unifiedResults: UnifiedSearchResult,
  activeEquipment: Set<EquipmentLabel>,
  activeBuckets: Set<MuscleBucket>
): UnifiedSearchResult {
  if (unifiedResults.intent === 'precision') {
    // In precision mode, refiners only apply to related tier, not best tier
    const refinedRelated = applyRefiners(
      unifiedResults.related.map(r => ({ exercise: r.exercise, score: r.score, matchedTokens: [] })),
      activeEquipment,
      activeBuckets
    ).map(r => {
      const original = unifiedResults.related.find(rel => rel.exercise.id === r.exercise.id);
      return original || { exercise: r.exercise, score: r.score, reason: 'name-partial' as const };
    });

    return {
      intent: 'precision',
      best: unifiedResults.best, // Best tier remains stable
      related: refinedRelated,
    };
  } else {
    // Discovery mode: apply refiners to all results
    const refined = applyRefiners(
      unifiedResults.results,
      activeEquipment,
      activeBuckets
    );

    return {
      intent: 'discovery',
      results: refined,
    };
  }
}



