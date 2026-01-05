/**
 * Usage statistics tracking for exercises
 * Tracks: use count, last used timestamp, last used in template
 */

const USAGE_STATS_KEY = 'exercise.usage.stats';

export interface UsageStats {
  useCount: number;
  lastUsedAt: number; // timestamp
  lastUsedInWorkoutTemplateId?: string;
}

type UsageStatsMap = { [exerciseId: string]: UsageStats };

/**
 * Load all usage stats from localStorage
 */
function loadUsageStats(): UsageStatsMap {
  try {
    const data = localStorage.getItem(USAGE_STATS_KEY);
    if (data) {
      const parsed = JSON.parse(data) as UsageStatsMap;
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    }
    return {};
  } catch (error) {
    console.error('[ExerciseUsageStats] Failed to load stats:', error);
    return {};
  }
}

/**
 * Save usage stats to localStorage
 */
function saveUsageStats(stats: UsageStatsMap): void {
  try {
    localStorage.setItem(USAGE_STATS_KEY, JSON.stringify(stats));
  } catch (error) {
    console.error('[ExerciseUsageStats] Failed to save stats:', error);
  }
}

/**
 * Record that an exercise was used
 * Increments use count and updates last used timestamp
 */
export function recordUsage(
  exerciseId: string,
  templateId?: string
): void {
  if (!exerciseId) return;

  const stats = loadUsageStats();
  const existing = stats[exerciseId] || { useCount: 0, lastUsedAt: 0 };

  stats[exerciseId] = {
    useCount: existing.useCount + 1,
    lastUsedAt: Date.now(),
    lastUsedInWorkoutTemplateId: templateId || existing.lastUsedInWorkoutTemplateId,
  };

  saveUsageStats(stats);
}

/**
 * Get usage stats for an exercise
 */
export function getUsageStats(exerciseId: string): UsageStats | null {
  const stats = loadUsageStats();
  return stats[exerciseId] || null;
}

/**
 * Get usage score for ranking
 * Combines recency (exponential decay) and frequency (log scale)
 */
export function getUsageScore(exerciseId: string): number {
  const stats = getUsageStats(exerciseId);
  if (!stats) return 0;

  // Exponential decay for recency (τ = 30 days)
  const daysSince = (Date.now() - stats.lastUsedAt) / (1000 * 60 * 60 * 24);
  const recentBoost = Math.exp(-daysSince / 30);

  // Logarithmic frequency boost
  const freqBoost = Math.log(1 + stats.useCount);

  return recentBoost + 0.3 * freqBoost;
}

/**
 * Get context score if exercise was used in a specific template
 */
export function getContextScore(exerciseId: string, templateId?: string): number {
  if (!templateId) return 0;

  const stats = getUsageStats(exerciseId);
  if (stats?.lastUsedInWorkoutTemplateId === templateId) {
    return 1.0; // Big boost for template context
  }

  return 0;
}

/**
 * Get all usage stats (for cleanup/maintenance)
 */
export function getAllUsageStats(): UsageStatsMap {
  return loadUsageStats();
}

/**
 * Clean up usage stats for exercises that no longer exist
 */
export function cleanupUsageStats(existingExerciseIds: Set<string>): void {
  const stats = loadUsageStats();
  let changed = false;

  for (const exerciseId of Object.keys(stats)) {
    if (!existingExerciseIds.has(exerciseId)) {
      delete stats[exerciseId];
      changed = true;
    }
  }

  if (changed) {
    saveUsageStats(stats);
  }
}

