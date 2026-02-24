/**
 * Exercise drag-and-drop utilities for reorder and grouping.
 * Handles SessionListItem[] (ExerciseItem | GroupItem) with immutable updates.
 */

export type ExerciseItem = { type: 'exercise'; id: string; name: string };
export type GroupItem = { type: 'group'; id: string; children: ExerciseItem[] };
export type SessionListItem = ExerciseItem | GroupItem;

export type ItemLocation =
  | { container: 'root'; index: number }
  | { container: string; index: number; groupId: string };

/**
 * Get 1-based global exercise index (for display).
 */
export function getGlobalExerciseIndex(items: SessionListItem[], exerciseId: string): number {
  let idx = 0;
  for (const item of items) {
    if (item.type === 'exercise') {
      idx++;
      if (item.id === exerciseId) return idx;
    } else {
      for (const c of item.children) {
        idx++;
        if (c.id === exerciseId) return idx;
      }
    }
  }
  return 0;
}

/**
 * Find where an item (exercise or group) lives in the list.
 */
export function findItemLocation(
  items: SessionListItem[],
  id: string
): ItemLocation | null {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type === 'exercise') {
      if (item.id === id) return { container: 'root', index: i };
    } else {
      if (item.id === id) return { container: 'root', index: i };
      const childIdx = item.children.findIndex((c) => c.id === id);
      if (childIdx !== -1) return { container: item.id, index: childIdx, groupId: item.id };
    }
  }
  return null;
}

/**
 * Get the item by id.
 */
export function getItemById(items: SessionListItem[], id: string): ExerciseItem | GroupItem | null {
  for (const item of items) {
    if (item.type === 'exercise' && item.id === id) return item;
    if (item.type === 'group' && item.id === id) return item;
    if (item.type === 'group') {
      const child = item.children.find((c) => c.id === id);
      if (child) return child;
    }
  }
  return null;
}

/**
 * Remove item from its current location.
 */
export function removeItem(
  items: SessionListItem[],
  location: ItemLocation
): { nextItems: SessionListItem[]; removed: ExerciseItem | GroupItem } {
  if (location.container === 'root') {
    const removed = items[location.index];
    if (!removed) return { nextItems: [...items], removed: items[0] as ExerciseItem };
    const nextItems = items.filter((_, i) => i !== location.index);
    return { nextItems, removed };
  }
  const groupIdx = items.findIndex((i) => i.type === 'group' && i.id === location.groupId);
  if (groupIdx === -1) return { nextItems: [...items], removed: items[0] as ExerciseItem };
  const group = items[groupIdx] as GroupItem;
  const removed = group.children[location.index];
  if (!removed) return { nextItems: [...items], removed: group.children[0] };
  const newChildren = group.children.filter((_, i) => i !== location.index);
  const nextItems = [...items];
  if (newChildren.length === 0) {
    nextItems.splice(groupIdx, 1);
  } else if (newChildren.length === 1) {
    nextItems[groupIdx] = newChildren[0];
  } else {
    nextItems[groupIdx] = { ...group, children: newChildren };
  }
  return { nextItems, removed };
}

/**
 * Insert item at location.
 */
export function insertItem(
  items: SessionListItem[],
  location: ItemLocation,
  item: ExerciseItem | GroupItem,
  index: number
): SessionListItem[] {
  if (location.container === 'root') {
    const next = [...items];
    next.splice(index, 0, item);
    return next;
  }
  if (item.type === 'group') return items;
  const groupIdx = items.findIndex((i) => i.type === 'group' && i.id === location.groupId);
  if (groupIdx === -1) return items;
  const group = items[groupIdx] as GroupItem;
  const newChildren = [...group.children];
  newChildren.splice(index, 0, item as ExerciseItem);
  const nextItems = [...items];
  nextItems[groupIdx] = { ...group, children: newChildren };
  return nextItems;
}

/**
 * Reorder within a container.
 */
export function reorderWithinContainer<T>(list: T[], startIndex: number, finishIndex: number): T[] {
  if (startIndex === finishIndex) return [...list];
  const result = [...list];
  const [removed] = result.splice(startIndex, 1);
  result.splice(finishIndex, 0, removed);
  return result;
}

export function generateGroupId(): string {
  return `group-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Create new group from two exercises. Replaces target with group.
 * items: list after removing dragged (so it still contains target).
 */
export function createGroupFromTwoExercises(
  items: SessionListItem[],
  targetIndex: number,
  draggedExercise: ExerciseItem,
  targetExercise: ExerciseItem
): SessionListItem[] {
  const groupId = generateGroupId();
  const newGroup: GroupItem = {
    type: 'group',
    id: groupId,
    children: [targetExercise, draggedExercise],
  };
  const next = [...items];
  next[targetIndex] = newGroup;
  return next;
}

/**
 * Add exercise to existing group. Removes exercise from current location first.
 */
export function addExerciseToGroup(
  items: SessionListItem[],
  draggedLocation: ItemLocation,
  groupId: string,
  exercise: ExerciseItem,
  insertIndex: number
): SessionListItem[] {
  const { nextItems } = removeItem(items, draggedLocation);
  const groupIdx = nextItems.findIndex((i) => i.type === 'group' && i.id === groupId);
  if (groupIdx === -1) return items;
  const group = nextItems[groupIdx] as GroupItem;
  const newChildren = [...group.children];
  newChildren.splice(insertIndex, 0, exercise);
  return nextItems.map((i, idx) =>
    idx === groupIdx ? { ...i, children: newChildren } : i
  ) as SessionListItem[];
}

/**
 * Flatten to exercise names (for templates).
 */
export function flattenToNames(items: SessionListItem[]): string[] {
  return items.flatMap((i) =>
    i.type === 'exercise' ? [i.name] : i.children.map((c) => c.name)
  );
}

/**
 * Replace an exercise by id (works for root and group children).
 */
export function replaceExerciseById(
  items: SessionListItem[],
  id: string,
  updates: Partial<ExerciseItem>
): SessionListItem[] {
  return items.map((i) => {
    if (i.type === 'exercise' && i.id === id) {
      return { ...i, ...updates };
    }
    if (i.type === 'group') {
      const childIdx = i.children.findIndex((c) => c.id === id);
      if (childIdx !== -1) {
        const newChildren = [...i.children];
        newChildren[childIdx] = { ...newChildren[childIdx], ...updates };
        return { ...i, children: newChildren };
      }
    }
    return i;
  });
}

/**
 * Get neutral group display label (no training jargon).
 * @param groupIndex 1-based index from root list order
 * @param childrenCount number of exercises in group
 */
export function getGroupDisplayLabel(
  groupIndex: number,
  childrenCount: number
): { title: string; subtitle: string } {
  return {
    title: `Group ${groupIndex}`,
    subtitle: `${childrenCount} exercise${childrenCount > 1 ? 's' : ''}`,
  };
}

/**
 * Get set label for a set performed inside a group.
 * e.g. "Group 1 — Set 1"
 */
export function getGroupSetLabel(groupTitle: string, setNumber: number): string {
  return `${groupTitle} — Set ${setNumber}`;
}

/**
 * Get group index (1-based) from root list order.
 */
export function getGroupIndex(items: SessionListItem[], groupId: string): number {
  const idx = items
    .filter((i): i is GroupItem => i.type === 'group')
    .findIndex((g) => g.id === groupId);
  return idx >= 0 ? idx + 1 : 0;
}

/**
 * Remove child from group and insert at root position.
 * Applies auto-ungroup when group has 1 child left.
 */
export function pullChildOutOfGroup(
  items: SessionListItem[],
  groupId: string,
  childId: string,
  insertRootIndex: number
): SessionListItem[] {
  const loc = findItemLocation(items, childId);
  if (!loc || loc.container !== groupId) return items;
  const { nextItems, removed } = removeItem(items, loc);
  if (removed.type !== 'exercise') return items;
  const insertLoc: ItemLocation = { container: 'root', index: insertRootIndex };
  return insertItem(nextItems, insertLoc, removed, insertRootIndex);
}

/**
 * Ungroup: replace group with its children as solo exercises at same position.
 */
export function ungroup(items: SessionListItem[], groupId: string): SessionListItem[] {
  const groupIdx = items.findIndex((i) => i.type === 'group' && i.id === groupId);
  if (groupIdx === -1) return items;
  const group = items[groupIdx] as GroupItem;
  const next = [...items];
  next.splice(groupIdx, 1, ...group.children);
  return next;
}
