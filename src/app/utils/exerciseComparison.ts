/**
 * Exercise comparison utilities
 * Computes comparison flags between exercise sessions
 */

import { Workout } from '../types';
import { getUnitSystem } from '../../utils/preferences';
import { getRecentSessionsForExercise } from './storage';

export interface ComparisonFlag {
  show: boolean;
  direction: 'up' | 'down';
  message: string;
}

/**
 * Get the heaviest set weight from a session's sets
 * @param sets - Array of sets with weight and reps
 * @returns Heaviest weight in kg, or null if no valid weights
 */
function getHeaviestSetWeight(sets: Array<{ weight: number; reps: number }>): number | null {
  if (!sets || sets.length === 0) return null;
  
  const weights = sets
    .map(set => set.weight)
    .filter(weight => typeof weight === 'number' && !isNaN(weight) && isFinite(weight) && weight > 0);
  
  if (weights.length === 0) return null;
  
  return Math.max(...weights);
}

/**
 * Compute comparison flag between last and previous session
 * @param exerciseName - Name of the exercise
 * @param workouts - All completed workouts
 * @returns Comparison flag with show status, direction, and message
 */
export function getComparisonFlag(
  exerciseName: string,
  workouts: Workout[]
): ComparisonFlag {
  // Get last 2 sessions (most recent first)
  const sessions = getRecentSessionsForExercise(exerciseName, workouts, 2);
  
  // Need at least 2 sessions to compare
  if (sessions.length < 2) {
    return { show: false, direction: 'up', message: '' };
  }
  
  const lastSession = sessions[0];
  const prevSession = sessions[1];
  
  const lastHeaviest = getHeaviestSetWeight(lastSession.sets);
  const prevHeaviest = getHeaviestSetWeight(prevSession.sets);
  
  // Both sessions must have valid weights
  if (lastHeaviest === null || prevHeaviest === null || prevHeaviest === 0) {
    return { show: false, direction: 'up', message: '' };
  }
  
  // Compute difference
  const diff = lastHeaviest - prevHeaviest;
  const absDiff = Math.abs(diff);
  const relDiff = prevHeaviest > 0 ? absDiff / prevHeaviest : 0;
  
  // Get thresholds based on unit system
  const unitSystem = getUnitSystem();
  const ABS_THRESHOLD = unitSystem === 'metric' ? 2.5 : 5; // 2.5 kg or 5 lb
  const REL_THRESHOLD = 0.05; // 5%
  
  // Check if difference is meaningful
  const showFlag = absDiff >= ABS_THRESHOLD || relDiff >= REL_THRESHOLD;
  
  if (!showFlag) {
    return { show: false, direction: 'up', message: '' };
  }
  
  // Determine direction and message
  const direction = diff > 0 ? 'up' : 'down';
  const message = `Heaviest set ${direction === 'up' ? '↑' : '↓'} vs previous`;
  
  return { show: true, direction, message };
}
