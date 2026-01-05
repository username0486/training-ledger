/**
 * Utility for managing recently chosen exercises in localStorage
 */

const RECENTS_STORAGE_KEY = 'exercise.search.recent';
const MAX_RECENTS = 20;

/**
 * Get exercise identifier (prefer stable id, fallback to normalized name)
 */
function getExerciseId(exercise: { id?: string; name: string }): string {
  return exercise.id || exercise.name.trim().toLowerCase();
}

/**
 * Load recently chosen exercises from localStorage
 * Returns array of exercise IDs (or normalized names if no ID)
 */
export function loadRecentExercises(): string[] {
  try {
    const data = localStorage.getItem(RECENTS_STORAGE_KEY);
    if (data) {
      const recents = JSON.parse(data) as string[];
      return Array.isArray(recents) ? recents : [];
    }
    return [];
  } catch (error) {
    console.error('[ExerciseRecents] Failed to load recents:', error);
    return [];
  }
}

/**
 * Save recently chosen exercises to localStorage
 */
function saveRecentExercises(recents: string[]): void {
  try {
    localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(recents));
  } catch (error) {
    console.error('[ExerciseRecents] Failed to save recents:', error);
  }
}

/**
 * Record an exercise as recently chosen
 * Moves it to the front, deduplicates, and caps at MAX_RECENTS
 */
export function recordRecentExercise(exercise: { id?: string; name: string }): void {
  const exerciseId = getExerciseId(exercise);
  const recents = loadRecentExercises();
  
  // Remove if already exists
  const filtered = recents.filter(id => id !== exerciseId);
  
  // Add to front
  const updated = [exerciseId, ...filtered].slice(0, MAX_RECENTS);
  
  saveRecentExercises(updated);
}

/**
 * Get recent exercises with usage stats for ranking
 * Returns exercises ordered by: 1) most recently used, 2) frequency
 * Limited to maxItems (default 5, absolute max 7)
 */
export function getRecentExercisesWithUsage<T extends { id?: string; name: string }>(
  allExercises: T[],
  maxItems: number = 5,
  getUsageStats?: (exerciseId: string) => { useCount: number; lastUsedAt: number } | null
): T[] {
  const recents = loadRecentExercises();
  const exerciseMap = new Map<string, T>();
  
  // Build map for quick lookup
  allExercises.forEach(ex => {
    const id = getExerciseId(ex);
    exerciseMap.set(id, ex);
  });
  
  // Get exercises that are in recents, with usage stats
  const recentExercisesWithStats: Array<{ exercise: T; lastUsedAt: number; useCount: number }> = [];
  
  recents.forEach(recentId => {
    const exercise = exerciseMap.get(recentId);
    if (exercise) {
      const stats = getUsageStats ? getUsageStats(getExerciseId(exercise)) : null;
      recentExercisesWithStats.push({
        exercise,
        lastUsedAt: stats?.lastUsedAt || 0,
        useCount: stats?.useCount || 0,
      });
    }
  });
  
  // Sort by: 1) most recently used (lastUsedAt desc), 2) frequency (useCount desc)
  recentExercisesWithStats.sort((a, b) => {
    // First by recency
    if (b.lastUsedAt !== a.lastUsedAt) {
      return b.lastUsedAt - a.lastUsedAt;
    }
    // Then by frequency
    return b.useCount - a.useCount;
  });
  
  // Limit to maxItems (absolute max 7)
  const limited = recentExercisesWithStats.slice(0, Math.min(maxItems, 7));
  
  return limited.map(item => item.exercise);
}

/**
 * Order exercises with recents first, then alphabetically
 * Returns a new array with the ordering applied
 */
export function orderExercisesWithRecents<T extends { id?: string; name: string }>(
  exercises: T[]
): T[] {
  const recents = loadRecentExercises();
  const exerciseMap = new Map<string, T>();
  
  // Build map for quick lookup
  exercises.forEach(ex => {
    const id = getExerciseId(ex);
    exerciseMap.set(id, ex);
  });
  
  // Separate into recents and others
  const recentExercises: T[] = [];
  const otherExercises: T[] = [];
  
  // Add exercises that are in recents (in recents order)
  recents.forEach(recentId => {
    const exercise = exerciseMap.get(recentId);
    if (exercise) {
      recentExercises.push(exercise);
      exerciseMap.delete(recentId); // Remove from map so it's not added to others
    }
  });
  
  // Add remaining exercises
  exerciseMap.forEach(exercise => {
    otherExercises.push(exercise);
  });
  
  // Sort others alphabetically by name
  otherExercises.sort((a, b) => {
    const nameA = a.name.trim().toLowerCase();
    const nameB = b.name.trim().toLowerCase();
    return nameA.localeCompare(nameB);
  });
  
  // Combine: recents first, then others
  return [...recentExercises, ...otherExercises];
}
