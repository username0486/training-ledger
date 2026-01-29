/**
 * Duration helpers for session timing.
 * Source of truth is timestamps (startedAt/endedAt), not interval drift.
 */

/**
 * Returns elapsed seconds from startedAt until now (or endedAt if provided).
 */
export function getElapsedSec(startedAt: number, endedAt?: number): number {
  const start = typeof startedAt === 'number' && isFinite(startedAt) ? startedAt : 0;
  const end = typeof endedAt === 'number' && isFinite(endedAt) ? endedAt : Date.now();
  if (start <= 0) return 0;
  return Math.max(0, Math.floor((end - start) / 1000));
}

/**
 * Format duration for session timing displays:
 * - Under 1 hour (< 3600 seconds): MM:SS (e.g., 04:07, 23:59)
 * - 1 hour or more (≥ 3600 seconds): HH:MM (e.g., 1:05, 2:40)
 * 
 * Rules:
 * - Minutes are always zero-padded
 * - Seconds are always zero-padded (when shown)
 * - Hours are NOT zero-padded
 * - Do NOT show seconds once hours are present
 */
export function formatDuration(elapsedSec: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedSec || 0));
  
  // Under 1 hour: display as MM:SS
  if (totalSeconds < 3600) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const mm = minutes.toString().padStart(2, '0');
    const ss = seconds.toString().padStart(2, '0');
    return `${mm}:${ss}`;
  }
  
  // 1 hour or more: display as HH:MM
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const mm = minutes.toString().padStart(2, '0');
  return `${hours}:${mm}`;
}

/**
 * Compute a persisted durationSec from timestamps.
 * Uses Math.round per requirements.
 */
export function computeDurationSec(startedAt: number, endedAt: number): number {
  if (!startedAt || !endedAt) return 0;
  return Math.max(0, Math.round((endedAt - startedAt) / 1000));
}

/**
 * Format duration range for preview display:
 * - Always shows minutes (no seconds)
 * - If duration exceeds 60 minutes, shows hours+minutes range
 * - Examples: "20–30 min", "1h 05m – 1h 15m"
 */
export function formatDurationRange(minSec: number, maxSec: number): string {
  const minMinutes = Math.floor(minSec / 60);
  const maxMinutes = Math.floor(maxSec / 60);
  
  // If both are under 60 minutes, show simple range
  if (maxMinutes < 60) {
    return `${minMinutes}–${maxMinutes} min`;
  }
  
  // If max is 60+ minutes, format both as hours+minutes (even if min < 60)
  const minHours = Math.floor(minMinutes / 60);
  const minMins = minMinutes % 60;
  const maxHours = Math.floor(maxMinutes / 60);
  const maxMins = maxMinutes % 60;
  
  // Format: if hours > 0, show "Xh YYm", otherwise just "YYm"
  const minStr = minHours > 0 
    ? `${minHours}h ${minMins.toString().padStart(2, '0')}m`
    : `${minMins}m`;
  const maxStr = `${maxHours}h ${maxMins.toString().padStart(2, '0')}m`;
  
  return `${minStr} – ${maxStr}`;
}

/**
 * Estimate workout duration range for preview:
 * - If no prior completion: assumes 3 sets per exercise, 60-150s rest between sets, rounds UP per-exercise to nearest minute
 * - If prior completion exists: use last duration ±5 min
 * Returns { minSec, maxSec } or null if cannot estimate
 * 
 * Base assumptions (no prior completion):
 * - setsPerExercise = 3
 * - restBetweenSets = 60-150 seconds
 * - workTimePerSet = 30 seconds
 * - rest occurs only between sets → (setsPerExercise - 1) rests
 * - Per-exercise: min = (3×30) + (2×60) = 210s, max = (3×30) + (2×150) = 390s
 * - Round UP to nearest minute: min = ceil(210/60) = 4 min, max = ceil(390/60) = 7 min
 * - Total: n × 4 – n × 7 minutes
 */
export function estimateWorkoutDuration(
  templateId: string,
  exerciseCount: number,
  completedWorkouts: Array<{ templateId?: string; durationSec?: number; endedAt?: number }>
): { minSec: number; maxSec: number } | null {
  // Guard: if exercise count is 0 or missing, hide estimate
  if (!exerciseCount || exerciseCount === 0) {
    return null;
  }
  
  // Find most recent completed workout for this template
  const priorWorkouts = completedWorkouts
    .filter(w => w.templateId === templateId && w.durationSec !== undefined && w.durationSec > 0)
    .sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0));
  
  if (priorWorkouts.length > 0 && priorWorkouts[0].durationSec !== undefined) {
    // Use last duration ±5 min
    const baseSec = priorWorkouts[0].durationSec;
    const baseMin = Math.round(baseSec / 60);
    const minMin = Math.max(5, baseMin - 5);
    const maxMin = baseMin + 5;
    return {
      minSec: minMin * 60,
      maxSec: maxMin * 60,
    };
  }
  
  // No prior completion: use exercise count heuristic with 3 sets per exercise
  // Per-exercise time calculation:
  // - Work time: 3 sets × 30 seconds = 90 seconds
  // - Rest time: (3 - 1) rests between sets
  //   - Min rest: 2 × 60 = 120 seconds
  //   - Max rest: 2 × 150 = 300 seconds
  // - Total per exercise: min = 90 + 120 = 210s, max = 90 + 300 = 390s
  // - Round UP to nearest minute: min = ceil(210/60) = 4 min, max = ceil(390/60) = 7 min
  const minExerciseSec = (3 * 30) + (2 * 60);  // 210 seconds
  const maxExerciseSec = (3 * 30) + (2 * 150); // 390 seconds
  
  // Round UP to nearest whole minute
  const minExerciseMin = Math.ceil(minExerciseSec / 60); // 4 minutes
  const maxExerciseMin = Math.ceil(maxExerciseSec / 60); // 7 minutes
  
  // Total workout estimate
  const minTotalMin = exerciseCount * minExerciseMin;
  const maxTotalMin = exerciseCount * maxExerciseMin;
  
  return {
    minSec: minTotalMin * 60,
    maxSec: maxTotalMin * 60,
  };
}

