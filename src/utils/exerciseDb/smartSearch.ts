// Smart search with ranking, normalization, and refinement

import { AnyExercise } from './types';
import { normalizeExerciseName } from './types';
import { normalizeEquipment, deriveMuscleBucket, extractQueryHints, type EquipmentLabel, type MuscleBucket } from './normalize';

export interface SearchResult {
  exercise: AnyExercise;
  score: number;
  matchedTokens: string[];
}

export interface Refiner {
  type: 'equipment' | 'bucket';
  label: string;
  count: number;
}

/**
 * Smart search with multi-field matching and ranking
 */
export function smartSearch(
  exercises: AnyExercise[],
  query: string
): SearchResult[] {
  if (!query || !query.trim()) {
    return exercises.map(ex => ({ exercise: ex, score: 0, matchedTokens: [] }));
  }

  const normalizedQuery = normalizeExerciseName(query);
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const queryHints = extractQueryHints(query);

  // Score each exercise
  const scored: SearchResult[] = exercises.map(exercise => {
    const normalizedName = normalizeExerciseName(exercise.name);
    let score = 0;
    const matchedTokens: string[] = [];

    // 1) Name matches (highest priority)
    if (normalizedName === normalizedQuery) {
      score = 1000;
      matchedTokens.push('name:exact');
    } else if (normalizedName.startsWith(normalizedQuery)) {
      score = 800;
      matchedTokens.push('name:starts');
    } else {
      // Check if name starts with any token
      for (const token of queryTokens) {
        if (normalizedName.startsWith(token)) {
          score = Math.max(score, 700);
          matchedTokens.push(`name:starts:${token}`);
        } else if (normalizedName.includes(token)) {
          score = Math.max(score, 500);
          matchedTokens.push(`name:includes:${token}`);
        }
      }
    }

    // 2) Alias matches
    if (exercise.aliases && exercise.aliases.length > 0) {
      for (const alias of exercise.aliases) {
        const normalizedAlias = normalizeExerciseName(alias);
        if (normalizedAlias === normalizedQuery) {
          score = Math.max(score, 900);
          matchedTokens.push('alias:exact');
          break;
        } else if (normalizedAlias.startsWith(normalizedQuery)) {
          score = Math.max(score, 650);
          matchedTokens.push('alias:starts');
        } else if (normalizedAlias.includes(normalizedQuery)) {
          score = Math.max(score, 450);
          matchedTokens.push('alias:includes');
        }
      }
    }

    // 3) Equipment matches
    const equipment = normalizeEquipment(exercise.equipment);
    if (equipment) {
      const equipmentStr = equipment.toLowerCase();
      if (equipmentStr.includes(normalizedQuery) || normalizedQuery.includes(equipmentStr)) {
        score = Math.max(score, 400);
        matchedTokens.push(`equipment:${equipment}`);
      }
      // Boost if query hint matches equipment
      if (queryHints.equipment === equipment) {
        score = Math.max(score, 350);
        matchedTokens.push(`equipment:hint:${equipment}`);
      }
    }

    // 4) Bucket matches
    const sysEx = exercise.source === 'system' ? (exercise as any) : null;
    const bucket = deriveMuscleBucket(
      sysEx?.target,
      sysEx?.bodyPart,
      exercise.primaryMuscles && exercise.primaryMuscles.length > 0 ? exercise.primaryMuscles : undefined
    );
    if (bucket) {
      const bucketStr = bucket.toLowerCase();
      if (bucketStr.includes(normalizedQuery) || normalizedQuery.includes(bucketStr)) {
        score = Math.max(score, 300);
        matchedTokens.push(`bucket:${bucket}`);
      }
      // Boost if query hint matches bucket
      if (queryHints.bucket === bucket) {
        score = Math.max(score, 250);
        matchedTokens.push(`bucket:hint:${bucket}`);
      }
    }

    // 5) Raw target/bodyPart matches (lower priority)
    if (exercise.source === 'system') {
      const sysEx = exercise as any;
      if (sysEx.target) {
        const targetStr = typeof sysEx.target === 'string' 
          ? normalizeExerciseName(sysEx.target)
          : Array.isArray(sysEx.target)
            ? sysEx.target.map((t: string) => normalizeExerciseName(t)).join(' ')
            : '';
        for (const token of queryTokens) {
          if (targetStr.includes(token)) {
            score = Math.max(score, 200);
            matchedTokens.push(`target:${token}`);
          }
        }
      }
      if (sysEx.bodyPart) {
        const bodyPartStr = typeof sysEx.bodyPart === 'string'
          ? normalizeExerciseName(sysEx.bodyPart)
          : Array.isArray(sysEx.bodyPart)
            ? sysEx.bodyPart.map((bp: string) => normalizeExerciseName(bp)).join(' ')
            : '';
        for (const token of queryTokens) {
          if (bodyPartStr.includes(token)) {
            score = Math.max(score, 200);
            matchedTokens.push(`bodyPart:${token}`);
          }
        }
      }
    }

    return { exercise, score, matchedTokens };
  }).filter(item => item.score > 0);

  // Sort by score (descending), then by matched token count, then alphabetically
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // More matched tokens = better
    if (b.matchedTokens.length !== a.matchedTokens.length) {
      return b.matchedTokens.length - a.matchedTokens.length;
    }
    return normalizeExerciseName(a.exercise.name).localeCompare(normalizeExerciseName(b.exercise.name));
  });

  return scored;
}

/**
 * Apply refiners to search results
 */
export function applyRefiners(
  results: SearchResult[],
  activeEquipment: Set<EquipmentLabel>,
  activeBuckets: Set<MuscleBucket>
): SearchResult[] {
  if (activeEquipment.size === 0 && activeBuckets.size === 0) {
    return results;
  }

  return results.filter(result => {
    // Equipment filter (AND logic: must match at least one active equipment)
    if (activeEquipment.size > 0) {
      const equipment = normalizeEquipment(result.exercise.equipment);
      if (!equipment || !activeEquipment.has(equipment)) {
        return false;
      }
    }

    // Bucket filter (AND logic: must match at least one active bucket)
    if (activeBuckets.size > 0) {
      const sysEx = result.exercise.source === 'system' ? (result.exercise as any) : null;
      const bucket = deriveMuscleBucket(
        sysEx?.target,
        sysEx?.bodyPart,
        result.exercise.primaryMuscles && result.exercise.primaryMuscles.length > 0 ? result.exercise.primaryMuscles : undefined
      );
      if (!bucket || !activeBuckets.has(bucket)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Generate refiners from search results
 */
export function generateRefiners(results: SearchResult[]): Refiner[] {
  if (results.length < 20) {
    return [];
  }

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

/**
 * Group results by bucket or equipment (only when helpful)
 */
export function groupResults(
  results: SearchResult[],
  query: string
): { groupLabel: string; results: SearchResult[] }[] | null {
  const queryHints = extractQueryHints(query);
  const normalizedQuery = normalizeExerciseName(query);

  // Check if query contains equipment or bucket tokens
  const hasEquipmentToken = queryHints.equipment !== null;
  const hasBucketToken = queryHints.bucket !== null;

  // Group by bucket if query has equipment token
  if (hasEquipmentToken && !hasBucketToken) {
    const groups = new Map<MuscleBucket | 'Other', SearchResult[]>();
    
    for (const result of results) {
      const sysEx = result.exercise.source === 'system' ? (result.exercise as any) : null;
      const bucket = deriveMuscleBucket(
        sysEx?.target,
        sysEx?.bodyPart,
        result.exercise.primaryMuscles && result.exercise.primaryMuscles.length > 0 ? result.exercise.primaryMuscles : undefined
      ) || 'Other' as MuscleBucket | 'Other';
      
      if (!groups.has(bucket)) {
        groups.set(bucket, []);
      }
      groups.get(bucket)!.push(result);
    }

    // Only group if it creates <= 6 groups and no tiny groups
    if (groups.size <= 6) {
      const groupArray = Array.from(groups.entries())
        .filter(([_, results]) => results.length >= 2) // Skip tiny groups
        .map(([label, results]) => ({ groupLabel: label, results }));
      
      if (groupArray.length > 1) {
        return groupArray;
      }
    }
  }

  // Group by equipment if query has bucket token
  if (hasBucketToken && !hasEquipmentToken) {
    const groups = new Map<EquipmentLabel | 'Other', SearchResult[]>();
    
    for (const result of results) {
      const equipment = normalizeEquipment(result.exercise.equipment) || 'Other' as EquipmentLabel | 'Other';
      
      if (!groups.has(equipment)) {
        groups.set(equipment, []);
      }
      groups.get(equipment)!.push(result);
    }

    // Only group if it creates <= 6 groups and no tiny groups
    if (groups.size <= 6) {
      const groupArray = Array.from(groups.entries())
        .filter(([_, results]) => results.length >= 2) // Skip tiny groups
        .map(([label, results]) => ({ groupLabel: label, results }));
      
      if (groupArray.length > 1) {
        return groupArray;
      }
    }
  }

  return null; // No grouping
}

