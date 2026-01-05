/**
 * Swap history tracking for exercise replacements
 * Stores lightweight records of exercise swaps for ranking future replacements
 */

export interface SwapRecord {
  originalExerciseId: string;
  replacementExerciseId: string;
  timestamp: number;
  workoutInstanceId: string;
  slotId?: string; // Optional slot identifier if workouts have slots
}

const SWAP_HISTORY_KEY = 'exercise.swap.history';
const MAX_SWAP_RECORDS = 100; // Keep last 100 swaps

/**
 * Load swap history from localStorage
 */
function loadSwapHistory(): SwapRecord[] {
  try {
    const stored = localStorage.getItem(SWAP_HISTORY_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[SwapHistory] Error loading swap history:', error);
    return [];
  }
}

/**
 * Save swap history to localStorage
 */
function saveSwapHistory(records: SwapRecord[]): void {
  try {
    // Keep only the most recent records
    const trimmed = records
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_SWAP_RECORDS);
    localStorage.setItem(SWAP_HISTORY_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('[SwapHistory] Error saving swap history:', error);
  }
}

/**
 * Record a swap event
 */
export function recordSwap(
  originalExerciseId: string,
  replacementExerciseId: string,
  workoutInstanceId: string,
  slotId?: string
): void {
  const records = loadSwapHistory();
  const newRecord: SwapRecord = {
    originalExerciseId,
    replacementExerciseId,
    timestamp: Date.now(),
    workoutInstanceId,
    slotId,
  };
  records.push(newRecord);
  saveSwapHistory(records);
}

/**
 * Get swap score for a replacement exercise
 * Returns a score based on how often this replacement was chosen for the original exercise
 */
export function getSwapScore(
  originalExerciseId: string,
  replacementExerciseId: string
): number {
  const records = loadSwapHistory();
  
  // Count how many times this specific swap occurred
  const swapCount = records.filter(
    r => r.originalExerciseId === originalExerciseId &&
         r.replacementExerciseId === replacementExerciseId
  ).length;
  
  // Return a score (0-10) based on frequency
  // More recent swaps get slightly higher weight, but frequency is primary
  if (swapCount === 0) return 0;
  if (swapCount === 1) return 3;
  if (swapCount === 2) return 5;
  if (swapCount >= 3) return 8;
  return 0;
}

/**
 * Get all replacement exercises that were swapped for a given original exercise
 * Returns a map of replacementExerciseId -> count
 */
export function getReplacementHistory(originalExerciseId: string): Map<string, number> {
  const records = loadSwapHistory();
  const history = new Map<string, number>();
  
  records
    .filter(r => r.originalExerciseId === originalExerciseId)
    .forEach(r => {
      const count = history.get(r.replacementExerciseId) || 0;
      history.set(r.replacementExerciseId, count + 1);
    });
  
  return history;
}

