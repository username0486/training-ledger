/**
 * Semantic scoring for exercises based on query concepts
 * Scores exercises that match intent even if text doesn't match
 */

import { AnyExercise } from './exerciseDb/types';
import { QueryConcepts } from './searchConcepts';
import { normalize } from './searchNormalize';

/**
 * Compute semantic score based on query concepts
 * Scoring:
 * - +3 if inferred muscle in primaryMuscles
 * - +1 if inferred muscle in secondaryMuscles
 * - +2 if inferred equipment matches exercise.equipment
 * - +1 if inferred force matches
 * - +1 if inferred mechanic matches
 * - +1 if inferred category matches
 */
export function semanticScore(
  exercise: AnyExercise,
  concepts: QueryConcepts
): number {
  let score = 0;
  
  // Normalize exercise equipment (can be string or array)
  const exerciseEquipment = Array.isArray(exercise.equipment)
    ? exercise.equipment.map(eq => normalize(eq))
    : exercise.equipment
    ? [normalize(exercise.equipment)]
    : [];
  
  // Normalize exercise muscles
  const primaryMuscles = (exercise.primaryMuscles || []).map(m => normalize(m));
  const secondaryMuscles = (exercise.secondaryMuscles || []).map(m => normalize(m));
  
  // Muscle matching
  if (concepts.muscles.length > 0) {
    const normalizedConcepts = concepts.muscles.map(m => normalize(m));
    
    // Primary muscles: +3
    for (const concept of normalizedConcepts) {
      if (primaryMuscles.some(m => m.includes(concept) || concept.includes(m))) {
        score += 3;
        break; // Only count once per exercise
      }
    }
    
    // Secondary muscles: +1
    for (const concept of normalizedConcepts) {
      if (secondaryMuscles.some(m => m.includes(concept) || concept.includes(m))) {
        score += 1;
        break;
      }
    }
  }
  
  // Equipment matching: +2
  if (concepts.equipment.length > 0) {
    const normalizedConcepts = concepts.equipment.map(eq => normalize(eq));
    for (const concept of normalizedConcepts) {
      if (exerciseEquipment.some(eq => eq === concept || eq.includes(concept) || concept.includes(eq))) {
        score += 2;
        break;
      }
    }
  }
  
  // Force matching: +1
  // Note: force/mechanic are only on SystemExercise, check with type guard
  if (concepts.force && 'force' in exercise && exercise.force) {
    const normalizedForce = normalize(exercise.force);
    const normalizedConcept = normalize(concepts.force);
    if (normalizedForce === normalizedConcept) {
      score += 1;
    }
  }
  
  // Mechanic matching: +1
  if (concepts.mechanic && 'mechanic' in exercise && exercise.mechanic) {
    const normalizedMechanic = normalize(exercise.mechanic);
    const normalizedConcept = normalize(concepts.mechanic);
    if (normalizedMechanic === normalizedConcept) {
      score += 1;
    }
  }
  
  // Category matching: +1
  if (concepts.category && exercise.category) {
    const normalizedCategory = normalize(exercise.category);
    const normalizedConcept = normalize(concepts.category);
    if (normalizedCategory === normalizedConcept) {
      score += 1;
    }
  }
  
  return score;
}

/**
 * Check if exercise is an anchor (common/popular exercise)
 * For now, we'll use a simple heuristic based on exercise name patterns
 * In production, this could be a curated list or usage-based
 */
export function isAnchorExercise(exercise: AnyExercise): boolean {
  // Common anchor exercise patterns
  const anchorPatterns = [
    'bench press',
    'squat',
    'deadlift',
    'overhead press',
    'row',
    'pull',
    'curl',
    'extension',
    'press',
    'raise',
    'fly',
    'pulldown',
    'pullup',
    'pull-up',
    'dip',
    'push-up',
    'pushup',
    'lunge',
    'leg press',
    'crunch',
    'plank',
  ];
  
  const normalizedName = normalize(exercise.name);
  
  // Check if name contains any anchor pattern
  for (const pattern of anchorPatterns) {
    if (normalizedName.includes(pattern)) {
      return true;
    }
  }
  
  // System exercises with high usage are likely anchors
  // For now, we'll consider all system exercises as potential anchors
  // In production, this could be based on actual usage stats
  if (exercise.source === 'system') {
    // Additional check: if it's a compound movement (common anchors)
    if (exercise.mechanic === 'compound') {
      return true;
    }
  }
  
  return false;
}

/**
 * Get anchor boost score
 * Anchors get a small boost in semantic ranking to keep results sane
 */
export function getAnchorBoost(exercise: AnyExercise): number {
  return isAnchorExercise(exercise) ? 0.5 : 0;
}

