// Refiner generation for relevance search

import { type Refiner } from './smartSearch';
import { type UnifiedSearchResult } from './relevanceSearch';
import { normalizeEquipment, deriveMuscleBucket, type EquipmentLabel, type MuscleBucket } from './normalize';
import { type BestMatchResult, type RelatedResult } from './precisionSearch';
import { type SearchResult } from './smartSearch';

/**
 * Generate refiners from unified search results
 */
export function generateRefinersFromUnified(unifiedResults: UnifiedSearchResult): Refiner[] {
  if (unifiedResults.intent === 'precision') {
    // In precision mode, only show refiners if total results >= 20
    const totalCount = unifiedResults.best.length + unifiedResults.related.length;
    if (totalCount < 20) {
      return [];
    }

    // Generate refiners from related tier only (best tier is always shown)
    return generateRefinersFromResults(
      unifiedResults.related.map(r => ({ exercise: r.exercise, score: r.score, matchedTokens: [] }))
    );
  } else {
    // Discovery mode: generate from all results if >= 20
    if (unifiedResults.results.length < 20) {
      return [];
    }

    return generateRefinersFromResults(unifiedResults.results);
  }
}

function generateRefinersFromResults(results: SearchResult[]): Refiner[] {
  const equipmentCounts = new Map<EquipmentLabel, number>();
  const bucketCounts = new Map<MuscleBucket, number>();

  // Count equipment and buckets
  for (const result of results) {
    const equipment = normalizeEquipment(result.exercise.equipment);
    if (equipment) {
      equipmentCounts.set(equipment, (equipmentCounts.get(equipment) || 0) + 1);
    }

    const sysEx = result.exercise.source === 'system' ? (result.exercise as any) : null;
    const bucket = deriveMuscleBucket(
      sysEx?.target,
      sysEx?.bodyPart,
      result.exercise.primaryMuscles && result.exercise.primaryMuscles.length > 0 ? result.exercise.primaryMuscles : undefined
    );
    if (bucket) {
      bucketCounts.set(bucket, (bucketCounts.get(bucket) || 0) + 1);
    }
  }

  const refiners: Refiner[] = [];

  // Filter equipment refiners (only if they reduce results by ~30% or more)
  const threshold = Math.ceil(results.length * 0.3);
  const equipmentRefiners = Array.from(equipmentCounts.entries())
    .filter(([_, count]) => count >= threshold)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2) // Max 2 equipment refiners
    .map(([label, count]) => ({
      type: 'equipment' as const,
      label,
      count,
    }));

  refiners.push(...equipmentRefiners);

  // Filter bucket refiners (only if they reduce results by ~30% or more)
  const bucketRefiners = Array.from(bucketCounts.entries())
    .filter(([_, count]) => count >= threshold)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2) // Max 2 bucket refiners
    .map(([label, count]) => ({
      type: 'bucket' as const,
      label,
      count,
    }));

  refiners.push(...bucketRefiners);

  return refiners;
}



