/**
 * Rest timer utilities for computing elapsed time from persisted timestamps
 */

/**
 * Compute elapsed seconds since a timestamp
 */
export function getElapsedSince(timestamp: number | null | undefined, nowMs?: number): number {
  if (!timestamp) return 0;
  const now = nowMs ?? Date.now();
  return Math.max(0, Math.floor((now - timestamp) / 1000));
}

/**
 * Format elapsed seconds as MM:SS
 */
export function formatRestTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format elapsed seconds as MM:SS (under 1 hour) or HH:MM (1 hour+)
 */
export function formatElapsed(seconds: number): string {
  if (seconds < 3600) {
    // Under 1 hour: MM:SS
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  } else {
    // 1 hour+: HH:MM
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  }
}

/**
 * Format "x ago" style relative time from timestamp
 * Uses nowMs for consistent computation across re-renders
 */
export function formatAgo(lastSetAtMs: number, nowMs: number): string {
  const diff = nowMs - lastSetAtMs;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(diff / 604800000);
  
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return `${weeks}w ago`;
}

/**
 * Get the most recent lastSetAt timestamp from a group of exercises
 * Used for supersets/groups where all exercises share the same rest context
 */
export function getGroupLastSetAt(exercises: Array<{ lastSetAt?: number }>): number | null {
  const timestamps = exercises
    .map(ex => ex.lastSetAt)
    .filter((ts): ts is number => ts !== undefined && ts !== null);
  
  if (timestamps.length === 0) return null;
  return Math.max(...timestamps);
}
