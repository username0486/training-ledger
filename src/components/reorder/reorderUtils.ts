/**
 * Reorder utilities for drag-and-drop lists.
 * Uses stable array operations to ensure React state remains the single source of truth.
 */

/**
 * Reorders an array by moving the item at startIndex to finishIndex.
 * Returns a new array; does not mutate the original.
 *
 * @param list - The array to reorder
 * @param startIndex - Index of the item being moved
 * @param finishIndex - Index where the item should end up
 * @returns A new array with the reordered items
 */
export function reorderArray<T>(list: T[], startIndex: number, finishIndex: number): T[] {
  if (startIndex === finishIndex) return [...list];
  if (startIndex < 0 || startIndex >= list.length) return [...list];
  if (finishIndex < 0 || finishIndex >= list.length) return [...list];

  const result = [...list];
  const [removed] = result.splice(startIndex, 1);
  result.splice(finishIndex, 0, removed);
  return result;
}
