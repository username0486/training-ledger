import { Set } from '../types';

/**
 * Get sets in chronological display order (oldest → newest)
 * Sorts by timestamp ascending, preserving insertion order if timestamps are equal
 */
export function getSetsInDisplayOrder(sets: Set[]): Set[] {
  if (sets.length === 0) return [];
  
  // Create a defensive copy to avoid mutating the original
  const sorted = [...sets];
  
  // Sort by timestamp ascending (oldest first)
  sorted.sort((a, b) => {
    // Primary sort: by timestamp
    if (a.timestamp !== b.timestamp) {
      return a.timestamp - b.timestamp;
    }
    // If timestamps are equal (shouldn't happen, but fallback to insertion order)
    // Use id as tiebreaker to maintain stable order
    return a.id.localeCompare(b.id);
  });
  
  return sorted;
}
