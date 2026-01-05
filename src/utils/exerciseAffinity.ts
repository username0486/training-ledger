/**
 * Lightweight query→exercise affinity tracking
 * Stores which exercises users select for which queries to improve ranking
 * Enhanced with score and timestamp for better ranking
 */

const AFFINITY_STORAGE_KEY = 'exercise.search.affinity';
const MAX_AFFINITIES_PER_QUERY = 5;
const MAX_AFFINITY_SCORE = 10;

export interface QueryAffinity {
  exerciseId: string;
  score: number; // 0..MAX_AFFINITY_SCORE
  lastChosenAt: number; // timestamp
}

type AffinityMap = { [normalizedQuery: string]: QueryAffinity[] };

/**
 * Load affinity mappings from localStorage
 */
function loadAffinities(): AffinityMap {
  try {
    const data = localStorage.getItem(AFFINITY_STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data) as AffinityMap;
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    }
    return {};
  } catch (error) {
    console.error('[ExerciseAffinity] Failed to load affinities:', error);
    return {};
  }
}

/**
 * Save affinity mappings to localStorage
 */
function saveAffinities(affinities: AffinityMap): void {
  try {
    localStorage.setItem(AFFINITY_STORAGE_KEY, JSON.stringify(affinities));
  } catch (error) {
    console.error('[ExerciseAffinity] Failed to save affinities:', error);
  }
}

/**
 * Record that a user selected an exercise for a given query
 * This creates/updates the affinity mapping with score increment
 */
export function recordAffinity(query: string, exerciseId: string): void {
  if (!query.trim() || !exerciseId) return;

  const normalizedQuery = normalizeQuery(query);
  const affinities = loadAffinities();
  
  // Get existing affinities for this query
  const existing = affinities[normalizedQuery] || [];
  
  // Find existing affinity for this exercise
  const existingIndex = existing.findIndex(a => a.exerciseId === exerciseId);
  
  if (existingIndex >= 0) {
    // Update existing: increment score, update timestamp
    existing[existingIndex] = {
      exerciseId,
      score: Math.min(existing[existingIndex].score + 1, MAX_AFFINITY_SCORE),
      lastChosenAt: Date.now(),
    };
    // Move to front (most recent)
    const updated = [existing[existingIndex], ...existing.filter((_, i) => i !== existingIndex)];
    affinities[normalizedQuery] = updated.slice(0, MAX_AFFINITIES_PER_QUERY);
  } else {
    // New affinity: add with score 1
    const newAffinity: QueryAffinity = {
      exerciseId,
      score: 1,
      lastChosenAt: Date.now(),
    };
    const updated = [newAffinity, ...existing].slice(0, MAX_AFFINITIES_PER_QUERY);
    affinities[normalizedQuery] = updated;
  }
  
  saveAffinities(affinities);
}

/**
 * Normalize query for affinity storage
 */
function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Get query affinities for a given query
 * Returns array of QueryAffinity objects
 */
export function getAffinities(query: string): QueryAffinity[] {
  if (!query.trim()) return [];
  
  const normalizedQuery = normalizeQuery(query);
  const affinities = loadAffinities();
  return affinities[normalizedQuery] || [];
}

/**
 * Get exercise IDs that have affinity with a given query (backward compat)
 */
export function getAffinityExerciseIds(query: string): string[] {
  return getAffinities(query).map(a => a.exerciseId);
}

/**
 * Get all affinities as a Map for efficient lookup
 */
export function getAllAffinities(): Map<string, QueryAffinity[]> {
  const affinities = loadAffinities();
  const map = new Map<string, QueryAffinity[]>();
  
  for (const [query, affinityList] of Object.entries(affinities)) {
    map.set(query, affinityList);
  }
  
  return map;
}

/**
 * Get affinity score for a specific query→exercise pair
 * Returns normalized score (0..1)
 */
export function getAffinityScore(query: string, exerciseId: string): number {
  const affinities = getAffinities(query);
  const affinity = affinities.find(a => a.exerciseId === exerciseId);
  
  if (!affinity) return 0;
  
  // Normalize score to 0..1
  return Math.min(affinity.score / MAX_AFFINITY_SCORE, 1.0);
}

/**
 * Clean up affinities for exercises that no longer exist
 * Optional maintenance function - can be called periodically
 */
export function cleanupAffinities(existingExerciseIds: Set<string>): void {
  const affinities = loadAffinities();
  let changed = false;
  
  for (const [query, exerciseIds] of Object.entries(affinities)) {
    const filtered = exerciseIds.filter(id => existingExerciseIds.has(id));
    if (filtered.length !== exerciseIds.length) {
      affinities[query] = filtered;
      changed = true;
    }
    
    // Remove empty entries
    if (filtered.length === 0) {
      delete affinities[query];
      changed = true;
    }
  }
  
  if (changed) {
    saveAffinities(affinities);
  }
}

