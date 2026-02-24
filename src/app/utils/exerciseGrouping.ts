/**
 * Exercise grouping utilities for supersets/tri-sets
 * Grouping is list-level metadata only - does not affect set logging
 */

import { Exercise, AdHocLoggingSession } from '../types';
import { getGroupDisplayLabel, getGroupSetLabel } from '../../components/drag/exerciseDnDUtils';

/**
 * Generate a unique group ID
 */
export function generateGroupId(): string {
  return `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get all exercises in a group
 */
export function getGroupExercises(exercises: Exercise[], groupId: string): Exercise[] {
  return exercises.filter(ex => ex.groupId === groupId);
}

/**
 * Check if exercises are contiguous in the list
 */
export function areExercisesContiguous(exercises: Exercise[], exerciseIds: string[]): boolean {
  const indices = exerciseIds.map(id => exercises.findIndex(ex => ex.id === id)).filter(i => i !== -1);
  if (indices.length === 0) return true;
  
  indices.sort((a, b) => a - b);
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] !== indices[i - 1] + 1) {
      return false;
    }
  }
  return true;
}

/**
 * Ensure grouped exercises are contiguous by reordering
 */
export function ensureGroupContiguous(exercises: Exercise[], groupId: string): Exercise[] {
  const groupExercises = getGroupExercises(exercises, groupId);
  const otherExercises = exercises.filter(ex => ex.groupId !== groupId);
  
  if (groupExercises.length === 0) return exercises;
  
  // Find the first position of any group member
  const firstGroupIndex = exercises.findIndex(ex => ex.groupId === groupId);
  
  // Reorder: place group exercises together at the first position
  const reordered: Exercise[] = [...exercises];
  groupExercises.forEach((groupEx, idx) => {
    const currentIndex = reordered.findIndex(ex => ex.id === groupEx.id);
    if (currentIndex !== firstGroupIndex + idx) {
      // Remove from current position
      reordered.splice(currentIndex, 1);
      // Insert at correct position
      reordered.splice(firstGroupIndex + idx, 0, groupEx);
    }
  });
  
  return reordered;
}

/**
 * Create a new group from exercise IDs
 */
export function createGroup(exercises: Exercise[], instanceIds: string[]): Exercise[] {
  if (instanceIds.length < 2) return exercises;
  
  const groupId = generateGroupId();
  const updated = exercises.map(ex => 
    instanceIds.includes(ex.id) ? { ...ex, groupId } : ex
  );
  
  return ensureGroupContiguous(updated, groupId);
}

/**
 * Add an exercise to an existing group
 */
export function addToGroup(exercises: Exercise[], groupId: string, instanceId: string): Exercise[] {
  const updated = exercises.map(ex => 
    ex.id === instanceId ? { ...ex, groupId } : ex
  );
  
  return ensureGroupContiguous(updated, groupId);
}

/**
 * Merge two groups into one
 */
export function mergeGroups(exercises: Exercise[], groupId1: string, groupId2: string): Exercise[] {
  // Use groupId1 as canonical
  const updated = exercises.map(ex => 
    ex.groupId === groupId2 ? { ...ex, groupId: groupId1 } : ex
  );
  
  return ensureGroupContiguous(updated, groupId1);
}

/**
 * Remove an exercise from its group
 */
export function ungroup(exercises: Exercise[], instanceId: string): Exercise[] {
  const exercise = exercises.find(ex => ex.id === instanceId);
  if (!exercise || !exercise.groupId) return exercises;
  
  const groupId = exercise.groupId;
  const groupExercises = getGroupExercises(exercises, groupId);
  
  // If only 2 exercises in group, dissolve the group
  if (groupExercises.length <= 2) {
    return exercises.map(ex => 
      ex.groupId === groupId ? { ...ex, groupId: null } : ex
    );
  }
  
  // Otherwise, just remove this exercise from the group
  return exercises.map(ex => 
    ex.id === instanceId ? { ...ex, groupId: null } : ex
  );
}

/**
 * Remove all exercises from a group (dissolve group)
 */
export function ungroupAll(exercises: Exercise[], groupId: string): Exercise[] {
  return exercises.map(ex => 
    ex.groupId === groupId ? { ...ex, groupId: null } : ex
  );
}

/**
 * Get ordered group members (in display order)
 */
export function getGroupMembersOrdered(exercises: Exercise[], groupId: string): Exercise[] {
  const members = getGroupExercises(exercises, groupId);
  // Sort by position in exercises array to maintain display order
  return members.sort((a, b) => {
    const indexA = exercises.findIndex(ex => ex.id === a.id);
    const indexB = exercises.findIndex(ex => ex.id === b.id);
    return indexA - indexB;
  });
}

/**
 * Swap a group member with a replacement exercise (true replace-in-place).
 * - Removes source member from the exercises list entirely (caller should add to replacedExercises if it had sets).
 * - Inserts replacement at the same position in the group.
 * - Ensures replacement is not already grouped.
 */
export function swapGroupMember(
  exercises: Exercise[],
  groupId: string,
  sourceMemberInstanceId: string,
  replacementInstanceId: string
): Exercise[] {
  // Get ordered group members
  const members = getGroupMembersOrdered(exercises, groupId);
  
  // Find source member index
  const sourceIndex = members.findIndex(m => m.id === sourceMemberInstanceId);
  if (sourceIndex === -1) {
    console.error('[swapGroupMember] Source member not found in group', {
      groupId,
      sourceMemberInstanceId,
      memberIds: members.map(m => m.id),
    });
    return exercises; // Abort - no changes
  }
  
  // Find replacement exercise
  const replacement = exercises.find(ex => ex.id === replacementInstanceId);
  if (!replacement) {
    console.error('[swapGroupMember] Replacement exercise not found', {
      replacementInstanceId,
      exerciseIds: exercises.map(ex => ex.id),
    });
    return exercises; // Abort - no changes
  }
  
  // Enforce "not already grouped"
  if (replacement.groupId !== null && replacement.groupId !== undefined) {
    console.warn('[swapGroupMember] Replacement is already in a group', {
      replacementInstanceId,
      existingGroupId: replacement.groupId,
    });
    return exercises;
  }
  
  // Remove source member entirely from the list (no ungroup; true replace)
  const withoutSource = exercises.filter(ex => ex.id !== sourceMemberInstanceId);
  
  // Find where the group starts (first member after removing source)
  const firstGroupIndex = withoutSource.findIndex(ex => ex.groupId === groupId);
  
  if (firstGroupIndex === -1) {
    console.error('[swapGroupMember] Group not found after removing source member');
    return withoutSource;
  }
  
  // Target position: firstGroupIndex + sourceIndex
  const targetIndex = firstGroupIndex + sourceIndex;
  
  // Find current position of replacement in the list (without source)
  const replacementCurrentIndex = withoutSource.findIndex(ex => ex.id === replacementInstanceId);
  
  // Remove replacement from current position
  const replacementExercise = withoutSource[replacementCurrentIndex];
  const withoutReplacement = withoutSource.filter((_, idx) => idx !== replacementCurrentIndex);
  
  // Insert replacement at target position with groupId
  const withReplacement = [
    ...withoutReplacement.slice(0, targetIndex),
    { ...replacementExercise, groupId },
    ...withoutReplacement.slice(targetIndex),
  ];
  
  return ensureGroupContiguous(withReplacement, groupId);
}

/**
 * Get 1-based group index from exercises array order (for display labels).
 */
export function getGroupIndexForExercises(exercises: Exercise[], groupId: string): number {
  const seen = new Set<string>();
  let idx = 0;
  for (const ex of exercises) {
    if (ex.groupId && !seen.has(ex.groupId)) {
      seen.add(ex.groupId);
      idx++;
      if (ex.groupId === groupId) return idx;
    }
  }
  return 0;
}

/**
 * Get group display label for session (Group 1, Group 2, etc.).
 */
export function getGroupLabelForSession(
  exercises: Exercise[],
  groupId: string
): { displayLabel: string; subtitle: string } {
  const members = getGroupExercises(exercises, groupId);
  const groupIndex = getGroupIndexForExercises(exercises, groupId);
  const { title, subtitle } = getGroupDisplayLabel(groupIndex, members.length);
  return { displayLabel: title, subtitle };
}

export { getGroupSetLabel };

/**
 * Get group information for an exercise
 */
export function getGroupInfo(exercises: Exercise[], exerciseId: string): {
  groupId: string | null;
  groupMembers: Exercise[];
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
} {
  const exercise = exercises.find(ex => ex.id === exerciseId);
  if (!exercise || !exercise.groupId) {
    return {
      groupId: null,
      groupMembers: [],
      isFirstInGroup: false,
      isLastInGroup: false,
    };
  }
  
  const groupMembers = getGroupExercises(exercises, exercise.groupId);
  const sortedMembers = groupMembers.sort((a, b) => {
    const indexA = exercises.findIndex(ex => ex.id === a.id);
    const indexB = exercises.findIndex(ex => ex.id === b.id);
    return indexA - indexB;
  });
  
  const exerciseIndex = sortedMembers.findIndex(ex => ex.id === exerciseId);
  
  return {
    groupId: exercise.groupId,
    groupMembers: sortedMembers,
    isFirstInGroup: exerciseIndex === 0,
    isLastInGroup: exerciseIndex === sortedMembers.length - 1,
  };
}

/**
 * Filter out grouped exercise members from a list
 * Only returns exercises that are not part of a group (or are the first member of a group)
 */
export function filterGroupedMembers(exercises: Exercise[]): Exercise[] {
  const seenGroupIds = new Set<string | null>();
  const result: Exercise[] = [];
  
  exercises.forEach(ex => {
    if (!ex.groupId) {
      // Not grouped - include it
      result.push(ex);
    } else {
      // Grouped - only include if we haven't seen this group yet (first member)
      if (!seenGroupIds.has(ex.groupId)) {
        seenGroupIds.add(ex.groupId);
        // Don't include individual members - groups are handled in primary area
        // If you need to represent the group, return just the first member
        // For now, we exclude all grouped members from lists
      }
    }
  });
  
  return result.filter(ex => !ex.groupId);
}

/**
 * Build a list of session items from exercises
 * Groups exercises into supersets (single items) and keeps individual exercises separate
 */
export interface SessionItem {
  id: string; // Unique ID: exerciseId for single, groupId for superset
  type: 'exercise' | 'superset';
  exerciseIds: string[]; // All exercise IDs in this item
  isComplete: boolean; // True if all exercises in item are complete
}

export function buildSessionItems(exercises: Exercise[]): SessionItem[] {
  const items: SessionItem[] = [];
  const processedIds = new Set<string>();
  const groupMap = new Map<string, Exercise[]>();
  
  // First pass: collect all groups
  exercises.forEach(ex => {
    if (ex.groupId) {
      if (!groupMap.has(ex.groupId)) {
        groupMap.set(ex.groupId, []);
      }
      groupMap.get(ex.groupId)!.push(ex);
    }
  });
  
  // Second pass: build items
  exercises.forEach(ex => {
    if (processedIds.has(ex.id)) return;
    
    if (ex.groupId && groupMap.has(ex.groupId)) {
      // This is part of a group - create superset item
      const groupMembers = groupMap.get(ex.groupId)!;
      if (groupMembers.length >= 2) {
        items.push({
          id: ex.groupId,
          type: 'superset',
          exerciseIds: groupMembers.map(m => m.id),
          isComplete: groupMembers.every(m => m.isComplete || false),
        });
        groupMembers.forEach(m => processedIds.add(m.id));
      } else {
        // Group with only one member - treat as individual
        items.push({
          id: ex.id,
          type: 'exercise',
          exerciseIds: [ex.id],
          isComplete: ex.isComplete || false,
        });
        processedIds.add(ex.id);
      }
    } else {
      // Individual exercise
      items.push({
        id: ex.id,
        type: 'exercise',
        exerciseIds: [ex.id],
        isComplete: ex.isComplete || false,
      });
      processedIds.add(ex.id);
    }
  });
  
  // Sort items to maintain exercise order
  return items.sort((a, b) => {
    const aIndex = exercises.findIndex(ex => a.exerciseIds.includes(ex.id));
    const bIndex = exercises.findIndex(ex => b.exerciseIds.includes(ex.id));
    return aIndex - bIndex;
  });
}

/**
 * Apply grouping operations to AdHocLoggingSession
 */
export function applyGroupingToSession(
  session: AdHocLoggingSession,
  updatedExercises: Exercise[]
): AdHocLoggingSession {
  // Normalize input: ensure updatedExercises is an array
  let exercisesArray: Exercise[];
  if (Array.isArray(updatedExercises)) {
    exercisesArray = updatedExercises;
  } else if (updatedExercises && typeof updatedExercises === 'object' && 'exercises' in updatedExercises && Array.isArray((updatedExercises as any).exercises)) {
    // Handle case where a session object is passed instead of exercises array
    exercisesArray = (updatedExercises as any).exercises;
  } else if (updatedExercises && typeof updatedExercises === 'object') {
    // Handle case where a map/record is passed
    exercisesArray = Object.values(updatedExercises);
  } else {
    // Fallback: use session exercises
    console.error('[applyGroupingToSession] Invalid updatedExercises type, using session exercises', typeof updatedExercises, updatedExercises);
    exercisesArray = session.exercises;
  }

  if (!Array.isArray(exercisesArray) || exercisesArray.length === 0) {
    console.error('[applyGroupingToSession] exercisesArray is not a valid array', exercisesArray);
    return session;
  }

  // Filter out undefined/null entries defensively
  const validExercisesArray = exercisesArray.filter((ex): ex is NonNullable<typeof ex> => ex != null);
  const validSessionExercises = (session.exercises ?? []).filter((ex): ex is NonNullable<typeof ex> => ex != null);

  // Create a map of original session exercises to preserve metadata
  const originalExerciseMap = new Map(validSessionExercises.map(ex => [ex.id, ex]));

  // Update exercises and maintain order (only include ids that exist in updated exercises)
  const exerciseMap = new Map(validExercisesArray.map(ex => [ex.id, ex]));
  const orderedExercises = (session.exerciseOrder ?? [])
    .map(id => exerciseMap.get(id))
    .filter((ex): ex is NonNullable<typeof ex> => ex !== undefined);
  
  // Update groups map
  const groups: { [groupId: string]: { createdAt: number } } = session.groups || {};
  validExercisesArray.forEach(ex => {
    if (ex.groupId && !groups[ex.groupId]) {
      groups[ex.groupId] = { createdAt: Date.now() };
    }
  });
  
  // Reorder exerciseOrder to ensure grouped exercises are contiguous
  const reorderedExerciseOrder: string[] = [];
  const processedIds = new Set<string>();
  
  validExercisesArray.forEach(ex => {
    if (processedIds.has(ex.id)) return;

    if (ex.groupId) {
      // Add all exercises in the group together
      const groupMembers = validExercisesArray.filter(e => e.groupId === ex.groupId);
      groupMembers.forEach(member => {
        if (!processedIds.has(member.id)) {
          reorderedExerciseOrder.push(member.id);
          processedIds.add(member.id);
        }
      });
    } else {
      // Add ungrouped exercise
      reorderedExerciseOrder.push(ex.id);
      processedIds.add(ex.id);
    }
  });
  
  // Only add ids from session that exist in updated exercises (don't re-add swapped-out exercises)
  (session.exerciseOrder ?? []).forEach(id => {
    if (!processedIds.has(id) && exerciseMap.has(id)) {
      reorderedExerciseOrder.push(id);
    }
  });
  
  const exercises = reorderedExerciseOrder
    .map(id => {
      const updatedEx = exerciseMap.get(id);
      const originalEx = originalExerciseMap.get(id);
      if (!updatedEx) return null;
      if (!originalEx) {
        // New exercise (e.g. from add+swap) - use updatedEx, caller must have full format
        return updatedEx as any;
      }
      return {
        ...originalEx,
        sets: updatedEx.sets,
        isComplete: updatedEx.isComplete,
        groupId: updatedEx.groupId || null,
      };
    })
    .filter((ex): ex is NonNullable<typeof ex> => ex != null);

  return {
    ...session,
    exerciseOrder: reorderedExerciseOrder,
    exercises,
    groups,
  };
}
