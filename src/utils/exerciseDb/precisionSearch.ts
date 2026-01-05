// Precision search with two-tier results (best match + related)

import { AnyExercise } from './types';
import { normalizeExerciseName } from './types';
import { buildSearchText } from './searchAliases';
import { normalizeEquipment, deriveMuscleBucket, extractQueryHints, type EquipmentLabel, type MuscleBucket } from './normalize';

export interface BestMatchResult {
  exercise: AnyExercise;
  score: number;
  reason: 'exact' | 'contains' | 'alias-contains' | 'token-set-name' | 'token-set-aliases' | 'starts-with';
}

export interface RelatedResult {
  exercise: AnyExercise;
  score: number;
  reason: 'equipment' | 'bucket' | 'target' | 'bodypart' | 'name-partial';
}

export interface PrecisionSearchResults {
  best: BestMatchResult[];
  related: RelatedResult[];
}

/**
 * Precision search with strict name/alias matching for best tier
 */
export function precisionSearch(
  exercises: AnyExercise[],
  query: string
): PrecisionSearchResults {
  const normalizedQuery = normalizeExerciseName(query);
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const queryLower = normalizedQuery.toLowerCase();

  const bestMatches: BestMatchResult[] = [];
  const relatedMatches: RelatedResult[] = [];
  const bestMatchIds = new Set<string>();

  // Build search text for each exercise
  const exerciseSearchData = exercises.map(ex => ({
    exercise: ex,
    searchText: buildSearchText(ex),
    nameNormalized: normalizeExerciseName(ex.name),
  }));

  // Tier A: Best match (strict name/alias matching)
  for (const { exercise, searchText, nameNormalized } of exerciseSearchData) {
    let score = 0;
    let reason: BestMatchResult['reason'] | null = null;

    // 1000: exact match
    if (nameNormalized === normalizedQuery) {
      score = 1000;
      reason = 'exact';
    }
    // 900: name contains full query
    else if (nameNormalized.includes(normalizedQuery)) {
      score = 900;
      reason = 'contains';
    }
    // 850: alias contains full query
    else if (searchText.includes(normalizedQuery) && searchText !== nameNormalized) {
      score = 850;
      reason = 'alias-contains';
    }
    // 800: all tokens appear in name in ANY order (token set match)
    else if (queryTokens.length > 0 && queryTokens.every(token => nameNormalized.includes(token))) {
      score = 800;
      reason = 'token-set-name';
    }
    // 780: all tokens appear across name+aliases (token set match)
    else if (queryTokens.length > 0 && queryTokens.every(token => searchText.includes(token))) {
      score = 780;
      reason = 'token-set-aliases';
    }
    // 700: name startsWith first token and contains the rest
    else if (queryTokens.length > 0) {
      const firstToken = queryTokens[0];
      const restTokens = queryTokens.slice(1);
      if (nameNormalized.startsWith(firstToken) && 
          restTokens.every(token => nameNormalized.includes(token))) {
        score = 700;
        reason = 'starts-with';
      }
    }

    if (score > 0 && reason) {
      bestMatches.push({ exercise, score, reason });
      bestMatchIds.add(exercise.id);
    }
  }

  // Sort best matches: by score (desc), then by word count (fewer extra words first), then alphabetical
  bestMatches.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // Fewer extra words in name (prefer shorter)
    const aWords = normalizeExerciseName(a.exercise.name).split(/\s+/).length;
    const bWords = normalizeExerciseName(b.exercise.name).split(/\s+/).length;
    if (aWords !== bWords) {
      return aWords - bWords;
    }
    // Alphabetical
    return normalizeExerciseName(a.exercise.name).localeCompare(normalizeExerciseName(b.exercise.name));
  });

  // Tier B: Related (only if best tier has < 5 results)
  if (bestMatches.length < 5) {
    const queryHints = extractQueryHints(query);

    for (const { exercise, searchText, nameNormalized } of exerciseSearchData) {
      // Skip if already in best matches
      if (bestMatchIds.has(exercise.id)) {
        continue;
      }

      let score = 0;
      let reason: RelatedResult['reason'] | null = null;

      // Name partial match (lower priority)
      if (queryTokens.some(token => nameNormalized.includes(token))) {
        score = 500;
        reason = 'name-partial';
      }

      // Equipment match
      const equipment = normalizeEquipment(exercise.equipment);
      if (equipment && queryHints.equipment === equipment) {
        score = Math.max(score, 400);
        reason = 'equipment';
      } else if (equipment && queryLower.includes(equipment.toLowerCase())) {
        score = Math.max(score, 350);
        reason = 'equipment';
      }

      // Bucket match
      const sysEx = exercise.source === 'system' ? (exercise as any) : null;
      const bucket = deriveMuscleBucket(
        sysEx?.target,
        sysEx?.bodyPart,
        exercise.primaryMuscles && exercise.primaryMuscles.length > 0 ? exercise.primaryMuscles : undefined
      );
      if (bucket && queryHints.bucket === bucket) {
        score = Math.max(score, 300);
        reason = 'bucket';
      } else if (bucket && queryLower.includes(bucket.toLowerCase())) {
        score = Math.max(score, 250);
        reason = 'bucket';
      }

      // Target/bodyPart match
      if (sysEx?.target) {
        const targetStr = typeof sysEx.target === 'string' 
          ? normalizeExerciseName(sysEx.target)
          : Array.isArray(sysEx.target)
            ? sysEx.target.map((t: string) => normalizeExerciseName(t)).join(' ')
            : '';
        if (queryTokens.some(token => targetStr.includes(token))) {
          score = Math.max(score, 200);
          reason = 'target';
        }
      }
      if (sysEx?.bodyPart) {
        const bodyPartStr = typeof sysEx.bodyPart === 'string'
          ? normalizeExerciseName(sysEx.bodyPart)
          : Array.isArray(sysEx.bodyPart)
            ? sysEx.bodyPart.map((bp: string) => normalizeExerciseName(bp)).join(' ')
            : '';
        if (queryTokens.some(token => bodyPartStr.includes(token))) {
          score = Math.max(score, 200);
          reason = 'bodypart';
        }
      }

      if (score > 0 && reason) {
        relatedMatches.push({ exercise, score, reason });
      }
    }

    // Sort related matches by score (desc), then alphabetical
    relatedMatches.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return normalizeExerciseName(a.exercise.name).localeCompare(normalizeExerciseName(b.exercise.name));
    });

    // Cap related tier to 30 items if best tier has at least 1 result
    if (bestMatches.length >= 1 && relatedMatches.length > 30) {
      relatedMatches.splice(30);
    }
  }

  return { best: bestMatches, related: relatedMatches };
}



